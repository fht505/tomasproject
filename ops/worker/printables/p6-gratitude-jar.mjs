// P6 — Gratitude jar kit: jar label + 30 prompt slips + instruction card.
// GRATITUDE JAR passed the Class 16/9 screen (every bare-word filing in our
// classes is dead; the exact-name Etsy shop has zero active listings).
import { C, SERIF, LETTER, A4, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LABEL = { w: 1200, h: 900 };     // 4x3in wraparound-friendly label
const SLIP = { w: 1650, h: 300 };      // 5.5x1in slips, 10 per page

const SLIPS = [
  'Today I laughed at...', 'A person I appreciated today...', 'Something small that went right...',
  'A smell or taste I loved today...', 'Someone who helped me without being asked...',
  'A place I felt at ease...', 'Something I finished...', 'A kindness I saw...',
  'Something that felt like fall today...', 'A song that landed right...',
  'Something I am better at than last year...', 'A meal worth remembering...',
  'A text that made my day...', 'Something I want to remember about today...',
  'A problem that turned out fine...', 'Someone I am lucky to know...',
  'A moment of quiet I noticed...', 'Something borrowed I should return with thanks...',
  'A stranger who was decent...', 'Something I made...',
  'Weather worth being outside in...', 'A habit that is paying off...',
  'Something my past self set up for me...', 'A joke that keeps working...',
  'Something warm...', 'A book, show or game that earned its hours...',
  'Someone who listened...', 'Something I get to do tomorrow...',
  'A worry that never came true...', 'Today, mostly, I am thankful for...',
];

function label() {
  const { w, h } = LABEL;
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}" rx="40"/>
  <rect x="34" y="34" width="${w - 68}" height="${h - 68}" fill="none" stroke="${C.terra}" stroke-width="4" rx="24"/>
  <rect x="52" y="52" width="${w - 104}" height="${h - 104}" fill="none" stroke="${C.terra}" stroke-width="2" rx="16"/>
  ${motifs.wheat(w / 2 - 90, 240, 0.9, C.green)}
  ${motifs.wheat(w / 2 + 90, 240, 0.9, C.green)}
  <text x="${w / 2}" y="480" font-family="${SERIF}" font-style="italic" font-size="120" fill="${C.terra}" text-anchor="middle">Gratitude Jar</text>
  <line x1="280" y1="560" x2="${w - 280}" y2="560" stroke="${C.terra}" stroke-width="3"/>
  <text x="${w / 2}" y="650" font-family="${SERIF}" font-size="44" letter-spacing="6" fill="${C.green}" text-anchor="middle">DROP A NOTE IN · READ THEM ALL</text>
  <text x="${w / 2}" y="710" font-family="${SERIF}" font-size="44" letter-spacing="6" fill="${C.green}" text-anchor="middle">ON THANKSGIVING</text>`;
}

function slip(text, i) {
  const { w, h } = SLIP;
  const m = motifs[['star', 'leaf', 'acorn'][i % 3]];
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" fill="none" stroke="${C.inkSoft}" stroke-width="2"/>
  ${m(120, h / 2, 0.7, C.terra)}
  <text x="220" y="${h / 2 + 18}" font-family="${SERIF}" font-style="italic" font-size="52" fill="${C.ink}">${text}</text>`;
}

function slipPage(pageSize, slips) {
  const { w, h } = pageSize;
  const gap = 24;
  const bh = slips.length * SLIP.h + (slips.length - 1) * gap;
  const ox = (w - SLIP.w) / 2, oy = (h - bh) / 2;
  const cells = slips.map((s, i) =>
    `<g transform="translate(${ox},${oy + i * (SLIP.h + gap)})">${s}</g>`).join('');
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>${cells}
    ${cropMarks(pageSize, { w: SLIP.w, h: bh })}
  </svg>`;
}

function labelPage(pageSize) {
  const { w, h } = pageSize;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <g transform="translate(${(w - LABEL.w) / 2},${(h - LABEL.h) / 2})">${label()}</g>
    ${cropMarks(pageSize, LABEL)}
  </svg>`;
}

function instructions(pageSize) {
  const { w, h } = pageSize;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <text x="${w / 2}" y="500" font-family="${SERIF}" font-style="italic" font-size="110" fill="${C.terra}" text-anchor="middle">Gratitude Jar Kit</text>
    <text x="${w / 2}" y="640" font-family="${SERIF}" font-size="54" letter-spacing="8" fill="${C.green}" text-anchor="middle">LABEL + 30 PROMPT SLIPS</text>
    ${[
      ['1.', 'Print the label on full-sheet sticker paper, or plain paper'],
      ['', 'and attach with twine or glue. Fits a quart mason jar.'],
      ['2.', 'Print the slips; cut on the marks. Keep them by the jar.'],
      ['3.', 'All season, anyone may drop a filled slip in.'],
      ['4.', 'On Thanksgiving, read every one aloud at the table.'],
    ].map(([n, t], i) => `
      <text x="360" y="${880 + i * 120}" font-family="${SERIF}" font-size="56" fill="${C.terra}">${n}</text>
      <text x="470" y="${880 + i * 120}" font-family="${SERIF}" font-size="56" fill="${C.ink}">${t}</text>`).join('')}
    <text x="${w / 2}" y="${h - 300}" font-family="${SERIF}" font-size="44" fill="${C.inkSoft}" text-anchor="middle">Personal use only · KindlyPut</text>
  </svg>`;
}

const dir = outDir('P6-gratitude-jar');
for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
  const pages = [instructions(size), labelPage(size)];
  for (let i = 0; i < SLIPS.length; i += 10) {
    pages.push(slipPage(size, SLIPS.slice(i, i + 10).map((t, j) => slip(t, i + j))));
  }
  await pagesToPdf(pages, name, join(dir, `gratitude-jar-kit-${name}.pdf`));
  console.log(`P6 ${name}: ${pages.length} pages`);
}
writeFileSync(join(dir, 'preview-label.png'), await svgToPng(
  `<svg width="${LABEL.w}" height="${LABEL.h}" xmlns="http://www.w3.org/2000/svg">${label()}</svg>`));
console.log('P6 preview written');
