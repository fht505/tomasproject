#!/usr/bin/env node
// LEDGER run — pull real Printify orders and compute the numbers the
// console HUD displays. Every figure traces to an API response.
//
//   node ledger.mjs
//
// Writes:
//   ../state/orders.json   raw pull (all pages)
//   ../state/ledger.json   revenue/costs/margin roll-up
//   ../state/products.json product sync (drafts + published counts)

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials } from './config.mjs';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const stateDir = PATHS.state;
const stagedPath = join(stateDir, 'staged.json');

let cfg, token, shop;
try {
  cfg = loadConfig();
  ({ token, shopId: shop } = credentials(['token', 'shop']));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const client = makeClient(token);
const write = (name, obj) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, name), JSON.stringify(obj, null, 2));
};
const cents = (v) => (typeof v === 'number' ? v : 0) / 100;

// ---- orders --------------------------------------------------------------
// Paginate until a page comes back EMPTY. Do not guess the page size: an
// earlier version stopped at "fewer than 10 rows", which silently under-reports
// revenue if Printify pages at 20 or 50. Under-reporting money is exactly the
// class of error this project refuses to ship.
const orders = [];
let orderPages = 0;
for (let page = 1; page <= 200; page++) {
  const res = await client.orders(shop, page);
  const rows = res?.data ?? [];
  orderPages++;
  if (!rows.length) break;
  orders.push(...rows);
  // honor the envelope's own page count when the API provides one
  const last = res?.last_page;
  if (typeof last === 'number' && page >= last) break;
}
// Printify order payloads carry address_to: the buyer's name, email, phone and
// street address. This file gets committed and the console fetches it over
// HTTP, so writing orders verbatim would publish customer PII into permanent
// git history and to anyone who can reach the served directory. Keep only the
// fields the ledger and the console actually use.
const redactOrder = (o) => ({
  id: o.id,
  status: o.status,
  created_at: o.created_at,
  total_price: o.total_price,
  total_cost: o.total_cost,
  total_shipping: o.total_shipping,
  sales_channel: o.shop?.sales_channel ?? null,
  line_items: (o.line_items || []).map(li => ({
    product_id: li.product_id, variant_id: li.variant_id,
    quantity: li.quantity, cost: li.cost,
  })),
});

const redactedOrders = orders.map(redactOrder);
const ordersEnvelope = {
  fetchedAt: new Date().toISOString(),
  source: `Printify GET /shops/${shop}/orders.json (${orderPages} pages walked)`,
  redacted_fields: ['address_to (buyer name, email, phone, street address)', 'metadata'],
  redaction_reason: 'this file is committed and served to the browser; buyer PII must not be in either',
  data: redactedOrders,
};

// Tripwire: if Printify moves PII to a field this projection does not know
// about, fail loudly rather than write it. Cheaper than a git history rewrite.
const leak = JSON.stringify(ordersEnvelope.data).match(/address|email|@|phone|first_name|last_name|\bzip\b/i);
if (leak) {
  console.error(`refusing to write orders.json — redaction missed something matching "${leak[0]}".`);
  console.error('Printify\'s order shape has changed; update redactOrder in ledger.mjs before re-running.');
  process.exit(1);
}
write('orders.json', ordersEnvelope);

// ---- roll-up -------------------------------------------------------------
// Printify order totals are in cents. total_price is what the customer paid
// (as synced from the sales channel); total_shipping and the line item costs
// are what we pay. Anything Printify doesn't report is left at 0 — never
// estimated into the ledger.
// Cancelled/refunded orders must not inflate revenue. Printify order status
// values include canceled/cancelled and refunded variants; exclude them and
// report the count separately rather than silently dropping them.
const EXCLUDED = /cancel|refund|void/i;
const counted = orders.filter(o => !EXCLUDED.test(String(o.status || '')));
const excludedOrders = orders.length - counted.length;

let revenue = 0, production = 0, shipping = 0, unitsSold = 0;
const byChannel = {};
for (const o of counted) {
  const rev = cents(o.total_price);
  revenue += rev;
  production += cents(o.total_cost ?? o.line_items?.reduce((a, li) => a + (li.cost || 0) * (li.quantity || 1), 0));
  shipping += cents(o.total_shipping);
  unitsSold += (o.line_items || []).reduce((a, li) => a + (li.quantity || 1), 0);
  const ch = (o.shop?.sales_channel || 'etsy').toLowerCase();
  byChannel[ch] = (byChannel[ch] || 0) + rev;
}
// Etsy's cut on a sale, using the ONE fee schedule the operator maintains in
// ops/config.json — the same numbers the margin guard prices with, so the
// ledger can never disagree with what stage promised. Applied once per ORDER
// (processing is per payment, not per item). This is a derived figure, not an
// API value, and it is labeled as such in the state file.
const f = cfg.fees;
const feePct = (f.transaction_pct + f.payment_processing_pct + f.offsite_ads_pct) / 100;
const etsyFees = counted.reduce((a, o) => {
  const r = cents(o.total_price);
  return a + (r > 0 ? r * feePct + f.payment_processing_flat_usd : 0);
}, 0);
const costs = production + shipping + etsyFees;

write('ledger.json', {
  fetchedAt: new Date().toISOString(),
  source: 'computed from Printify orders API; Etsy fee rates from ops/config.json applied to real order totals',
  derived_fields: ['costs.platform_fees (Etsy fee formula applied to real order totals, not an API value)'],
  fee_schedule: { ...f, confirmed_by_operator: !!f.fees_confirmed },
  excluded_orders: excludedOrders,
  revenue: {
    total: Number(revenue.toFixed(2)),
    etsy: Number((byChannel.etsy || 0).toFixed(2)),
    fiverr: 0,
    other: Number((revenue - (byChannel.etsy || 0)).toFixed(2)),
  },
  costs: {
    total: Number(costs.toFixed(2)),
    production: Number(production.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    platform_fees: Number(etsyFees.toFixed(2)),
  },
  net: Number((revenue - costs).toFixed(2)),
  orders: counted.length,
  units: unitsSold,
});

// ---- products sync -------------------------------------------------------
// same pagination rule as orders: walk until a page is empty, never guess size
const products = [];
for (let page = 1; page <= 200; page++) {
  const res = await client.listProducts(shop, page);
  const rows = res?.data ?? [];
  if (!rows.length) break;
  products.push(...rows);
  const last = res?.last_page;
  if (typeof last === 'number' && page >= last) break;
}
// annotate with our spec codes where we staged them
let specByProductId = {};
if (existsSync(stagedPath)) {
  const staged = JSON.parse(readFileSync(stagedPath, 'utf8'));
  specByProductId = Object.fromEntries(
    Object.entries(staged.items).map(([code, it]) => [it.product_id, code]));
}
write('products.json', {
  fetchedAt: new Date().toISOString(),
  source: `Printify GET /shops/${shop}/products.json`,
  data: products.map(p => ({
    id: p.id, title: p.title, is_published: !!p.is_locked || !!(p.external && p.external.id),
    external: p.external ? [p.external] : [],
    spec_code: specByProductId[p.id] || null,
  })),
});

console.log(`orders: ${counted.length} counted${excludedOrders ? ` (${excludedOrders} cancelled/refunded excluded)` : ''} · units: ${unitsSold} · revenue: $${revenue.toFixed(2)} · costs: $${costs.toFixed(2)} · net: $${(revenue - costs).toFixed(2)}`);
console.log(`products: ${products.length} synced`);
if (!f.fees_confirmed) {
  console.log('! platform_fees uses an UNCONFIRMED fee schedule — check ops/config.json fees against your Etsy account and set fees_confirmed: true');
}
console.log('state written — the console will show these numbers on next refresh');
