#!/usr/bin/env node
// Trademark screen for every phrase we print.
//
//   node tm.mjs               what still needs screening, with the search links
//   node tm.mjs pass A1,B7    record that you checked those and they are clear
//   node tm.mjs fail B7 "reason"
//   node tm.mjs show          the full recorded screen
//
// BATCH-01.md has described this gate since the beginning, and nothing
// enforced it — the gate existed only as a sentence in a document. A phrase
// printed on a product is the one thing that can end the shop without warning
// and without caring that it was an accident, so this fails CLOSED: `stage`
// refuses to create a product whose phrase has no recorded PASS.
//
// It cannot search for you. There is no trademark API here, and guessing would
// be worse than useless. What it does is make the check impossible to skip
// silently, hand you the exact searches, and keep a dated record of what you
// found — which is also the thing you would want if a claim ever arrived.

import { PATHS } from './config.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const screenPath = join(PATHS.state, 'tm-screen.json');
const [cmd = 'list', arg, ...restArgs] = process.argv.slice(2);

// Lazy: stage.mjs imports tmBlocker from this file, so nothing here may read a
// file or exit at import time.
//
// One phrase can appear on several products (a tee and its mug). Screen the
// phrase once; every listing carrying it inherits the verdict.
let _byPhrase = null;
function phraseIndex() {
  if (_byPhrase) return _byPhrase;
  if (!existsSync(PATHS.listings)) {
    throw new Error('no BATCH-01.listings.json — run: node ops.mjs listings');
  }
  const { listings } = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
  _byPhrase = new Map();
  for (const l of listings) {
    const p = (l.phrase || '').trim();
    if (!p) continue;
    if (!_byPhrase.has(p)) _byPhrase.set(p, []);
    _byPhrase.get(p).push(l.code);
  }
  return _byPhrase;
}

const load = () => (existsSync(screenPath)
  ? JSON.parse(readFileSync(screenPath, 'utf8'))
  : { fetchedAt: null, source: 'operator trademark screen', produced_by: 'tm.mjs', verdicts: {} });

const save = (s) => {
  mkdirSync(PATHS.state, { recursive: true });
  s.fetchedAt = new Date().toISOString();
  writeFileSync(screenPath, JSON.stringify(s, null, 2));
};

const searchLinks = (phrase) => {
  const q = encodeURIComponent(phrase);
  return [
    `  USPTO  https://tmsearch.uspto.gov/search/search-information?q=${q}`,
    `  Etsy   https://www.etsy.com/search?q=${q}`,
  ].join('\n');
};

// A code list resolves to the phrases those codes carry, so you can screen the
// way you read the batch (by code) while the record stays keyed by phrase.
function phrasesFor(spec) {
  const byPhrase = phraseIndex();
  if (!spec) return [];
  if (spec === 'all') return [...byPhrase.keys()];
  const wanted = spec.split(',').map(s => s.trim()).filter(Boolean);
  const out = new Set();
  for (const w of wanted) {
    const direct = [...byPhrase.keys()].find(p => p.toLowerCase() === w.toLowerCase());
    if (direct) { out.add(direct); continue; }
    const hit = [...byPhrase.entries()].find(([, codes]) => codes.includes(w));
    if (hit) out.add(hit[0]);
    else console.log(`  ? "${w}" is not a code or phrase in this batch`);
  }
  return [...out];
}

const commands = {
  list() {
    const byPhrase = phraseIndex();
    const s = load();
    const pending = [];
    let passed = 0, failed = 0;
    for (const [phrase, codes] of byPhrase) {
      const v = s.verdicts[phrase];
      if (!v) pending.push([phrase, codes]);
      else if (v.verdict === 'PASS') passed++;
      else failed++;
    }
    console.log(`\n  ${byPhrase.size} distinct printed phrases · ${passed} cleared · ${failed} rejected · ${pending.length} unscreened\n`);
    if (!pending.length) {
      console.log('  every phrase has a recorded verdict — staging is unblocked\n');
      return 0;
    }
    console.log('  Check each of these, then record it. Look for the phrase as a\n'
      + '  registered mark in the relevant goods class, and for another Etsy\n'
      + '  seller using it as a brand name rather than as a joke on a shirt.\n');
    for (const [phrase, codes] of pending) {
      console.log(`  ${codes.join(',')}  "${phrase}"`);
      console.log(searchLinks(phrase));
      console.log('');
    }
    console.log(`  clear:  node ops.mjs tm pass ${pending[0][1][0]}`);
    console.log(`  reject: node ops.mjs tm fail ${pending[0][1][0]} "registered for apparel"\n`);
    return 1;
  },

  pass() {
    const byPhrase = phraseIndex();
    const targets = phrasesFor(arg);
    if (!targets.length) throw new Error('usage: tm.mjs pass A1,B7  (or a phrase, or: all)');
    const s = load();
    for (const phrase of targets) {
      s.verdicts[phrase] = {
        verdict: 'PASS',
        codes: byPhrase.get(phrase),
        checked_at: new Date().toISOString(),
        note: restArgs.join(' ') || 'operator checked USPTO and Etsy; no conflicting mark found',
      };
      console.log(`PASS  "${phrase}"  [${byPhrase.get(phrase).join(',')}]`);
    }
    save(s);
    console.log(`\n${targets.length} recorded. Remaining: node ops.mjs tm`);
  },

  fail() {
    const byPhrase = phraseIndex();
    const targets = phrasesFor(arg);
    if (!targets.length) throw new Error('usage: tm.mjs fail A1 "reason"');
    const reason = restArgs.join(' ');
    if (!reason) throw new Error('a rejection needs a reason — it is the record you would rely on later');
    const s = load();
    for (const phrase of targets) {
      s.verdicts[phrase] = {
        verdict: 'FAIL', codes: byPhrase.get(phrase),
        checked_at: new Date().toISOString(), note: reason,
      };
      console.log(`FAIL  "${phrase}"  [${byPhrase.get(phrase).join(',')}] — ${reason}`);
    }
    save(s);
    console.log('\nRewrite these phrases in gen-listings.mjs ROWS, then: node ops.mjs listings');
  },

  show() {
    const s = load();
    const rows = Object.entries(s.verdicts);
    if (!rows.length) return console.log('nothing screened yet — run: node ops.mjs tm');
    for (const [phrase, v] of rows) {
      console.log(`  ${v.verdict.padEnd(5)} ${(v.codes || []).join(',').padEnd(10)} "${phrase}"`);
      console.log(`        ${v.checked_at.slice(0, 10)} · ${v.note}`);
    }
    console.log(`\nrecord: ${screenPath}`);
  },
};

// Used by stage.mjs to fail closed. Absent verdict is a block, not a pass.
export function tmBlocker(listing) {
  if (!existsSync(screenPath)) {
    return 'no trademark screen on record — run: node ops.mjs tm';
  }
  const s = JSON.parse(readFileSync(screenPath, 'utf8'));
  const phrase = (listing.phrase || '').trim();
  if (!phrase) return null;
  const v = s.verdicts?.[phrase];
  if (!v) return `phrase "${phrase}" has never been trademark-screened — run: node ops.mjs tm`;
  if (v.verdict !== 'PASS') return `phrase "${phrase}" was rejected on ${v.checked_at.slice(0, 10)}: ${v.note}`;
  return null;
}

const invoked = process.argv[1] && process.argv[1].endsWith('tm.mjs');
if (invoked) {
  const fn = commands[cmd];
  if (!fn) { console.error('commands: list | pass <codes> | fail <codes> "reason" | show'); process.exit(2); }
  try {
    process.exit((await fn()) || 0);
  } catch (e) { console.error(e.message); process.exit(1); }
}
