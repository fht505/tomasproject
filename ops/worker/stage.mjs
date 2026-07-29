#!/usr/bin/env node
// Stage BATCH-01 as real Printify DRAFT products.
//
//   node stage.mjs plan          resolve blueprints/providers/variants + REAL costs
//   node stage.mjs run           upload art + create drafts (margin-guarded)
//   node stage.mjs run --only A1,B7
//
// Idempotent: keeps ../state/staged.json mapping spec code -> printify id.
// A code already present is skipped unless --force.
//
// Nothing is published to Etsy here. Publishing is a separate, operator-
// approved step (publish.mjs) by design.
//
// The margin guard is the point of this file. Printify reports a real base
// cost per variant only on the created product, so `run` creates the draft,
// reads the cost back, and DELETES the draft if the net margin lands under
// config.min_margin_usd. A draft that never earns money never survives here.

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials, netMargin, minPriceFor, assertNoPlaceholders, assertShippingClaimMatchesConfig } from './config.mjs';
import { tmBlocker } from './tm.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const stagedPath = join(PATHS.state, 'staged.json');

const args = process.argv.slice(2);
const mode = args[0] || 'plan';
const only = (() => {
  const i = args.indexOf('--only');
  if (i === -1) return null;
  if (!args[i + 1]) throw new Error('--only needs a comma-separated list of codes');
  return new Set(args[i + 1].split(',').map(s => s.trim()).filter(Boolean));
})();
const force = args.includes('--force');
// Build every payload and price every margin, but POST nothing. The Printify
// product schema is the most likely thing to be wrong on a first run, and this
// is the only way to look at it without creating 40 real products to find out.
const dryRun = args.includes('--dry-run');

// Which catalog blueprint to use per product type.
//
// Pinned by id, with `expect` asserting the title still reads how we think it
// does. Printify's blueprint ids are global to the catalog, not per-account, so
// pinning is safe — and the assertion means a silently repointed id fails loudly
// instead of printing the wrong product.
//
// This used to be regex-only, and `candle: /candle/i` matched the FIRST of 13
// candle blueprints: an 11oz jar, while all twelve candle listings say 9oz in
// their title and description. The search picked a product our own copy
// contradicted and nothing noticed, because a loose search that matches many
// things still returns exactly one answer. Hence both the pin and, below, the
// hard failure when a fallback search is ambiguous.
//
// `providerId` is pinned from MEASURED cost, not reputation or list order —
// see state/costs.json, written by `ops.mjs probe`. Provider choice turned out
// to be the single biggest lever on whether this batch makes money: the same
// Bella 3001 tee ranged $6.08–$21.69 across seven US providers, an $8.48 spread
// per unit. Picking "first US in the list" put 20 tee listings on a fine-art
// printer at $1.60 net, under the floor.
const BLUEPRINT_SEARCH = {
  tee_bella_3001: {
    id: 12, expect: /bella.*canvas.*unisex jersey short sleeve/i,
    providerId: 99, providerNote: 'Printify Choice — measured $6.08-13.21, nets $8.01 at $23.95 (Marco Fine Arts netted $1.60)',
    // MUST be pinned: this blueprint returns "neck" (750x750 inside label)
    // as placeholders[0]. front is 2767x3362.
    placeholder: 'front', printArea: '2767x3362',
    match: /bella.*canvas.*3001|unisex jersey short sleeve/i, label: 'Bella+Canvas 3001 tee',
  },
  sweatshirt_gildan_18000: {
    id: 49, expect: /gildan.*unisex heavy blend.*crewneck/i,
    providerId: 217, providerNote: 'Fulfill Engine — measured $19.97 flat, nets $12.11 at $35.95',
    // offers 9 positions incl. neck and both wrists — front is 2976x3398
    placeholder: 'front', printArea: '2976x3398',
    match: /gildan.*18000|unisex heavy blend.*crewneck/i, label: 'Gildan 18000 crewneck',
  },
  candle_9oz: {
    // 9oz soy in a glass jar — what the listing copy actually describes
    id: 755, expect: /candle builders.*scented soy candles.*9oz/i,
    providerId: 91, providerNote: 'Candle Builders — measured $11.27-11.67, nets $14.08 at $28.95',
    // label wrap, and it is SMALL — 900x600 is the whole print area
    placeholder: 'front', printArea: '900x600',
    match: /scented soy candles with white lid, 9oz/i, label: '9oz scented soy candle',
  },
  mug_11oz: {
    id: 68, expect: /mug 11oz/i,
    providerId: 1, providerNote: 'SPOKE Custom Products — measured $6.44 flat, nets $9.35 at $17.95',
    placeholder: 'front', printArea: '2700x1120',
    match: /^mug 11oz$|mug.*11oz/i, label: '11oz ceramic mug',
  },
  tote: {
    // Was blueprint 507 at Colorway: $18.41-19.69 against a $19.95 price, a
    // $2.09 LOSS per unit. This one is half the cost for the same product.
    id: 1313, expect: /liberty bags.*cotton canvas tote/i,
    providerId: 99, providerNote: 'Printify Choice — measured $9.48 flat, nets $8.12 at $19.95',
    placeholder: 'front', printArea: '3000x3600',
    match: /liberty bags.*cotton canvas tote/i, label: 'cotton canvas tote bag',
  },
};

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const saveState = (name, obj) => {
  mkdirSync(PATHS.state, { recursive: true });
  writeFileSync(join(PATHS.state, name), JSON.stringify(obj, null, 2));
};
const usd = (cents) => cents / 100;
const money = (n) => `$${n.toFixed(2)}`;

function connect() {
  const { token, shopId } = credentials(['token', 'shop']);
  return { client: makeClient(token), shop: shopId };
}

// ---------------------------------------------------------------- catalog
let blueprintCache = null;
let providerLocations = null;

// The print provider decides ship-from country, and therefore the transit half
// of the delivery date Etsy shows a US buyer. This used to be `providers[0]` —
// the most important fulfillment decision in the pipeline, made by array order.
async function chooseProvider(client, providers, pinnedId = null) {
  // A measured pin beats any heuristic. Fall through to ranking only if the
  // pinned provider is not offered for this blueprint on this account.
  if (pinnedId) {
    const hit = providers.find(p => p.id === pinnedId);
    if (hit) {
      const country = await providerCountry(client, hit);
      return {
        chosen: { id: hit.id, title: hit.title, country },
        ranked: [{ id: hit.id, title: hit.title, country }],
        reason: 'pinned from measured base cost (state/costs.json)',
      };
    }
    console.log(`  ! pinned provider ${pinnedId} not offered here — ranking instead`);
  }
  return rankProviders(client, providers);
}

async function providerCountry(client, p) {
  if (!providerLocations) {
    try {
      const all = await client.allProviders();
      providerLocations = new Map((all || []).map(x => [x.id, x.location?.country || null]));
    } catch { providerLocations = new Map(); }
  }
  return providerLocations.get(p.id) ?? p.location?.country ?? null;
}

async function rankProviders(client, providers) {
  if (!providerLocations) {
    try {
      const all = await client.allProviders();
      providerLocations = new Map((all || []).map(p => [p.id, p.location?.country || null]));
    } catch {
      providerLocations = new Map(); // location unavailable; ranking degrades, loudly
    }
  }
  const ranked = providers
    .map(p => ({ id: p.id, title: p.title, country: providerLocations.get(p.id) ?? p.location?.country ?? null }))
    .sort((a, b) => (a.country === 'US' ? 0 : 1) - (b.country === 'US' ? 0 : 1));
  const chosen = ranked[0];
  const reason = chosen.country === 'US'
    ? 'ships from the US — shortest transit for US buyers'
    : `no US provider available for this blueprint (chosen ships from ${chosen.country || 'an unreported location'}) — expect longer delivery estimates`;
  return { chosen, ranked, reason };
}

// Resolve one blueprint: pinned id first, ambiguity-checked search as fallback.
// Exported so `catalog` proves exactly what `stage` would build.
export async function resolveBlueprint(client, productType) {
  const spec = BLUEPRINT_SEARCH[productType];
  if (!spec) throw new Error(`no blueprint rule for ${productType}`);
  if (!blueprintCache) blueprintCache = await client.blueprints();
  const title = (b) => `${b.brand} ${b.title}`;

  if (spec.id) {
    const pinned = blueprintCache.find(b => b.id === spec.id);
    if (pinned) {
      // The id resolved — but is it still the product we think it is?
      if (spec.expect && !spec.expect.test(title(pinned))) {
        throw new Error(`blueprint ${spec.id} is "${title(pinned)}", which no longer looks like ${spec.label}. Printify may have repointed it — re-check with: node ops.mjs blueprints ${spec.label.split(' ')[0]}`);
      }
      return pinned;
    }
    console.log(`  ! blueprint ${spec.id} (${spec.label}) not visible on this account — falling back to search`);
  }

  // Fallback search. If it is ambiguous, STOP: picking the first of several is
  // exactly how twelve listings ended up pointed at an 11oz jar.
  const hits = blueprintCache.filter(b => spec.match.test(title(b)));
  if (hits.length > 1) {
    const list = hits.slice(0, 8).map(b => `\n    id=${b.id}  ${title(b)}`).join('');
    throw new Error(`"${spec.label}" matches ${hits.length} blueprints — refusing to guess. Pin one by id in BLUEPRINT_SEARCH:${list}`);
  }
  const bp = hits[0];
  if (!bp) throw new Error(`no blueprint matched "${spec.label}" — inspect with: node ops.mjs blueprints ${spec.label.split(' ')[0]}`);
  return bp;
}

async function resolveProduct(client, productType) {
  const spec = BLUEPRINT_SEARCH[productType];
  const bp = await resolveBlueprint(client, productType);
  const providers = await client.providers(bp.id);
  if (!providers.length) throw new Error(`blueprint ${bp.id} has no print providers`);
  const { chosen, ranked, reason } = await chooseProvider(client, providers, spec.providerId);
  const { variants } = await client.variants(bp.id, chosen.id);
  if (!variants?.length) throw new Error(`blueprint ${bp.id} / provider ${chosen.id} returned no variants`);
  return { blueprint: bp, provider: chosen, providerRanking: ranked, providerReason: reason, variants };
}

// Real US first-item shipping, straight from the catalog. Only consulted when
// the operator has turned free_shipping on — otherwise the buyer pays it and it
// never touches margin. Throws rather than guessing: an unknown shipping cost
// under free shipping is exactly how a listing quietly sells at a loss.
async function usShippingUsd(client, blueprintId, providerId) {
  const res = await client.shipping(blueprintId, providerId);
  const profiles = res?.profiles ?? [];
  const pick = profiles.find(p => (p.countries || []).includes('US'))
    || profiles.find(p => (p.countries || []).includes('REST_OF_THE_WORLD'))
    || profiles[0];
  const cents = pick?.first_item?.cost;
  if (typeof cents !== 'number') {
    throw new Error(`free_shipping is on but Printify returned no first_item cost for blueprint ${blueprintId} — turn free_shipping off in ops/config.json or inspect the shipping response manually`);
  }
  return usd(cents);
}

// ---------------------------------------------------------------- payload
// Colors we want on a dark-ink graphic, best first. Matched loosely against
// whatever the provider actually stocks — never assumed present.
const COLOR_PREFERENCE = [
  'black', 'navy', 'heather', 'dark grey', 'charcoal',
  'natural', 'sand', 'white', 'forest', 'maroon',
];
const MAX_COLORS = 6;
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

// Where the design sits inside the blueprint's print area. x/y are the centre
// point and scale is a fraction of the print area's width, so the previous
// single constant — {x:0.5, y:0.5, scale:1} — put a full-width design in the
// vertical middle of a 12x16in tee panel: a collarbone-to-navel print on all
// 22 apparel drafts.
//
// These are STARTING VALUES, not verified truth. Nobody has seen a mockup from
// this account yet, so `review --mockups` before approving is what actually
// confirms them, and this is the one number to adjust if the mockups look off.
const PLACEMENT = {
  tee_bella_3001: { x: 0.5, y: 0.42, scale: 0.85 },
  sweatshirt_gildan_18000: { x: 0.5, y: 0.42, scale: 0.85 },
  tote: { x: 0.5, y: 0.45, scale: 0.9 },
  mug_11oz: { x: 0.5, y: 0.5, scale: 1 },      // wrap: full bleed is correct
  candle_9oz: { x: 0.5, y: 0.5, scale: 1 },    // label: fills its own area
};

function chooseVariants(listing, resolved) {
  const isApparel = listing.product.startsWith('tee') || listing.product.startsWith('sweatshirt');
  let variants = resolved.variants;

  if (isApparel) {
    // The descriptions say "in a range of colors". This used to ship whatever
    // single color happened to sit at variants[0], which made that line false.
    const available = [...new Set(resolved.variants.map(v => v.options?.color).filter(Boolean))];
    const picked = [];
    for (const want of COLOR_PREFERENCE) {
      if (picked.length >= MAX_COLORS) break;
      const hit = available.find(c => c.toLowerCase().includes(want) && !picked.includes(c));
      if (hit) picked.push(hit);
    }
    // nothing matched the preference list — take what the provider has rather
    // than shipping a single arbitrary color
    const colors = picked.length ? picked : available.slice(0, MAX_COLORS);
    variants = resolved.variants.filter(v =>
      SIZES.includes(v.options?.size) && colors.includes(v.options?.color));
    if (!variants.length) {
      variants = resolved.variants.filter(v => SIZES.includes(v.options?.size));
    }
    if (!variants.length) variants = resolved.variants.slice(0, 6);
  }

  if (variants.length > 60) {
    console.log(`  ! ${listing.code}: ${variants.length} variants at one price — capping to 60`);
    variants = variants.slice(0, 60);
  }
  if (!variants.length) throw new Error('no variants resolved for this blueprint/provider');
  return variants;
}

// Larger sizes cost more to produce. The first real staging run priced every
// variant flat, and the cost readback showed what that does: the 3XL Bella
// 3001 costs $16.12 against $13.21 for the S-XL range, dragging the tee's
// worst-case net from ~$8 to $5.10 — ten cents above the floor. An upsize
// surcharge is standard practice on Etsy apparel and repairs the tail without
// touching the base price buyers compare on.
const SIZE_SURCHARGE_USD = { '2XL': 2.00, '3XL': 4.00, '4XL': 5.00, '5XL': 6.00 };
const surchargeCents = (size) => Math.round((SIZE_SURCHARGE_USD[size] || 0) * 100);

function buildProductPayload(listing, resolved, uploadId, priceCents) {
  const variants = chooseVariants(listing, resolved);
  // The placeholder position must come from the blueprint, not a guess: a mug
  // wrap or candle label is not 'front'. Fail loudly if we cannot read one.
  // Pin the print position. NEVER placeholders[0]: on the Bella 3001 at
  // Printify Choice the first placeholder is "neck" — a 750x750 inside label —
  // so taking index 0 would have printed all 20 tee designs on the neck tag
  // instead of the 2767x3362 chest. The sweatshirt only escaped because
  // "front" happened to sort first, which is luck, not correctness.
  const spec = BLUEPRINT_SEARCH[listing.product];
  const wanted = spec?.placeholder || 'front';
  const offered = [...new Set(
    (resolved.variants || []).flatMap(v => (v.placeholders || []).map(p => p.position)))];
  if (!offered.length) {
    throw new Error(`${listing.product}: blueprint exposes no print placeholder at all — inspect with node ops.mjs providers`);
  }
  if (!offered.includes(wanted)) {
    throw new Error(`${listing.product}: print position "${wanted}" is not offered by this blueprint/provider. Available: ${offered.join(', ')}. Fix the \`placeholder\` in BLUEPRINT_SEARCH rather than guessing.`);
  }
  const placeholderPos = wanted;
  const place = PLACEMENT[listing.product];
  if (!place) {
    throw new Error(`no print placement defined for ${listing.product} — add one to PLACEMENT in stage.mjs rather than letting it default to a full-width centred print`);
  }

  return {
    title: listing.title,
    description: listing.description.replace(/\n/g, '<br>'),
    tags: listing.tags,
    blueprint_id: resolved.blueprint.id,
    print_provider_id: resolved.provider.id,
    variants: variants.map(v => ({
      id: v.id,
      price: priceCents + surchargeCents(v.options?.size),
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: variants.map(v => v.id),
      placeholders: [{
        position: placeholderPos,
        images: [{ id: uploadId, x: place.x, y: place.y, scale: place.scale, angle: 0 }],
      }],
    }],
  };
}

// ---------------------------------------------------------------- margins
// Worst-case base cost across the variants we actually enabled. Pricing is flat
// across variants, so the most expensive variant is the one that decides whether
// this listing makes money. Returns null when Printify exposed no cost at all —
// that is reported as unverified, never filled in with a guess.
function baseCostFromProduct(product) {
  const enabled = (product?.variants || []).filter(v => v.is_enabled !== false);
  const costs = enabled.map(v => v.cost).filter(c => typeof c === 'number' && c > 0);
  if (!costs.length) return null;
  return { maxUsd: usd(Math.max(...costs)), minUsd: usd(Math.min(...costs)), variants: costs.length };
}

// Some accounts expose cost on the catalog variant itself. When they do we can
// show margins before writing anything; when they don't, plan says so plainly.
function baseCostFromCatalog(variants) {
  const costs = variants.map(v => v.cost).filter(c => typeof c === 'number' && c > 0);
  if (!costs.length) return null;
  return { maxUsd: usd(Math.max(...costs)), minUsd: usd(Math.min(...costs)), variants: costs.length };
}

// The whole guard in one place: given a listing and the product Printify just
// created, does this draft get to live? Three outcomes, no fourth:
//   accept + verified    real margin, clears the floor
//   reject               real margin, under the floor -> caller deletes it
//   accept + unverified  Printify told us no cost; the draft stays but publish
//                        refuses it, because an unknown margin is not a safe one
function marginDecision(listing, product, shippingUsd, cfg) {
  const cost = baseCostFromProduct(product);
  if (!cost) {
    return { accept: true, verified: false, cost: null, margin: null,
      reason: 'Printify returned no variant cost — margin UNVERIFIED, publish will refuse this one' };
  }
  // Pricing is laddered by size, so "the worst variant" is no longer simply
  // the most expensive one — a $16.12-cost 3XL priced at +$4 can be healthier
  // than a $13.21 M at base price. Evaluate every enabled variant at ITS OWN
  // price and let the thinnest one decide. Variants created by this run carry
  // the price we set (cents); anything without one falls back to the flat
  // listing price, which keeps the pre-ladder tests and older drafts honest.
  const enabled = (product?.variants || []).filter(v => v.is_enabled !== false)
    .filter(v => typeof v.cost === 'number' && v.cost > 0);
  let worst = null;
  for (const v of enabled) {
    const priceUsd = typeof v.price === 'number' && v.price > 0 ? usd(v.price) : listing.price_usd;
    const m = netMargin({ priceUsd, baseCostUsd: usd(v.cost), shippingUsd, fees: cfg.fees });
    if (!worst || m.net < worst.margin.net) worst = { margin: m, costUsd: usd(v.cost), priceUsd };
  }
  const margin = worst.margin;
  if (margin.net < cfg.min_margin_usd) {
    const need = minPriceFor({
      baseCostUsd: worst.costUsd, shippingUsd, target: cfg.min_margin_usd, fees: cfg.fees,
    });
    return { accept: false, verified: true, cost, margin, minPrice: need,
      reason: `net ${money(margin.net)} under the ${money(cfg.min_margin_usd)} floor at ${money(worst.priceUsd)} (cost ${money(worst.costUsd)}, fees ${money(margin.platform_fees)}) — that variant needs ${money(need)} or higher` };
  }
  return { accept: true, verified: true, cost, margin, reason: null };
}

// ---------------------------------------------------------------- plan
async function plan(listings, cfg) {
  const { client } = connect();
  const types = [...new Set(listings.map(l => l.product))];
  console.log(`resolving ${types.length} product types against the live catalog…\n`);

  const resolvedByType = {};
  const planOut = {};
  for (const t of types) {
    try {
      const r = await resolveProduct(client, t);
      resolvedByType[t] = r;
      const cost = baseCostFromCatalog(r.variants);
      planOut[t] = {
        blueprint_id: r.blueprint.id, blueprint: `${r.blueprint.brand} ${r.blueprint.title}`,
        provider_id: r.provider.id, provider: r.provider.title,
        provider_country: r.provider.country, provider_reason: r.providerReason,
        provider_ranking: r.providerRanking,
        variant_count: r.variants.length,
        base_cost_usd: cost ? { min: cost.minUsd, max: cost.maxUsd, source: 'printify catalog variants' } : null,
      };
      console.log(`OK  ${t}`);
      console.log(`    blueprint ${r.blueprint.id}: ${r.blueprint.brand} — ${r.blueprint.title}`);
      console.log(`    provider  ${r.provider.id}: ${r.provider.title} [${r.provider.country || '?'}] — ${r.providerReason}`);
      console.log(`    variants  ${r.variants.length} offered; this run enables ${chooseVariants(listings.find(l => l.product === t), r).length}`);
      if (cost) console.log(`    base cost ${money(cost.minUsd)}–${money(cost.maxUsd)} per unit`);
      else console.log(`    base cost not exposed by the catalog endpoint — verified at stage time instead`);
    } catch (e) {
      planOut[t] = { error: e.message };
      console.log(`FAIL ${t} — ${e.message}`);
    }
  }

  // shipping, only if the operator opted into absorbing it
  const shippingByType = {};
  if (cfg.fees.free_shipping) {
    console.log('\nfree_shipping is on — pulling real US shipping rates…');
    for (const [t, r] of Object.entries(resolvedByType)) {
      try {
        shippingByType[t] = await usShippingUsd(client, r.blueprint.id, r.provider.id);
        console.log(`  ${t}: ${money(shippingByType[t])} first item`);
      } catch (e) {
        console.log(`  ${t}: FAIL — ${e.message}`);
      }
    }
  }

  // per-listing margin preview, but only where a real cost exists
  const rows = [];
  let unverified = 0, thin = 0;
  for (const l of listings) {
    const cost = planOut[l.product]?.base_cost_usd;
    if (!cost) { unverified++; continue; }
    const m = netMargin({
      priceUsd: l.price_usd,
      baseCostUsd: cost.max,
      shippingUsd: shippingByType[l.product] ?? 0,
      fees: cfg.fees,
    });
    if (m.net < cfg.min_margin_usd) thin++;
    rows.push({ code: l.code, product: l.product, ...m });
  }

  if (rows.length) {
    console.log('\n  code  product                   price    cost    fees     net');
    for (const r of rows) {
      const flag = r.net < cfg.min_margin_usd ? '  <-- under floor' : '';
      console.log(`  ${r.code.padEnd(5)} ${r.product.padEnd(24)} ${money(r.price).padStart(7)} ${money(r.base_cost).padStart(7)} ${money(r.platform_fees).padStart(7)} ${money(r.net).padStart(7)}${flag}`);
    }
  }

  const artMissing = [...new Set(listings.map(l => l.art_file))]
    .filter(f => !existsSync(join(PATHS.print, f)));

  saveState('plan.json', {
    fetchedAt: new Date().toISOString(),
    source: 'printify catalog resolution',
    produced_by: 'stage.mjs plan',
    margin_inputs: {
      base_cost: 'REAL — printify catalog/product response',
      fees: cfg.fees.fees_confirmed
        ? 'operator-confirmed Etsy fee schedule from ops/config.json'
        : 'UNCONFIRMED Etsy fee schedule from ops/config.json — operator has not verified it yet',
      shipping: cfg.fees.free_shipping ? 'REAL — printify shipping endpoint' : 'buyer-paid, excluded',
    },
    min_margin_usd: cfg.min_margin_usd,
    plan: planOut,
    shipping_usd: shippingByType,
    margins: rows,
    art_missing: artMissing,
  });

  console.log(`\nwrote state/plan.json`);
  if (!cfg.fees.fees_confirmed) {
    console.log(`! fee schedule UNCONFIRMED — margins above are indicative only. Check ops/config.json fees against your Etsy account, then set fees_confirmed: true`);
  }
  if (unverified) console.log(`! ${unverified} listings have no pre-create cost — their margin is checked at stage time and a losing draft is deleted on the spot`);
  if (thin) console.log(`! ${thin} listings price under the ${money(cfg.min_margin_usd)} floor — raise price_usd or drop them before staging`);
  if (artMissing.length) console.log(`! ${artMissing.length} print masters missing: ${artMissing.slice(0, 5).join(', ')}${artMissing.length > 5 ? '…' : ''}  (run node ops.mjs art)`);
  const failures = Object.values(planOut).filter(p => p.error).length;
  if (!failures && !artMissing.length) console.log(`ready — next: node ops.mjs stage`);
  return failures ? 1 : 0;
}

// ---------------------------------------------------------------- run
async function stageRun(listings, cfg) {
  if (listings.length > cfg.max_products_per_run) {
    throw new Error(`${listings.length} listings exceeds max_products_per_run (${cfg.max_products_per_run}) — raise it in ops/config.json or narrow with --only`);
  }
  const { client, shop } = connect();
  const staged = existsSync(stagedPath) ? load(stagedPath) : { fetchedAt: null, items: {} };

  // Per-run limits do not bound a loop. Count what is really in the shop first,
  // so a repeated invocation dies before its first write rather than after its
  // two-hundredth product.
  if (!dryRun) {
    const ceiling = cfg.max_products_total ?? Infinity;
    let live = 0;
    for (let page = 1; page <= 200; page++) {
      const res = await client.listProducts(shop, page);
      const rows = res?.data ?? [];
      if (!rows.length) break;
      live += rows.length;
      const last = res?.last_page;
      if (typeof last === 'number' && page >= last) break;
    }
    const toCreate = listings.filter(l => !staged.items[l.code] || force).length;
    if (live + toCreate > ceiling) {
      throw new Error(`shop already holds ${live} products; creating ${toCreate} more would pass max_products_total (${ceiling}). Raise it in ops/config.json only if that is genuinely what you want.`);
    }
    console.log(`shop holds ${live} products · this run creates at most ${toCreate} · ceiling ${ceiling}\n`);
  }

  const resolvedCache = {};
  const uploadCache = {};
  const shippingCache = {};
  const dryPayloads = [];
  let created = 0, skipped = 0, failed = 0, rejected = 0, unverified = 0, tmPending = 0;

  for (const l of listings) {
    const existing = staged.items[l.code];
    if (existing && !force) { skipped++; continue; }
    let productId = null;
    try {
      // never let an unsubstituted {PLACEHOLDER} reach a marketplace, and never
      // let a stale listings file publish a delivery promise config.json does
      // not make
      assertNoPlaceholders(l);
      assertShippingClaimMatchesConfig(l, cfg);

      // Fail closed: an unscreened phrase is a blocked phrase. But a dry run
      // creates nothing, so the trademark risk does not apply to it — and
      // blocking it here would gate the payload validation behind 34 manual
      // searches, which is the opposite of what a dry run is for. Report and
      // continue instead.
      const tm = tmBlocker(l);
      if (tm) {
        if (!dryRun) throw new Error(tm);
        tmPending++;
      }

      // --force replaces an existing draft. Refusing a LIVE one is checked
      // here, up front, so a dry run reports it too — but the actual delete
      // happens further down, immediately before the replacement is created.
      if (existing && existing.published) {
        throw new Error(`${l.code} is already LIVE on Etsy — re-staging would leave a duplicate listing. Take it down first: node ops.mjs unstage ${l.code} --force`);
      }

      // A dry run is most useful BEFORE the art exists — that is when you want
      // to know the payload shape is right. Missing art is fatal only for real.
      const artPath = join(PATHS.print, l.art_file);
      if (!existsSync(artPath)) {
        if (!dryRun) throw new Error(`print master missing: ${l.art_file} (run node ops.mjs art)`);
        console.log(`  · ${l.code}: print master ${l.art_file} not built yet`);
      }

      if (!resolvedCache[l.product]) resolvedCache[l.product] = await resolveProduct(client, l.product);
      const resolved = resolvedCache[l.product];

      if (cfg.fees.free_shipping && shippingCache[l.product] === undefined) {
        shippingCache[l.product] = await usShippingUsd(client, resolved.blueprint.id, resolved.provider.id);
      }

      if (!dryRun && !uploadCache[l.art_file]) {
        const b64 = readFileSync(artPath).toString('base64');
        const up = await client.uploadImageB64(l.art_file, b64);
        uploadCache[l.art_file] = up.id;
        console.log(`  uploaded ${l.art_file} -> ${up.id}`);
      }

      const payload = buildProductPayload(l, resolved, uploadCache[l.art_file] ?? '<upload-id>',
        Math.round(l.price_usd * 100));

      if (dryRun) {
        dryPayloads.push({ code: l.code, payload });
        const ph = payload.print_areas[0].placeholders[0];
        const im = ph.images[0];
        console.log(`DRY   ${l.code}  ${payload.variants.length} variants @ ${money(l.price_usd)}  bp ${payload.blueprint_id}/pp ${payload.print_provider_id}  "${ph.position}" x${im.x} y${im.y} scale${im.scale}`);
        if (existing) console.log(`      would retire previous draft ${existing.product_id}`);
        created++;
        continue;
      }

      // Retire the superseded draft as late as possible — everything above can
      // still throw (missing master, rate limit, blueprint failure), and doing
      // this any earlier means a failure leaves a good draft deleted and no
      // replacement created.
      if (existing) {
        await client.deleteProduct(shop, existing.product_id);
        console.log(`  retired previous draft ${existing.product_id} for ${l.code}`);
      }

      const product = await client.createProduct(shop, payload);
      productId = product.id;

      // ---- margin guard, on real numbers, before this draft is allowed to stay
      const decision = marginDecision(l, product, shippingCache[l.product] ?? 0, cfg);
      if (!decision.accept) {
        await client.deleteProduct(shop, productId);
        rejected++;
        console.log(`REJECT ${l.code} — ${decision.reason}; draft deleted`);
        continue;
      }
      if (!decision.verified) {
        unverified++;
        console.log(`  ! ${l.code}: ${decision.reason}`);
      }

      staged.items[l.code] = {
        product_id: product.id, title: l.title, product: l.product,
        art: l.art_file, price_usd: l.price_usd, staged_at: new Date().toISOString(),
        base_cost_usd: decision.cost ? decision.cost.maxUsd : null,
        margin: decision.margin,
        margin_verified: decision.verified,
        fees_confirmed: !!cfg.fees.fees_confirmed,
        approved: false,
        published: false,
        // every product id this code has ever held, so nothing we created on
        // Printify is ever unreachable from our own records
        superseded: [
          ...(existing?.superseded || []),
          ...(existing ? [{ product_id: existing.product_id, staged_at: existing.staged_at, retired_at: new Date().toISOString() }] : []),
        ],
      };
      created++;
      const marginNote = decision.margin ? ` net ${money(decision.margin.net)}` : ' net UNVERIFIED';
      console.log(`DRAFT ${l.code} -> ${product.id} ${marginNote}  ${l.title.slice(0, 44)}`);
      // persist immediately: a crash or rate-limit mid-run must never leave a
      // draft live on Printify with no local record, or a re-run duplicates it
      staged.fetchedAt = new Date().toISOString();
      staged.source = 'stage.mjs run against Printify API';
      saveState('staged.json', staged);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${l.code} — ${e.message}`);
      // A product created but not recorded is the one state we cannot tolerate.
      // Compare ids, not presence: on a --force run the OLD record still sits
      // under this code, so a presence check would skip the rollback and leave
      // the new product orphaned.
      if (productId && staged.items[l.code]?.product_id !== productId) {
        try {
          await client.deleteProduct(shop, productId);
          console.log(`      rolled back orphan draft ${productId}`);
        } catch (d) {
          console.log(`      ! orphan draft ${productId} left on Printify — delete it manually (${d.message})`);
        }
      }
      if (/429|rate limit/i.test(e.message)) {
        console.log('rate limited — stopping cleanly. Re-run to continue where this left off.');
        break;
      }
    }
  }

  if (dryRun) {
    saveState('dry-run.json', {
      fetchedAt: new Date().toISOString(),
      source: 'stage.mjs run --dry-run — payloads built from the live catalog, nothing sent',
      produced_by: 'stage.mjs --dry-run',
      note: 'image ids are placeholders; every other field is exactly what would be POSTed',
      payloads: dryPayloads,
    });
    console.log(`\n${created} payloads built, ${failed} failed, nothing sent to Printify`);
    if (tmPending) {
      console.log(`${tmPending} listings are not trademark-screened yet — fine for a dry run, but the real stage will refuse them. Run: node ops.mjs tm`);
    }
    console.log('read state/dry-run.json before the real run — especially print_areas.placeholders[].position');
    return failed ? 1 : 0;
  }

  staged.fetchedAt = new Date().toISOString();
  staged.source = 'stage.mjs run against Printify API';
  saveState('staged.json', staged);
  console.log(`\n${created} drafts created · ${skipped} already staged · ${rejected} rejected on margin · ${failed} failed`);
  if (unverified) console.log(`${unverified} drafts have UNVERIFIED margin — publish will skip them unless you pass --allow-unverified-margin`);
  console.log('nothing published to Etsy — that is a separate approved step: node ops.mjs review');
  return failed ? 1 : 0;
}

// ---------------------------------------------------------------- main
async function main() {
  const cfg = loadConfig();
  if (!existsSync(PATHS.listings)) {
    throw new Error('no BATCH-01.listings.json — run: node ops.mjs listings');
  }
  const all = load(PATHS.listings).listings;
  if (only) {
    const known = new Set(all.map(l => l.code));
    const unknown = [...only].filter(c => !known.has(c));
    if (unknown.length) throw new Error(`--only names codes that are not in the listing file: ${unknown.join(', ')}`);
  }
  const listings = all.filter(l => !only || only.has(l.code));
  if (!listings.length) throw new Error('no listings selected');

  if (mode === 'plan') return plan(listings, cfg);
  if (mode === 'run') return stageRun(listings, cfg);
  throw new Error('usage: stage.mjs plan | run [--only CODES] [--force]');
}

// exported so the margin logic can be tested without touching the live API
export { baseCostFromProduct, baseCostFromCatalog, chooseVariants, marginDecision };
// catalog.mjs reuses the same blueprint search and provider ranking, so what it
// proves is exactly what staging would later create — not a parallel guess.
export { BLUEPRINT_SEARCH, chooseProvider };

const invokedDirectly = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main()
    .then(code => process.exit(code || 0))
    .catch(e => { console.error(e.message); process.exit(1); });
}
