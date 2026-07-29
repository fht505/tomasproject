#!/usr/bin/env node
// Score candidate phrases BEFORE any design time is spent on them.
//
//   node ops.mjs scout                 score the built-in candidate list
//   node ops.mjs scout "phrase one" "phrase two"
//
// Batch 1 was built in the expensive order: draw 34 designs, then screen
// trademarks (2 designs died), then measure competition (several landed on
// phrases with 100k+ competitors, one at 272k). Every one of those checks is
// cheap and every one of them could have run first.
//
// So this runs them first. For each candidate it reports:
//   - competing active listings on Etsy (the API can answer this)
//   - whether the phrase collides with anything already screened
//   - a flag when the phrase is a known-crowded pattern
//
// It deliberately does NOT clear trademarks. That still needs a human with
// USPTO — this only stops us paying for art on a phrase that was never worth
// screening.

import { readFileSync, existsSync } from 'node:fs';
import { call } from './etsy.mjs';
import { PATHS } from './config.mjs';

// Batch 3 candidates: fall/holiday candles. Chosen because measured competition
// put "fall candle" at 44,418 against 870,402 for "teacher shirt" — 6x less
// contested — and candles carry the best verified margin at $14.08.
const CANDIDATES = [
  'Chaos Coordinator Fuel',
  'Emotionally Unavailable Until Coffee',
  'This Candle Owes Me Nothing',
  'Burn After Parenting',
  'Sunday Reset Ritual',
  'Overthinking Season',
  'Certified Homebody',
  'Introvert Recharge Station',
  'The Kids Are Finally Asleep',
  'Cancelled Plans Celebration',
  'Reheated Coffee Club',
  'Professional Blanket Warmer',
  'Cozy Girl Autumn',
  'Leaf Peeping Season',
  'Flannel and Firewood',
  'October Is A Personality',
  'Sweatpants Weather',
  'Apple Orchard Afternoon',
  'Woodsmoke and Wool',
  'Last Warm Day',
];

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const phrases = args.length ? args : CANDIDATES;

const screened = existsSync(`${PATHS.state}/tm-screen.json`)
  ? JSON.parse(readFileSync(`${PATHS.state}/tm-screen.json`, 'utf8')).verdicts || {}
  : {};

// Words that carry someone else's registration in the phrases we already lost.
// Not a trademark check — a cheap pre-filter so obvious repeats never reach one.
const BURNT = ['love language', 'teach love', 'sweater weather', 'harvest moon', 'dog mama'];

async function competition(term) {
  try {
    const r = await call('GET', `/listings/active?keywords=${encodeURIComponent(term)}&limit=1`);
    return r.count ?? null;
  } catch { return null; }
}

const rows = [];
for (const p of phrases) {
  const count = await competition(p);
  const lower = p.toLowerCase();
  const collides = BURNT.find(b => lower.includes(b)) || null;
  const alreadyScreened = screened[p]?.verdict || null;
  rows.push({ phrase: p, count, collides, alreadyScreened });
  await new Promise(r => setTimeout(r, 130));
}

rows.sort((a, b) => (a.count ?? 1e9) - (b.count ?? 1e9));
const num = (n) => n === null ? '      ?' : n.toLocaleString().padStart(8);

console.log('\n  CANDIDATE PHRASES — competing active listings on Etsy\n');
for (const r of rows) {
  const flags = [
    r.collides ? `contains "${r.collides}" (burnt)` : null,
    r.alreadyScreened ? `already screened: ${r.alreadyScreened}` : null,
    r.count !== null && r.count < 50 ? 'wide open' : null,
    r.count !== null && r.count > 50000 ? 'crowded' : null,
  ].filter(Boolean).join(' · ');
  console.log(`  ${num(r.count)}  ${r.phrase.padEnd(38)} ${flags}`);
}

const viable = rows.filter(r => !r.collides && (r.count ?? 1e9) < 5000);
console.log(`\n  ${viable.length} of ${rows.length} are viable on competition alone (<5,000, no burnt phrase)`);
console.log('  NEXT STEP IS NOT ART. Trademark-screen the shortlist first —');
console.log('  that is what killed two finished designs in batch 1:');
console.log(`    node ops.mjs tm\n`);
console.log('  Reminder: this measures COMPETITION, not demand. A phrase with');
console.log('  3 competitors may have 3 searchers. It only tells you where you');
console.log('  are not shouting into a crowd.\n');
