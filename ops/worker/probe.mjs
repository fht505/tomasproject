#!/usr/bin/env node
// Measure REAL Printify base costs, by creating a draft and deleting it.
//
//   node ops.mjs probe
//
// Printify's catalog endpoints do not expose base cost. It appears only on a
// created product. So the only honest way to know whether $23.95 clears the $5
// floor is to create one, read the number, and delete it.
//
// That is what this does, and nothing more:
//
//   1. upload one small placeholder image (once)
//   2. for each candidate: create a DRAFT, read variants[].cost, DELETE it
//   3. print real costs and real margins, and rank the tee providers by price
//
// Safety, in order of how much it matters:
//   - runs against a shop with NO marketplace connection where one exists, so a
//     draft cannot reach Etsy even momentarily
//   - nothing is ever published; drafts only
//   - every created id is deleted in a finally block, and any that survive are
//     printed loudly at the end so they can be removed by hand
//   - creates nothing permanent and spends no money

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials, netMargin, minPriceFor } from './config.mjs';
import { PRODUCTS } from './products.mjs';
import { resolveBlueprint, chooseProvider, BLUEPRINT_SEARCH } from './stage.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const money = (n) => `$${n.toFixed(2)}`;
const usd = (c) => c / 100;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PACE_MS = 700;

// Tee providers worth comparing: garment specialists plus the incumbent, so the
// current pick is measured rather than merely replaced.
const TEE_CANDIDATES = [
  { id: 99, name: 'Printify Choice' },
  { id: 29, name: 'Monster Digital' },
  { id: 39, name: 'SwiftPOD' },
  { id: 27, name: 'Print Geek' },
  { id: 61, name: 'Dimona Tee' },
  { id: 50, name: 'Underground Threads' },
  { id: 3, name: 'Marco Fine Arts (current)' },
];

let cfg, token;
try {
  cfg = loadConfig();
  ({ token } = credentials(['token']));
} catch (e) { console.error(`\n  ${e.message}\n`); process.exit(1); }
const client = makeClient(token);

// ---------------------------------------------------------------- shop
const shops = await client.shops();
if (!shops.length) {
  console.error('no shops on this Printify account — connect any store first');
  process.exit(1);
}
// Prefer a shop with no live marketplace behind it.
const safe = shops.find(s => /custom|api/i.test(s.sales_channel || ''))
  || shops.find(s => !/etsy|amazon|shopify|ebay/i.test(s.sales_channel || ''))
  || shops[0];
const shop = String(safe.id);
console.log(`\n  probing on shop ${shop} (${safe.sales_channel})${/custom|api/i.test(safe.sales_channel || '') ? ' — no marketplace connection, drafts cannot reach a storefront' : ' — NOTE: this shop has a marketplace connection; drafts are still never published'}\n`);

// ---------------------------------------------------------------- image
const png = await sharp({
  create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).png().toBuffer();
const upload = await client.uploadImageB64('probe-placeholder.png', png.toString('base64'));
console.log(`  placeholder image uploaded (${upload.id})\n`);

// ---------------------------------------------------------------- probing
const created = new Set();
const results = [];

async function costOf(label, blueprintId, providerId, priceUsd) {
  let id = null;
  try {
    const { variants } = await client.variants(blueprintId, providerId);
    if (!variants?.length) return { label, error: 'no variants' };
    const pick = variants.slice(0, 10);
    const position = variants[0]?.placeholders?.[0]?.position;
    if (!position) return { label, error: 'no print placeholder exposed' };

    const product = await client.createProduct(shop, {
      title: `COST PROBE — delete me (${label})`,
      description: 'Temporary product created to read base costs. Deleted automatically.',
      blueprint_id: blueprintId,
      print_provider_id: providerId,
      variants: pick.map(v => ({ id: v.id, price: Math.round(priceUsd * 100), is_enabled: true })),
      print_areas: [{
        variant_ids: pick.map(v => v.id),
        placeholders: [{ position, images: [{ id: upload.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }],
      }],
    });
    id = product.id;
    created.add(id);

    const costs = (product.variants || [])
      .filter(v => v.is_enabled !== false)
      .map(v => v.cost).filter(c => typeof c === 'number' && c > 0);
    if (!costs.length) return { label, error: 'product returned no costs either' };
    return {
      label, blueprintId, providerId,
      min: usd(Math.min(...costs)), max: usd(Math.max(...costs)), variants: costs.length,
    };
  } catch (e) {
    return { label, error: e.message.slice(0, 140) };
  } finally {
    if (id) {
      try { await client.deleteProduct(shop, id); created.delete(id); }
      catch (e) { console.log(`  ! could not delete probe ${id}: ${e.message.slice(0, 80)}`); }
    }
    await sleep(PACE_MS);
  }
}

// --- ad-hoc mode: probe specific blueprints across their US providers -------
// `node ops.mjs probe 720 1313 553` — for comparing alternatives to a product
// that priced badly, which is the usual reason to reach for this.
const adhoc = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
if (adhoc.length) {
  const atPrice = Number(process.argv.find(a => /^--price=/.test(a))?.split('=')[1]) || 19.95;
  console.log(`  AD-HOC BLUEPRINT PROBE — margins shown at ${money(atPrice)}\n`);
  const all = await client.blueprints();
  const rows = [];
  for (const bpId of adhoc) {
    const bp = all.find(b => b.id === bpId);
    if (!bp) { console.log(`  ${bpId}: not in the catalog`); continue; }
    console.log(`  ${bpId}  ${bp.brand} — ${bp.title}`);
    const providers = await client.providers(bpId);
    const { ranked } = await chooseProvider(client, providers);
    for (const p of ranked.filter(p => p.country === 'US').slice(0, 3)) {
      const r = await costOf(`bp${bpId}/${p.title}`, bpId, p.id, atPrice);
      if (r.error) { console.log(`       ${p.title.padEnd(24)} unavailable — ${r.error}`); continue; }
      const m = netMargin({ priceUsd: atPrice, baseCostUsd: r.max, fees: cfg.fees });
      const need = minPriceFor({ baseCostUsd: r.max, target: cfg.min_margin_usd, fees: cfg.fees });
      console.log(`       ${p.title.padEnd(24)} ${money(r.min)}–${money(r.max)}  nets ${money(m.net)}  (needs ${money(need)} for the floor)`);
      rows.push({ blueprint: bpId, title: `${bp.brand} — ${bp.title}`, provider: p.title, providerId: p.id, min: r.min, max: r.max, net: m.net, min_viable_price: need });
    }
    console.log('');
  }
  mkdirSync(PATHS.state, { recursive: true });
  writeFileSync(join(PATHS.state, 'costs-adhoc.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: 'Printify — real base costs from created drafts, then deleted',
    produced_by: 'probe.mjs (ad-hoc)', priced_at: atPrice, rows,
  }, null, 2));
  console.log(`  wrote state/costs-adhoc.json`);
  if (created.size) {
    console.log(`\n  ! ${created.size} probe product(s) not deleted — remove by hand:`);
    for (const id of created) console.log(`      ${id}`);
    process.exitCode = 1;
  } else console.log('  all probe products deleted — nothing left behind\n');
  process.exit(process.exitCode || 0);
}

// --- one probe per product type, using the provider we would actually pick ---
console.log('  BASE COSTS AT THE CURRENTLY SELECTED PROVIDER\n');
for (const [key, product] of Object.entries(PRODUCTS)) {
  const bp = await resolveBlueprint(client, product.type);
  const providers = await client.providers(bp.id);
  // honour the same pin staging uses, or this measures a provider we would
  // never actually ship from
  const { chosen } = await chooseProvider(client, providers, BLUEPRINT_SEARCH[product.type]?.providerId);
  const r = await costOf(key, bp.id, chosen.id, product.price);
  r.product = key; r.provider = chosen.title; r.planned_price = product.price;

  if (r.error) {
    console.log(`  ${key.padEnd(11)} FAILED — ${r.error}`);
  } else {
    const m = netMargin({ priceUsd: product.price, baseCostUsd: r.max, fees: cfg.fees });
    r.margin = m;
    const under = m.net < cfg.min_margin_usd;
    if (under) r.min_viable_price = minPriceFor({ baseCostUsd: r.max, target: cfg.min_margin_usd, fees: cfg.fees });
    console.log(`  ${key.padEnd(11)} cost ${money(r.min)}–${money(r.max)} · at ${money(product.price)} nets ${money(m.net)}${under ? `  <-- UNDER $${cfg.min_margin_usd} FLOOR, needs ${money(r.min_viable_price)}` : ''}`);
    console.log(`  ${''.padEnd(11)} ${chosen.title}`);
  }
  results.push(r);
}

// --- tee provider bake-off ---
console.log('\n  TEE PROVIDER COMPARISON (Bella+Canvas 3001)\n');
const teeBp = await resolveBlueprint(client, PRODUCTS.tee.type);
const teeRows = [];
for (const cand of TEE_CANDIDATES) {
  const r = await costOf(`tee/${cand.name}`, teeBp.id, cand.id, PRODUCTS.tee.price);
  r.provider = cand.name; r.providerId = cand.id;
  if (r.error) {
    console.log(`  ${cand.name.padEnd(26)} unavailable — ${r.error}`);
  } else {
    const m = netMargin({ priceUsd: PRODUCTS.tee.price, baseCostUsd: r.max, fees: cfg.fees });
    r.margin = m;
    console.log(`  ${cand.name.padEnd(26)} ${money(r.min)}–${money(r.max)}  ->  nets ${money(m.net)} at ${money(PRODUCTS.tee.price)}`);
  }
  teeRows.push(r);
}

const ranked = teeRows.filter(r => !r.error).sort((a, b) => a.max - b.max);
if (ranked.length) {
  console.log(`\n  cheapest: ${ranked[0].provider} at ${money(ranked[0].max)} worst-case variant`);
  const spread = ranked[ranked.length - 1].max - ranked[0].max;
  console.log(`  spread across providers: ${money(spread)} per unit — on 20 tee listings that is the difference between a viable batch and a thin one`);
}

// ---------------------------------------------------------------- output
mkdirSync(PATHS.state, { recursive: true });
writeFileSync(join(PATHS.state, 'costs.json'), JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'Printify — real base costs read from created draft products, then deleted',
  produced_by: 'probe.mjs',
  probe_shop: shop,
  margin_inputs: {
    base_cost: 'REAL — measured from created products',
    fees: cfg.fees.fees_confirmed ? 'operator-confirmed' : 'UNCONFIRMED — from ops/config.json',
    prices: 'planned prices from products.mjs',
  },
  min_margin_usd: cfg.min_margin_usd,
  products: results,
  tee_providers: teeRows,
}, null, 2));

console.log(`\n  wrote state/costs.json`);
if (created.size) {
  console.log(`\n  ! ${created.size} probe product(s) could NOT be deleted — remove by hand in Printify:`);
  for (const id of created) console.log(`      ${id}`);
  process.exitCode = 1;
} else {
  console.log(`  all probe products deleted — nothing left behind\n`);
}
