#!/usr/bin/env node
// Create shop sections and file every live listing into one.
//
//   node ops.mjs etsy-sections           show the plan, change nothing
//   node ops.mjs etsy-sections --write   create sections and assign listings
//
// All 34 listings launched with shop_section_id null, so the storefront is one
// undifferentiated grid. Sections are how a buyer who likes one candle finds the
// other nine, and how a shop reads as curated rather than dumped.
//
// Sections are derived from the SAME data the listings are built from — the
// product type and the niche the phrase belongs to — so a listing can never
// drift into a section that contradicts its own copy.

import { readFileSync } from 'node:fs';
import { call, etsy } from './etsy.mjs';
import { makeClient } from './printify.mjs';
import { PATHS, env } from './config.mjs';

const shopId = env('ETSY_SHOP_ID');
const write = process.argv.includes('--write');
const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
const staged = JSON.parse(readFileSync(`${PATHS.state}/staged.json`, 'utf8'));
const printify = makeClient(env('PRINTIFY_API_TOKEN'));

// Which section a listing belongs to. Candles split by tone because that is the
// real browse decision — someone shopping "funny gift for a coworker" and
// someone shopping "cosy autumn decor" want different shelves even though both
// are 9oz soy candles.
const WRY = new Set(['A9', 'A10', 'A11', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D9', 'D10']);
function sectionFor(l) {
  if (l.product.startsWith('candle')) return WRY.has(l.code) ? 'Funny Candles' : 'Fall Candles';
  if (l.product.startsWith('mug')) return 'Mugs';
  if (l.product.startsWith('tote')) return 'Totes';
  // apparel splits by who it is for — the niches the shop actually sells into
  const t = (l.tags || []).join(' ');
  if (/teacher|educator|school/.test(t)) return 'Teacher';
  if (/nurse|rn |scrub|healthcare/.test(t)) return 'Nurse';
  if (/dog|pet|belly rub/.test(t)) return 'Dog Lover';
  if (/grandma|nana|mimi|gigi/.test(t)) return 'Grandma';
  if (/dad|father|girl dad|daughters/.test(t)) return 'Dad';
  return 'Apparel';
}

const plan = new Map();          // section title -> [codes]
for (const l of listings) {
  if (!staged.items[l.code]) continue;      // only live ones
  const s = sectionFor(l);
  if (!plan.has(s)) plan.set(s, []);
  plan.get(s).push(l.code);
}

console.log('\n  section plan\n');
for (const [title, codes] of [...plan].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(codes.length).padStart(2)}  ${title.padEnd(16)} ${codes.join(', ')}`);
}

if (!write) {
  console.log('\n  nothing written. To apply:  node ops.mjs etsy-sections --write\n');
  process.exitCode = 0;
} else {
  // Reuse existing sections rather than creating duplicates.
  const existing = await call('GET', `/shops/${shopId}/sections`);
  const byTitle = new Map((existing.results || []).map(s => [s.title, s.shop_section_id]));

  for (const title of plan.keys()) {
    if (byTitle.has(title)) continue;
    const r = await call('POST', `/shops/${shopId}/sections`, { title });
    byTitle.set(title, r.shop_section_id);
    console.log(`  created section ${r.shop_section_id}  ${title}`);
    await new Promise(r => setTimeout(r, 250));
  }

  let ok = 0, failed = 0;
  for (const [title, codes] of plan) {
    const sectionId = byTitle.get(title);
    for (const code of codes) {
      const item = staged.items[code];
      const p = await printify.getProduct(env('PRINTIFY_SHOP_ID'), item.product_id);
      const etsyId = p.external?.id;
      if (!etsyId) { console.log(`  SKIP ${code} — no Etsy listing id`); continue; }
      try {
        await call('PATCH', `/shops/${shopId}/listings/${etsyId}`, { shop_section_id: sectionId });
        ok++;
      } catch (e) {
        failed++; console.log(`  FAILED ${code}: ${e.message.slice(0, 110)}`);
      }
      await new Promise(r => setTimeout(r, 250));
    }
    console.log(`  filed ${codes.length} into ${title}`);
  }
  console.log(`\n  ${ok} listings assigned · ${failed} failed\n`);
  process.exitCode = failed ? 1 : 0;
}
