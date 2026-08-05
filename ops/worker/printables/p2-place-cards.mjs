// P2 — Thanksgiving place cards, tent-fold, 3.5x2in face (1050x600px).
// Three variants: "thankful", "grateful" (both PASSED the Class 16/9 screen),
// and a no-text botanical. GATHER was the planned third word and FAILED on
// accumulation — IF Gathering's live Cl 9 filing covers conversation cards,
// and Etsy carries actively-trading GATHER paper shops — so the fallback
// designed into the batch doc is now the product: the word is gone, nothing
// else changed.
import { C, SERIF, LETTER, A4, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FACE = { w: 1050, h: 600 };

// A tent card is the face printed twice, mirrored about the fold. Buyers fold
// on the dashed line; the card stands. Full tent = 1050 x 1200.
function face(variant) {
  const { w, h } = FACE;
  const word = variant === 'botanical' ? '' :
    `<text x="${w / 2}" y="150" font-family="${SERIF}" font-style="italic" font-size="86" fill="${C.terra}" text-anchor="middle">${variant}</text>`;
  const motif = variant === 'botanical'
    ? motifs.branch(w / 2, 140, 1.0, C.green)
    : motifs.star(w / 2 + (variant === 'thankful' ? 210 : 230), 130, 1.2, C.gold);
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${C.terra}" stroke-width="3"/>
  ${word}${motif}
  <line x1="180" y1="${h - 170}" x2="${w - 180}" y2="${h - 170}" stroke="${C.inkSoft}" stroke-width="2"/>
  <text x="${w / 2}" y="${h - 110}" font-family="${SERIF}" font-size="34" letter-spacing="8" fill="${C.inkSoft}" text-anchor="middle">NAME</text>`;
}

function tent(variant) {
  const { w, h } = FACE;
  return `
  <g transform="translate(${w},${h}) rotate(180)">${face(variant)}</g>
  <g transform="translate(0,${h})">${face(variant)}</g>
  <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="${C.inkSoft}" stroke-width="2" stroke-dasharray="14 14"/>`;
}

// two tents per page, stacked
function page(pageSize, variants) {
  const { w, h } = pageSize;
  const tw = FACE.w, th = FACE.h * 2;
  const gap = 120;
  const bh = th * 2 + gap;
  const ox = (w - tw) / 2, oy = (h - bh) / 2;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <g transform="translate(${ox},${oy})">${tent(variants[0])}</g>
    <g transform="translate(${ox},${oy + th + gap})">${tent(variants[1])}</g>
    ${cropMarks(pageSize, { w: tw, h: bh })}
  </svg>`;
}

function instructions(pageSize) {
  const { w, h } = pageSize;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <text x="${w / 2}" y="500" font-family="${SERIF}" font-style="italic" font-size="110" fill="${C.terra}" text-anchor="middle">Place Cards</text>
    <text x="${w / 2}" y="640" font-family="${SERIF}" font-size="54" letter-spacing="8" fill="${C.green}" text-anchor="middle">TENT-FOLD · 3.5 x 2 IN · THREE STYLES</text>
    ${[
      ['1.', 'Print on white cardstock, 100% scale ("Actual size").'],
      ['2.', 'Cut on the corner marks; each sheet holds two cards.'],
      ['3.', 'Fold on the dashed line so the card stands.'],
      ['4.', 'Hand-write each guest name on the NAME line.'],
    ].map(([n, t], i) => `
      <text x="360" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.terra}">${n}</text>
      <text x="470" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.ink}">${t}</text>`).join('')}
    <text x="${w / 2}" y="${h - 300}" font-family="${SERIF}" font-size="44" fill="${C.inkSoft}" text-anchor="middle">Personal use only · KindlyPut</text>
  </svg>`;
}

const dir = outDir('P2-place-cards');
for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
  const pages = [
    instructions(size),
    page(size, ['thankful', 'thankful']),
    page(size, ['grateful', 'grateful']),
    page(size, ['botanical', 'botanical']),
  ];
  await pagesToPdf(pages, name, join(dir, `thanksgiving-place-cards-${name}.pdf`));
  console.log(`P2 ${name}: ${pages.length} pages`);
}
writeFileSync(join(dir, 'preview-thankful.png'), await svgToPng(
  `<svg width="${FACE.w}" height="${FACE.h}" xmlns="http://www.w3.org/2000/svg">${face('thankful')}</svg>`));
writeFileSync(join(dir, 'preview-botanical.png'), await svgToPng(
  `<svg width="${FACE.w}" height="${FACE.h}" xmlns="http://www.w3.org/2000/svg">${face('botanical')}</svg>`));
console.log('P2 previews written');
