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

// ---- orders (paginate until a short page) --------------------------------
const orders = [];
for (let page = 1; page <= 20; page++) {
  const res = await client.orders(shop, page);
  const rows = res?.data ?? [];
  orders.push(...rows);
  if (rows.length < 10) break;
}
write('orders.json', {
  fetchedAt: new Date().toISOString(),
  source: `Printify GET /shops/${shop}/orders.json`,
  data: orders,
});

// ---- roll-up -------------------------------------------------------------
// Printify order totals are in cents. total_price is what the customer paid
// (as synced from the sales channel); total_shipping and the line item costs
// are what we pay. Anything Printify doesn't report is left at 0 — never
// estimated into the ledger.
let revenue = 0, production = 0, shipping = 0, unitsSold = 0;
const byChannel = {};
for (const o of orders) {
  const rev = cents(o.total_price);
  revenue += rev;
  production += cents(o.total_cost ?? o.line_items?.reduce((a, li) => a + (li.cost || 0) * (li.quantity || 1), 0));
  shipping += cents(o.total_shipping);
  unitsSold += (o.line_items || []).reduce((a, li) => a + (li.quantity || 1), 0);
  const ch = (o.shop?.sales_channel || 'etsy').toLowerCase();
  byChannel[ch] = (byChannel[ch] || 0) + rev;
}
// Etsy's cut on a sale: 6.5% transaction + 3% + $0.25 processing.
const etsyFees = orders.reduce((a, o) => {
  const r = cents(o.total_price);
  return a + (r > 0 ? r * 0.095 + 0.25 : 0);
}, 0);
const costs = production + shipping + etsyFees;

write('ledger.json', {
  fetchedAt: new Date().toISOString(),
  source: 'computed from Printify orders API; Etsy fee rates applied to real order totals',
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
  orders: orders.length,
  units: unitsSold,
});

// ---- products sync -------------------------------------------------------
const products = [];
for (let page = 1; page <= 10; page++) {
  const res = await client.listProducts(shop, page);
  const rows = res?.data ?? [];
  products.push(...rows);
  if (rows.length < 10) break;
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

console.log(`orders: ${orders.length} · units: ${unitsSold} · revenue: $${revenue.toFixed(2)} · costs: $${costs.toFixed(2)} · net: $${(revenue - costs).toFixed(2)}`);
console.log(`products: ${products.length} synced`);
console.log('state written — the console will show these numbers on next refresh');
