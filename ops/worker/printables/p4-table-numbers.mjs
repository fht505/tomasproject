// P4 — Thanksgiving/fall table numbers 1-12, 5x7in cards.
// Zero trademark exposure by design: numerals, the word "Table", and motifs.
// One card per page, centered with crop marks, US Letter and A4 editions.
import { C, SERIF, LETTER, A4, CARD_5x7, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MOTIFS = ['wheat', 'pumpkin', 'acorn', 'leaf', 'branch', 'wheat',
  'pumpkin', 'acorn', 'leaf', 'branch', 'wheat', 'pumpkin'];

function card(n) {
  const m = motifs[MOTIFS[n - 1]];
  const { w, h } = CARD_5x7;
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="50" y="50" width="${w - 100}" height="${h - 100}" fill="none" stroke="${C.terra}" stroke-width="5"/>
  <rect x="70" y="70" width="${w - 140}" height="${h - 140}" fill="none" stroke="${C.terra}" stroke-width="2"/>
  <text x="${w / 2}" y="480" font-family="${SERIF}" font-size="120" letter-spacing="30"
        fill="${C.green}" text-anchor="middle">TABLE</text>
  <text x="${w / 2}" y="1300" font-family="${SERIF}" font-style="italic" font-size="760"
        fill="${C.terra}" text-anchor="middle">${n}</text>
  ${m(w / 2, 1720, 1.6, C.green)}`;
}

function page(pageSize, n) {
  const { w, h } = pageSize;
  const cw = CARD_5x7.w, ch = CARD_5x7.h;
  const x = (w - cw) / 2, y = (h - ch) / 2;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <g transform="translate(${x},${y})">${card(n)}</g>
    ${cropMarks(pageSize, CARD_5x7)}
  </svg>`;
}

function instructions(pageSize) {
  const { w, h } = pageSize;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <text x="${w / 2}" y="500" font-family="${SERIF}" font-style="italic" font-size="110" fill="${C.terra}" text-anchor="middle">Table Numbers</text>
    <text x="${w / 2}" y="640" font-family="${SERIF}" font-size="54" letter-spacing="8" fill="${C.green}" text-anchor="middle">CARDS 1 – 12 · 5x7 IN</text>
    ${[
      ['1.', 'Print on white cardstock (65 lb / 176 gsm or heavier).'],
      ['2.', 'Cut along the corner marks — each card is 5 x 7 inches.'],
      ['3.', 'Display in a 5x7 frame or on a small easel, one per table.'],
      ['4.', 'Print at 100% scale ("Actual size") — do not use "Fit to page".'],
    ].map(([n, t], i) => `
      <text x="360" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.terra}">${n}</text>
      <text x="470" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.ink}">${t}</text>`).join('')}
    <text x="${w / 2}" y="${h - 300}" font-family="${SERIF}" font-size="44" fill="${C.inkSoft}" text-anchor="middle">Personal use only · KindlyPut</text>
  </svg>`;
}

const dir = outDir('P4-table-numbers');
for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
  const pages = [instructions(size), ...Array.from({ length: 12 }, (_, i) => page(size, i + 1))];
  await pagesToPdf(pages, name, join(dir, `table-numbers-1-12-${name}.pdf`));
  console.log(`P4 ${name}: 13 pages -> table-numbers-1-12-${name}.pdf`);
}
// preview image for listing photos + review
writeFileSync(join(dir, 'preview-card-1.png'), await svgToPng(
  `<svg width="${CARD_5x7.w}" height="${CARD_5x7.h}" xmlns="http://www.w3.org/2000/svg">${card(1)}</svg>`));
writeFileSync(join(dir, 'preview-card-7.png'), await svgToPng(
  `<svg width="${CARD_5x7.w}" height="${CARD_5x7.h}" xmlns="http://www.w3.org/2000/svg">${card(7)}</svg>`));
console.log('P4 previews written');
