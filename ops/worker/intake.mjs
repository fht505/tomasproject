#!/usr/bin/env node
// Art intake: validate Joe's generated PNGs against BATCH-01 and produce
// print-resolution masters. Real files in, real files out — no placeholders.
//
//   node intake.mjs            validate + upscale everything in ../art/
//   node intake.mjs check      validate only (fast, no writes)
//
// Input:  ops/art/<CODE>.png        (A1.png, B7.png, …)
// Output: ops/art/print/<CODE>.png  (long edge upscaled to print target)

import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, '..', 'art');
const outDir = join(artDir, 'print');
const listingsPath = join(here, '..', 'BATCH-01.listings.json');

// print target by product family (long edge, px). 300dpi-ish for apparel
// print areas; candle/mug refined once the exact blueprint specs are mapped.
const TARGET = { tee: 4500, sweatshirt: 4500, candle: 3000, mug: 2700, tote: 3600 };
const MIN_SOURCE = 900; // reject art below this — upscale would be mush

const family = (product) =>
  product.startsWith('tee') ? 'tee' :
  product.startsWith('sweatshirt') ? 'sweatshirt' :
  product.startsWith('candle') ? 'candle' :
  product.startsWith('mug') ? 'mug' : 'tote';

const checkOnly = process.argv[2] === 'check';

if (!existsSync(listingsPath)) {
  console.error('missing BATCH-01.listings.json — run gen-listings.mjs first');
  process.exit(1);
}
const { listings } = JSON.parse(readFileSync(listingsPath, 'utf8'));
const wanted = new Map(listings.map(l => [l.art_file, l]));

if (!existsSync(artDir)) {
  console.error(`no art directory yet (${artDir}) — waiting on generated PNGs`);
  process.exit(1);
}

const files = readdirSync(artDir).filter(f => f.toLowerCase().endsWith('.png'));
if (!files.length) {
  console.error('art directory is empty — nothing to intake');
  process.exit(1);
}

let ok = 0, bad = 0;
const missing = [...new Set([...wanted.keys()])].filter(f => !files.includes(f));

for (const f of files) {
  const listing = wanted.get(f);
  if (!listing) { console.log(`SKIP ${f} — no listing uses this file`); continue; }
  try {
    const img = sharp(join(artDir, f));
    const meta = await img.metadata();
    const long = Math.max(meta.width, meta.height);
    if (long < MIN_SOURCE) throw new Error(`too small (${meta.width}x${meta.height}, need ≥${MIN_SOURCE})`);
    if (meta.format !== 'png') throw new Error(`not a png (${meta.format})`);

    if (!checkOnly) {
      mkdirSync(outDir, { recursive: true });
      const target = TARGET[family(listing.product)];
      const scale = target / long;
      await img
        .resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
          kernel: sharp.kernel.lanczos3, fit: 'fill',
        })
        .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, f));
    }
    console.log(`OK   ${f}  ${meta.width}x${meta.height}${checkOnly ? '' : ` -> ${TARGET[family(listing.product)]}px print master`}  alpha=${meta.hasAlpha}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${f} — ${e.message}`);
    bad++;
  }
}

console.log(`\n${ok} ok, ${bad} failed, ${missing.length} still missing`);
if (missing.length) console.log('missing:', missing.join(', '));
process.exit(bad ? 1 : 0);
