#!/usr/bin/env node
// Measure real competition on Etsy for the terms this shop is betting on.
//
//   node ops.mjs etsy-demand
//
// Marketplace Insights (search VOLUME) is Shop-Manager-only — every API probe
// 404s. But /listings/active?keywords= is public and returns a real count of
// competing active listings, which is the other half of the picture and the
// half we can actually get without a human clicking.
//
// What this cannot tell you: how many people SEARCH a term. A term with 200
// competitors might have 5 searches a month. So low competition is a
// hypothesis worth testing, never a conclusion — and the shop's own stats
// remain the only source of demand truth once traffic starts.

import { readFileSync, writeFileSync } from 'node:fs';
import { call } from './etsy.mjs';
import { PATHS } from './config.mjs';

const NICHES = [
  'fall candle', 'teacher shirt', 'nurse shirt', 'dog mom gift',
  'grandma shirt', 'dad shirt', 'funny mug', 'canvas tote bag',
];

const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
const phrases = [...new Set(listings.map(l => l.phrase).filter(Boolean))];

async function competition(term) {
  const r = await call('GET', `/listings/active?keywords=${encodeURIComponent(term)}&limit=1`);
  return r.count ?? null;
}

const num = (n) => n === null ? '     ?' : n.toLocaleString().padStart(9);

console.log('\n  COMPETING ACTIVE LISTINGS — the broad niches we entered\n');
const nicheRows = [];
for (const t of NICHES) {
  const c = await competition(t);
  nicheRows.push({ term: t, count: c });
  console.log(`  ${num(c)}   ${t}`);
  await new Promise(r => setTimeout(r, 150));
}

console.log('\n  OUR EXACT PRINTED PHRASES — how crowded is the specific thing we sell\n');
const phraseRows = [];
for (const p of phrases) {
  const c = await competition(p);
  phraseRows.push({ phrase: p, count: c });
  await new Promise(r => setTimeout(r, 150));
}
phraseRows.sort((a, b) => (a.count ?? 1e9) - (b.count ?? 1e9));
for (const r of phraseRows) console.log(`  ${num(r.count)}   ${r.phrase}`);

const live = phraseRows.filter(r => typeof r.count === 'number');
const median = live.length ? live[Math.floor(live.length / 2)].count : null;
console.log(`\n  median competition across our phrases: ${median?.toLocaleString() ?? '?'}`);
console.log('  lowest 5 are the most winnable for a zero-review shop;');
console.log('  highest 5 are where we are shouting into a crowd.\n');
console.log('  CAVEAT: this is competition, NOT demand. A term with 200 competitors');
console.log('  may have almost no searches. Treat low counts as hypotheses to test,');
console.log('  and let the shop\'s own traffic stats settle it.\n');

writeFileSync(`${PATHS.state}/etsy-demand.json`, JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'Etsy Open API v3 GET /listings/active?keywords= — count of competing ACTIVE listings',
  caveat: 'Competition only. Search volume (Marketplace Insights) is not exposed by the API; every probe 404s.',
  niches: nicheRows,
  phrases: phraseRows,
  median_phrase_competition: median,
}, null, 2));
console.log(`  wrote state/etsy-demand.json\n`);
