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

// Triage only — this is a reading of which phrases are LIKELY to be registered,
// not a search result and not legal advice. Short, brandable phrases get
// registered in Class 25; long descriptive ones rarely do and are rarely
// enforced. It exists solely to order the work so the dangerous ones get looked
// at while attention is fresh. Every phrase still needs a real verdict.
const HIGH_RISK = new Set([
  'Dog Mama', 'Sweater Weather', 'Harvest Moon', 'Teach Love Inspire',
  'Emotional Support Candle', 'Emotional Support Nurse', 'Emotional Support Coffee',
  'Teacher Era', 'Nurse Era', 'Grandma Era', 'Cozy Era',
  'Pumpkin Season', 'Smells Like Fall', 'Professional Chaos Coordinator',
]);

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const commands = {
  // Screening 34 phrases from a terminal means 68 copy-pastes and a lot of
  // scrolling. This is the same data as `list`, laid out so the whole batch can
  // be worked through in one pass: tick what is clear, copy one command.
  sheet() {
    const byPhrase = phraseIndex();
    const s = load();
    const rows = [...byPhrase].map(([phrase, codes]) => ({
      phrase, codes, verdict: s.verdicts[phrase]?.verdict || null,
      note: s.verdicts[phrase]?.note || '',
      high: HIGH_RISK.has(phrase),
    }));
    // dangerous first, then anything already decided drops to the bottom
    rows.sort((a, b) =>
      (a.verdict ? 1 : 0) - (b.verdict ? 1 : 0) ||
      (b.high ? 1 : 0) - (a.high ? 1 : 0) ||
      a.phrase.localeCompare(b.phrase));

    const pending = rows.filter(r => !r.verdict).length;
    const body = rows.map(r => `
    <tr class="${r.verdict ? 'done' : ''}">
      <td>${r.verdict ? '' : `<input type="checkbox" data-code="${esc(r.codes[0])}">`}</td>
      <td class="risk">${r.verdict ? `<span class="v ${r.verdict === 'PASS' ? 'pass' : 'fail'}">${r.verdict}</span>` : (r.high ? '<span class="hi">SCREEN&nbsp;CAREFULLY</span>' : '<span class="lo">lower risk</span>')}</td>
      <td><strong>${esc(r.phrase)}</strong><div class="codes">${esc(r.codes.join(', '))}</div>${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}</td>
      <td class="links">
        <a target="_blank" rel="noreferrer" href="https://tmsearch.uspto.gov/search/search-information?q=${encodeURIComponent(r.phrase)}">USPTO</a>
        <a target="_blank" rel="noreferrer" href="https://www.etsy.com/search?q=${encodeURIComponent(r.phrase)}">Etsy</a>
      </td>
      <td class="cmd"><code>tm fail ${esc(r.codes[0])} "reason"</code></td>
    </tr>`).join('');

    const html = `<!doctype html><meta charset="utf-8"><title>Trademark screen — ${pending} left</title>
<style>
 :root{color-scheme:light dark}
 body{font:15px/1.5 ui-sans-serif,system-ui,sans-serif;margin:0;padding:24px;max-width:1100px}
 h1{font-size:20px;margin:0 0 4px} .sub{opacity:.7;margin-bottom:18px}
 .box{border:1px solid #8883;border-radius:8px;padding:14px 16px;margin-bottom:20px;background:#8881}
 table{border-collapse:collapse;width:100%} td,th{padding:9px 8px;border-bottom:1px solid #8883;vertical-align:top;text-align:left}
 tr.done{opacity:.45}
 .codes{font:12px ui-monospace,monospace;opacity:.6}
 .note{font-size:12px;opacity:.8;font-style:italic}
 .hi{background:#d3202033;color:#c62828;padding:2px 7px;border-radius:99px;font-size:11px;font-weight:600;white-space:nowrap}
 .lo{opacity:.55;font-size:11px}
 .v{padding:2px 7px;border-radius:99px;font-size:11px;font-weight:600}
 .pass{background:#2e7d3233;color:#2e7d32} .fail{background:#d3202033;color:#c62828}
 .links a{display:inline-block;margin-right:10px}
 .cmd code{font:11px ui-monospace,monospace;opacity:.55}
 #out{position:sticky;bottom:0;background:Canvas;border-top:2px solid #8886;padding:14px 0;margin-top:10px}
 #cmd{width:100%;font:13px ui-monospace,monospace;padding:10px;border-radius:6px;border:1px solid #8886;background:#8881;color:inherit}
 button{font:13px inherit;padding:8px 14px;border-radius:6px;border:1px solid #8886;background:#8881;color:inherit;cursor:pointer}
</style>
<h1>Trademark screen — ${pending} phrase${pending === 1 ? '' : 's'} left</h1>
<div class="sub">FondlyMade · generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · <code>node ops.mjs tm sheet</code></div>
<div class="box">
 <strong>What you are looking for.</strong> Two different things:
 <ol style="margin:8px 0 0;padding-left:20px">
  <li><strong>USPTO</strong> — the phrase registered as a <em>live</em> mark in the goods class you are printing on (Class 25 apparel, Class 4 candles, Class 21 mugs). A dead or abandoned mark does not block you.</li>
  <li><strong>Etsy</strong> — another seller using it as a <em>brand name</em> rather than as a joke on a shirt. Fifty shops selling the same slogan is a good sign, not a bad one; one shop using it as their shop name is the problem.</li>
 </ol>
 <div style="margin-top:10px;opacity:.8">Tick every phrase that is clear, then copy the single command at the bottom. Reject one at a time with the command in its row. <strong>Staging refuses any phrase without a recorded verdict</strong>, so nothing here can be skipped by accident.</div>
</div>
<table><tr><th></th><th>risk</th><th>phrase</th><th>search</th><th>reject with</th></tr>${body}</table>
<div id="out">
 <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
  <button id="all">tick all remaining</button><button id="none">clear</button>
  <span id="n" style="opacity:.7"></span>
 </div>
 <input id="cmd" readonly value="">
</div>
<script>
 const boxes=[...document.querySelectorAll('input[type=checkbox]')];
 const out=document.getElementById('cmd'), n=document.getElementById('n');
 function sync(){
   const c=boxes.filter(b=>b.checked).map(b=>b.dataset.code);
   out.value=c.length?'node ops.mjs tm pass '+c.join(','):'';
   n.textContent=c.length+' of '+boxes.length+' ticked';
 }
 boxes.forEach(b=>b.addEventListener('change',sync));
 document.getElementById('all').onclick=()=>{boxes.forEach(b=>b.checked=true);sync()};
 document.getElementById('none').onclick=()=>{boxes.forEach(b=>b.checked=false);sync()};
 out.onclick=()=>{out.select();try{document.execCommand('copy')}catch(e){}};
 sync();
</script>`;

    const dest = join(PATHS.ops, 'TM-SHEET.html');
    writeFileSync(dest, html);
    console.log(`\n  wrote ${rows.length} phrases (${pending} unscreened) -> ${dest}`);
    console.log('  open it, tick what is clear, copy the one command at the bottom\n');
    return 0;
  },

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
