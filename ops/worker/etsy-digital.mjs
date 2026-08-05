#!/usr/bin/env node
// Create DIGITAL DOWNLOAD listings directly through the Etsy API.
//
//   node ops.mjs etsy-digital           plan: what would be created
//   node ops.mjs etsy-digital --write   create DRAFT listings + upload files/images
//
// The physical pipeline goes through Printify because Printify fulfils. Digital
// has no fulfilment, so Etsy's own API is the whole path: create a draft
// listing (type "download"), attach the PDF files, attach listing images.
// Everything lands as a DRAFT — activation (and the $0.20 fee) happens only
// after the operator approval gate, same discipline as publish.mjs.
//
// Files upload as multipart/form-data, which the shared JSON client does not
// speak — the uploaders here build FormData directly.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { call } from './etsy.mjs';
import { env, PATHS } from './config.mjs';

const shopId = env('ETSY_SHOP_ID');
const write = process.argv.includes('--write');
const DIGITAL = join(PATHS.ops, 'digital');

// Etsy taxonomy, chosen from the live tree (seller-taxonomy/nodes):
//   1874  Paper & Party Supplies > ... > Design & Templates > Templates
//   2078  Art & Collectibles > Prints > Digital Prints
const MANIFEST = [
  {
    code: 'P4',
    dir: 'P4-table-numbers',
    title: 'Thanksgiving Table Numbers 1-12 Printable | 5x7 Fall Table Decor | Instant Download',
    price: 5.99,
    taxonomy_id: 2078,
    tags: ['table numbers', 'thanksgiving table', 'fall table decor', 'printable table card',
      'friendsgiving decor', 'harvest table', 'fall wedding decor', 'autumn table number',
      'thanksgiving decor', '5x7 printable', 'instant download', 'fall party decor', 'seating decor'],
    description: `Twelve 5x7 table number cards with hand-drawn autumn motifs — wheat, pumpkins, acorns and oak leaves — in a warm cream and terracotta palette.

WHAT YOU RECEIVE (instant download)
• Table numbers 1-12, one 5x7 card per page, with crop marks
• US Letter and A4 PDF editions, 300dpi
• Printing instructions page

HOW IT WORKS
Print on cardstock at home or at any print shop, cut on the marks, and display in 5x7 frames or on easels.

This is a digital file — no physical item ships. Colors may vary slightly by printer. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
  {
    code: 'P5',
    dir: 'P5-recipe-card',
    title: 'Pumpkin Pie Recipe Card Printable | 5x7 Fall Kitchen Decor | Instant Download',
    price: 4.99,
    taxonomy_id: 2078,
    tags: ['recipe card', 'pumpkin pie recipe', 'fall kitchen decor', 'printable recipe',
      'thanksgiving recipe', 'kitchen wall art', 'fall printable', 'recipe wall art',
      'autumn kitchen', '5x7 printable', 'instant download', 'hostess gift idea', 'holiday baking'],
    description: `A classic pumpkin pie recipe on a 5x7 card in vintage apothecary-label style — frame it in the kitchen or prop it on the counter for the season.

WHAT YOU RECEIVE (instant download)
• One 5x7 recipe card with crop marks
• US Letter and A4 PDF editions, 300dpi

The recipe is the real thing — tested proportions, plainly written.

This is a digital file — no physical item ships. Colors may vary slightly by printer. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
  {
    code: 'P1',
    dir: 'P1-conversation-cards',
    title: 'Thanksgiving Conversation Cards Printable | 24 Table Questions | Instant Download',
    price: 6.99,
    taxonomy_id: 1874,
    tags: ['conversation cards', 'thanksgiving game', 'table questions', 'gratitude cards',
      'family dinner game', 'friendsgiving game', 'dinner party game', 'thankful cards',
      'printable cards', 'ice breaker cards', 'instant download', 'holiday table game', 'family game'],
    description: `Twenty-four conversation cards for the Thanksgiving table — questions that get better answers than "fine". Print, cut, deal one to each guest or draw between courses.

WHAT YOU RECEIVE (instant download)
• 24 question cards + 1 title card, 2.5x3.5in, four per page with crop marks
• US Letter and A4 PDF editions, 300dpi
• Instructions page (house rule included: no one-word answers)

This is a digital file — no physical item ships. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
  {
    code: 'P3',
    dir: 'P3-menu',
    title: 'Thanksgiving Menu Printable | 5x7 Print and Handwrite Dinner Menu | Instant Download',
    price: 4.99,
    taxonomy_id: 1874,
    tags: ['thanksgiving menu', 'printable menu', 'dinner menu card', 'friendsgiving menu',
      'fall dinner party', 'menu template', 'holiday menu', 'handwritten menu',
      'thanksgiving decor', '5x7 printable', 'instant download', 'hostess menu', 'table menu'],
    description: `A 5x7 Thanksgiving dinner menu you print and fill in by hand — course headings and clean lines, so the menu looks composed even when dinner is chaos.

WHAT YOU RECEIVE (instant download)
• One 5x7 menu card with crop marks (courses: To Begin, The Mains, On the Side, Pie & After)
• US Letter and A4 PDF editions, 300dpi

Print several — one per table, or one per year as a keepsake.

This is a digital file — no physical item ships. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
  {
    code: 'P2',
    dir: 'P2-place-cards',
    title: 'Thanksgiving Place Cards Printable | Tent Fold 3.5x2 | Three Styles | Instant Download',
    price: 4.99,
    taxonomy_id: 1874,
    tags: ['place cards', 'thanksgiving table', 'name cards', 'tent place card',
      'friendsgiving decor', 'harvest table decor', 'printable name card', 'fall place card',
      'thankful place card', 'table setting', 'instant download', 'holiday place card', 'dinner party'],
    description: `Tent-fold place cards in three styles - "thankful", "grateful", and a botanical no-text design - with a clean line for hand-writing each guest name.

WHAT YOU RECEIVE (instant download)
- Three styles, two cards per page, tent-fold with dashed fold line and crop marks
- US Letter and A4 PDF editions, 300dpi
- Printing instructions page

This is a digital file - no physical item ships. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
  {
    code: 'P6',
    dir: 'P6-gratitude-jar',
    title: 'Gratitude Jar Kit Printable | Jar Label + 30 Prompt Slips | Instant Download',
    price: 5.99,
    taxonomy_id: 1874,
    tags: ['gratitude jar', 'thankful jar', 'gratitude prompts', 'family tradition',
      'thankful tradition', 'gratitude practice', 'fall family activity', 'jar label printable',
      'gratitude slips', 'mason jar label', 'instant download', 'holiday tradition', 'kids activity'],
    description: `A season-long family tradition in one kit: a jar label sized for a quart mason jar, thirty prompt slips to fill out as fall goes by, and one rule - read them all aloud on Thanksgiving.

WHAT YOU RECEIVE (instant download)
- Jar label (4x3in, rounded, fits a quart mason jar)
- 30 gratitude prompt slips, ten per page with crop marks
- Instructions page
- US Letter and A4 PDF editions, 300dpi

This is a digital file - no physical item ships. Personal use only.

Original design by KindlyPut, created with AI-assisted tools under our creative direction (disclosed per Etsy policy).`,
  },
];

async function uploadMultipart(path, form) {
  const key = env('ETSY_KEYSTRING'), secret = env('ETSY_SHARED_SECRET');
  const token = env('ETSY_ACCESS_TOKEN');
  const res = await fetch('https://openapi.etsy.com/v3/application' + path, {
    method: 'POST',
    headers: {
      'x-api-key': `${key}:${secret}`,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'perpetua-orbital-ops',
    },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`etsy multipart ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

// Idempotency: a second --write must never re-create drafts. The first
// version did exactly that and minted four duplicates (drafts, so free, but
// deletion needs the listings_d scope the token does not yet carry).
let drafted = {};
try { drafted = JSON.parse(readFileSync(join(PATHS.state, 'digital.json'), 'utf8')).items || {}; } catch {}

for (const m of MANIFEST) {
  if (drafted[m.code]) { console.log(`SKIP ${m.code}: already drafted as ${drafted[m.code]}`); continue; }
  const dir = join(DIGITAL, m.dir);
  if (!existsSync(dir)) { console.log(`SKIP ${m.code}: ${dir} missing`); continue; }
  const pdfs = readdirSync(dir).filter(f => f.endsWith('.pdf'));
  const pngs = readdirSync(dir).filter(f => f.endsWith('.png'));
  console.log(`\n${m.code}  $${m.price}  ${m.title.slice(0, 70)}`);
  console.log(`     files: ${pdfs.join(', ')}`);
  console.log(`     images: ${pngs.join(', ')}`);
  if (m.tags.length > 13) { console.log(`     ! ${m.tags.length} tags — Etsy allows 13`); continue; }

  if (!write) continue;

  const draft = await call('POST', `/shops/${shopId}/listings`, {
    quantity: 999,
    title: m.title,
    description: m.description,
    price: m.price,
    who_made: 'i_did',
    when_made: 'made_to_order',
    taxonomy_id: m.taxonomy_id,
    type: 'download',
    tags: m.tags,
    state: 'draft',
  });
  console.log(`     draft listing ${draft.listing_id}`);
  drafted[m.code] = draft.listing_id;
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(PATHS.state, 'digital.json'), JSON.stringify({ note: 'code -> Etsy draft listing id', items: drafted }, null, 2));

  for (const f of pdfs) {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(join(dir, f))], { type: 'application/pdf' }), f);
    form.append('name', f);
    await uploadMultipart(`/shops/${shopId}/listings/${draft.listing_id}/files`, form);
    console.log(`     file up: ${f}`);
    await new Promise(r => setTimeout(r, 300));
  }
  for (const [i, f] of pngs.entries()) {
    const form = new FormData();
    form.append('image', new Blob([readFileSync(join(dir, f))], { type: 'image/png' }), f);
    form.append('rank', String(i + 1));
    await uploadMultipart(`/shops/${shopId}/listings/${draft.listing_id}/images`, form);
    console.log(`     image up: ${f}`);
    await new Promise(r => setTimeout(r, 300));
  }
}
console.log(write
  ? '\nDrafts created. Nothing is live: activation follows the operator approval gate.'
  : '\nPlan only. To create drafts:  node ops.mjs etsy-digital --write');
