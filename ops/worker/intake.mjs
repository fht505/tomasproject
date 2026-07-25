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

// Print target by product family (long edge, px), sized to the print area that
// is actually used at 300dpi rather than to the largest the blueprint allows:
// a standard adult front print is 11-12in wide, so 3600px covers it. Targeting
// 4500 forced a 4.4x upscale from a 1024px source for no printed benefit.
const TARGET = { tee: 3600, sweatshirt: 3600, candle: 3000, mug: 2700, tote: 3300 };
const MIN_SOURCE = 900;   // below this, upscaling produces mush
const MAX_UPSCALE = 4.0;  // beyond this, so does upscaling from anything
const WARN_UPSCALE = 3.0;

// A design printed on a garment must have a transparent background. Without an
// alpha channel the print carries its own white rectangle, which on a black tee
// is a visible box around the artwork and a guaranteed refund. Mug and candle
// wraps can legitimately be full-bleed, so this is enforced where it matters.
const NEEDS_ALPHA = new Set(['tee', 'sweatshirt', 'tote']);

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
  const fam = family(l.product);
  const target = TARGET[fam];
  const cur = byArt.get(l.art_file);
  if (!cur) byArt.set(l.art_file, { target, uses: [l.code], families: new Set([fam]) });
  else { cur.target = Math.max(cur.target, target); cur.uses.push(l.code); cur.families.add(fam); }
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
const passed = [];
const details = [];
const missing = [...byArt.keys()].filter(f => !files.includes(f));

for (const f of files) {
  const spec = byArt.get(f);
  if (!spec) { console.log(`SKIP ${f} — no listing uses this file`); continue; }
  try {
    const img = sharp(join(artDir, f));
    const meta = await img.metadata();
    const long = Math.max(meta.width, meta.height);
    const upscale = spec.target / long;

    if (meta.format !== 'png') throw new Error(`not a png (${meta.format})`);
    if (long < MIN_SOURCE) throw new Error(`too small (${meta.width}x${meta.height}, need ≥${MIN_SOURCE})`);

    // These two are print-fatal, so they stop the file rather than annotate it.
    const wantsAlpha = [...spec.families].some(fam => NEEDS_ALPHA.has(fam));
    if (wantsAlpha && !meta.hasAlpha) {
      throw new Error(`no alpha channel, but ${spec.uses.join('/')} print on fabric — regenerate with a transparent background (the print would carry a white box)`);
    }
    if (upscale > MAX_UPSCALE) {
      throw new Error(`would need ${upscale.toFixed(1)}x upscale to reach ${spec.target}px — regenerate at a higher resolution (need ≥${Math.ceil(spec.target / MAX_UPSCALE)}px on the long edge)`);
    }
    if (upscale > WARN_UPSCALE) {
      console.log(`  ! ${f}: ${upscale.toFixed(1)}x upscale — fine for bold one-ink text, soft for fine detail`);
    }

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
    passed.push(f);
    details.push({
      file: f, uses: spec.uses, source: `${meta.width}x${meta.height}`,
      target_px: spec.target, upscale: Number(upscale.toFixed(2)), alpha: !!meta.hasAlpha,
    });
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
  // `ok` must mean "passed validation and has a print master", not "a file with
  // this name exists". It used to be the latter, so a failed PNG still counted
  // toward the art gate on the status board.
  const manifest = {
    fetchedAt: new Date().toISOString(),
    source: 'intake.mjs validation run over ops/art/',
    produced_by: 'intake.mjs',
    required: byArt.size,
    ok: passed,
    failed: bad,
    missing,
    files: details,
  };
  writeFileSync(join(stateDir, 'art.json'), JSON.stringify(manifest, null, 2));
}

console.log(`\n${ok} ok, ${bad} failed, ${missing.length} still missing`);
if (missing.length) console.log('missing:', missing.join(', '));
process.exit(bad ? 1 : 0);
