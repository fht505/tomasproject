#!/usr/bin/env node
// Environment check. Run this FIRST on a new machine.
//
//   node ops.mjs doctor
//
// Everything else in this pipeline assumes node, sharp, a readable config and
// a reachable Printify. When one of those is wrong the failure surfaces three
// commands later as something that looks like a bug in the pipeline. This
// checks them directly and says how to fix each one.
//
// Exits non-zero if anything BLOCKING is wrong. Warnings do not fail.

import { PATHS, loadConfig, env } from './config.mjs';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIN_NODE = 20;

const results = [];
const ok = (name, detail) => results.push({ level: 'ok', name, detail });
const warn = (name, detail, fix) => results.push({ level: 'warn', name, detail, fix });
const bad = (name, detail, fix) => results.push({ level: 'FAIL', name, detail, fix });

// ---------------------------------------------------------------- runtime
const major = Number(process.versions.node.split('.')[0]);
if (major >= MIN_NODE) {
  ok('node', `v${process.versions.node}`);
} else {
  bad('node', `v${process.versions.node} is too old`,
    `install Node ${MIN_NODE} or newer — https://nodejs.org (this code uses top-level await and built-in fetch)`);
}

// ---------------------------------------------------------------- sharp
// The only dependency, and the only one that can fail per-platform: it ships
// prebuilt native binaries, so a machine with the wrong arch build installed
// fails at require time rather than at install time.
try {
  const sharp = (await import('sharp')).default;
  const v = JSON.parse(readFileSync(join(PATHS.here, 'node_modules/sharp/package.json'), 'utf8')).version;
  await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png().toBuffer();
  ok('sharp', `v${v}, renders correctly`);
} catch (e) {
  bad('sharp', e.message.split('\n')[0],
    `cd ${PATHS.here} && npm install    (if it still fails: rm -rf node_modules package-lock.json && npm install)`);
}

// ---------------------------------------------------------------- config
let cfg = null;
try {
  cfg = loadConfig();
  const shop = (cfg.shop_name || '').trim();
  if (shop) ok('ops/config.json', `valid · shop "${shop}"`);
  else warn('ops/config.json', 'valid, but shop_name is empty',
    'set shop_name to the exact Etsy shop name before generating listings');
} catch (e) {
  bad('ops/config.json', e.message, 'fix the JSON, or restore it from git');
}

if (cfg) {
  if (cfg.fees?.fees_confirmed) ok('fee schedule', 'confirmed by operator');
  else warn('fee schedule', 'not confirmed — publish will refuse to run',
    'check ops/config.json fees against Shop Manager → Finances, then set fees_confirmed: true');

  const p = cfg.processing || {};
  if ((p.days || '').trim() && (p.source || '').trim()) ok('processing time', `${p.days} (${p.source})`);
  else warn('processing time', 'blank — no shipping promise goes into descriptions, and the ship-by clock is off',
    'fill processing.days and processing.source after `node ops.mjs plan` shows the provider lead time');
}

// ---------------------------------------------------------------- secrets
const token = env('PRINTIFY_API_TOKEN');
const shopId = env('PRINTIFY_SHOP_ID');
if (!existsSync(PATHS.env)) {
  warn('credentials', 'no .env file yet',
    `cd ${PATHS.here} && cp .env.example .env    then paste the Printify token into it`);
} else if (!token) {
  bad('credentials', '.env exists but PRINTIFY_API_TOKEN is empty', 'paste the token into ops/worker/.env');
} else {
  ok('credentials', shopId ? 'token + shop id' : 'token set, shop id not yet resolved');
}

// ---------------------------------------------------------------- writable
for (const [label, dir] of [['state', PATHS.state], ['art', PATHS.art]]) {
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, '.doctor-write-test');
    writeFileSync(probe, 'x');
    rmSync(probe);
    ok(`${label}/ writable`, dir);
  } catch (e) {
    bad(`${label}/ writable`, e.message, `check permissions on ${dir}`);
  }
}

// ---------------------------------------------------------------- network
// A real request, not a ping: corporate proxies and VPNs fail TLS to specific
// hosts while everything else works. With a token this also proves the token.
try {
  const res = await fetch('https://api.printify.com/v1/shops.json', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401 && !token) ok('printify reachable', 'responds (401 expected without a token)');
  else if (res.status === 401) bad('printify token', 'rejected with 401', 'the token is wrong or revoked — generate a new one');
  else if (res.ok) {
    const shops = await res.json();
    ok('printify', `token valid · ${shops.length} shop${shops.length === 1 ? '' : 's'} connected`);
    if (shopId && !shops.some(s => String(s.id) === String(shopId))) {
      bad('shop id', `PRINTIFY_SHOP_ID=${shopId} is not one of your shops`, 'run: node ops.mjs verify');
    }
    if (!shops.length) {
      warn('printify shops', 'none connected', 'connect the Etsy store in Printify: My stores → Add new store → Etsy');
    }
  } else if (res.status === 403) {
    warn('printify', 'reachable but returned 403',
      'usually a proxy or VPN sitting in front of api.printify.com rather than a Printify problem — try without the VPN');
  } else {
    warn('printify', `unexpected status ${res.status}`, 'retry; if it persists check Printify status');
  }
} catch (e) {
  bad('network', `cannot reach api.printify.com — ${e.message}`,
    'check the connection; a VPN or proxy may be blocking it');
}

// ---------------------------------------------------------------- pipeline state
if (existsSync(PATHS.listings)) {
  try {
    const l = JSON.parse(readFileSync(PATHS.listings, 'utf8'));
    ok('listings', `${l.count} generated`);
  } catch { bad('listings', 'BATCH-01.listings.json is not valid JSON', 'regenerate: node ops.mjs listings'); }
} else {
  warn('listings', 'not generated yet', 'node ops.mjs listings   (needs shop_name set first)');
}

// ---------------------------------------------------------------- report
const C = { ok: '\x1b[32m✔\x1b[0m', warn: '\x1b[33m!\x1b[0m', FAIL: '\x1b[31m✗\x1b[0m' };
console.log('\n  \x1b[1mEnvironment check\x1b[0m\n');
for (const r of results) {
  console.log(`  ${C[r.level]} ${r.name.padEnd(22)} \x1b[2m${r.detail}\x1b[0m`);
  if (r.fix) console.log(`      \x1b[36m${r.fix}\x1b[0m`);
}

const fails = results.filter(r => r.level === 'FAIL').length;
const warns = results.filter(r => r.level === 'warn').length;
console.log('');
if (fails) {
  console.log(`  \x1b[31m${fails} blocking problem${fails === 1 ? '' : 's'}\x1b[0m — fix the cyan lines above, then re-run\n`);
} else if (warns) {
  console.log(`  \x1b[32mnothing broken\x1b[0m · ${warns} step${warns === 1 ? '' : 's'} still to do — run \x1b[1mnode ops.mjs\x1b[0m for the order\n`);
} else {
  console.log('  \x1b[32meverything checks out\x1b[0m — run \x1b[1mnode ops.mjs\x1b[0m\n');
}
process.exit(fails ? 1 : 0);
