#!/usr/bin/env node
// Generates BATCH-01.listings.json — the production input for Printify
// draft creation. Deterministic: edit the tables here, re-run, commit both.
//
//   node gen-listings.mjs
//
// Etsy constraints respected: title ≤ 140 chars, 13 tags, each tag ≤ 20 chars.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- products
const PRODUCTS = {
  candle: { type: 'candle_9oz', price: 28.95, blueprintHint: 'scented candle 9oz' },
  tee: { type: 'tee_bella_3001', price: 23.95, blueprintHint: 'Bella+Canvas 3001' },
  sweatshirt: { type: 'sweatshirt_gildan_18000', price: 34.95, blueprintHint: 'Gildan 18000' },
  mug: { type: 'mug_11oz', price: 17.95, blueprintHint: 'ceramic mug 11oz' },
  tote: { type: 'tote', price: 19.95, blueprintHint: 'cotton tote' },
};

// ---------------------------------------------------------------- tag banks
const T = {
  candleCore: ['fall candles', 'autumn candle', 'fall decor', 'cozy fall gift',
    'seasonal candle', 'candle gift', 'autumn home decor', 'hostess gift'],
  candleFun: ['funny candle', 'gift for her', 'best friend gift', 'housewarming gift', 'candle lover gift'],
  candleClassic: ['pumpkin candle', 'sweater weather', 'harvest decor', 'fall aesthetic', 'thanksgiving decor'],
  teacher: ['teacher shirt', 'teacher gift', 'back to school', 'teacher era', 'teacher tee',
    'appreciation gift', 'new teacher gift', 'teacher outfit', 'school shirt', 'educator gift'],
  dad: ['dad shirt', 'dad gift', 'father daughter', 'girl dad gift', 'dad of daughters',
    'fathers day gift', 'new dad gift', 'dad tee', 'daddy shirt', 'husband gift'],
  dogmom: ['dog mom shirt', 'dog mom gift', 'dog lover gift', 'dog mama', 'pet lover shirt',
    'dog owner gift', 'fur mama shirt', 'dog lover tee', 'dog mom era', 'rescue dog mom'],
  grandma: ['grandma shirt', 'grandma gift', 'nana gift', 'grandmother gift', 'new grandma gift',
    'grandma era', 'nana shirt', 'gigi gift', 'grandparents day', 'mimi shirt'],
  nurse: ['nurse shirt', 'nurse gift', 'nurse era', 'rn gift', 'nursing student',
    'scrub life', 'nurse week gift', 'er nurse gift', 'nurse tee', 'healthcare worker'],
  apparelCore: ['gift for her', 'vintage style tee', 'comfort tee', 'graphic tee'],
  mug: ['coffee mug', 'funny mug', 'mug gift', 'office gift', 'coworker gift', 'ceramic mug 11oz'],
  tote: ['tote bag', 'canvas tote', 'market bag', 'book bag', 'shopping tote', 'gift for her'],
};

// every listing can draw from this generic gift bank to reach 13 tags
const giftCore = ['gift for him', 'birthday gift', 'christmas gift', 'holiday gift',
  'stocking stuffer', 'secret santa gift', 'gift idea', 'unique gift'];

const pickTags = (...banks) => {
  const seen = [];
  for (const bank of [...banks, giftCore]) for (const t of bank) {
    if (t.length <= 20 && !seen.includes(t)) seen.push(t);
    if (seen.length === 13) return seen;
  }
  return seen;
};

// ------------------------------------------------------------- description
const partner = 'Printed and shipped by our trusted print partner (Printify network).';
const disclosure = 'Original design by our studio, created with AI-assisted tools under our creative direction (disclosed per Etsy policy). Designed by {SHOP}.';

const DESC = {
  candle: (hook) => [hook, '',
    '• 9oz scented soy-blend candle, hand-poured by our production partner',
    '• Reusable glass vessel, cotton wick, 50+ hour burn time',
    `• ${partner}`, `• ${disclosure}`,
    '• Ships in 2–5 business days · Arrives gift-ready', '',
    'Trim wick to 1/4" before each burn. Never leave a burning candle unattended.'].join('\n'),
  tee: (hook) => [hook, '',
    '• Premium unisex tee (Bella+Canvas 3001) — soft ringspun cotton, retail fit',
    '• True to size; size chart in images. Sizes S–3XL, multiple colors',
    `• ${partner}`, `• ${disclosure}`,
    '• Ships in 2–5 business days', '',
    'Machine wash cold inside-out, tumble dry low.'].join('\n'),
  sweatshirt: (hook) => [hook, '',
    '• Cozy heavyweight crewneck (Gildan 18000), fleece-lined',
    '• Unisex fit, S–3XL, multiple colors — size chart in images',
    `• ${partner}`, `• ${disclosure}`,
    '• Ships in 2–5 business days', '',
    'Machine wash cold inside-out, tumble dry low.'].join('\n'),
  mug: (hook) => [hook, '',
    '• 11oz ceramic mug, vivid wraparound print, dishwasher & microwave safe',
    `• ${partner}`, `• ${disclosure}`,
    '• Ships in 2–5 business days · Packed in a protective box'].join('\n'),
  tote: (hook) => [hook, '',
    '• Sturdy cotton canvas tote, roomy enough for books, groceries, everything',
    `• ${partner}`, `• ${disclosure}`,
    '• Ships in 2–5 business days'].join('\n'),
};

// ---------------------------------------------------------------- listings
// [code, product, phrase, titleTail, tagBanks, hook]
const ROWS = [
  ['A1', 'candle', 'Pumpkin Season', 'Fall Candle | Autumn Decor | Cozy Hostess Gift | Soy Blend 9oz',
    [T.candleClassic, T.candleCore, T.candleFun], 'It is officially Pumpkin Season — light it and let the whole room agree.'],
  ['A2', 'candle', 'Sweater Weather', 'Fall Candle | Cozy Autumn Gift | Seasonal Home Decor | Soy Blend 9oz',
    [T.candleClassic, T.candleCore, T.candleFun], 'The candle equivalent of your favorite knit — Sweater Weather in a jar.'],
  ['A3', 'candle', 'Cozy Era', 'Retro Fall Candle | Autumn Aesthetic Decor | Gift for Her | 9oz',
    [T.candleCore, T.candleFun, T.candleClassic], 'Announce your Cozy Era with a warm retro glow.'],
  ['A4', 'candle', 'Falling Leaves', 'Fall Candle | Elegant Autumn Decor | Hostess Gift | Soy Blend 9oz',
    [T.candleCore, T.candleClassic, T.candleFun], 'Quiet, golden, unhurried — Falling Leaves for slow autumn evenings.'],
  ['A5', 'candle', 'Harvest Moon', 'Fall Candle | Autumn Home Decor | Thanksgiving Gift | Soy Blend 9oz',
    [T.candleClassic, T.candleCore, T.candleFun], 'A deep amber glow for long nights — Harvest Moon.'],
  ['A6', 'candle', 'Bonfire Nights', 'Fall Candle | Cozy Autumn Gift | Cabin Decor | Soy Blend 9oz',
    [T.candleCore, T.candleFun, T.candleClassic], 'Ember-lit and a little smoky — Bonfire Nights without the smoke in your eyes.'],
  ['A7', 'candle', 'Hot Cider SZN', 'Funny Fall Candle | Autumn Kitchen Decor | Gift for Her | 9oz',
    [T.candleFun, T.candleClassic, T.candleCore], 'Warm spice and zero patience for summer — it is Hot Cider SZN.'],
  ['A8', 'candle', 'Smells Like Fall', 'Minimalist Fall Candle | Modern Autumn Decor | Hostess Gift | 9oz',
    [T.candleCore, T.candleClassic, T.candleFun], 'Exactly what it says: it Smells Like Fall in the best possible way.'],
  ['A9', 'candle', 'Emotional Support Candle', 'Funny Candle | Gift for Her | Best Friend Gift | Soy Blend 9oz',
    [T.candleFun, T.candleCore, T.candleClassic], 'For daily use as needed: the Emotional Support Candle. Side effects include calm.'],
  ['A10', 'candle', 'Light Me When the Kids Are Asleep', 'Funny Candle | Mom Gift | Self Care Gift | 9oz',
    [T.candleFun, T.candleCore, T.candleClassic], 'The most honest candle in the house. You earned this one.'],
  ['A11', 'candle', 'Smells Like a Finished To-Do List', 'Funny Candle | Office Gift | Coworker Gift | 9oz',
    [T.candleFun, T.candleCore, T.candleClassic], 'Productivity has a scent, and it is this candle.'],
  ['A12', 'candle', 'First Day of Fall 2026', 'Commemorative Fall Candle | Autumn Tradition Gift | 9oz',
    [T.candleClassic, T.candleCore, T.candleFun], 'Mark the season properly — a collectible for the First Day of Fall, 2026.'],

  ['B1', 'tee', 'Teacher Era', 'Shirt | Retro Teacher Tee | Back to School | Teacher Appreciation Gift',
    [T.teacher, T.apparelCore], 'In your Teacher Era — retro varsity style for the classroom and everywhere else.'],
  ['B2', 'tee', 'Professional Chaos Coordinator', 'Shirt | Funny Teacher Tee | Back to School Gift',
    [T.teacher, T.apparelCore], 'Job title: Professional Chaos Coordinator. Accurate is an understatement.'],
  ['B3', 'tee', 'Teach Love Inspire', 'Shirt | Vintage Teacher Tee | Teacher Appreciation Gift',
    [T.teacher, T.apparelCore], 'Teach. Love. Inspire. The whole job in three words, in vintage collegiate style.'],
  ['B4', 'tee', 'Fueled by Coffee and Lesson Plans', 'Shirt | Funny Teacher Tee | New Teacher Gift',
    [T.teacher, T.apparelCore], 'Running entirely on Coffee & Lesson Plans — and honestly thriving.'],
  ['B5', 'tee', 'Best Class Ever Est. 2026', 'Shirt | Teacher Tee | First Day of School | Back to School',
    [T.teacher, T.apparelCore], 'Make it official: Best Class Ever, Est. 2026.'],
  ['B6', 'tee', 'Proud Dad of Girls', 'Shirt | Dad of Daughters Tee | Fathers Day Gift | Gift from Daughter',
    [T.dad, T.apparelCore], 'Varsity-style and proud of it — for the Proud Dad of Girls.'],
  ['B7', 'tee', 'Outnumbered and Loving It', 'Shirt | Funny Dad Tee | Dad of Daughters | Fathers Day Gift',
    [T.dad, T.apparelCore], 'Outnumbered & Loving It — the official shirt of dads who lost the majority vote.'],
  ['B8', 'tee', 'Dad of Daughters Best Job Ever', 'Shirt | Vintage Dad Badge Tee | Fathers Day Gift',
    [T.dad, T.apparelCore], 'Dad of Daughters: Best Job Ever. Vintage patch style, permanent position.'],
  ['B9', 'tee', 'Raising Strong Girls', 'Shirt | Dad Tee | Girl Dad Gift | Fathers Day | Gift for Him',
    [T.dad, T.apparelCore], 'The mission statement, in hand-script: Raising Strong Girls.'],
  ['B10', 'tee', 'Dog Mama', 'Shirt | Retro Dog Mom Tee | Dog Lover Gift | Fur Mama Gift',
    [T.dogmom, T.apparelCore], 'Retro script, paw-print flourish — Dog Mama, worn proudly.'],
  ['B11', 'tee', 'Professional Dog Cuddler', 'Shirt | Funny Dog Mom Tee | Dog Lover Gift',
    [T.dogmom, T.apparelCore], 'Certified, badge and all: Professional Dog Cuddler.'],
  ['B12', 'tee', 'My Dog Is My Therapist', 'Shirt | Funny Dog Lover Tee | Dog Mom Gift',
    [T.dogmom, T.apparelCore], 'Cheaper than sessions, better at listening: My Dog Is My Therapist.'],
  ['B13', 'tee', 'Raised on Belly Rubs', 'Shirt | Vintage Dog Lover Tee | Dog Owner Gift',
    [T.dogmom, T.apparelCore], 'A household philosophy: Raised on Belly Rubs.'],
  ['B14', 'tee', 'Grandma Era', 'Shirt | Retro Grandma Tee | New Grandma Gift | Nana Gift',
    [T.grandma, T.apparelCore], 'The best era yet — Grandma Era, in warm retro serif.'],
  ['B15', 'tee', 'Promoted to Nana 2026', 'Shirt | New Grandma Announcement Tee | Nana Gift',
    [T.grandma, T.apparelCore], 'Biggest promotion of a lifetime: Promoted to Nana, class of 2026.'],
  ['B16', 'tee', "Grandma's Garden Club", 'Shirt | Botanical Grandma Tee | Garden Lover Gift',
    [T.grandma, T.apparelCore], "Charter member, Grandma's Garden Club — vintage seed-packet style."],
  ['B17', 'tee', 'Spoiling Is My Love Language', 'Shirt | Funny Grandma Tee | Nana Gift | Gigi Gift',
    [T.grandma, T.apparelCore], 'Grandma truth, elegantly scripted: Spoiling Is My Love Language.'],
  ['B18', 'tee', 'Nurse Era', 'Shirt | Retro Nurse Tee | Nurse Appreciation Gift | RN Gift',
    [T.nurse, T.apparelCore], 'In your Nurse Era — retro serif with a heartbeat underline.'],
  ['B19', 'tee', 'Coffee Scrubs Repeat', 'Shirt | Funny Nurse Tee | Nursing Student Gift',
    [T.nurse, T.apparelCore], 'The schedule, printed: Coffee · Scrubs · Repeat.'],
  ['B20', 'tee', 'Emotional Support Nurse', 'Shirt | Funny Nurse Tee | Nurse Week Gift | RN Gift',
    [T.nurse, T.apparelCore], 'Badge-certified: Emotional Support Nurse, on duty always.'],

  ['C1', 'mug', 'Emotional Support Candle (Mug Edition)', 'Mug | Funny Coffee Mug | Best Friend Gift | 11oz',
    [T.mug, T.candleFun], 'The Emotional Support lineup, now in coffee form.', 'A9'],
  ['C2', 'mug', 'Smells Like a Finished To-Do List', 'Mug | Funny Office Mug | Coworker Gift | 11oz',
    [T.mug, T.candleFun], 'Pairs with productivity. Refills encouraged.', 'A11'],
  ['C3', 'mug', 'Professional Chaos Coordinator', 'Mug | Funny Teacher Mug | Teacher Gift | 11oz',
    [T.mug, T.teacher], 'For the desk of the Professional Chaos Coordinator.', 'B2'],
  ['C4', 'mug', 'Nurse Era', 'Mug | Nurse Coffee Mug | Nurse Appreciation Gift | 11oz',
    [T.mug, T.nurse], 'Shift fuel for the Nurse Era.', 'B18'],
  ['C5', 'tote', "Grandma's Garden Club", 'Tote Bag | Botanical Canvas Tote | Garden Lover Gift',
    [T.tote, T.grandma], "The official carry-all of Grandma's Garden Club.", 'B16'],
  ['C6', 'tote', 'Dog Mama', 'Tote Bag | Dog Mom Canvas Tote | Dog Lover Gift',
    [T.tote, T.dogmom], 'Treats, leash, poop bags, dignity — the Dog Mama tote holds it all.', 'B10'],
  ['C7', 'sweatshirt', 'Teacher Era', 'Sweatshirt | Cozy Teacher Crewneck | Teacher Appreciation Gift',
    [T.teacher, T.apparelCore], 'The Teacher Era crewneck — for grading weather.', 'B1'],
  ['C8', 'sweatshirt', 'Grandma Era', 'Sweatshirt | Cozy Grandma Crewneck | Nana Gift',
    [T.grandma, T.apparelCore], 'Grandma Era, fleece-lined.', 'B14'],
];

// ---------------------------------------------------------------- build
const listings = ROWS.map((row) => {
  const [code, productKey, phrase, tail, banks, hook, artFrom] = row;
  const p = PRODUCTS[productKey];
  let title = `${phrase} ${tail}`;
  if (title.length > 140) title = title.slice(0, 140).replace(/ [^ ]*$/, '');
  const tags = pickTags(...banks);
  return {
    code,
    art_file: `${artFrom || code}.png`,
    product: p.type,
    blueprint_hint: p.blueprintHint,
    price_usd: p.price,
    title,
    tags,
    description: DESC[productKey](hook),
    compliance: { ai_disclosure: true, attribution: 'designed_by', partner: 'printify' },
    status: 'spec',
  };
});

// sanity gates
for (const l of listings) {
  if (l.title.length > 140) throw new Error(`${l.code}: title too long`);
  if (l.tags.length !== 13) throw new Error(`${l.code}: ${l.tags.length} tags (${l.tags.join('|')})`);
  for (const t of l.tags) if (t.length > 20) throw new Error(`${l.code}: tag too long "${t}"`);
}

const out = join(here, '..', 'BATCH-01.listings.json');
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), count: listings.length, listings }, null, 2));
console.log(`wrote ${listings.length} listings -> ${out}`);
