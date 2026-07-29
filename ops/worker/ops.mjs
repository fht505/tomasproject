#!/usr/bin/env node
// ============================================================================
// PERPETUA ORBITAL — one command for the whole operation.
//
//   node ops.mjs doctor          check this machine can run everything
//   node ops.mjs console         serve the operations console + open a browser
//   node ops.mjs                 where am I, what do I do next
//   node ops.mjs verify          prove the Printify token + list shops
//   node ops.mjs catalog         do our products exist, and do the prices work?
//                                (token only — no Etsy shop needed)
//   node ops.mjs listings        regenerate listing copy from ops/config.json
//   node ops.mjs art             validate design PNGs -> print masters
//   node ops.mjs tm              trademark-screen every printed phrase (gate)
//   node ops.mjs plan            resolve blueprints + REAL base costs/margins
//   node ops.mjs stage           create drafts on Printify (margin-guarded)
//   node ops.mjs review          list drafts, margins and status
//   node ops.mjs review --mockups   same, plus the real mockup image URLs
//   node ops.mjs approve all     operator gate before anything goes live
//   node ops.mjs publish         push approved drafts to Etsy
//   node ops.mjs ledger          pull real orders -> revenue state
//   node ops.mjs orders          ship-by clock + stuck-order alarm (run daily)
//   node ops.mjs unstage A1,B7   delete those drafts (rollback)
//
// Every command is safe to re-run. Nothing publishes without `approve`, and
// nothing publishes at all until a real per-unit margin has been read back
// from Printify and cleared the floor in ops/config.json.
// ============================================================================

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, env, loadConfig } from './config.mjs';

const [cmd = 'status', ...rest] = process.argv.slice(2);
const arg0 = rest[0];

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
};

const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const state = (n) => readJson(join(PATHS.state, n + '.json'));

function run(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(PATHS.here, script), ...args], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

// ---------------------------------------------------------------- status
function status() {
  const cfg = (() => { try { return loadConfig(); } catch { return null; } })();
  const listings = readJson(PATHS.listings);
  const art = state('art');
  const staged = state('staged');
  const ledger = state('ledger');
  const hasEnv = existsSync(PATHS.env);
  const token = !!env('PRINTIFY_API_TOKEN');
  const shopId = !!env('PRINTIFY_SHOP_ID');

  const plan = state('plan');
  const catalog = state('catalog');
  const costs = state('costs');
  const uniqueArt = listings ? new Set(listings.listings.map(l => l.art_file)).size : 0;
  const artOk = art?.ok?.length ?? 0;
  const stagedItems = staged ? Object.values(staged.items) : [];
  const approved = stagedItems.filter(i => i.approved).length;
  const published = stagedItems.filter(i => i.published).length;
  const unverifiedMargin = stagedItems.filter(i => !i.margin_verified).length;

  const tm = state('tm-screen');
  const phrases = listings ? new Set(listings.listings.map(l => l.phrase).filter(Boolean)) : new Set();
  const phrasesTotal = phrases.size;
  const verdicts = tm?.verdicts ?? {};
  const phrasesCleared = [...phrases].filter(p => verdicts[p]?.verdict === 'PASS').length;
  const phrasesRejected = [...phrases].filter(p => verdicts[p] && verdicts[p].verdict !== 'PASS').length;

  const steps = [
    {
      name: 'Shop name set',
      done: !!(cfg && cfg.shop_name && cfg.shop_name.trim()),
      detail: cfg?.shop_name?.trim() || 'empty',
      next: 'edit ops/config.json → "shop_name": "Your Etsy Shop Name"',
    },
    {
      name: 'Credentials present',
      done: token,
      detail: !hasEnv ? 'no .env file' : token ? (shopId ? 'token + shop id' : 'token only') : 'no token',
      next: 'cp .env.example .env  then paste the Printify token into it',
    },
    {
      name: 'Printify connection verified',
      done: token && shopId,
      detail: shopId ? 'shop id set' : 'not verified',
      next: 'node ops.mjs verify   (prints the shop id → paste into .env)',
    },
    {
      name: 'Etsy fee schedule confirmed',
      done: !!cfg?.fees?.fees_confirmed,
      detail: cfg?.fees?.fees_confirmed
        ? `${cfg.fees.transaction_pct}% + ${cfg.fees.payment_processing_pct}% + $${cfg.fees.payment_processing_flat_usd}`
        : 'unconfirmed',
      next: 'check ops/config.json fees against Shop Manager → Finances, then set fees_confirmed: true',
    },
    {
      name: 'Listing copy generated',
      done: !!listings,
      detail: listings ? `${listings.count} listings` : 'not generated',
      next: 'node ops.mjs listings',
    },
    // Deliberately BEFORE art. Drawing 34 designs is the expensive human step,
    // and the catalog decides whether they are worth drawing: if this account
    // has no 9oz candle blueprint, twelve of them are wasted work. Find out
    // first.
    // `catalog` and `plan` answer the same question — do these products exist
    // and do the prices work — but catalog needs only a token, so it is the one
    // that actually gets run first. Accepting only plan.json reported "not run"
    // when the work was done and its results were sitting in catalog.json.
    {
      name: 'Catalog + margins resolved',
      done: !!(plan || catalog),
      detail: plan
        ? `${Object.values(plan.plan || {}).filter(p => !p.error).length}/${Object.keys(plan.plan || {}).length} product types (plan)`
        : catalog
          ? `${(catalog.products || []).filter(p => p.found).length}/${(catalog.products || []).length} product types${costs ? ' · costs measured' : ''}`
          : 'not run',
      next: 'node ops.mjs catalog   (proves the products exist and prices the real margins — do this BEFORE drawing 34 designs)',
    },
    {
      name: 'Printed phrases screened',
      done: !!(tm && listings && phrasesTotal > 0 && phrasesCleared >= phrasesTotal),
      detail: listings ? `${phrasesCleared}/${phrasesTotal} phrases${phrasesRejected ? ` · ${phrasesRejected} rejected` : ''}` : '—',
      next: 'node ops.mjs tm   (trademark-screen every printed phrase — stage refuses unscreened ones)',
    },
    {
      name: 'Design art validated',
      done: uniqueArt > 0 && artOk >= uniqueArt,
      detail: listings ? `${artOk}/${uniqueArt} files` : '—',
      next: `generate PNGs with ops/PROMPTS.md → save into ops/art/ → node ops.mjs art`,
    },
    {
      name: 'Drafts staged on Printify',
      done: stagedItems.length >= (listings?.count ?? 40),
      detail: `${stagedItems.length}/${listings?.count ?? 40}${unverifiedMargin ? ` · ${unverifiedMargin} unverified margin` : ''}`,
      next: 'node ops.mjs stage',
    },
    {
      name: 'Operator approved',
      done: approved > 0 && approved >= stagedItems.length && stagedItems.length > 0,
      detail: `${approved}/${stagedItems.length || 0}`,
      next: 'node ops.mjs review --mockups   then   node ops.mjs approve all',
    },
    {
      name: 'Published to Etsy',
      done: published > 0 && published >= stagedItems.length && stagedItems.length > 0,
      detail: `${published}/${stagedItems.length || 0}`,
      next: 'node ops.mjs publish',
    },
    {
      name: 'First real order',
      done: (ledger?.orders ?? 0) > 0,
      detail: ledger ? `${ledger.orders} orders · $${(ledger.revenue?.total ?? 0).toFixed(2)}` : 'no ledger yet',
      next: 'node ops.mjs ledger   (run daily once live, alongside node ops.mjs orders)',
    },
  ];

  console.log('\n' + C.b('  PERPETUA ORBITAL — operations status') + '\n');
  for (const s of steps) {
    const mark = s.done ? C.g('✔') : C.dim('·');
    const detail = s.done ? C.dim(s.detail) : C.y(s.detail);
    console.log(`  ${mark} ${s.name.padEnd(30)} ${detail}`);
  }
  const next = steps.find(s => !s.done);
  console.log('');
  if (next) {
    console.log('  ' + C.b('NEXT: ') + next.name);
    console.log('  ' + C.g('  ' + next.next) + '\n');
  } else {
    console.log('  ' + C.g('all launch gates passed — run `node ops.mjs orders` and `node ops.mjs ledger` daily') + '\n');
  }
  if (ledger && ledger.revenue) {
    console.log(`  revenue $${ledger.revenue.total.toFixed(2)} · costs $${ledger.costs.total.toFixed(2)} · net $${ledger.net.toFixed(2)}`);
    console.log(C.dim(`  ledger fetched ${ledger.fetchedAt}`) + '\n');
  }
}

// ---------------------------------------------------------------- dispatch
const COMMANDS = {
  status,
  help: () => console.log(readFileSync(new URL(import.meta.url)).toString().split('// ===')[1]),
  verify: () => run('cli.mjs', ['verify']),
  listings: () => run('gen-listings.mjs'),
  art: () => run('intake.mjs', rest),
  plan: () => run('stage.mjs', ['plan', ...rest]),
  stage: () => run('stage.mjs', ['run', ...rest]),
  review: () => run('publish.mjs', ['list', ...rest]),
  approve: () => run('publish.mjs', ['approve', ...rest]),
  publish: () => run('publish.mjs', ['run', ...rest]),
  unstage: () => run('publish.mjs', ['unstage', ...rest]),
  ledger: () => run('ledger.mjs'),
  orders: () => run('orders.mjs', ['watch']),
  console: () => run('serve.mjs', rest),
  catalog: () => run('catalog.mjs'),
  vault: () => run('gen-vault.mjs'),
  sheet: () => run('gen-promptsheet.mjs', rest),
  probe: () => run('probe.mjs', rest),
  leadtime: () => run('leadtime.mjs', rest),
  margins: () => run('margins.mjs', rest),
  etsy: () => run('etsy.mjs', rest),
  doctor: () => run('doctor.mjs'),
  test: () => run('test-margin.mjs'),
  tm: () => run('tm.mjs', [arg0 ?? 'list', ...rest.slice(1)]),
  blueprints: () => run('cli.mjs', ['blueprints', ...rest]),
  providers: () => run('cli.mjs', ['providers', ...rest]),
};

const fn = COMMANDS[cmd];
if (!fn) {
  console.error(`unknown command "${cmd}"\ncommands: ${Object.keys(COMMANDS).join(' | ')}`);
  process.exit(2);
}
const code = await fn();
process.exit(typeof code === 'number' ? code : 0);
