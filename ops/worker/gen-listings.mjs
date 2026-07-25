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
import { loadConfig } from './config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = loadConfig();
const SHOP = (cfg.shop_name || '').trim();
if (!SHOP) {
  console.error('shop_name is empty in ops/config.json — set the real Etsy shop name, then re-run.');
  console.error('(descriptions carry "Designed by <shop>"; publishing a placeholder would be visible to buyers)');
  process.exit(1);
}

// ---------------------------------------------------------------- products
const PRODUCTS = {
  candle: { type: 'candle_9oz', price: 28.95, blueprintHint: 'scented candle 9oz' },
  tee: { type: 'tee_bella_3001', price: 23.95, blueprintHint: 'Bella+Canvas 3001' },
  // 35.95, not 34.95: Etsy's US Free Shipping Guarantee triggers at $35 and a
  // sweatshirt is the one item in this batch that sells alone above it.
  sweatshirt: { type: 'sweatshirt_gildan_18000', price: 35.95, blueprintHint: 'Gildan 18000' },
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
  // "comfort tee" is deliberately absent: Comfort Colors is a Gildan trademark
  // and the garment this pipeline resolves is a Bella+Canvas 3001.
  apparelCore: ['gift for her', 'vintage style tee', 'soft cotton tee', 'graphic tee'],
  // same, minus the recipient assumption — a dad shirt tagged "gift for her"
  // competes for a query it can never satisfy
  apparelNeutral: ['vintage style tee', 'soft cotton tee', 'graphic tee'],
  // sweatshirts need their own core: the tee tags are filtered out of a
  // crewneck listing by nounSafe, which used to leave it padding with generics
  sweatshirtCore: ['cozy sweatshirt', 'crewneck sweater', 'graphic sweatshirt',
    'oversized crewneck', 'gift for her'],
  mug: ['coffee mug', 'funny mug', 'mug gift', 'office gift', 'coworker gift', 'ceramic mug 11oz'],
  tote: ['tote bag', 'canvas tote', 'market bag', 'book bag', 'shopping tote', 'gift for her'],
};

// every listing can draw from this generic gift bank to reach 13 tags
const giftCore = ['gift for him', 'birthday gift', 'christmas gift', 'holiday gift',
  'stocking stuffer', 'secret santa gift', 'gift idea', 'unique gift'];

// Etsy de-clumps results so one shop does not dominate a query: five listings
// carrying the SAME 13 tags are not five shots at "teacher shirt", they are one
// shot and four listings paying rent. So every listing leads with tags naming
// the phrase actually printed on it, then draws a rotating slice of the shared
// banks — siblings sharing a bank get different slices, not identical sets.
// The shared banks cross product lines: T.dogmom holds "dog mom shirt", and a
// tote drawing from it ended up titled "Dog Mama Tote Bag | … | Dog Mom Shirt".
// A buyer reads the title as a description of the thing in the box, so a tag
// naming someone else's product noun is filtered out for that listing.
const PRODUCT_NOUNS = {
  candle: ['candle', 'jar'],
  tee: ['shirt', 'tee', 'tshirt'],
  sweatshirt: ['sweatshirt', 'crewneck', 'sweater'],
  mug: ['mug', 'cup'],
  tote: ['tote', 'bag'],
};
const ALL_NOUNS = [...new Set(Object.values(PRODUCT_NOUNS).flat())];

function nounSafe(productKey, tag) {
  const mine = PRODUCT_NOUNS[productKey] || [];
  const words = tag.toLowerCase().match(/[a-z0-9]+/g) || [];
  return !words.some((w) => ALL_NOUNS.includes(w) && !mine.includes(w));
}

const bankRotation = new Map();
function pickTags(productKey, phraseTags, banks) {
  const signature = banks.map(b => b[0]).join('|');
  const offset = bankRotation.get(signature) ?? 0;
  bankRotation.set(signature, offset + 1);

  const out = [];
  const add = (t) => {
    if (!t || t.length > 20 || out.includes(t) || out.length >= 13) return;
    if (!nounSafe(productKey, t)) return;
    out.push(t);
  };
  const rotate = (bank) => {
    const k = bank.length ? offset % bank.length : 0;
    return bank.slice(k).concat(bank.slice(0, k));
  };

  phraseTags.forEach(add);
  for (const bank of banks) rotate(bank).forEach(add);
  rotate(giftCore).forEach(add);
  return out;
}

// Titles ran 56-87 characters against Etsy's 140 limit — real search surface
// left silent. Extend each one with its own tags, most specific first.
//
// Two limits, both learned the hard way. A tag must bring a word the title does
// not already have, or padding produces "Funny Coffee Mug | Funny Gift Mug |
// Funny Mug | Mug Gift" — length without reach. And it stops at 95, not 115:
// Etsy's 2025 guidance reads title, tags, attributes and description together,
// so the title no longer has to carry every keyword, and occasion and
// recipient terms belong in the tags where they already are. Padding to 115
// was just re-stating the tag list in title case.
const TITLE_EXCLUDE = new Set([
  'gift for her', 'gift for him', 'birthday gift', 'christmas gift',
  'holiday gift', 'stocking stuffer', 'secret santa gift', 'gift idea',
  'unique gift', 'housewarming gift', 'best friend gift', 'appreciation gift',
  'hostess gift',
]);

function padTitle(title, tags) {
  const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const words = (s) => s.toLowerCase().match(/[a-z0-9]+/g) || [];
  const count = new Map();
  for (const w of words(title)) count.set(w, (count.get(w) ?? 0) + 1);

  for (const t of tags) {
    if (title.length >= 95) break;
    if (TITLE_EXCLUDE.has(t)) continue;
    const tagWords = words(t);
    if (tagWords.every((w) => count.has(w))) continue;          // adds no new word
    if (tagWords.some((w) => (count.get(w) ?? 0) >= 2)) continue; // would stutter
    const segment = ' | ' + titleCase(t);
    if (title.length + segment.length > 138) continue;
    title += segment;
    tagWords.forEach((w) => count.set(w, (count.get(w) ?? 0) + 1));
  }
  return title;
}

// Repetition is worth knowing about, but fixing it by deleting words wrecks
// meaning — an earlier pass turned "New Grandma Gift" into "New Gift". So this
// reports and the wording gets fixed by hand in the ROWS table above.
function repeatedWords(title) {
  const counts = new Map();
  // "gift" recurring is how Etsy titles read; a niche noun three times is not
  const generic = new Set(['gift', 'gifts', 'from', 'with', 'that', 'your']);
  for (const w of title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 3 && !generic.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 3).map(([w]) => w);
}

// ------------------------------------------------------------- description
const partner = `Printed and shipped by our production partner (${cfg.production_partner}).`;
const disclosure = `Original design by ${SHOP}, created with AI-assisted tools under our creative direction (disclosed per Etsy policy). Designed by ${SHOP}.`;

// A shipping claim only goes into a description when the operator has recorded a
// real number AND said where it came from. Etsy shows the listing's processing
// time either way, so an unsourced promise here adds nothing and risks
// everything — a late ship voids Purchase Protection and Star Seller standing.
const proc = cfg.processing || {};
const shipLine = (proc.days || '').trim() && (proc.source || '').trim()
  ? [`• Ships in ${proc.days.trim()}`]
  : [];
if (!shipLine.length) {
  console.log('note: ops/config.json processing.days/source are blank, so no shipping');
  console.log('      promise is written into the descriptions. Etsy still shows your');
  console.log('      processing time. Fill both in once you know the real lead time.');
}

const DESC = {
  candle: (hook) => [hook, '',
    '• 9oz scented soy-blend candle, hand-poured by our production partner',
    '• Reusable glass vessel, cotton wick, 50+ hour burn time',
    `• ${partner}`, `• ${disclosure}`, ...shipLine, '',
    'Trim wick to 1/4" before each burn. Never leave a burning candle unattended.'].join('\n'),
  tee: (hook) => [hook, '',
    '• Premium unisex tee (Bella+Canvas 3001) — soft ringspun cotton, retail fit',
    '• True to size. Sizes S–3XL, in a range of colors',
    `• ${partner}`, `• ${disclosure}`, ...shipLine, '',
    'Machine wash cold inside-out, tumble dry low.'].join('\n'),
  sweatshirt: (hook) => [hook, '',
    '• Cozy heavyweight crewneck (Gildan 18000), fleece-lined',
    '• Unisex fit, S–3XL, in a range of colors',
    `• ${partner}`, `• ${disclosure}`, ...shipLine, '',
    'Machine wash cold inside-out, tumble dry low.'].join('\n'),
  mug: (hook) => [hook, '',
    '• 11oz ceramic mug, vivid wraparound print, dishwasher & microwave safe',
    `• ${partner}`, `• ${disclosure}`, ...shipLine,
    '• Packed in a protective box'].join('\n'),
  tote: (hook) => [hook, '',
    '• Sturdy cotton canvas tote, roomy enough for books, groceries, everything',
    `• ${partner}`, `• ${disclosure}`, ...shipLine].join('\n'),
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
  ['A8', 'candle', 'Smells Like Fall', 'Minimalist Soy Candle | Modern Autumn Decor | Hostess Gift | 9oz',
    [T.candleCore, T.candleClassic, T.candleFun], 'Exactly what it says: it Smells Like Fall in the best possible way.'],
  ['A9', 'candle', 'Emotional Support Candle', 'Gift for Her | Best Friend Gift | Funny Soy Candle 9oz',
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
    [T.dad, T.apparelNeutral], 'Varsity-style and proud of it — for the Proud Dad of Girls.'],
  ['B7', 'tee', 'Outnumbered and Loving It', 'Shirt | Funny Dad Tee | Dad of Daughters | Fathers Day Gift',
    [T.dad, T.apparelNeutral], 'Outnumbered & Loving It — the official shirt of dads who lost the majority vote.'],
  ['B8', 'tee', 'Dad of Daughters Best Job Ever', 'Shirt | Vintage Dad Badge Tee | Fathers Day Gift',
    [T.dad, T.apparelNeutral], 'Dad of Daughters: Best Job Ever. Vintage patch style, permanent position.'],
  ['B9', 'tee', 'Raising Strong Girls', 'Shirt | Dad Tee | Girl Dad Gift | Fathers Day | Gift for Him',
    [T.dad, T.apparelNeutral], 'The mission statement, in hand-script: Raising Strong Girls.'],
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

  // C1/C2 get their own art. They used to reuse the A9/A11 candle designs,
  // which meant shipping a mug with the word "Candle" printed on it and copy
  // built on "smells like" — a joke that only works on a candle.
  ['C1', 'mug', 'Emotional Support Coffee', 'Mug | Funny Coffee Mug | Best Friend Gift | 11oz',
    [T.mug, T.candleFun], 'Prescribed daily, refilled hourly: Emotional Support Coffee.'],
  ['C2', 'mug', 'Powered by Finished To-Do Lists', 'Mug | Funny Office Mug | Coworker Gift | 11oz',
    [T.mug, T.candleFun], 'Pairs with productivity. Refills encouraged.'],
  ['C3', 'mug', 'Professional Chaos Coordinator', 'Mug | Funny Teacher Mug | Teacher Gift | 11oz',
    [T.mug, T.teacher], 'For the desk of the Professional Chaos Coordinator.', 'B2'],
  ['C4', 'mug', 'Nurse Era', 'Mug | Nurse Coffee Mug | Nurse Appreciation Gift | 11oz',
    [T.mug, T.nurse], 'Shift fuel for the Nurse Era.', 'B18'],
  ['C5', 'tote', "Grandma's Garden Club", 'Tote Bag | Botanical Canvas Tote | Garden Lover Gift',
    [T.tote, T.grandma], "The official carry-all of Grandma's Garden Club.", 'B16'],
  ['C6', 'tote', 'Dog Mama', 'Tote Bag | Dog Mom Canvas Tote | Dog Lover Gift',
    [T.tote, T.dogmom], 'Treats, leash, poop bags, dignity — the Dog Mama tote holds it all.', 'B10'],
  ['C7', 'sweatshirt', 'Teacher Era', 'Sweatshirt | Cozy Teacher Crewneck | Teacher Appreciation Gift',
    [T.teacher, T.sweatshirtCore], 'The Teacher Era crewneck — for grading weather.', 'B1'],
  ['C8', 'sweatshirt', 'Grandma Era', 'Sweatshirt | Cozy Grandma Crewneck | Nana Gift',
    [T.grandma, T.sweatshirtCore], 'Grandma Era, fleece-lined.', 'B14'],
];

// ------------------------------------------------------------ phrase tags
// The phrase actually printed on the product is the least contested thing we
// sell — nobody else is bidding on "outnumbered dad". Before this table not one
// tag in the batch contained any of these, so the only differentiated search
// surface we had was the one we never claimed. Two per listing, ≤20 chars,
// placed ahead of the shared banks.
const PHRASE_TAGS = {
  A1: ['pumpkin season', 'pumpkin spice gift'],
  A2: ['sweater weather', 'cozy candle gift'],
  A3: ['cozy era', 'retro fall candle'],
  A4: ['falling leaves', 'elegant fall decor'],
  A5: ['harvest moon', 'amber candle'],
  A6: ['bonfire candle', 'cabin decor gift'],
  A7: ['hot cider szn', 'spiced cider candle'],
  A8: ['smells like fall', 'minimalist candle'],
  A9: ['emotional support', 'support candle'],
  A10: ['mom candle gift', 'quiet time candle'],
  A11: ['to do list candle', 'productivity gift'],
  A12: ['first day of fall', 'fall 2026'],

  B1: ['teacher era shirt', 'retro teacher tee'],
  B2: ['chaos coordinator', 'funny teacher tee'],
  B3: ['teach love inspire', 'vintage teacher'],
  B4: ['coffee and lessons', 'lesson plan shirt'],
  B5: ['best class ever', 'class of 2026 tee'],
  B6: ['proud dad of girls', 'girl dad shirt'],
  B7: ['outnumbered dad', 'funny dad tee'],
  B8: ['best job ever', 'dad badge tee'],
  B9: ['raising strong girl', 'girl dad tee'],
  B10: ['dog mama shirt', 'retro dog mom tee'],
  B11: ['dog cuddler shirt', 'funny dog mom tee'],
  B12: ['dog is my therapist', 'dog therapy shirt'],
  B13: ['belly rubs shirt', 'vintage dog tee'],
  B14: ['grandma era shirt', 'retro grandma tee'],
  B15: ['promoted to nana', 'new nana 2026'],
  B16: ['garden club shirt', 'botanical grandma'],
  B17: ['spoiling grandma', 'love language tee'],
  B18: ['nurse era shirt', 'retro nurse tee'],
  B19: ['coffee scrubs', 'scrub life tee'],
  B20: ['support nurse tee', 'funny nurse tee'],

  C1: ['support coffee mug', 'funny gift mug'],
  C2: ['to do list mug', 'office humor mug'],
  C3: ['chaos coordinator', 'teacher mug gift'],
  C4: ['nurse era mug', 'rn coffee mug'],
  C5: ['garden club tote', 'botanical tote'],
  C6: ['dog mama tote', 'dog mom tote bag'],
  C7: ['teacher crewneck', 'teacher sweatshirt'],
  C8: ['grandma crewneck', 'nana sweatshirt', 'grandma sweatshirt'],
};

// ---------------------------------------------------------------- build
const listings = ROWS.map((row) => {
  const [code, productKey, phrase, tail, banks, hook, artFrom] = row;
  const p = PRODUCTS[productKey];
  const tags = pickTags(productKey, PHRASE_TAGS[code] || [], banks);
  let title = padTitle(`${phrase} ${tail}`, tags);
  if (title.length > 140) title = title.slice(0, 140).replace(/ [^ ]*$/, '');
  return {
    code,
    // the words actually printed on the product — what the trademark screen
    // screens, and the thing a strike would be about
    phrase,
    art_file: `${artFrom || code}.png`,
    product: p.type,
    blueprint_hint: p.blueprintHint,
    price_usd: p.price,
    title,
    tags,
    description: DESC[productKey](hook),
    compliance: { ai_disclosure: cfg.ai_disclosure, attribution: cfg.attribution, partner: 'printify', shop: SHOP },
    status: 'spec',
  };
});

// ---------------------------------------------------------------- gates
// These throw rather than warn. A listing file that violates one of these is
// not a style problem — it is money spent on a listing that cannot be found,
// or text a buyer will read and hold us to.
for (const l of listings) {
  const ph = (l.title + l.description + l.tags.join(' ')).match(/\{[A-Z_]+\}/);
  if (ph) throw new Error(`${l.code}: unsubstituted placeholder ${ph[0]}`);
  if (l.title.length > 140) throw new Error(`${l.code}: title too long`);
  if (l.tags.length !== 13) throw new Error(`${l.code}: ${l.tags.length} tags (${l.tags.join('|')})`);
  for (const t of l.tags) if (t.length > 20) throw new Error(`${l.code}: tag too long "${t}"`);
  if (!(PHRASE_TAGS[l.code] || []).length) {
    throw new Error(`${l.code}: no phrase tags — the printed phrase is the one keyword nobody else owns, so it must be tagged`);
  }
  // Never claim a brand we do not print on. Comfort Colors is Gildan's.
  const surface = `${l.title} ${l.tags.join(' ')} ${l.description}`;
  const brand = surface.match(/comfort colors|gildan(?! 18000)|nike|disney|stanley|carhartt/i);
  if (brand) throw new Error(`${l.code}: names a brand we do not sell — "${brand[0]}"`);
}

// Two listings sharing a tag set are one listing competing with itself: Etsy
// de-clumps a single shop's results, so the second one pays its fee and ranks
// nowhere. Before this gate the 40 listings resolved to 13 distinct sets.
const bySet = new Map();
for (const l of listings) {
  const key = [...l.tags].sort().join('|');
  if (!bySet.has(key)) bySet.set(key, []);
  bySet.get(key).push(l.code);
}
const collisions = [...bySet.values()].filter(codes => codes.length > 1);
if (collisions.length) {
  throw new Error(`identical tag sets — these listings would compete with each other: ${collisions.map(c => c.join('/')).join(', ')}`);
}

// Report, don't throw: title length is a judgement call, but 60 characters of
// a 140-character budget is a lot of unclaimed search surface to leave silent.
const short = listings.filter(l => l.title.length < 70);
const stutter = listings.map(l => [l.code, repeatedWords(l.title)]).filter(([, w]) => w.length);
const distinctTags = new Set(listings.flatMap(l => l.tags)).size;

const out = join(here, '..', 'BATCH-01.listings.json');
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), count: listings.length, listings }, null, 2));
console.log(`wrote ${listings.length} listings -> ${out}`);
console.log(`${bySet.size} distinct tag sets · ${distinctTags} distinct tags across ${listings.length * 13} slots`);
if (short.length) {
  console.log(`${short.length} titles under 90 chars — unused search surface: ${short.map(l => `${l.code}(${l.title.length})`).join(' ')}`);
}
if (stutter.length) {
  console.log(`titles repeating a word 3+ times — reword the tail in ROWS: ${stutter.map(([c, w]) => `${c}(${w.join(',')})`).join(' ')}`);
}
