#!/usr/bin/env node
// Measure competition on every tag this shop uses.
//
//   node ops.mjs etsy-tags            measure and report
//
// The demand scan showed the broad niches are effectively closed (870k
// competing listings for "teacher shirt") while our specific phrases are wide
// open (1 for "Hot Cider SZN"). Tags are where that asymmetry is actionable —
// but only within Etsy's limits: 20 characters per tag, 13 per listing. Most of
// our best phrases are longer than 20 characters and therefore cannot be tags
// at all; they live in titles, where they already lead.
//
// So this measures what we ACTUALLY tag with, to find the tags that are pure
// waste — the ones competing against hundreds of thousands of listings, which a
// zero-review shop will never rank for and which occupy a slot that could hold
// something winnable.

import { readFileSync, writeFileSync } from 'node:fs';
import { call } from './etsy.mjs';
import { PATHS } from './config.mjs';

const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
const tagUse = new Map();          // tag -> codes using it
for (const l of listings) {
  for (const t of l.tags || []) {
    if (!tagUse.has(t)) tagUse.set(t, []);
    tagUse.get(t).push(l.code);
  }
}

console.log(`\n  measuring ${tagUse.size} distinct tags…\n`);
const rows = [];
for (const [tag, codes] of tagUse) {
  let count = null;
  try {
    const r = await call('GET', `/listings/active?keywords=${encodeURIComponent(tag)}&limit=1`);
    count = r.count ?? null;
  } catch { /* leave null, reported as unknown */ }
  rows.push({ tag, count, uses: codes.length, chars: tag.length });
  await new Promise(r => setTimeout(r, 120));
}

rows.sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
const num = (n) => n === null ? '        ?' : n.toLocaleString().padStart(9);

console.log('  WORST 20 — highest competition, a zero-review shop cannot rank here\n');
for (const r of rows.slice(0, 20)) console.log(`  ${num(r.count)}  ${String(r.uses).padStart(2)}x  ${r.tag}`);

console.log('\n  BEST 20 — genuinely winnable\n');
for (const r of rows.slice(-20).reverse()) console.log(`  ${num(r.count)}  ${String(r.uses).padStart(2)}x  ${r.tag}`);

const known = rows.filter(r => typeof r.count === 'number').sort((a, b) => a.count - b.count);
const median = known.length ? known[Math.floor(known.length / 2)].count : null;
const brutal = known.filter(r => r.count > 200000);
console.log(`\n  median tag competition: ${median?.toLocaleString() ?? '?'}`);
console.log(`  tags above 200k competitors: ${brutal.length} of ${known.length} — occupying ${brutal.reduce((s, r) => s + r.uses, 0)} of ${listings.length * 13} slots\n`);

writeFileSync(`${PATHS.state}/etsy-tags.json`, JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'Etsy Open API v3 GET /listings/active?keywords= per tag',
  caveat: 'Competition only, not search volume. A tag with low competition may also have low demand.',
  median_competition: median,
  tags: rows,
}, null, 2));
console.log(`  wrote state/etsy-tags.json\n`);
