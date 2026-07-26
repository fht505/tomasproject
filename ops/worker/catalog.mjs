#!/usr/bin/env node
// Do the products we plan to sell actually exist, and do our prices work?
//
//   node ops.mjs catalog
//
// This needs ONLY a Printify API token. No Etsy shop, no connected store, no
// shop id, no generated listings, no shop name. Printify signup is free and
// takes five minutes, so this question can be answered long before the storefront
// exists — which matters, because the answer decides whether 34 designs are
// worth drawing.
//
// The specific risk it retires: if this account has no 9oz candle blueprint,
// twelve of the forty listings are void and roughly a third of the design work
// would have been wasted. Better to find out now than after three hours in
// ChatGPT.
//
// Everything here is read-only. It creates nothing and cannot spend money.

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials, netMargin, minPriceFor } from './config.mjs';
import { PRODUCTS } from './products.mjs';
import { BLUEPRINT_SEARCH, chooseProvider, resolveBlueprint } from './stage.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const money = (n) => `$${n.toFixed(2)}`;
const usd = (cents) => cents / 100;

let cfg, token;
try {
  cfg = loadConfig();
  // token only — deliberately NOT ['token','shop']. That is the whole point:
  // this runs before any store exists.
  ({ token } = credentials(['token']));
} catch (e) {
  console.error(`\n  ${e.message}\n`);
  console.error('  Printify signup is free and needs no Etsy store:');
  console.error('    1. printify.com -> sign up');
  console.error('    2. Account -> Connections -> Generate API token');
  console.error('    3. cp .env.example .env   and paste the token in');
  console.error('    4. node ops.mjs catalog\n');
  process.exit(1);
}
const client = makeClient(token);

console.log('\n  Resolving the real Printify catalog. Nothing is created.\n');

const blueprints = await client.blueprints();
console.log(`  ${blueprints.length} blueprints visible on this account\n`);

const rows = [];
let missing = 0, thin = 0, unpriced = 0;

for (const [key, product] of Object.entries(PRODUCTS)) {
  const spec = BLUEPRINT_SEARCH[product.type];
  let bp;
  try {
    // same resolver stage uses, so this proves the real thing
    bp = await resolveBlueprint(client, product.type);
  } catch (e) {
    console.log(`  MISSING  ${key.padEnd(11)} ${e.message}`);
    console.log(`           ${product.count} of 40 listings depend on this\n`);
    rows.push({ key, type: product.type, found: false, error: e.message, listings_at_risk: product.count });
    missing++;
    continue;
  }

  const providers = await client.providers(bp.id);
  if (!providers.length) {
    console.log(`  MISSING  ${key.padEnd(11)} blueprint ${bp.id} has no print providers\n`);
    rows.push({ key, type: product.type, found: false, blueprint_id: bp.id, listings_at_risk: product.count });
    missing++;
    continue;
  }

  const { chosen, reason } = await chooseProvider(client, providers, spec.providerId);
  const { variants } = await client.variants(bp.id, chosen.id);

  // Cost is exposed here on some accounts and only on a created product on
  // others. Report which, rather than guessing a number either way.
  const costs = (variants || []).map(v => v.cost).filter(c => typeof c === 'number' && c > 0);
  const row = {
    key, type: product.type, found: true,
    blueprint_id: bp.id, blueprint: `${bp.brand} — ${bp.title}`,
    provider_id: chosen.id, provider: chosen.title, provider_country: chosen.country,
    provider_reason: reason,
    variants: variants?.length ?? 0,
    planned_price: product.price,
    listings: product.count,
  };

  console.log(`  OK       ${key.padEnd(11)} ${bp.brand} — ${bp.title}`);
  console.log(`           blueprint ${bp.id} · provider ${chosen.id} ${chosen.title} [${chosen.country || '?'}] · ${variants?.length ?? 0} variants`);
  console.log(`           ${reason}`);

  if (costs.length) {
    const maxUsd = usd(Math.max(...costs));
    const minUsd = usd(Math.min(...costs));
    const m = netMargin({ priceUsd: product.price, baseCostUsd: maxUsd, fees: cfg.fees });
    row.base_cost_usd = { min: minUsd, max: maxUsd };
    row.margin = m;
    const flag = m.net < cfg.min_margin_usd ? '  <-- UNDER FLOOR' : '';
    console.log(`           cost ${money(minUsd)}–${money(maxUsd)} · at ${money(product.price)} nets ${money(m.net)} after ${money(m.platform_fees)} fees${flag}`);
    if (m.net < cfg.min_margin_usd) {
      const need = minPriceFor({ baseCostUsd: maxUsd, target: cfg.min_margin_usd, fees: cfg.fees });
      console.log(`           needs ${money(need)} to clear the ${money(cfg.min_margin_usd)} floor`);
      row.min_viable_price = need;
      thin++;
    }
  } else {
    console.log(`           base cost not exposed by the catalog on this account — verified at stage time instead`);
    unpriced++;
  }
  console.log('');
  rows.push(row);
}

mkdirSync(PATHS.state, { recursive: true });
writeFileSync(join(PATHS.state, 'catalog.json'), JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'Printify catalog API (blueprints, print_providers, variants)',
  produced_by: 'catalog.mjs',
  note: 'read-only catalog resolution; requires a token only, no shop or store',
  margin_inputs: {
    base_cost: 'REAL — printify catalog variants where exposed',
    fees: cfg.fees.fees_confirmed
      ? 'operator-confirmed Etsy fee schedule from ops/config.json'
      : 'UNCONFIRMED Etsy fee schedule from ops/config.json',
    prices: 'planned prices from products.mjs',
  },
  min_margin_usd: cfg.min_margin_usd,
  products: rows,
}, null, 2));

// ---------------------------------------------------------------- verdict
const atRisk = rows.filter(r => !r.found).reduce((a, r) => a + (r.listings_at_risk || 0), 0);
console.log('  ' + '-'.repeat(64));
if (missing) {
  console.log(`  ${missing} product type${missing === 1 ? '' : 's'} unavailable — ${atRisk} of 40 listings affected.`);
  console.log(`  Do NOT draw art for those until the blueprint search is fixed or the batch is rebalanced.`);
} else {
  console.log(`  All ${rows.length} product types exist on this account.`);
}
if (thin) console.log(`  ${thin} priced under the ${money(cfg.min_margin_usd)} floor — raise the price in products.mjs before staging.`);
if (unpriced) console.log(`  ${unpriced} did not expose costs here; the margin guard still checks them at stage time.`);
if (!cfg.fees.fees_confirmed) {
  console.log(`  ! Fee schedule UNCONFIRMED, so the margins above are indicative. Confirm it in ops/config.json.`);
}
console.log(`\n  wrote state/catalog.json\n`);

process.exitCode = missing ? 1 : 0;
