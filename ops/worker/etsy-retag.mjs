#!/usr/bin/env node
// Replace unwinnable tags with measured long-tail alternatives.
//
//   node ops.mjs etsy-retag           propose and measure, change nothing
//   node ops.mjs etsy-retag --write   push the improved tag sets to Etsy
//
// The tag scan found 235 of 520 slots (45%) spent on tags with >200,000
// competing listings — "gift for her" at 9.8M, used on 15 listings. A shop with
// no reviews cannot rank for those; the slot is simply gone. Meanwhile the
// phrase-derived tags are wide open ("hot cider szn": 1 competitor).
//
// This does NOT strip every broad tag. Two are kept per listing on purpose:
// they carry category signal, and Etsy's own guidance is that recipient and
// occasion terms belong in tags rather than titles. What goes is the surplus —
// the 3rd through 7th near-identical gift tag, each one a slot spent on a
// lottery ticket.
//
// Every replacement is MEASURED before it is used. A long-tail tag nobody
// searches is no better than a broad tag nobody can win; low competition is a
// hypothesis, so candidates that turn out to be crowded are discarded rather
// than assumed good.

import { readFileSync, writeFileSync } from 'node:fs';
import { call, etsy } from './etsy.mjs';
import { makeClient } from './printify.mjs';
import { PATHS, env } from './config.mjs';

const MAX_TAG_CHARS = 20;          // Etsy hard limit
const TAG_SLOTS = 13;              // Etsy hard limit
const BROAD = 200000;              // above this, treat as unwinnable
const KEEP_BROAD = 2;              // category signal worth keeping

const shopId = env('ETSY_SHOP_ID');
const write = process.argv.includes('--write');
const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
const staged = JSON.parse(readFileSync(`${PATHS.state}/staged.json`, 'utf8'));
const measured = new Map(
  (JSON.parse(readFileSync(`${PATHS.state}/etsy-tags.json`, 'utf8')).tags || [])
    .map(t => [t.tag, t.count]));
const printify = makeClient(env('PRINTIFY_API_TOKEN'));

const cache = new Map(measured);
async function competition(tag) {
  if (cache.has(tag)) return cache.get(tag);
  let c = null;
  try {
    const r = await call('GET', `/listings/active?keywords=${encodeURIComponent(tag)}&limit=1`);
    c = r.count ?? null;
  } catch { /* unknown stays null and is not used */ }
  cache.set(tag, c);
  await new Promise(r => setTimeout(r, 120));
  return c;
}

// Long-tail candidates built from what this listing actually IS: fragments of
// its own printed phrase crossed with its product noun, plus a couple of
// descriptive pairings. Generic on purpose only where it stays specific.
const NOUN = {
  candle_9oz: ['candle', 'soy candle', '9oz candle'],
  tee_bella_3001: ['shirt', 'tee', 'graphic shirt'],
  sweatshirt_gildan_18000: ['sweatshirt', 'crewneck'],
  mug_11oz: ['mug', 'coffee mug', 'ceramic mug'],
  tote: ['tote', 'tote bag', 'canvas tote'],
};

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);

function candidates(listing) {
  const w = words(listing.phrase);
  const nouns = NOUN[listing.product] || ['gift'];
  const out = new Set();
  // whole phrase if it fits
  const whole = w.join(' ');
  if (whole.length <= MAX_TAG_CHARS) out.add(whole);
  // trailing and leading fragments crossed with the product noun
  for (let n = Math.min(3, w.length); n >= 2; n--) {
    for (const frag of [w.slice(0, n).join(' '), w.slice(-n).join(' ')]) {
      if (frag.length <= MAX_TAG_CHARS) out.add(frag);
      for (const noun of nouns) {
        const t = `${frag} ${noun}`;
        if (t.length <= MAX_TAG_CHARS) out.add(t);
      }
    }
  }
  return [...out];
}

const proposals = [];
for (const l of listings) {
  if (!staged.items[l.code]) continue;           // only live ones
  const tags = l.tags || [];
  const scored = [];
  for (const t of tags) scored.push({ tag: t, count: await competition(t) });
  const broad = scored.filter(s => (s.count ?? 0) > BROAD).sort((a, b) => b.count - a.count);
  const keep = scored.filter(s => !broad.includes(s));
  // keep the two least-bad broad tags for category signal
  const keptBroad = broad.slice(-KEEP_BROAD);
  const dropping = broad.slice(0, Math.max(0, broad.length - KEEP_BROAD));
  if (!dropping.length) continue;

  const fresh = [];
  const have = new Set([...keep, ...keptBroad].map(s => s.tag));
  for (const c of candidates(l)) {
    if (fresh.length >= dropping.length) break;
    if (have.has(c)) continue;
    const n = await competition(c);
    if (n === null) continue;
    if (n > BROAD) continue;                      // no better than what we dropped
    fresh.push({ tag: c, count: n });
    have.add(c);
  }
  // Never ship fewer than 13 tags. When measured replacements run out, refill
  // from the tags we were dropping, least-crowded first — a broad tag is a long
  // shot, but an empty slot is a guaranteed zero, and Etsy's own guidance is to
  // use all 13. This is why the earlier pass proposed 87 replacements for 135
  // slots and would have shipped listings with 9 tags.
  const chosen = [...keep, ...keptBroad, ...fresh];
  const refill = [...dropping].sort((a, b) => a.count - b.count);
  while (chosen.length < TAG_SLOTS && refill.length) chosen.push(refill.shift());
  const next = chosen.slice(0, TAG_SLOTS).map(s => s.tag);
  proposals.push({ code: l.code, dropping: dropping.map(d => d), adding: fresh, next });
}

console.log(`\n  ${proposals.length} listing(s) have unwinnable tags to replace\n`);
for (const p of proposals.slice(0, 5)) {
  console.log(`  ${p.code}`);
  for (const d of p.dropping.slice(0, 3)) console.log(`    - ${String(d.count.toLocaleString()).padStart(10)}  ${d.tag}`);
  for (const a of p.adding.slice(0, 3)) console.log(`    + ${String(a.count.toLocaleString()).padStart(10)}  ${a.tag}`);
}
if (proposals.length > 5) console.log(`\n  … and ${proposals.length - 5} more`);

const droppedTotal = proposals.reduce((s, p) => s + p.dropping.length, 0);
const addedTotal = proposals.reduce((s, p) => s + p.adding.length, 0);
console.log(`\n  ${droppedTotal} unwinnable slots identified · ${addedTotal} measured replacements found`);

if (!write) {
  console.log('\n  nothing written. To apply:  node ops.mjs etsy-retag --write\n');
  process.exitCode = 0;
} else {
  let ok = 0, failed = 0;
  for (const p of proposals) {
    const item = staged.items[p.code];
    const prod = await printify.getProduct(env('PRINTIFY_SHOP_ID'), item.product_id);
    const etsyId = prod.external?.id;
    if (!etsyId) { console.log(`  SKIP ${p.code} — no Etsy listing id`); continue; }
    try {
      await call('PATCH', `/shops/${shopId}/listings/${etsyId}`, { tags: p.next });
      ok++; console.log(`  RETAGGED ${p.code.padEnd(4)} ${etsyId}  (${p.next.length} tags)`);
    } catch (e) {
      failed++; console.log(`  FAILED   ${p.code.padEnd(4)} ${e.message.slice(0, 130)}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`\n  ${ok} retagged · ${failed} failed\n`);
  process.exitCode = failed ? 1 : 0;
}

writeFileSync(`${PATHS.state}/etsy-retag.json`, JSON.stringify({
  fetchedAt: new Date().toISOString(),
  broad_threshold: BROAD,
  kept_broad_per_listing: KEEP_BROAD,
  proposals,
}, null, 2));
