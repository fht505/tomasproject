#!/usr/bin/env node
// PERPETUA ORBITAL ops CLI — talks to real services or exits nonzero.
//
//   node cli.mjs verify              prove the Printify token works (GET /shops)
//   node cli.mjs blueprints <text>   find product blueprints (tee, candle, mug…)
//   node cli.mjs providers <bpId>    print providers for a blueprint
//   node cli.mjs orders              pull real orders -> ../state/orders.json
//
// Config via env (never committed):
//   PRINTIFY_API_TOKEN   required
//   PRINTIFY_SHOP_ID     required for product/order commands (verify prints it)

import { makeClient } from './printify.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stateDir = join(here, '..', 'state');

const [cmd, ...args] = process.argv.slice(2);
const client = () => makeClient(process.env.PRINTIFY_API_TOKEN);
const shopId = () => {
  const id = process.env.PRINTIFY_SHOP_ID;
  if (!id) throw new Error('PRINTIFY_SHOP_ID is not set (run `verify` to list shops)');
  return id;
};

const commands = {
  async verify() {
    const shops = await client().shops();
    console.log('token OK. shops:');
    for (const s of shops) {
      console.log(`  id=${s.id}  title="${s.title}"  channel=${s.sales_channel}`);
    }
    if (!shops.length) console.log('  (none — connect the Etsy store in Printify first)');
  },

  async blueprints(query) {
    if (!query) throw new Error('usage: blueprints <search text>');
    const all = await client().blueprints();
    const q = query.toLowerCase();
    const hits = all.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.brand || '').toLowerCase().includes(q));
    for (const b of hits.slice(0, 25)) {
      console.log(`  id=${b.id}  ${b.brand} — ${b.title}`);
    }
    console.log(`${hits.length} matches`);
  },

  async providers(bpId) {
    if (!bpId) throw new Error('usage: providers <blueprintId>');
    const list = await client().providers(bpId);
    for (const p of list) console.log(`  id=${p.id}  ${p.title}`);
  },

  async orders() {
    const data = await client().orders(shopId());
    mkdirSync(stateDir, { recursive: true });
    const out = join(stateDir, 'orders.json');
    writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString(), data }, null, 2));
    const n = (data && data.data ? data.data.length : 0);
    console.log(`wrote ${n} orders (page 1) -> ${out}`);
  },
};

const fn = commands[cmd];
if (!fn) {
  console.error('unknown command. commands: verify | blueprints | providers | orders');
  process.exit(2);
}
fn(...args).catch((e) => { console.error(e.message); process.exit(1); });
