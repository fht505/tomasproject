#!/usr/bin/env node
// Art intake: validate Joe's generated PNGs against BATCH-01 and produce
// print-resolution masters. Real files in, real files out — no placeholders.
//
//   node intake.mjs            validate + upscale everything in ../art/
//   node intake.mjs check      validate only (fast, no writes)
//   node intake.mjs next       which design to make next, with its prompt
//   node intake.mjs add <file> [CODE]   file a download under the right code
//   node intake.mjs key <CODE>         remove a white background (adds alpha)
//
// Input:  ops/art/<CODE>.png        (A1.png, B7.png, …)
// Output: ops/art/print/<CODE>.png  (long edge upscaled to print target)

import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, '..', 'art');
const outDir = join(artDir, 'print');
const listingsPath = join(here, '..', 'BATCH-01.listings.json');

// Print target by product family (long edge, px) — now the MEASURED print area
// from the live Printify catalog, not an estimate. See BLUEPRINT_SEARCH in
// stage.mjs for where each came from.
//
// This matters more than it looks. The candle target was 3000 against a real
// print area of 900x600, so a perfectly good 1024px label was being judged as
// needing a 2.9x upscale it never needed. Measuring turned that into a
// downscale. Targets that are guesses make the quality gates lie in both
// directions.
const TARGET = {
  tee: 3362,        // front 2767x3362
  sweatshirt: 3398, // front 2976x3398
  candle: 900,      // label 900x600 — small, and that is correct
  mug: 2700,        // wrap 2700x1120
  tote: 3600,       // front 3000x3600
};
const MIN_SOURCE = 900;   // below this, upscaling produces mush
const MAX_UPSCALE = 4.0;  // beyond this, so does upscaling from anything
const WARN_UPSCALE = 3.0;

// A design printed on a garment must have a transparent background. Without an
// alpha channel the print carries its own white rectangle, which on a black tee
// is a visible box around the artwork and a guaranteed refund. Mug and candle
// wraps can legitimately be full-bleed, so this is enforced where it matters.
const NEEDS_ALPHA = new Set(['tee', 'sweatshirt', 'tote']);

// `hasAlpha` only says the file has an alpha channel — it is true for a PNG
// whose alpha is fully opaque, which is exactly what an image editor produces
// when it "adds transparency support" without removing anything. That file
// would pass an hasAlpha check and still print a white box on a black shirt.
// So test the pixels: sample the border, where a keyed background must be
// transparent, at a downscale that keeps this cheap.
async function borderIsTransparent(file) {
  const size = 64;
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const a = (x, y) => data[(y * info.width + x) * info.channels + 3];
  let clear = 0, total = 0;
  for (let i = 0; i < size; i++) {
    for (const [x, y] of [[i, 0], [i, size - 1], [0, i], [size - 1, i]]) {
      total++;
      if (a(x, y) < 32) clear++;
    }
  }
  return { fraction: clear / total, ok: clear / total > 0.5 };
}

const family = (product) =>
  product.startsWith('tee') ? 'tee' :
  product.startsWith('sweatshirt') ? 'sweatshirt' :
  product.startsWith('candle') ? 'candle' :
  product.startsWith('mug') ? 'mug' : 'tote';

const mode = process.argv[2] || 'run';
const checkOnly = mode === 'check';

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

// ------------------------------------------------------- guided intake
// Generating 34 designs means 34 downloads that all arrive named something
// like "ChatGPT Image Jul 25.png", and renaming them by hand — on a phone —
// is the slowest step in the whole pipeline and the easiest place to put the
// wrong design under the wrong code. `next` says what to make; `add` files it.
const artOrder = [...byArt.keys()].sort((a, b) => {
  const key = (f) => [f[0], parseInt(f.slice(1), 10) || 0];
  const [la, na] = key(a), [lb, nb] = key(b);
  return la === lb ? na - nb : la < lb ? -1 : 1;
});
const missingNow = () => artOrder.filter(f => !existsSync(join(artDir, f)));

function promptFor(code) {
  const promptsPath = join(here, '..', 'PROMPTS.md');
  if (!existsSync(promptsPath)) return null;
  const md = readFileSync(promptsPath, 'utf8');
  // prompts are written as **CODE** followed by a > blockquote
  const m = md.match(new RegExp(`\\*\\*${code}\\*\\*\\s*\\n((?:>.*\\n?)+)`));
  return m ? m[1].split('\n').map(l => l.replace(/^>\s?/, '')).join('\n').trim() : null;
}

// Each mode is a function so it can `return` instead of calling process.exit().
// On Windows, exiting while sharp's libuv handles are still closing aborts the
// process with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` — after
// the work succeeded and the output was printed, so it looks like a crash that
// isn't one, and the exit code becomes meaningless.
async function modeNext() {
  const left = missingNow();
  if (!left.length) {
    console.log(`\n  all ${artOrder.length} designs present — next: node ops.mjs art\n`);
    return;
  }
  const code = left[0].replace(/\.png$/i, '');
  const prompt = promptFor(code);
  console.log(`\n  ${left.length} of ${artOrder.length} designs still to make. Next up: ${code}\n`);
  if (prompt) {
    console.log('  Paste this into ChatGPT:\n');
    console.log(prompt.split('\n').map(l => '    ' + l).join('\n'));
    console.log('\n  Check the spelling letter by letter before saving.');
  } else {
    console.log(`  (no prompt found for ${code} in ops/PROMPTS.md)`);
  }
  console.log(`\n  Then: node ops.mjs art add ~/Downloads/<whatever-it-saved-as>.png`);
  console.log(`  It files the image as ${code}.png for you.\n`);
  console.log(`  remaining: ${left.map(f => f.replace(/\.png$/i, '')).join(' ')}\n`);
}

async function modeAdd() {
  const src = process.argv[3];
  const asCode = process.argv[4];  // optional explicit code
  if (!src) {
    console.error('usage: node ops.mjs art add <file.png> [CODE]');
    process.exitCode = 2; return;
  }
  if (!existsSync(src)) {
    console.error(`no such file: ${src}`);
    process.exitCode = 1; return;
  }
  const left = missingNow();
  const target = asCode ? `${asCode.toUpperCase().replace(/\.png$/i, '')}.png` : left[0];
  if (!target) {
    console.error('every design already has a file — pass an explicit code to replace one');
    process.exitCode = 1; return;
  }
  if (!byArt.has(target)) {
    console.error(`${target} is not a design this batch uses. Expected one of: ${artOrder.map(f => f.replace(/\.png$/i, '')).join(' ')}`);
    process.exitCode = 1; return;
  }
  const code = target.replace(/\.png$/i, '');
  const spec = byArt.get(target);

  // Validate BEFORE filing. Filing a bad image and reporting the problem
  // afterwards still drops it into the batch, so `art next` moves on and the
  // defect surfaces at intake instead — and if it overwrote a good file, that
  // good file is already gone.
  let meta;
  try {
    meta = await sharp(src).metadata();
  } catch (e) {
    console.error(`could not read ${src}: ${e.message}`);
    process.exitCode = 1; return;
  }
  const long = Math.max(meta.width, meta.height);
  const upscale = spec.target / long;
  const wantsAlpha = [...spec.families].some(fam => NEEDS_ALPHA.has(fam));
  const problems = [];
  let fixable = false;
  // JPEG is the normal case, not an error: the Gemini web UI only exports JPEG,
  // so rejecting it would block every single design. Convert on filing instead.
  // Nothing is lost — the compression already happened upstream, and the
  // pipeline needs PNG only so it can carry an alpha channel.
  const CONVERTIBLE = new Set(['jpeg', 'jpg', 'webp', 'png']);
  if (!CONVERTIBLE.has(meta.format)) {
    problems.push(`unsupported format (${meta.format}) — need png, jpeg or webp`);
  }
  if (long < MIN_SOURCE) problems.push(`too small (${meta.width}x${meta.height}, need ≥${MIN_SOURCE}px)`);
  if (wantsAlpha) {
    const border = meta.hasAlpha ? await borderIsTransparent(src) : { fraction: 0, ok: false };
    if (!border.ok) {
      problems.push(`background is not transparent (${Math.round(border.fraction * 100)}% of the border is clear), and ${spec.uses.join('/')} print on fabric`);
      fixable = true;
    }
  }
  if (upscale > MAX_UPSCALE) {
    problems.push(`needs ${upscale.toFixed(1)}x upscale — regenerate at ≥${Math.ceil(spec.target / MAX_UPSCALE)}px on the long edge`);
  }

  if (problems.length) {
    console.log(`REJECTED  ${src}  (would be ${code})`);
    for (const p of problems) console.log(`  · ${p}`);
    if (fixable && problems.length === 1) {
      // a white background is the one defect we can repair rather than reject
      console.log(`\nfiling it anyway so it can be keyed:`);
      mkdirSync(artDir, { recursive: true });
      await sharp(src).png({ compressionLevel: 9 }).toFile(join(artDir, target));
      console.log(`  node ops.mjs art key ${code}     removes the white background`);
      console.log(`  then check it looks right, and carry on with: node ops.mjs art next`);
      return;
    }
    console.log(`\nnot filed — ${code} is still outstanding. Regenerate and run the same command again.`);
    process.exitCode = 1; return;
  }

  mkdirSync(artDir, { recursive: true });
  const dest = join(artDir, target);
  const replacing = existsSync(dest);
  // always write PNG, converting if the source was JPEG or WebP
  await sharp(src).png({ compressionLevel: 9 }).toFile(dest);
  const converted = meta.format !== 'png' ? ` (converted from ${meta.format})` : '';
  console.log(`${replacing ? 'REPLACED' : 'FILED'}  ${src}  ->  ops/art/${target}${converted}   (used by ${spec.uses.join(',')})`);
  console.log(`  ok  ${meta.width}x${meta.height}, alpha=${meta.hasAlpha}, ${upscale.toFixed(1)}x to print size`);
  if (upscale > WARN_UPSCALE) {
    console.log(`  ! ${upscale.toFixed(1)}x is fine for bold one-ink text, soft for fine detail`);
  }

  const left2 = missingNow();
  console.log(left2.length
    ? `\n${left2.length} to go — next: node ops.mjs art next`
    : `\nthat was the last one — next: node ops.mjs art`);
}

// ------------------------------------------------------------ keying
// Apparel art must have a transparent background, and the ChatGPT app will not
// produce an alpha channel however you ask. Without a way to add one, the
// alpha gate above would make 22 of the 40 listings impossible to stage — a
// rule that blocks the only tool the operator has is not a safety rail.
//
// Two modes, because letterforms and illustrations want opposite things.
//
// BORDER (default): remove near-white only where it connects to the image edge.
// Safe for a design with intentional interior white.
//
// ALL (--all): remove every near-white pixel regardless of connectivity. This
// is what letterforms need — the counter of an "A" is enclosed, so a border
// fill leaves it filled, and on a black shirt that prints as a solid blob.
//
// The reason --all is safe here rather than destructive: intentional light
// elements in this batch are CREAM (min channel ~228) while trapped background
// is pure WHITE (255). They separate by value, not just by connectivity, so a
// 244 threshold takes the counters and keeps the outlines and stars.
async function keyOut(file, { threshold = 244, all = false } = {}) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const near = (i) => data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold;

  let cleared = 0;
  let enclosed = 0;

  if (all) {
    for (let p = 0; p < width * height; p++) {
      if (near(p * channels)) { data[p * channels + 3] = 0; cleared++; }
    }
  } else {
    const seen = new Uint8Array(width * height);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const p = y * width + x;
      if (seen[p]) return;
      seen[p] = 1;
      if (near(p * channels)) stack.push(p);
    };
    for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
    for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

    while (stack.length) {
      const p = stack.pop();
      data[p * channels + 3] = 0;
      cleared++;
      const x = p % width, y = (p / width) | 0;
      push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
    }
    // near-white the fill could not reach — trapped counters, mostly
    for (let p = 0; p < width * height; p++) {
      if (data[p * channels + 3] !== 0 && near(p * channels)) enclosed++;
    }
  }

  const pct = (cleared / (width * height)) * 100;
  const enclosedPct = (enclosed / (width * height)) * 100;
  return { data, width, height, channels, pct, enclosedPct };
}

async function modeKey() {
  const code = (process.argv[3] || '').toUpperCase().replace(/\.png$/i, '');
  if (!code) {
    console.error('usage: node ops.mjs art key <CODE>');
    process.exitCode = 2; return;
  }
  const file = join(artDir, `${code}.png`);
  if (!existsSync(file)) {
    console.error(`no such design: ops/art/${code}.png`);
    process.exitCode = 1; return;
  }
  const all = process.argv.includes('--all');
  const { data, width, height, channels, pct, enclosedPct } = await keyOut(file, { all });

  if (pct < 2) {
    console.log(`  ! only ${pct.toFixed(1)}% of ${code} was removed — its background may not be white, or the design may already reach the edges. Left unchanged.`);
    process.exitCode = 1; return;
  }
  if (pct > 97) {
    console.log(`  ! ${pct.toFixed(1)}% of ${code} would be removed — that is almost the whole image. Left unchanged.`);
    process.exitCode = 1; return;
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(file + '.tmp');
  copyFileSync(file + '.tmp', file);
  rmSync(file + '.tmp');
  console.log(`KEYED ${code}  ${pct.toFixed(1)}% transparent${all ? '  (--all: every near-white pixel, not just the border)' : ''}`);

  // Trapped white is the counter of an "A" or the hole in an "R". On a dark
  // shirt it prints as a solid blob, so it is worth naming rather than leaving
  // for the operator to spot on a mockup.
  if (!all && enclosedPct > 0.15) {
    console.log(`  ! ${enclosedPct.toFixed(1)}% of the image is near-white ENCLOSED by artwork — typically letter counters.`);
    console.log(`    On a dark shirt those print as solid patches. If this is lettering, re-run:`);
    console.log(`      node ops.mjs art key ${code} --all`);
    console.log(`    Keep the border-only result if the design has intentional white inside it.`);
  } else {
    console.log('  Open it and check the design is intact before moving on.');
  }
}

async function modeRun() {
  if (!existsSync(artDir)) {
    console.error(`no art directory yet (${artDir}) — start with: node ops.mjs art next`);
    process.exitCode = 1; return;
  }

  const files = readdirSync(artDir).filter(f => f.toLowerCase().endsWith('.png'));
  if (!files.length) {
    console.error('art directory is empty — nothing to intake');
    process.exitCode = 1; return;
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
      if (wantsAlpha) {
        const border = meta.hasAlpha ? await borderIsTransparent(join(artDir, f)) : { fraction: 0, ok: false };
        if (!border.ok) {
          throw new Error(`background is not transparent (${Math.round(border.fraction * 100)}% of the border is clear) but ${spec.uses.join('/')} print on fabric — the print would carry a white box. Fix with: node ops.mjs art key ${f.replace(/\.png$/i, '')}`);
        }
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
  process.exitCode = bad ? 1 : 0;
}

// ---------------------------------------------------------------- dispatch
if (mode === 'next') await modeNext();
else if (mode === 'add') await modeAdd();
else if (mode === 'key') await modeKey();
else if (mode === 'run' || mode === 'check') await modeRun();
else {
  console.error(`unknown art command "${mode}" — expected: next | add | key | check | (nothing)`);
  process.exitCode = 2;
}
