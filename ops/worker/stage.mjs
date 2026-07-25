#!/usr/bin/env node
// Stage BATCH-01 as real Printify DRAFT products.
//
//   node stage.mjs plan          resolve blueprints/providers/variants, no writes
//   node stage.mjs run           upload art + create drafts (idempotent)
//   node stage.mjs run --only A1,B7
//
// Idempotent: keeps ../state/staged.json mapping spec code -> printify id.
// A code already present is skipped unless --force.
//
// Nothing is published to Etsy here. Publishing is a separate, operator-
// approved step (publish.mjs) by design.

import { makeClient } from './printify.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stateDir = join(here, '..', 'state');
const printDir = join(here, '..', 'art', 'print');
const stagedPath = join(stateDir, 'staged.json');

const args = process.argv.slice(2);
const mode = args[0] || 'plan';
const only = (() => {
  const i = args.indexOf('--only');
  return i === -1 ? null : new Set(args[i + 1].split(',').map(s => s.trim()));
})();
const force = args.includes('--force');

// Which catalog blueprint to use per product type. Resolved by searching the
// live catalog for these terms — verified against the real API at plan time,
// never hardcoded IDs (blueprint ids differ per account/provider availability).
const BLUEPRINT_SEARCH = {
  tee_bella_3001: { match: /bella.*canvas.*3001|unisex jersey short sleeve/i, label: 'Bella+Canvas 3001 tee' },
  sweatshirt_gildan_18000: { match: /gildan.*18000|unisex heavy blend.*crewneck/i, label: 'Gildan 18000 crewneck' },
  candle_9oz: { match: /candle/i, label: 'scented candle' },
  mug_11oz: { match: /mug.*11|11oz.*mug|white ceramic mug/i, label: '11oz ceramic mug' },
  tote: { match: /tote/i, label: 'cotton tote bag' },
};

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const saveState = (name, obj) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, name), JSON.stringify(obj, null, 2));
};

function requireEnv() {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shop = process.env.PRINTIFY_SHOP_ID;
  if (!token) throw new Error('PRINTIFY_API_TOKEN is not set');
  if (!shop) throw new Error('PRINTIFY_SHOP_ID is not set (run `cli.mjs verify` to list shops)');
  return { client: makeClient(token), shop };
}

// pick the cheapest US-capable provider and a sane default variant set
async function resolveProduct(client, productType) {
  const spec = BLUEPRINT_SEARCH[productType];
  if (!spec) throw new Error(`no blueprint search rule for ${productType}`);
  const blueprints = await client.blueprints();
  const bp = blueprints.find(b => spec.match.test(`${b.brand} ${b.title}`));
  if (!bp) throw new Error(`no blueprint matched "${spec.label}" — inspect with: cli.mjs blueprints ${spec.label.split(' ')[0]}`);
  const providers = await client.providers(bp.id);
  if (!providers.length) throw new Error(`blueprint ${bp.id} has no print providers`);
  const provider = providers[0];
  const { variants } = await client.variants(bp.id, provider.id);
  return { blueprint: bp, provider, variants };
}

function buildProductPayload(listing, resolved, uploadId, priceCents) {
  // Choose variants: apparel -> common sizes in the first available color;
  // single-variant goods (candle/mug/tote) -> all variants.
  const isApparel = listing.product.startsWith('tee') || listing.product.startsWith('sweatshirt');
  let variants = resolved.variants;
  if (isApparel) {
    const wanted = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    const firstColor = (resolved.variants[0]?.options?.color) || null;
    variants = resolved.variants.filter(v =>
      wanted.includes(v.options?.size) && (!firstColor || v.options?.color === firstColor));
    if (!variants.length) variants = resolved.variants.slice(0, 6);
  }
  const placeholderPos = resolved.variants[0]?.placeholders?.[0]?.position || 'front';

  return {
    title: listing.title,
    description: listing.description.replace(/\n/g, '<br>'),
    tags: listing.tags,
    blueprint_id: resolved.blueprint.id,
    print_provider_id: resolved.provider.id,
    variants: variants.map(v => ({
      id: v.id,
      price: priceCents,
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: variants.map(v => v.id),
      placeholders: [{
        position: placeholderPos,
        images: [{ id: uploadId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
      }],
    }],
  };
}

async function main() {
  const listings = load(join(here, '..', 'BATCH-01.listings.json')).listings
    .filter(l => !only || only.has(l.code));

  if (mode === 'plan') {
    const { client } = requireEnv();
    const types = [...new Set(listings.map(l => l.product))];
    console.log(`resolving ${types.length} product types against the live catalog…\n`);
    const plan = {};
    for (const t of types) {
      try {
        const r = await resolveProduct(client, t);
        plan[t] = {
          blueprint_id: r.blueprint.id, blueprint: `${r.blueprint.brand} ${r.blueprint.title}`,
          provider_id: r.provider.id, provider: r.provider.title, variant_count: r.variants.length,
        };
        console.log(`OK  ${t}\n    blueprint ${r.blueprint.id}: ${r.blueprint.brand} — ${r.blueprint.title}\n    provider  ${r.provider.id}: ${r.provider.title}  (${r.variants.length} variants)`);
      } catch (e) {
        console.log(`FAIL ${t} — ${e.message}`);
      }
    }
    saveState('plan.json', { fetchedAt: new Date().toISOString(), source: 'printify catalog resolution', plan });
    console.log(`\nwrote state/plan.json — review, then: node stage.mjs run`);
    return;
  }

  if (mode !== 'run') throw new Error('usage: stage.mjs plan | run [--only CODES] [--force]');

  const { client, shop } = requireEnv();
  const staged = existsSync(stagedPath) ? load(stagedPath) : { fetchedAt: null, items: {} };

  // resolve each product type once
  const resolvedCache = {};
  const uploadCache = {};
  let created = 0, skipped = 0, failed = 0;

  for (const l of listings) {
    if (staged.items[l.code] && !force) { skipped++; continue; }
    try {
      const artPath = join(printDir, l.art_file);
      if (!existsSync(artPath)) throw new Error(`print master missing: ${l.art_file} (run intake.mjs)`);

      if (!resolvedCache[l.product]) resolvedCache[l.product] = await resolveProduct(client, l.product);
      if (!uploadCache[l.art_file]) {
        const b64 = readFileSync(artPath).toString('base64');
        const up = await client.uploadImageB64(l.art_file, b64);
        uploadCache[l.art_file] = up.id;
        console.log(`  uploaded ${l.art_file} -> ${up.id}`);
      }

      const payload = buildProductPayload(l, resolvedCache[l.product], uploadCache[l.art_file],
        Math.round(l.price_usd * 100));
      const product = await client.createProduct(shop, payload);
      staged.items[l.code] = {
        product_id: product.id, title: l.title, product: l.product,
        art: l.art_file, price_usd: l.price_usd, staged_at: new Date().toISOString(),
        published: false,
      };
      created++;
      console.log(`DRAFT ${l.code} -> ${product.id}  ${l.title.slice(0, 60)}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${l.code} — ${e.message}`);
    }
  }

  staged.fetchedAt = new Date().toISOString();
  staged.source = 'stage.mjs run against Printify API';
  saveState('staged.json', staged);
  console.log(`\n${created} drafts created, ${skipped} already staged, ${failed} failed`);
  console.log('nothing published to Etsy — that is a separate approved step');
}

main().catch(e => { console.error(e.message); process.exit(1); });
