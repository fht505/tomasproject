#!/usr/bin/env node
// Proves the margin guard's arithmetic and its edge cases without touching the
// live API. Run: node test-margin.mjs
//
// This exists because the margin guard is the only thing standing between a
// bad blueprint price and a shop that sells at a loss. "It looks right" is not
// good enough for the code that decides whether a product is allowed to exist.

import { netMargin, minPriceFor, loadConfig, assertShippingClaimMatchesConfig } from './config.mjs';
import { baseCostFromProduct, baseCostFromCatalog, chooseVariants, marginDecision } from './stage.mjs';
import { addDays, classify } from './orders.mjs';

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
};

const FEES = {
  fees_confirmed: true,
  transaction_pct: 6.5,
  payment_processing_pct: 3.0,
  payment_processing_flat_usd: 0.25,
  listing_fee_usd: 0.20,
  offsite_ads_pct: 0,
};

console.log('\nnetMargin');
// $28 tee, $11.50 base cost.
//   transaction 28 * 0.065            = 1.82
//   processing  28 * 0.03 + 0.25      = 1.09
//   listing                            = 0.20
//   platform total                     = 3.11
//   net = 28 - 11.50 - 3.11            = 13.39
eq('tee at $28 over $11.50 cost',
  netMargin({ priceUsd: 28, baseCostUsd: 11.5, fees: FEES }),
  { price: 28, base_cost: 11.5, shipping: 0, platform_fees: 3.11, net: 13.39, fees_confirmed: true });

// free shipping eats straight into net, dollar for dollar
eq('same tee absorbing $4.75 shipping',
  netMargin({ priceUsd: 28, baseCostUsd: 11.5, shippingUsd: 4.75, fees: FEES }).net,
  8.64);

// offsite ads is the worst case a listing has to survive
eq('same tee with 15% offsite ads',
  netMargin({ priceUsd: 28, baseCostUsd: 11.5, fees: { ...FEES, offsite_ads_pct: 15 } }).net,
  9.19);

// a real loser: $0.10 of headroom, then $1.59 of fees eats it
eq('mug priced below cost goes negative',
  netMargin({ priceUsd: 12, baseCostUsd: 11.9, fees: FEES }).net,
  -1.49);

eq('unconfirmed fees are carried through, not hidden',
  netMargin({ priceUsd: 28, baseCostUsd: 11.5, fees: { ...FEES, fees_confirmed: false } }).fees_confirmed,
  false);

console.log('\nbaseCostFromProduct');
// flat pricing means the MOST expensive enabled variant decides profitability
eq('takes the worst-case enabled variant',
  baseCostFromProduct({ variants: [
    { id: 1, is_enabled: true, cost: 1150 },
    { id: 2, is_enabled: true, cost: 1495 },
    { id: 3, is_enabled: false, cost: 9999 },
  ] }),
  { maxUsd: 14.95, minUsd: 11.5, variants: 2 });

eq('no cost field at all -> null, never a guess',
  baseCostFromProduct({ variants: [{ id: 1, is_enabled: true }] }),
  null);

eq('zero and missing costs are not treated as free',
  baseCostFromProduct({ variants: [{ id: 1, is_enabled: true, cost: 0 }, { id: 2, is_enabled: true, cost: 800 }] }),
  { maxUsd: 8, minUsd: 8, variants: 1 });

eq('empty product -> null', baseCostFromProduct({}), null);

eq('catalog variants read the same way',
  baseCostFromCatalog([{ cost: 500 }, { cost: 750 }]),
  { maxUsd: 7.5, minUsd: 5, variants: 2 });

console.log('\nchooseVariants');
const apparel = { code: 'T1', product: 'tee_bella_3001' };
const teeVariants = [
  { id: 1, options: { size: 'S', color: 'Black' } },
  { id: 2, options: { size: 'M', color: 'Black' } },
  { id: 3, options: { size: 'M', color: 'White' } },
  { id: 4, options: { size: '4XL', color: 'Black' } },   // size we do not stock
  { id: 5, options: { size: 'L', color: 'Chartreuse' } }, // color we do not want
];
eq('apparel offers several colors, drops unstocked sizes and off-list colors',
  chooseVariants(apparel, { variants: teeVariants }).map(v => v.id),
  [1, 2, 3]);

eq('when no preferred color exists, take what the provider has rather than one arbitrary color',
  chooseVariants(apparel, { variants: [
    { id: 9, options: { size: 'M', color: 'Chartreuse' } },
    { id: 10, options: { size: 'L', color: 'Puce' } },
  ] }).map(v => v.id),
  [9, 10]);

const many = Array.from({ length: 80 }, (_, i) => ({ id: i, options: {} }));
eq('a runaway variant list is capped at 60',
  chooseVariants({ code: 'C1', product: 'candle_9oz' }, { variants: many }).length,
  60);

console.log('\nminPriceFor — the price a rejected listing would need');
eq('inverts netMargin exactly',
  netMargin({
    priceUsd: minPriceFor({ baseCostUsd: 20, target: 5, fees: FEES }),
    baseCostUsd: 20, fees: FEES,
  }).net >= 5,
  true);

console.log('\nmarginDecision — the call that decides whether a draft survives');
const CFG = { min_margin_usd: 5.0, fees: FEES };
const tee = { code: 'B1', price_usd: 28, product: 'tee_bella_3001' };
const healthy = { variants: [{ is_enabled: true, cost: 1150 }] };
const marginal = { variants: [{ is_enabled: true, cost: 2000 }] };  // net 3.11 -> under floor
const silent = { variants: [{ is_enabled: true }] };

eq('healthy product is accepted with a verified margin',
  (({ accept, verified, margin }) => ({ accept, verified, net: margin.net }))(
    marginDecision(tee, healthy, 0, CFG)),
  { accept: true, verified: true, net: 13.39 });

eq('thin product is rejected, not quietly listed',
  (({ accept, verified }) => ({ accept, verified }))(marginDecision(tee, marginal, 0, CFG)),
  { accept: false, verified: true });

eq('rejection explains itself in dollars',
  /net \$4\.89 under the \$5\.00 floor/.test(marginDecision(tee, marginal, 0, CFG).reason),
  true);

eq('a product that clears by itself fails once free shipping is absorbed',
  (({ accept }) => accept)(marginDecision(tee, healthy, 9.0, CFG)),
  false);

eq('no cost from Printify -> kept but flagged unverified',
  (({ accept, verified, margin }) => ({ accept, verified, margin }))(
    marginDecision(tee, silent, 0, CFG)),
  { accept: true, verified: false, margin: null });

// $20 - $12.65 cost - $2.35 fees = exactly the $5.00 floor. "At the floor" must
// pass, or every price the operator tunes to the floor gets silently deleted.
eq('landing exactly on the floor passes',
  (({ accept, margin }) => ({ accept, net: margin.net }))(
    marginDecision({ ...tee, price_usd: 20 }, { variants: [{ is_enabled: true, cost: 1265 }] }, 0, CFG)),
  { accept: true, net: 5 });

eq('one cent under the floor does not',
  (({ accept, margin }) => ({ accept, net: margin.net }))(
    marginDecision({ ...tee, price_usd: 20 }, { variants: [{ is_enabled: true, cost: 1266 }] }, 0, CFG)),
  { accept: false, net: 4.99 });

console.log('\nship-by clock (orders watch)');
// Fri 2026-07-24 12:00Z + 5 business days = Fri 2026-07-31. Getting this wrong
// by a weekend is the difference between "on time" and a voided Purchase
// Protection claim, so it is pinned to an exact date.
eq('business days skip the weekend',
  addDays('2026-07-24T12:00:00Z', 5, true).toISOString().slice(0, 10),
  '2026-07-31');

eq('calendar days do not',
  addDays('2026-07-24T12:00:00Z', 5, false).toISOString().slice(0, 10),
  '2026-07-29');

const W = 5;
const lvl = (o) => classify({ windowDays: W, ...o }).level;

eq('a payment hold is an alarm, however young the order',
  lvl({ status: 'on-hold', hasTracking: false, ageHours: 1, hoursLeft: 100 }),
  'ALARM');

eq('past the ship-by with no tracking is an alarm',
  lvl({ status: 'in-production', hasTracking: false, ageHours: 200, hoursLeft: -3 }),
  'ALARM');

eq('under half the window left and nothing moving is a warning',
  lvl({ status: 'in-production', hasTracking: false, ageHours: 80, hoursLeft: 40 }),
  'WARN');

eq('tracking beats every deadline check',
  lvl({ status: 'in-production', hasTracking: true, ageHours: 200, hoursLeft: -50 }),
  'shipped');

eq('a fresh order inside its window is fine',
  lvl({ status: 'in-production', hasTracking: false, ageHours: 4, hoursLeft: 110 }),
  'ok');

eq('with no stated processing time, age alone still catches a stalled order',
  lvl({ status: 'created', hasTracking: false, ageHours: 40, hoursLeft: null }),
  'WARN');

eq('cancelled orders are not counted as trouble',
  lvl({ status: 'canceled', hasTracking: false, ageHours: 900, hoursLeft: -500 }),
  'dead');

console.log('\nshipping-claim guard');
const claims = (desc, days) => {
  try { assertShippingClaimMatchesConfig({ code: 'X', description: desc }, { processing: { days } }); return 'allowed'; }
  catch (e) { return e.message; }
};
eq('no claim in the description is always fine',
  claims('• Premium unisex tee', ''), 'allowed');
eq('a claim with no stated processing time is blocked',
  /states no processing time/.test(claims('• Ships in 2-5 business days', '')), true);
eq('a claim that disagrees with config is blocked',
  /says "3-6 business days"/.test(claims('• Ships in 2-5 business days', '3-6 business days')), true);
eq('a claim that matches config passes',
  claims('• Ships in 2-5 business days', '2-5 business days'), 'allowed');

console.log('\nlive config');
const cfg = loadConfig();
eq('config parses and defaults are filled', typeof cfg.fees.transaction_pct, 'number');
eq('min_margin_usd is a real floor', cfg.min_margin_usd > 0, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
