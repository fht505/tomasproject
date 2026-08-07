// Compose social post images: product mockups on the brand's cream ground,
// 1080x1080 (IG square, works everywhere). Sources are the LIVE Printify
// mockups — the same images buyers see — plus the digital-shelf previews, so
// the feed and the shop are visibly the same brand.
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient } from '../printify.mjs';
import { env, PATHS } from '../config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(PATHS.ops, 'social', 'img');
mkdirSync(OUT, { recursive: true });

const SIZE = 1080;
const CREAM = { r: 245, g: 239, b: 227 };

async function compose(inputBuf, outName) {
  const inner = await sharp(inputBuf)
    .resize(SIZE - 120, SIZE - 120, { fit: 'contain', background: { ...CREAM, alpha: 1 } })
    .png().toBuffer();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: CREAM } })
    .composite([
      { input: inner, left: 60, top: 60 },
      // thin terracotta frame, the label language
      { input: Buffer.from(`<svg width="${SIZE}" height="${SIZE}">
          <rect x="28" y="28" width="${SIZE - 56}" height="${SIZE - 56}" fill="none" stroke="#9C4A2F" stroke-width="3"/>
        </svg>`), left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 }).toFile(join(OUT, outName));
  console.log('composed', outName);
}

// physical products: pull the live front mockup from Printify
const printify = makeClient(env('PRINTIFY_API_TOKEN'));
const staged = JSON.parse(readFileSync(join(PATHS.state, 'staged.json'), 'utf8'));
async function mockup(code) {
  const p = await printify.getProduct(env('PRINTIFY_SHOP_ID'), staged.items[code].product_id);
  const img = (p.images || []).find(m => /front/i.test(m.camera_label || '')) || (p.images || [])[0];
  const res = await fetch(img.src);
  return Buffer.from(await res.arrayBuffer());
}

const PHYSICAL = ['D1', 'A9', 'B12', 'D4', 'B14', 'C1'];
for (const code of PHYSICAL) {
  await compose(await mockup(code), `post-${code}.jpg`);
}

// digital shelf: previews already on disk
const DIGITAL = [
  ['P1', join(PATHS.ops, 'digital/P1-conversation-cards/preview-header.png')],
  ['P4', join(PATHS.ops, 'digital/P4-table-numbers/preview-card-7.png')],
];
for (const [code, path] of DIGITAL) {
  if (existsSync(path)) await compose(readFileSync(path), `post-${code}.jpg`);
}

// intro card: the shop banner cropped square-ish center
const banner = join(PATHS.ops, 'brand', 'banner-3360x840.png');
if (existsSync(banner)) {
  const b = await sharp(banner).extract({ left: 1140, top: 0, width: 1080, height: 840 }).toBuffer();
  await compose(b, 'post-intro.jpg');
}
console.log('done ->', OUT);
