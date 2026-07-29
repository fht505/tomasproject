#!/usr/bin/env node
// Push locally-generated listing DESCRIPTIONS to the live Etsy listings.
//
//   node ops.mjs etsy-sync           what differs, changes nothing
//   node ops.mjs etsy-sync --write   apply
//
// Why this exists: the shop is named KindlyPut while every description said
// "Original design by FondlyMade" — a brand that does not exist on the
// storefront. Republishing through Printify would mint new Etsy listing ids and
// discard whatever search history the listings have; Etsy's API edits in place.
//
// TITLES ARE NEVER TOUCHED. Eight live titles have diverged from what this repo
// generates (A3 is live as "Cozy Era Retro Scented Candle | Autumn Soy-Blend
// Decor (9oz)" against our "Cozy Era Retro Fall Candle | Autumn Aesthetic Decor
// | 9oz"). Something edited them after publish — the operator, or an Etsy
// listing tool. Either way they are not ours to overwrite, and title matching
// is therefore not a sound join key.
//
// The join is Printify's own record instead: each product carries external.id,
// the Etsy listing id Printify created. That is authoritative and survives any
// amount of title editing on either side.

import { readFileSync } from 'node:fs';
import { call, etsy } from './etsy.mjs';
import { makeClient } from './printify.mjs';
import { PATHS, env } from './config.mjs';

const shopId = env('ETSY_SHOP_ID');
if (!shopId) { console.error('no ETSY_SHOP_ID — run: node ops.mjs etsy connect'); process.exit(1); }

const write = process.argv.includes('--write');
const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
const staged = JSON.parse(readFileSync(`${PATHS.state}/staged.json`, 'utf8'));
const printify = makeClient(env('PRINTIFY_API_TOKEN'));

// Etsy returns descriptions with HTML entities and real newlines; Printify was
// handed <br>. Compare on normalised text so encoding differences do not read
// as content changes — an early version reported nine spurious diffs that were
// all `&quot;` against `"`.
const decode = (s) => String(s || '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const norm = (s) => decode(s)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/\\n/g, '\n')
  .replace(/\r\n/g, '\n')
  .split('\n').map(x => x.trimEnd()).join('\n')
  .trim();

const byCode = new Map(listings.map(l => [l.code, l]));
const diffs = [];
const noListing = [];

for (const [code, item] of Object.entries(staged.items)) {
  const gen = byCode.get(code);
  if (!gen) continue;
  const p = await printify.getProduct(env('PRINTIFY_SHOP_ID'), item.product_id);
  const etsyId = p.external?.id;
  if (!etsyId) { noListing.push(code); continue; }
  let liveDesc;
  try { liveDesc = (await etsy.listing(etsyId)).description; }
  catch (e) { console.log(`  ! ${code}: could not read Etsy listing ${etsyId} — ${e.message.slice(0, 80)}`); continue; }
  const want = norm(gen.description);
  const have = norm(liveDesc);
  if (want !== have) diffs.push({ code, etsyId, want, have });
}

console.log(`\n  shop ${shopId} · ${Object.keys(staged.items).length} staged · ${diffs.length} description(s) differ`);
if (noListing.length) console.log(`  ${noListing.length} not synced to Etsy yet: ${noListing.join(', ')}`);

if (!diffs.length) { console.log('\n  every live description matches this repo\n'); process.exit(0); }

for (const d of diffs.slice(0, 4)) {
  const wl = d.want.split('\n'), hl = d.have.split('\n');
  const changed = hl.filter(x => x.trim() && !wl.includes(x));
  console.log(`\n  ${d.code}  listing ${d.etsyId}`);
  for (const line of changed.slice(0, 2)) console.log(`      live: ${line.slice(0, 110)}`);
}
if (diffs.length > 4) console.log(`\n  … and ${diffs.length - 4} more`);

if (!write) {
  console.log('\n  nothing written. To apply:  node ops.mjs etsy-sync --write\n');
  process.exitCode = 0;
} else {
  let ok = 0, failed = 0;
  for (const d of diffs) {
    try {
      await call('PATCH', `/shops/${shopId}/listings/${d.etsyId}`, { description: d.want });
      ok++; console.log(`  UPDATED ${d.code.padEnd(4)} ${d.etsyId}`);
    } catch (e) {
      failed++; console.log(`  FAILED  ${d.code.padEnd(4)} ${e.message.slice(0, 140)}`);
    }
    await new Promise(r => setTimeout(r, 250));   // well inside 10 QPS
  }
  console.log(`\n  ${ok} updated · ${failed} failed\n`);
  process.exitCode = failed ? 1 : 0;
}
