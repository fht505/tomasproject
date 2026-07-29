// TEMPORARY: side-by-side default-front mockups for the codes on the CLI.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, env } from './config.mjs';
import { makeClient } from './printify.mjs';

const staged = JSON.parse(readFileSync(join(PATHS.state, 'staged.json'), 'utf8'));
const client = makeClient(env('PRINTIFY_API_TOKEN'));
const shopId = env('PRINTIFY_SHOP_ID');
const codes = process.argv.slice(2);

const CELL = 620, PAD = 8, LABEL = 26;
const tiles = [];
for (const [i, code] of codes.entries()) {
  const item = staged.items[code];
  const product = await client.getProduct(shopId, item.product_id);
  const img = (product.images || []).find(m => /front/i.test(m.camera_label || '')) || (product.images || [])[0];
  const res = await fetch(img.src);
  const buf = Buffer.from(await res.arrayBuffer());
  const tile = await sharp(buf).resize(CELL, CELL, { fit: 'contain', background: { r: 245, g: 245, b: 243 } }).png().toBuffer();
  tiles.push({ input: tile, left: PAD + i * (CELL + PAD), top: LABEL + PAD });
  tiles.push({
    input: Buffer.from(`<svg width="${CELL}" height="${LABEL}"><text x="2" y="19" font-family="monospace" font-size="19" font-weight="bold" fill="white">${code}</text></svg>`),
    left: PAD + i * (CELL + PAD), top: PAD,
  });
}
const out = join(process.env.TMPDIR || '.', 'bigger-two.png');
await sharp({ create: { width: codes.length * (CELL + PAD) + PAD, height: CELL + LABEL + PAD * 2, channels: 3, background: { r: 24, g: 24, b: 24 } } })
  .composite(tiles).png().toFile(out);
console.log(out);
