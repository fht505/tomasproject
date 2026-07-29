#!/usr/bin/env node
// Order watch — the ship-by clock and the stuck-order alarm.
//
//   node orders.mjs watch
//
// The pipeline used to end at publish and pick back up at ledger (money in).
// Everything between — an order landing, Printify charging the card,
// production, tracking — had no visibility at all. The two silent killers both
// look like nothing from our side:
//
//   1. Printify's charge fails (expired card, insufficient funds). The order
//      sits on hold, never enters production, and Etsy shows the buyer nothing
//      unusual until it ships late.
//   2. The order imports but sits unapproved. Printify's default is
//      auto-approve 24h after import — a full day out of a ship-by window that
//      started the moment Etsy charged the buyer.
//
// Shipping later than the processing time stated on the listing voids Etsy
// Purchase Protection for that order and breaks Star Seller standing, so this
// reports against a real deadline or says plainly that it cannot.

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials } from './config.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const invokedDirectly = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const cmd = process.argv[2] || 'watch';
if (invokedDirectly && cmd !== 'watch') {
  console.error('usage: orders.mjs watch');
  process.exit(2);
}

let cfg, token, shop;
if (invokedDirectly) {
  try {
    cfg = loadConfig();
    ({ token, shopId: shop } = credentials(['token', 'shop']));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
if (!invokedDirectly) {
  // imported for its pure helpers only — nothing below this line should run
  cfg = { processing: {} };
}
const client = invokedDirectly ? makeClient(token) : null;

// The processing time the operator actually stated. No number here means no
// deadline — the alternative is inventing one, and a made-up ship-by is worse
// than none because it reads as authoritative.
const stated = (cfg.processing?.days || '').trim();
const statedSource = (cfg.processing?.source || '').trim();
const windowDays = stated && statedSource
  ? Math.max(...(stated.match(/\d+/g) || []).map(Number))
  : null;
const usesBusinessDays = /business/i.test(stated);

export function addDays(from, n, businessOnly) {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (!businessOnly || (day !== 0 && day !== 6)) left--;
  }
  return d;
}

const HOLD = /hold|payment|pending|action.?required|unpaid/i;
const DONE = /fulfil|shipped|delivered|complete/i;
const DEAD = /cancel|refund|void/i;

// Pure classifier, so the thing that decides "this order is in trouble" can be
// tested against fixtures instead of waiting for a real order to go wrong.
export function classify({ status, hasTracking, ageHours, hoursLeft, windowDays }) {
  if (DEAD.test(status)) return { level: 'dead', note: '' };
  if (DONE.test(status) || hasTracking) {
    return { level: 'shipped', note: hasTracking ? 'tracking present' : 'reported fulfilled' };
  }
  if (HOLD.test(status)) {
    return { level: 'ALARM', note: `status "${status}" — this is what a failed card charge looks like. Check Printify → Orders now; it will not enter production on its own.` };
  }
  if (hoursLeft !== null && hoursLeft < 0) {
    return { level: 'ALARM', note: `past its ship-by with no tracking (${Math.round(-hoursLeft)}h over)` };
  }
  if (hoursLeft !== null && hoursLeft < (windowDays * 24) / 2) {
    return { level: 'WARN', note: `${Math.round(hoursLeft)}h of the ship-by window left, no tracking yet` };
  }
  // past Printify's 24h default auto-approve, still nothing moving
  if (ageHours > 26) {
    return { level: 'WARN', note: `${Math.round(ageHours)}h old and not in production — check the order approval setting` };
  }
  return { level: 'ok', note: '' };
}

if (invokedDirectly) {
  const now = new Date();
  const hoursSince = (iso) => (now - new Date(iso)) / 36e5;

  // pull every page; same rule as ledger — walk until a page comes back empty
  const orders = [];
  for (let page = 1; page <= 200; page++) {
    const res = await client.orders(shop, page);
    const rows = res?.data ?? [];
    if (!rows.length) break;
    orders.push(...rows);
    const last = res?.last_page;
    if (typeof last === 'number' && page >= last) break;
  }

  const rows = [];
  for (const o of orders) {
    const status = String(o.status || '');
    if (DEAD.test(status)) continue;

    const shipments = o.shipments || [];
    const tracking = shipments.find(s => s.number || s.url) || null;
    const age = hoursSince(o.created_at);
    const shipBy = windowDays ? addDays(o.created_at, windowDays, usesBusinessDays) : null;
    const hoursLeft = shipBy ? (shipBy - now) / 36e5 : null;

    const { level, note: baseNote } = classify({
      status, hasTracking: !!tracking, ageHours: age, hoursLeft, windowDays,
    });
    const note = level === 'shipped' && tracking
      ? `tracking ${tracking.carrier || ''} ${tracking.number || ''}`.trim()
      : baseNote;

    rows.push({
      order_id: o.id,
      status,
      created_at: o.created_at,
      age_hours: Math.round(age),
      has_tracking: !!tracking,
      ship_by: shipBy ? shipBy.toISOString() : null,
      hours_left: hoursLeft === null ? null : Math.round(hoursLeft),
      level,
      note,
    });
  }

  const rank = { ALARM: 0, WARN: 1, ok: 2, shipped: 3 };
  rows.sort((a, b) => rank[a.level] - rank[b.level] || a.age_hours - b.age_hours);

  const counts = rows.reduce((a, r) => ({ ...a, [r.level]: (a[r.level] || 0) + 1 }), {});

  console.log('');
  if (!rows.length) {
    console.log('  no live orders');
  } else {
    for (const r of rows) {
      const left = r.hours_left === null ? '   —  ' : `${String(r.hours_left).padStart(4)}h`;
      console.log(`  ${r.level.padEnd(7)} ${r.order_id}  ${String(r.age_hours).padStart(4)}h old  ship-by ${left}  ${r.status}`);
      if (r.note) console.log(`          ${r.note}`);
    }
  }
  console.log('');
  if (!windowDays) {
    console.log('  ship-by clock unavailable: ops/config.json processing.days and .source are blank.');
    console.log('  Until both are set there is no stated processing time to measure against, and');
    console.log('  this will not invent one. Order age and tracking are still reported above.');
  } else {
    console.log(`  ship-by measured against your stated "${stated}"${usesBusinessDays ? ' (weekends skipped)' : ''}, source: ${statedSource}`);
  }
  console.log(`  ${counts.ALARM || 0} alarm · ${counts.WARN || 0} warn · ${counts.ok || 0} on track · ${counts.shipped || 0} shipped`);

  mkdirSync(PATHS.state, { recursive: true });
  writeFileSync(join(PATHS.state, 'order-watch.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: `Printify GET /shops/${shop}/orders.json`,
    produced_by: 'orders.mjs watch',
    derived_fields: [
      'ship_by (computed from ops/config.json processing.days, an operator-stated number, not an API value)',
      'level (our classification, not a Printify field)',
    ],
    redacted_fields: ['address_to (buyer name, email, phone, street address) — never read into this file'],
    processing_window: windowDays ? { days: windowDays, business_days: usesBusinessDays, source: statedSource } : null,
    counts,
    orders: rows,
  }, null, 2));

  // process.exit() here raced libuv's teardown on Windows and aborted with
  // "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" AFTER printing a
  // correct report — the same crash already fixed in doctor.mjs and intake.mjs.
  // Setting the code lets Node close its handles and exit cleanly, and this is
  // the command intended to run daily, so a spurious crash would look like a
  // real alarm every morning.
  process.exitCode = (counts.ALARM || 0) > 0 ? 1 : 0;

}
