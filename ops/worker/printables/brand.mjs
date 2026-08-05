// Shared design language for KindlyPut printables — the same palette and type
// voice as the candle labels and shop brand, so the digital line reads as the
// same hand. All dimensions in pixels at 300dpi.
export const C = {
  cream: '#F5EFE3',
  creamDeep: '#EFE7D6',
  terra: '#9C4A2F',
  green: '#4A5D45',
  ink: '#3E3428',
  inkSoft: '#7A6A55',
  gold: '#B8985A',
};

export const SERIF = 'Georgia, serif';

// page sizes at 300dpi
export const LETTER = { w: 2550, h: 3300 };   // 8.5 x 11 in
export const A4 = { w: 2480, h: 3508 };       // 210 x 297 mm

// A 5x7in card is 1500x2100px at 300dpi
export const CARD_5x7 = { w: 1500, h: 2100 };
// A place card (folded tent 3.5x2in face) face is 1050x600
export const PLACE_CARD = { w: 1050, h: 600 };

// Crop marks around a centered object on a page — buyers cut on these.
export function cropMarks(page, obj, len = 40, gap = 14) {
  const x0 = (page.w - obj.w) / 2, y0 = (page.h - obj.h) / 2;
  const x1 = x0 + obj.w, y1 = y0 + obj.h;
  const m = (x, y, dx, dy) =>
    `<line x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}" stroke="${C.inkSoft}" stroke-width="3"/>`;
  return [
    m(x0 - gap - len, y0, len, 0), m(x0, y0 - gap - len, 0, len),
    m(x1 + gap, y0, len, 0), m(x1, y0 - gap - len, 0, len),
    m(x0 - gap - len, y1, len, 0), m(x0, y1 + gap, 0, len),
    m(x1 + gap, y1, len, 0), m(x1, y1 + gap, 0, len),
  ].join('');
}

// simple autumn motifs from primitives only — no hand-authored path soup
export const motifs = {
  wheat: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="6">
      <line x1="0" y1="90" x2="0" y2="-10"/>
      ${[-1, 1].map(side => [0, 1, 2, 3].map(i =>
        `<ellipse cx="${side * 22}" cy="${-i * 26}" rx="12" ry="20" transform="rotate(${side * 28} ${side * 22} ${-i * 26})"/>`
      ).join('')).join('')}
      <ellipse cx="0" cy="-88" rx="12" ry="20"/>
    </g>`,
  pumpkin: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="6">
      <ellipse cx="0" cy="0" rx="70" ry="55"/>
      <ellipse cx="0" cy="0" rx="38" ry="55"/>
      <path d="M 0 -55 C -4 -75 8 -82 14 -88" stroke-width="8"/>
    </g>`,
  acorn: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="6">
      <path d="M -34 -6 A 40 34 0 0 1 34 -6 L 30 -2 L -30 -2 Z"/>
      <path d="M -30 0 A 34 46 0 0 0 30 0"/>
      <line x1="0" y1="-38" x2="6" y2="-52"/>
    </g>`,
  leaf: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="6">
      <path d="M 0 -60 C 34 -38 40 8 0 60 C -40 8 -34 -38 0 -60 Z"/>
      <line x1="0" y1="-52" x2="0" y2="52"/>
      ${[-1, 1].map(side => [0, 1, 2].map(i =>
        `<line x1="0" y1="${-20 + i * 24}" x2="${side * 20}" y2="${-34 + i * 24}"/>`
      ).join('')).join('')}
    </g>`,
  branch: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" stroke="${color}" fill="none" stroke-width="6">
      <path d="M -80 20 C -30 0 30 0 80 -20"/>
      ${[-55, -20, 15, 50].map((bx, i) =>
        `<ellipse cx="${bx}" cy="${i % 2 ? -14 : 16}" rx="11" ry="18" transform="rotate(${i % 2 ? 40 : -40} ${bx} ${i % 2 ? -14 : 16})"/>`
      ).join('')}
    </g>`,
  star: (x, y, s, color) => `
    <g transform="translate(${x},${y}) scale(${s})" fill="${color}">
      <path d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z"/>
    </g>`,
};
