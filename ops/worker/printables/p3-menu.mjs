// P3 — Thanksgiving dinner menu, 5x7in. "Thanksgiving Menu" is purely
// descriptive (unregistrable for a menu); the TURKEY DAY variant waits for its
// screen verdict, so this builds the safe headline now and the variant is one
// string swap later.
//
// Deliberately print-and-handwrite: course headings with blank lines, so the
// buyer writes their dishes. No editable-template dependency, no Canva
// requirement — the research flagged template flips as banned territory, and
// handwriting is the warmer object anyway.
import { C, SERIF, LETTER, A4, CARD_5x7, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COURSES = [
  ['TO BEGIN', 2],
  ['THE MAINS', 3],
  ['ON THE SIDE', 3],
  ['PIE &amp; AFTER', 2],   // &amp; because these labels land in raw SVG
];

function card(headline = 'Thanksgiving Menu') {
  const { w, h } = CARD_5x7;
  // Vertical budget, exactly: start 640; per section = 56 (label) + 88/line +
  // 64 (gap). 4 sections, 10 lines total = 640 + 4*120 + 10*88 = 2000, inside
  // the 2036px inner border. The first pass used 60/96/92 and ran the last
  // course 128px past the card edge — caught at visual review.
  let y = 640;
  const sections = COURSES.map(([label, lines]) => {
    let s = `<text x="${w / 2}" y="${y}" font-family="${SERIF}" font-size="46" letter-spacing="10" fill="${C.green}" text-anchor="middle">${label}</text>`;
    y += 56;
    for (let i = 0; i < lines; i++) {
      y += 88;
      s += `<line x1="300" y1="${y}" x2="${w - 300}" y2="${y}" stroke="${C.inkSoft}" stroke-width="2"/>`;
    }
    y += 64;
    return s;
  }).join('');
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="46" y="46" width="${w - 92}" height="${h - 92}" fill="none" stroke="${C.terra}" stroke-width="4"/>
  <rect x="64" y="64" width="${w - 128}" height="${h - 128}" fill="none" stroke="${C.terra}" stroke-width="2"/>
  ${motifs.branch(w / 2, 220, 1.1, C.green)}
  <text x="${w / 2}" y="420" font-family="${SERIF}" font-style="italic" font-size="110" fill="${C.terra}" text-anchor="middle">${headline}</text>
  <line x1="330" y1="500" x2="${w - 330}" y2="500" stroke="${C.terra}" stroke-width="3"/>
  ${sections}`;
}

function page(pageSize, headline) {
  const { w, h } = pageSize;
  const x = (w - CARD_5x7.w) / 2, y = (h - CARD_5x7.h) / 2;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <g transform="translate(${x},${y})">${card(headline)}</g>
    ${cropMarks(pageSize, CARD_5x7)}
  </svg>`;
}

export async function build(headline = 'Thanksgiving Menu') {
  const dir = outDir('P3-menu');
  for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
    await pagesToPdf([page(size, headline)], name, join(dir, `thanksgiving-menu-${name}.pdf`));
    console.log(`P3 ${name} -> thanksgiving-menu-${name}.pdf`);
  }
  writeFileSync(join(dir, 'preview.png'), await svgToPng(
    `<svg width="${CARD_5x7.w}" height="${CARD_5x7.h}" xmlns="http://www.w3.org/2000/svg">${card(headline)}</svg>`));
  console.log('P3 preview written');
}

if (process.argv[1] && process.argv[1].includes('p3-menu')) await build();
