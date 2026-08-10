// PERPETUA ORBITAL — prediction-market arb monitor, Phase 0 (log-only).
// Reads PUBLIC market data from Kalshi and Polymarket US; no account, no
// keys, no orders — it measures whether edge exists before any dollar moves.
//
// Detectors:
//  1. Intra-Kalshi bracket-sum: a mutually-exclusive event whose YES asks sum
//     under $1.00 (buy-the-set) or YES bids sum over $1.00 (sell-the-set),
//     net of Kalshi's taker fee. Single-venue: no resolution-mismatch risk.
//  2. Cross-venue divergence: same-event candidates matched by title tokens
//     across venues with a YES-price gap. Matches are graded match-risky by
//     default — resolution wording must be human-verified before any trade.
//
// Honesty rules: every record carries the quoted prices and computed net
// edge; depth is NOT available from these endpoints, so records say so —
// a logged edge is "existed at quote", not "was fillable at size".
//
// Usage: node arb/monitor.mjs scan     — one scan cycle, appends to log
//        node arb/monitor.mjs summary  — aggregate what the log has seen
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(here, '..', '..', 'state', 'arb');
mkdirSync(LOG_DIR, { recursive: true });

const kalshiFee = (p) => Math.ceil(7 * p * (1 - p)) / 100; // $ per contract, taker
const POLY_FEE = 0.001; // Polymarket US flat 0.10% taker on notional

async function getJson(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

// ---- Kalshi: events with nested markets (bracket sets) ------------------
async function kalshiEvents(maxPages = 5) {
  const events = [];
  let cursor = '';
  for (let i = 0; i < maxPages; i++) {
    const j = await getJson(`https://api.elections.kalshi.com/trade-api/v2/events?status=open&with_nested_markets=true&limit=200${cursor ? `&cursor=${cursor}` : ''}`);
    events.push(...(j.events ?? []));
    cursor = j.cursor;
    if (!cursor) break;
  }
  return events;
}

const D = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; };

function bracketScan(events) {
  const hits = [];
  for (const ev of events) {
    if (!ev.mutually_exclusive) continue;
    const ms = (ev.markets ?? [])
      .map(m => ({ ...m, ask: D(m.yes_ask_dollars), bid: D(m.yes_bid_dollars) }))
      .filter(m => m.status === 'active' && m.ask > 0 && m.ask < 1);
    if (ms.length < 2) continue;
    const askSum = ms.reduce((s, m) => s + m.ask, 0);
    const bidSum = ms.reduce((s, m) => s + m.bid, 0);
    const feeBuy = ms.reduce((s, m) => s + kalshiFee(m.ask), 0);
    const feeSell = ms.reduce((s, m) => s + kalshiFee(Math.max(m.bid, 0.01)), 0);
    const buyEdge = 1 - askSum - feeBuy;      // buy every YES for < $1 → set pays exactly $1
    const sellEdge = bidSum - 1 - feeSell;    // sell every YES for > $1
    if (buyEdge > 0 || sellEdge > 0) {
      hits.push({
        type: 'kalshi-bracket', event: ev.event_ticker, title: ev.title,
        legs: ms.length, askSum: +askSum.toFixed(3), bidSum: +bidSum.toFixed(3),
        feeBuy: +feeBuy.toFixed(3), feeSell: +feeSell.toFixed(3),
        netBuyEdge: +buyEdge.toFixed(4), netSellEdge: +sellEdge.toFixed(4),
        min_leg_ask_size: Math.min(...ms.map(m => D(m.yes_ask_size_fp) || 0)),
        min_leg_bid_size: Math.min(...ms.map(m => D(m.yes_bid_size_fp) || 0)),
        // mutually_exclusive guarantees AT MOST one YES — not that the listed
        // markets cover every outcome. Buy-the-set only pays $1 if the set is
        // EXHAUSTIVE; an uncovered outcome (e.g. "someone else" wins) makes
        // every leg lose. Sell-the-set is sound under exclusivity alone.
        buy_actionable: false,
        buy_caveat: 'requires exhaustive outcome set — verify event rules before grading actionable',
        sell_actionable: sellEdge > 0,
      });
    }
  }
  return hits;
}

// ---- Polymarket: open markets ------------------------------------------
async function polyMarkets(maxPages = 15) {
  const out = [];
  for (let i = 0; i < maxPages; i++) {
    // gamma API serves at most 100 per page regardless of the limit param
    const j = await getJson(`https://gamma-api.polymarket.com/markets?closed=false&limit=100&offset=${i * 100}`);
    if (!Array.isArray(j) || !j.length) break;
    out.push(...j);
    if (j.length < 100) break;
  }
  return out;
}

// ---- cross-venue candidate matching ------------------------------------
const STOP = new Set(['will', 'the', 'a', 'an', 'in', 'on', 'by', 'be', 'to', 'of', 'at', 'before', 'for', 'or', 'and', 'is']);
const tokens = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function crossScan(kEvents, pMarkets) {
  const hits = [];
  const kFlat = kEvents.flatMap(ev => (ev.markets ?? [])
    .map(m => ({ ...m, ask: D(m.yes_ask_dollars), bid: D(m.yes_bid_dollars) }))
    .filter(m => m.status === 'active' && m.bid > 0 && m.ask < 1)
    .map(m => ({ ev, m, toks: tokens(ev.title + ' ' + (m.yes_sub_title ?? '')) })));
  for (const p of pMarkets) {
    let prices;
    try { prices = JSON.parse(p.outcomePrices ?? '[]').map(Number); } catch { continue; }
    if (prices.length !== 2 || !(prices[0] > 0.01 && prices[0] < 0.99)) continue;
    const pToks = tokens(p.question);
    for (const k of kFlat) {
      const sim = jaccard(pToks, k.toks);
      if (sim < 0.55) continue;
      const kMid = (k.m.bid + k.m.ask) / 2;
      const gap = prices[0] - kMid;
      const fees = kalshiFee(Math.abs(kMid)) + Math.abs(prices[0]) * POLY_FEE;
      if (Math.abs(gap) - fees <= 0.015) continue; // ignore dust
      hits.push({
        type: 'cross-venue', similarity: +sim.toFixed(2), grade: 'match-risky',
        kalshi: { ticker: k.m.ticker, title: k.ev.title, sub: k.m.yes_sub_title ?? null, yes_bid: k.m.bid, yes_ask: k.m.ask },
        polymarket: { id: p.id, question: p.question, yes: prices[0], liquidity: p.liquidity ?? null },
        gap: +gap.toFixed(3), net_of_fees: +(Math.abs(gap) - fees).toFixed(4),
        note: 'resolution wording NOT verified — grade must be upgraded manually before this counts as edge',
      });
    }
  }
  return hits.sort((a, b) => b.net_of_fees - a.net_of_fees).slice(0, 25);
}

// ---- main ---------------------------------------------------------------
const cmd = process.argv[2] ?? 'scan';
if (cmd === 'scan') {
  const at = new Date().toISOString();
  const kEvents = await kalshiEvents();
  const pMarkets = await polyMarkets();
  const brackets = bracketScan(kEvents);
  const cross = crossScan(kEvents, pMarkets);
  const rec = { at, kalshi_events: kEvents.length, poly_markets: pMarkets.length, brackets, cross };
  appendFileSync(join(LOG_DIR, `scan-${at.slice(0, 10)}.jsonl`), JSON.stringify(rec) + '\n');
  console.log(`${at} scanned kalshi:${kEvents.length}ev poly:${pMarkets.length}mk -> bracket hits: ${brackets.length}, cross candidates: ${cross.length}`);
  for (const b of brackets.slice(0, 5)) console.log('  BRACKET', b.event, b.title.slice(0, 50), 'buyEdge', b.netBuyEdge, 'sellEdge', b.netSellEdge);
  for (const c of cross.slice(0, 5)) console.log('  CROSS', c.similarity, c.net_of_fees, '|', c.kalshi.title.slice(0, 40), '<>', c.polymarket.question.slice(0, 40));
} else if (cmd === 'summary') {
  const files = existsSync(LOG_DIR) ? readdirSync(LOG_DIR).filter(f => f.startsWith('scan-')) : [];
  let scans = 0, bracketHits = 0, crossHits = 0, bestBracket = null, bestCross = null;
  for (const f of files) {
    for (const line of readFileSync(join(LOG_DIR, f), 'utf8').trim().split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      scans++;
      bracketHits += r.brackets.length;
      crossHits += r.cross.length;
      for (const b of r.brackets) if (!bestBracket || Math.max(b.netBuyEdge, b.netSellEdge) > Math.max(bestBracket.netBuyEdge, bestBracket.netSellEdge)) bestBracket = b;
      for (const c of r.cross) if (!bestCross || c.net_of_fees > bestCross.net_of_fees) bestCross = c;
    }
  }
  console.log(JSON.stringify({ scans, bracketHits, crossHits, bestBracket, bestCross }, null, 2));
}
