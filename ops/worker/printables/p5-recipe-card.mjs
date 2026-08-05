// P5 — Pumpkin pie recipe card, 5x7in, apothecary-label style (the candle
// design language on paper). Recipe text is ORIGINAL wording — recipes as such
// are not copyrightable, but the text must be ours, and this is.
import { C, SERIF, LETTER, A4, CARD_5x7, cropMarks, motifs } from './brand.mjs';
import { pagesToPdf, svgToPng, outDir } from './render.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ING = [
  '1 can (15 oz) pumpkin puree',
  '1 can (12 oz) evaporated milk',
  '2 large eggs',
  '3/4 cup packed brown sugar',
  '1 tbsp pumpkin pie spice',
  '1/2 tsp fine salt',
  '1 unbaked 9-inch pie crust',
];
// each step is [firstLine, ...continuationLines] — continuations render
// indented and unnumbered, so a wrapped sentence is not miscounted as a step
const STEPS = [
  ['Heat the oven to 425 F.'],
  ['Whisk eggs, sugar, spice and salt. Whisk in pumpkin,', 'then milk.'],
  ['Pour into the crust on a baking sheet.'],
  ['Bake 15 minutes. Reduce to 350 F; bake 40-45 minutes', 'more, until a knife near the center comes out clean.'],
  ['Cool 2 hours. Serves 8, ideally with too much whipped cream.'],
];

function card() {
  const { w, h } = CARD_5x7;
  return `
  <rect width="${w}" height="${h}" fill="${C.cream}"/>
  <rect x="46" y="46" width="${w - 92}" height="${h - 92}" fill="none" stroke="${C.ink}" stroke-width="4"/>
  <rect x="64" y="64" width="${w - 128}" height="${h - 128}" fill="none" stroke="${C.ink}" stroke-width="2"/>
  ${motifs.pumpkin(w / 2, 250, 1.15, C.terra)}
  <text x="${w / 2}" y="470" font-family="${SERIF}" font-size="118" letter-spacing="6" fill="${C.ink}" text-anchor="middle">PUMPKIN PIE</text>
  <line x1="330" y1="530" x2="${w - 330}" y2="530" stroke="${C.terra}" stroke-width="3"/>
  <text x="${w / 2}" y="600" font-family="${SERIF}" font-size="44" letter-spacing="10" fill="${C.inkSoft}" text-anchor="middle">A CLASSIC, PLAINLY STATED</text>

  <text x="140" y="750" font-family="${SERIF}" font-size="48" letter-spacing="8" fill="${C.green}">INGREDIENTS</text>
  ${ING.map((t, i) => `<text x="160" y="${830 + i * 74}" font-family="${SERIF}" font-size="46" fill="${C.ink}">– ${t}</text>`).join('')}

  <text x="140" y="${830 + ING.length * 74 + 60}" font-family="${SERIF}" font-size="48" letter-spacing="8" fill="${C.green}">METHOD</text>
  ${(() => {
    let y = 830 + ING.length * 74 + 140;
    const out = [];
    STEPS.forEach((lines, i) => {
      lines.forEach((line, j) => {
        out.push(`<text x="${j === 0 ? 160 : 220}" y="${y}" font-family="${SERIF}" font-size="42" fill="${C.ink}">${j === 0 ? `${i + 1}. ` : ''}${line}</text>`);
        y += 70;
      });
    });
    return out.join('');
  })()}

  <line x1="330" y1="${h - 170}" x2="${w - 330}" y2="${h - 170}" stroke="${C.terra}" stroke-width="2"/>
  <text x="${w / 2}" y="${h - 108}" font-family="${SERIF}" font-style="italic" font-size="40" fill="${C.inkSoft}" text-anchor="middle">from the KindlyPut kitchen</text>`;
}

function page(pageSize) {
  const { w, h } = pageSize;
  const x = (w - CARD_5x7.w) / 2, y = (h - CARD_5x7.h) / 2;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="white"/>
    <g transform="translate(${x},${y})">${card()}</g>
    ${cropMarks(pageSize, CARD_5x7)}
  </svg>`;
}

const dir = outDir('P5-recipe-card');
for (const [name, size] of [['letter', LETTER], ['a4', A4]]) {
  await pagesToPdf([page(size)], name, join(dir, `pumpkin-pie-recipe-card-${name}.pdf`));
  console.log(`P5 ${name} -> pumpkin-pie-recipe-card-${name}.pdf`);
}
writeFileSync(join(dir, 'preview.png'), await svgToPng(
  `<svg width="${CARD_5x7.w}" height="${CARD_5x7.h}" xmlns="http://www.w3.org/2000/svg">${card()}</svg>`));
console.log('P5 preview written');
