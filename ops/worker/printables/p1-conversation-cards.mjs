// P1 — Thanksgiving conversation cards. 24 prompt cards + 1 header card,
// 2.5x3.5in (750x1050px at 300dpi), 4-up per page with crop marks.
//
// The prompts are original sentences — no mark exposure. The HEADER card
// carries "What are you thankful for?", which is in the batch-4 screen; the
// deck builds and ships either way because the header is one swappable card.
import { C, SERIF, LETTER, A4, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CARD = { w: 750, h: 1050 };

const PROMPTS = [
  ['What made you laugh', 'hardest this year?'],
  ['Who at this table are you', 'grateful for, and why?'],
  ['What smell means', 'fall to you?'],
  ['What is the best thing', 'you ate this year?'],
  ['What small thing became', 'a big deal this year?'],
  ['Which family story gets', 'better every time?'],
  ['What are you looking', 'forward to most?'],
  ['Who called you at exactly', 'the right moment?'],
  ['What did you learn', 'the hard way this year?'],
  ['What place felt most', 'like home this year?'],
  ['What song was stuck in', 'your head all year?'],
  ['Who made your year', 'easier without knowing it?'],
  ['What tradition should', 'this family never drop?'],
  ['What new thing did', 'you try and love?'],
  ['What are you better at', 'than you were last year?'],
  ['Which meal this year', 'deserves a rematch?'],
  ['What made you proud', 'of someone here?'],
  ['What is the coziest', 'corner of your home?'],
  ['What advice would you', 'give last-year you?'],
  ['What tiny luxury is', 'absolutely worth it?'],
  ['Who do you wish', 'were at this table?'],
  ['What went better than', 'you expected this year?'],
  ['What will you remember', 'about this exact day?'],
  ['What is your first', 'move on a day off?'],
];

const MOTIF_CYCLE = ['leaf', 'star', 'acorn', 'wheat'];

function promptCard(lines, i) {
  const m = motifs[MOTIF_CYCLE[i % MOTIF_CYCLE.length]];
  const { w, h } = CARD;
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="${C.terra}" stroke-width="3"/>
  ${m(w / 2, 240, 0.9, C.green)}
  ${lines.map((t, j) => `<text x="${w / 2}" y="${470 + j * 78}" font-family="${SERIF}" font-size="52" fill="${C.ink}" text-anchor="middle">${t}</text>`).join('')}
  <line x1="220" y1="${h - 190}" x2="${w - 220}" y2="${h - 190}" stroke="${C.terra}" stroke-width="2"/>
  <text x="${w / 2}" y="${h - 120}" font-family="${SERIF}" font-style="italic" font-size="34" fill="${C.inkSoft}" text-anchor="middle">pass it on</text>`;
}

// Header card text is screen-dependent; parameterized so a FAIL verdict swaps
// one string, not the deck.
function headerCard(headline = ['What are you', 'thankful for?']) {
  const { w, h } = CARD;
  return `
  <rect width="${w}" height="${h}" fill="${C.green}"/>
  <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="${C.cream}" stroke-width="3"/>
  ${motifs.wheat(w / 2, 260, 1.0, C.cream)}
  ${headline.map((t, j) => `<text x="${w / 2}" y="${480 + j * 92}" font-family="${SERIF}" font-style="italic" font-size="72" fill="${C.cream}" text-anchor="middle">${t}</text>`).join('')}
  <text x="${w / 2}" y="${h - 200}" font-family="${SERIF}" font-size="36" letter-spacing="6" fill="${C.creamDeep}" text-anchor="middle">24 QUESTIONS FOR</text>
  <text x="${w / 2}" y="${h - 148}" font-family="${SERIF}" font-size="36" letter-spacing="6" fill="${C.creamDeep}" text-anchor="middle">THE TABLE</text>`;
}

// 4-up layout: 2 x 2 cards centered on the page with crop marks per card
function fourUp(pageSize, cards) {
  const { w, h } = pageSize;
  const gx = 60, gy = 60;
  const bw = CARD.w * 2 + gx, bh = CARD.h * 2 + gy;
  const ox = (w - bw) / 2, oy = (h - bh) / 2;
  const cells = cards.map((svg, i) => {
    const cx = ox + (i % 2) * (CARD.w + gx);
    const cy = oy + Math.floor(i / 2) * (CARD.h + gy);
    return `<g transform="translate(${cx},${cy})">${svg}</g>`;
  }).join('');
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>${cells}
    ${cropMarks(pageSize, { w: bw, h: bh })}
  </svg>`;
}

function instructions(pageSize) {
  const { w, h } = pageSize;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <text x="${w / 2}" y="500" font-family="${SERIF}" font-style="italic" font-size="110" fill="${C.terra}" text-anchor="middle">Conversation Cards</text>
    <text x="${w / 2}" y="640" font-family="${SERIF}" font-size="54" letter-spacing="8" fill="${C.green}" text-anchor="middle">24 QUESTIONS · 2.5 x 3.5 IN</text>
    ${[
      ['1.', 'Print on white cardstock, 100% scale ("Actual size").'],
      ['2.', 'Cut on the corner marks; trim each card on its border.'],
      ['3.', 'Shuffle. Deal one to each guest, or draw between courses.'],
      ['4.', 'House rule: no one-word answers.'],
    ].map(([n, t], i) => `
      <text x="360" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.terra}">${n}</text>
      <text x="470" y="${900 + i * 130}" font-family="${SERIF}" font-size="58" fill="${C.ink}">${t}</text>`).join('')}
    <text x="${w / 2}" y="${h - 300}" font-family="${SERIF}" font-size="44" fill="${C.inkSoft}" text-anchor="middle">Personal use only · KindlyPut</text>
  </svg>`;
}

export async function build(headline) {
  const dir = outDir('P1-conversation-cards');
  const cards = [headerCard(headline), ...PROMPTS.map((p, i) => promptCard(p, i))];
  for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
    const pages = [instructions(size)];
    for (let i = 0; i < cards.length; i += 4) pages.push(fourUp(size, cards.slice(i, i + 4)));
    await pagesToPdf(pages, name, join(dir, `thanksgiving-conversation-cards-${name}.pdf`));
    console.log(`P1 ${name}: ${pages.length} pages`);
  }
  writeFileSync(join(dir, 'preview-header.png'), await svgToPng(
    `<svg width="${CARD.w}" height="${CARD.h}" xmlns="http://www.w3.org/2000/svg">${headerCard(headline)}</svg>`));
  writeFileSync(join(dir, 'preview-prompt.png'), await svgToPng(
    `<svg width="${CARD.w}" height="${CARD.h}" xmlns="http://www.w3.org/2000/svg">${promptCard(PROMPTS[1], 1)}</svg>`));
  console.log('P1 previews written');
}

if (process.argv[1] && process.argv[1].includes('p1-conversation-cards')) await build();
