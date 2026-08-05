// TEMPORARY: wait for Printify to finish syncing batch 3 to Etsy, then apply
// the two settings the first 34 already have — shop section and auto-renew.
//
// Printify creates the Etsy listing asynchronously after publish, so
// external.id arrives minutes later. Running the section pass immediately
// assigned only the 2 listings that had synced; the rest silently got nothing.
// This polls until every listing has an id rather than assuming a fixed delay.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient } from './printify.mjs';
import { call } from './etsy.mjs';
import { env } from './config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const printify = makeClient(env('PRINTIFY_API_TOKEN'));
const staged = JSON.parse(readFileSync(join(here, '../state/staged.json'), 'utf8'));
const codes = Object.keys(staged.items).filter(c => /^D\d+$/.test(c));

let ids = {};
for (let attempt = 1; attempt <= 30; attempt++) {
  ids = {};
  for (const code of codes) {
    const p = await printify.getProduct(env('PRINTIFY_SHOP_ID'), staged.items[code].product_id);
    if (p.external?.id) ids[code] = p.external.id;
  }
  const n = Object.keys(ids).length;
  console.log(`attempt ${attempt}: ${n}/${codes.length} synced`);
  if (n === codes.length) break;
  await new Promise(r => setTimeout(r, 30000));
}

const missing = codes.filter(c => !ids[c]);
if (missing.length) console.log(`still unsynced after waiting: ${missing.join(', ')}`);

// auto-renew, matching the rest of the shop
let renewed = 0;
for (const [code, id] of Object.entries(ids)) {
  try {
    await call('PATCH', `/shops/${env('ETSY_SHOP_ID')}/listings/${id}`, { should_auto_renew: true });
    renewed++;
  } catch (e) { console.log(`renew FAILED ${code}: ${e.message.slice(0, 90)}`); }
  await new Promise(r => setTimeout(r, 220));
}
console.log(`auto-renew enabled on ${renewed}`);

// sections — the existing tool is idempotent and reuses sections by title
const r = spawnSync(process.execPath, [join(here, 'ops.mjs'), 'etsy-sections', '--write'], { encoding: 'utf8' });
console.log((r.stdout || '').split('\n').slice(-6).join('\n'));
