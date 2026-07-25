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
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stateDir = join(here, '..', 'state');
const stagedPath = join(stateDir, 'staged.json');

const token = process.env.PRINTIFY_API_TOKEN;
const shop = process.env.PRINTIFY_SHOP_ID;
if (!token || !shop) {
  console.error('PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID must be set');
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
write('orders.json', {
  fetchedAt: new Date().toISOString(),
  source: `Printify GET /shops/${shop}/orders.json (${orderPages} pages walked)`,
  data: orders,
});

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
// Etsy's cut on a sale: 6.5% transaction + 3% + $0.25 processing, applied
// once per ORDER (processing is per payment, not per item). This is a derived
// figure, not an API value — it is labeled as such in the state file.
const etsyFees = counted.reduce((a, o) => {
  const r = cents(o.total_price);
  return a + (r > 0 ? r * 0.095 + 0.25 : 0);
}, 0);
const costs = production + shipping + etsyFees;

write('ledger.json', {
  fetchedAt: new Date().toISOString(),
  source: 'computed from Printify orders API; Etsy fee rates applied to real order totals',
  derived_fields: ['costs.platform_fees (Etsy fee formula applied to real order totals, not an API value)'],
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
console.log('state written — the console will show these numbers on next refresh');
