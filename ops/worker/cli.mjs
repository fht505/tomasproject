#!/usr/bin/env node
// PERPETUA ORBITAL ops CLI — talks to real services or exits nonzero.
//
//   node cli.mjs verify              prove the Printify token works (GET /shops)
//   node cli.mjs blueprints <text>   find product blueprints (tee, candle, mug…)
//   node cli.mjs providers <bpId>    print providers for a blueprint
//   node cli.mjs orders              pull real orders -> ../state/orders.json
//
// Credentials come from ops/worker/.env (gitignored) or the real environment.
//   PRINTIFY_API_TOKEN   required
//   PRINTIFY_SHOP_ID     required for product/order commands (verify prints it)

import { makeClient } from './printify.mjs';
import { PATHS, credentials } from './config.mjs';
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const stateDir = PATHS.state;

const [cmd, ...args] = process.argv.slice(2);
const client = () => makeClient(credentials(['token']).token);
const shopId = () => credentials(['token', 'shop']).shopId;

const commands = {
  async verify() {
    const shops = await client().shops();
    console.log('token OK. shops:');
    for (const s of shops) {
      console.log(`  id=${s.id}  title="${s.title}"  channel=${s.sales_channel}`);
    }

    // Persist for the console. Every sales channel connected in Printify is a
    // real route to a customer, so the station should show them rather than
    // assuming Etsy is the only one.
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'shops.json'), JSON.stringify({
      fetchedAt: new Date().toISOString(),
      source: 'Printify GET /shops.json',
      produced_by: 'cli.mjs verify',
      count: shops.length,
      shops: shops.map(s => ({
        id: s.id,
        title: s.title || null,          // Printify leaves this blank until the store finishes setup
        sales_channel: s.sales_channel,
      })),
    }, null, 2));

    if (!shops.length) {
      console.log('  (none — connect the Etsy store in Printify first, then re-run)');
      return;
    }
    // Save the operator a copy-paste step, but only when there is exactly one
    // shop and nothing to overwrite. Anything ambiguous stays manual.
    const current = credentials([]).shopId;
    if (current) {
      const known = shops.some(s => String(s.id) === String(current));
      console.log(known
        ? `\n.env PRINTIFY_SHOP_ID=${current} matches a real shop — connection verified`
        : `\n! .env has PRINTIFY_SHOP_ID=${current} which is NOT in the list above — fix it`);
      return;
    }
    if (shops.length === 1 && existsSync(PATHS.env)) {
      appendFileSync(PATHS.env, `\nPRINTIFY_SHOP_ID=${shops[0].id}\n`);
      console.log(`\nwrote PRINTIFY_SHOP_ID=${shops[0].id} into ops/worker/.env`);
    } else {
      console.log(`\nadd this line to ops/worker/.env:\n  PRINTIFY_SHOP_ID=${shops[0].id}`);
    }
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
