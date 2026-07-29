// TEMPORARY: pull the first mockup for every staged draft into one labelled
// contact sheet, so the operator approval gate is one look instead of 34 tabs.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, env } from './config.mjs';
import { makeClient } from './printify.mjs';

const staged = JSON.parse(readFileSync(join(PATHS.state, 'staged.json'), 'utf8'));
const client = makeClient(env('PRINTIFY_API_TOKEN'));
const shopId = env('PRINTIFY_SHOP_ID');

const codes = Object.keys(staged.items).sort((a, b) => {
  const k = (c) => [c[0], parseInt(c.slice(1), 10) || 0];
  const [la, na] = k(a), [lb, nb] = k(b);
  return la === lb ? na - nb : la < lb ? -1 : 1;
});

const CELL = 340, COLS = 6, PAD = 6, LABEL = 24;
const tiles = [];
let i = 0, missing = [];
for (const code of codes) {
  const item = staged.items[code];
  const product = await client.getProduct(shopId, item.product_id);
  const img = (product.images || []).find(m => /front/i.test(m.camera_label || '') ) || (product.images || [])[0];
  if (!img?.src) { missing.push(code); continue; }
  const res = await fetch(img.src);
  if (!res.ok) { missing.push(code); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const tile = await sharp(buf)
    .resize(CELL, CELL, { fit: 'contain', background: { r: 245, g: 245, b: 243 } })
    .png().toBuffer();
  const x = PAD + (i % COLS) * (CELL + PAD);
  const y = PAD + Math.floor(i / COLS) * (CELL + LABEL + PAD);
  tiles.push({ input: tile, left: x, top: y + LABEL });
  tiles.push({
    input: Buffer.from(`<svg width="${CELL}" height="${LABEL}"><text x="2" y="17" font-family="monospace" font-size="17" font-weight="bold" fill="white">${code}  ${item.net ? '$' + item.net : ''}</text></svg>`),
    left: x, top: y,
  });
  i++;
}
const rows = Math.ceil(i / COLS);
const out = join(process.env.TMPDIR || '.', 'mockups.png');
await sharp({ create: { width: COLS * (CELL + PAD) + PAD, height: rows * (CELL + LABEL + PAD) + PAD, channels: 3, background: { r: 24, g: 24, b: 24 } } })
  .composite(tiles).png().toFile(out);
console.log(`${i} mockups -> ${out}`);
if (missing.length) console.log('no mockup yet:', missing.join(', '));
