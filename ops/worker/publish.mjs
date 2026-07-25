#!/usr/bin/env node
// Publish operator-APPROVED drafts to the connected Etsy shop.
//
//   node publish.mjs list                 show staged drafts + status
//   node publish.mjs approve A1,B7        mark codes approved (operator gate)
//   node publish.mjs run                  publish everything approved+unpublished
//
// Two deliberate safeguards:
//   1. Nothing publishes without an explicit approve step.
//   2. Rate limit respected: Printify caps publishes at 200 / 30 min; we
//      pace well under it and stop cleanly if the API pushes back.

import { makeClient } from './printify.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stagedPath = join(here, '..', 'state', 'staged.json');
const PACE_MS = 9000; // ~200/30min ceiling; we run far below it

const load = () => {
  if (!existsSync(stagedPath)) throw new Error('no staged.json — run stage.mjs first');
  return JSON.parse(readFileSync(stagedPath, 'utf8'));
};
const save = (s) => writeFileSync(stagedPath, JSON.stringify(s, null, 2));

const [cmd, arg] = process.argv.slice(2);

const commands = {
  list() {
    const s = load();
    const rows = Object.entries(s.items);
    if (!rows.length) return console.log('nothing staged yet');
    for (const [code, it] of rows) {
      const state = it.published ? 'LIVE' : it.approved ? 'APPROVED' : 'DRAFT';
      console.log(`  ${code.padEnd(4)} ${state.padEnd(9)} ${it.product_id}  ${it.title.slice(0, 58)}`);
    }
    const live = rows.filter(([, i]) => i.published).length;
    const appr = rows.filter(([, i]) => i.approved && !i.published).length;
    console.log(`\n${rows.length} staged · ${appr} approved awaiting publish · ${live} live on Etsy`);
  },

  approve(codes) {
    if (!codes) throw new Error('usage: publish.mjs approve A1,B7  (or: all)');
    const s = load();
    const list = codes === 'all' ? Object.keys(s.items) : codes.split(',').map(c => c.trim());
    let n = 0;
    for (const c of list) {
      if (!s.items[c]) { console.log(`  ? ${c} not staged`); continue; }
      s.items[c].approved = true;
      s.items[c].approved_at = new Date().toISOString();
      n++;
    }
    save(s);
    console.log(`${n} approved for publish. Run: node publish.mjs run`);
  },

  async run() {
    const token = process.env.PRINTIFY_API_TOKEN;
    const shop = process.env.PRINTIFY_SHOP_ID;
    if (!token || !shop) throw new Error('PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID must be set');
    const client = makeClient(token);
    const s = load();
    const queue = Object.entries(s.items).filter(([, i]) => i.approved && !i.published);
    if (!queue.length) return console.log('nothing approved and unpublished — approve first');

    console.log(`publishing ${queue.length} approved listings to Etsy…`);
    let ok = 0;
    for (const [code, it] of queue) {
      try {
        await client.publishProduct(shop, it.product_id);
        it.published = true;
        it.published_at = new Date().toISOString();
        ok++;
        console.log(`LIVE  ${code}  ${it.title.slice(0, 60)}`);
        save(s);
      } catch (e) {
        console.log(`FAIL  ${code} — ${e.message}`);
        if (/429|rate/i.test(e.message)) {
          console.log('rate limited — stopping cleanly; re-run later to continue');
          break;
        }
      }
      await new Promise(r => setTimeout(r, PACE_MS));
    }
    s.fetchedAt = new Date().toISOString();
    save(s);
    console.log(`\n${ok} published. Etsy listings go live as Printify syncs them.`);
  },
};

const fn = commands[cmd];
if (!fn) { console.error('commands: list | approve <codes|all> | run'); process.exit(2); }
// wrap so synchronous throws surface as clean messages, not stack traces
(async () => fn(arg))().catch(e => { console.error(e.message); process.exit(1); });
