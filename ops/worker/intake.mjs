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
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

// One art file can serve SEVERAL listings across different products — the
// C-series reuses A/B artwork on mugs, totes and sweatshirts. Keying a Map by
// art_file would keep only the last listing and size that master for the wrong
// product (e.g. B18 used by a tee at 4500px and a mug at 2700px would be built
// at 2700 and print soft on the shirt). Size every master for the LARGEST
// target that uses it; Printify scales down cleanly, never up.
const byArt = new Map();
for (const l of listings) {
  const target = TARGET[family(l.product)];
  const cur = byArt.get(l.art_file);
  if (!cur) byArt.set(l.art_file, { target, uses: [l.code] });
  else { cur.target = Math.max(cur.target, target); cur.uses.push(l.code); }
}

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
const missing = [...byArt.keys()].filter(f => !files.includes(f));

for (const f of files) {
  const spec = byArt.get(f);
  if (!spec) { console.log(`SKIP ${f} — no listing uses this file`); continue; }
  try {
    const img = sharp(join(artDir, f));
    const meta = await img.metadata();
    const long = Math.max(meta.width, meta.height);
    if (long < MIN_SOURCE) throw new Error(`too small (${meta.width}x${meta.height}, need ≥${MIN_SOURCE})`);
    if (meta.format !== 'png') throw new Error(`not a png (${meta.format})`);

    if (!checkOnly) {
      mkdirSync(outDir, { recursive: true });
      const scale = spec.target / long;
      await img
        .resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
          kernel: sharp.kernel.lanczos3, fit: 'fill',
        })
        .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, f));
    }
    const used = spec.uses.length > 1 ? ` [${spec.uses.join(',')}]` : '';
    console.log(`OK   ${f}  ${meta.width}x${meta.height}${checkOnly ? '' : ` -> ${spec.target}px master`}${used}  alpha=${meta.hasAlpha}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${f} — ${e.message}`);
    bad++;
  }
}

// manifest for the console — which art actually exists, verified
if (!checkOnly) {
  const stateDir = join(here, '..', 'state');
  mkdirSync(stateDir, { recursive: true });
  const manifest = {
    fetchedAt: new Date().toISOString(),
    source: 'intake.mjs validation run over ops/art/',
    required: byArt.size,
    ok: files.filter(f => byArt.has(f)),
    missing,
  };
  writeFileSync(join(stateDir, 'art.json'), JSON.stringify(manifest, null, 2));
}

console.log(`\n${ok} ok, ${bad} failed, ${missing.length} still missing`);
if (missing.length) console.log('missing:', missing.join(', '));
process.exit(bad ? 1 : 0);
