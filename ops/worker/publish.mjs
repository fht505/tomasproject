#!/usr/bin/env node
// Publish operator-APPROVED drafts to the connected Etsy shop, and roll them
// back when something is wrong.
//
//   node publish.mjs list [--mockups]     show staged drafts, margins, status
//   node publish.mjs approve A1,B7        mark codes approved (operator gate)
//   node publish.mjs run                  publish everything approved+unpublished
//   node publish.mjs unstage A1,B7        delete drafts and forget them
//
// Four deliberate safeguards:
//   1. Nothing publishes without an explicit approve step.
//   2. Nothing publishes with an unverified margin, or with an unconfirmed
//      Etsy fee schedule — you cannot approve what you cannot price.
//   3. Rate limit respected: Printify caps publishes at 200 / 30 min; we
//      pace well under it and stop cleanly if the API pushes back.
//   4. unstage refuses to touch a LIVE listing unless you say --force, because
//      deleting a published product also removes it from Etsy.

import { makeClient } from './printify.mjs';
import { PATHS, loadConfig, credentials } from './config.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const stagedPath = join(PATHS.state, 'staged.json');
const PACE_MS = 9000; // ~200/30min ceiling; we run far below it

const load = () => {
  if (!existsSync(stagedPath)) throw new Error('no staged.json — run: node ops.mjs stage');
  return JSON.parse(readFileSync(stagedPath, 'utf8'));
};
const save = (s) => writeFileSync(stagedPath, JSON.stringify(s, null, 2));
const money = (n) => `$${Number(n).toFixed(2)}`;

const argv = process.argv.slice(2);
const [cmd, arg] = argv;
const flag = (name) => argv.includes(name);
// a flag is never a code list — catch `unstage --force` before it deletes
// something the operator never named
const codeArg = (v) => (v && !v.startsWith('--') ? v : null);

function connect() {
  const { token, shopId } = credentials(['token', 'shop']);
  return { client: makeClient(token), shop: shopId };
}

// A draft may only go live if we know what it earns. Both halves of that have
// to be true: a real base cost read back from Printify, and a fee schedule the
// operator has actually checked against their own Etsy account.
function publishBlocker(item, cfg, allowUnverified) {
  if (!item.margin_verified && !allowUnverified) {
    return 'margin never verified (Printify returned no variant cost) — re-stage it or pass --allow-unverified-margin';
  }
  if (item.margin && item.margin.net < cfg.min_margin_usd) {
    return `net ${money(item.margin.net)} is under the ${money(cfg.min_margin_usd)} floor`;
  }
  return null;
}

const commands = {
  async list() {
    const cfg = loadConfig();
    const s = load();
    const rows = Object.entries(s.items);
    if (!rows.length) return console.log('nothing staged yet — run: node ops.mjs stage');

    let mockups = {};
    if (flag('--mockups')) {
      const { client, shop } = connect();
      console.log(`fetching mockups for ${rows.length} products…\n`);
      for (const [code, it] of rows) {
        try {
          const p = await client.getProduct(shop, it.product_id);
          const img = (p.images || []).find(i => i.is_default) || (p.images || [])[0];
          mockups[code] = img?.src || null;
          // Leave a receipt. approve refuses any code without one, so the
          // approval gate means "a human loaded this artwork", not "someone
          // typed the word all".
          if (img?.src) it.mockup = { url: img.src, fetched_at: new Date().toISOString() };
        } catch (e) {
          mockups[code] = `(fetch failed: ${e.message.slice(0, 60)})`;
        }
      }
      save(s);
    }

    for (const [code, it] of rows) {
      const state = it.published ? 'LIVE' : it.approved ? 'APPROVED' : 'DRAFT';
      const margin = it.margin_verified ? money(it.margin.net).padStart(7) : ' UNVER.';
      console.log(`  ${code.padEnd(4)} ${state.padEnd(9)} ${margin}  ${it.product_id}  ${it.title.slice(0, 50)}`);
      if (mockups[code]) console.log(`       ${mockups[code]}`);
    }

    const live = rows.filter(([, i]) => i.published).length;
    const appr = rows.filter(([, i]) => i.approved && !i.published).length;
    const blocked = rows.filter(([, i]) => !i.published && publishBlocker(i, cfg, false)).length;
    console.log(`\n${rows.length} staged · ${appr} approved awaiting publish · ${live} live on Etsy`);
    if (blocked) console.log(`${blocked} cannot publish as-is — see the UNVER. rows above`);
    if (!cfg.fees.fees_confirmed) {
      console.log(`\n! ops/config.json fees.fees_confirmed is false — publish is blocked until you check the fee rates against your own Etsy account and set it true`);
    }
    if (!flag('--mockups')) console.log(`\nlook at the artwork before approving: node ops.mjs review --mockups`);
  },

  approve(raw) {
    const codes = codeArg(raw);
    if (!codes) throw new Error('usage: publish.mjs approve A1,B7  (or: all)');
    const cfg = loadConfig();
    const s = load();
    const list = codes === 'all' ? Object.keys(s.items) : codes.split(',').map(c => c.trim());
    let n = 0, warned = 0, unseen = 0;
    for (const c of list) {
      if (!s.items[c]) { console.log(`  ? ${c} not staged`); continue; }
      // You cannot approve artwork you have not loaded. `review --mockups`
      // records the mockup it fetched; without that receipt this is a rubber stamp.
      if (!s.items[c].mockup?.url) {
        console.log(`  ! ${c} has no fetched mockup — run: node ops.mjs review --mockups`);
        unseen++;
        continue;
      }
      const blocker = publishBlocker(s.items[c], cfg, false);
      if (blocker) { console.log(`  ! ${c} approved but will not publish: ${blocker}`); warned++; }
      s.items[c].approved = true;
      s.items[c].approved_at = new Date().toISOString();
      n++;
    }
    save(s);
    console.log(`${n} approved for publish${warned ? ` (${warned} blocked at publish time)` : ''}${unseen ? ` · ${unseen} skipped, artwork never loaded` : ''}.`);
    if (n) console.log('Run: node ops.mjs publish');
  },

  async run() {
    const cfg = loadConfig();
    if (!cfg.fees.fees_confirmed) {
      throw new Error('ops/config.json fees.fees_confirmed is false — confirm the Etsy fee rates against your own account first. Publishing at unknown fees is how a shop sells at a loss without noticing.');
    }
    const allowUnverified = flag('--allow-unverified-margin');
    const { client, shop } = connect();
    const s = load();
    const queue = Object.entries(s.items).filter(([, i]) => i.approved && !i.published);
    if (!queue.length) return console.log('nothing approved and unpublished — run: node ops.mjs approve all');

    const ready = [];
    for (const [code, it] of queue) {
      const blocker = publishBlocker(it, cfg, allowUnverified);
      if (blocker) console.log(`SKIP  ${code} — ${blocker}`);
      else ready.push([code, it]);
    }
    if (!ready.length) return console.log('\nnothing publishable — every approved draft is blocked above');

    console.log(`publishing ${ready.length} listings to Etsy…`);
    let ok = 0;
    for (const [code, it] of ready) {
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
    console.log('track what they earn: node ops.mjs ledger');
  },

  // ---- rollback ----------------------------------------------------------
  async unstage(raw) {
    const codes = codeArg(raw);
    if (!codes) throw new Error('usage: publish.mjs unstage A1,B7  (or: all)  [--force]');
    const { client, shop } = connect();
    const s = load();
    const list = codes === 'all' ? Object.keys(s.items) : codes.split(',').map(c => c.trim());
    const forced = flag('--force');
    let removed = 0, refused = 0, failed = 0;

    for (const code of list) {
      const it = s.items[code];
      if (!it) { console.log(`  ? ${code} not staged`); continue; }
      if (it.published && !forced) {
        console.log(`  ! ${code} is LIVE on Etsy — deleting it removes the listing and its reviews. Re-run with --force if that is what you want.`);
        refused++;
        continue;
      }
      try {
        if (it.published) {
          // unpublish first so Printify releases the Etsy lock; a failure here
          // is not fatal, the delete below is the operation that matters
          try { await client.unpublishProduct(shop, it.product_id); }
          catch (e) { console.log(`      unpublish said: ${e.message.slice(0, 80)}`); }
        }
        await client.deleteProduct(shop, it.product_id);
        delete s.items[code];
        removed++;
        console.log(`GONE  ${code}  ${it.product_id}`);
        save(s);
      } catch (e) {
        failed++;
        console.log(`FAIL  ${code} — ${e.message}`);
      }
    }
    s.fetchedAt = new Date().toISOString();
    save(s);
    console.log(`\n${removed} deleted · ${refused} refused (live) · ${failed} failed`);
    if (removed) console.log('those codes are free to stage again: node ops.mjs stage');
  },
};

const fn = commands[cmd];
if (!fn) {
  console.error('commands: list [--mockups] | approve <codes|all> | run [--allow-unverified-margin] | unstage <codes|all> [--force]');
  process.exit(2);
}
// wrap so synchronous throws surface as clean messages, not stack traces
(async () => fn(arg))().catch(e => { console.error(e.message); process.exit(1); });
