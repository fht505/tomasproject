#!/usr/bin/env node
// Read the real handling time for every product we sell, from Printify.
//
//   node ops.mjs leadtime
//
// ops/config.json wants processing.days, and until it is set no shipping
// promise goes into a description and the ship-by clock in `orders` stays off —
// which means a stalled order raises no alarm. The obvious way to fill it in is
// to type a number someone half-remembers. This reads it from the API instead.
//
// The number lives on the shipping endpoint, not the catalog one:
//   GET /v1/catalog/blueprints/{bp}/print_providers/{pp}/shipping.json
//        -> handling_time: { value, unit }
//
// READ THE CAVEAT THIS PRINTS. Printify documents handling_time as the maximum
// time before an order ships, and every provider we use returns exactly the same
// value — which is the signature of a platform-wide ceiling, not a measurement
// of how fast Candle Builders actually works. It is therefore safe to promise
// and wrong to treat as a production estimate. Whether to quote it to buyers is
// a business call, so this writes state/leadtime.json and leaves config alone.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeClient } from './printify.mjs';
import { PATHS, env, loadConfig } from './config.mjs';

const planPath = join(PATHS.state, 'plan.json');
if (!existsSync(planPath)) {
  console.error('no state/plan.json — run: node ops.mjs plan');
  process.exit(1);
}
const { plan } = JSON.parse(readFileSync(planPath, 'utf8'));
const client = makeClient(env('PRINTIFY_API_TOKEN'));

const rows = [];
for (const [key, p] of Object.entries(plan)) {
  if (!p.blueprint_id || !p.provider_id) {
    rows.push({ key, error: 'unresolved in plan.json' });
    continue;
  }
  try {
    const s = await client.shipping(p.blueprint_id, p.provider_id);
    const h = s?.handling_time;
    rows.push({
      key,
      blueprint_id: p.blueprint_id,
      provider_id: p.provider_id,
      provider: p.provider,
      handling_time_value: h?.value ?? null,
      handling_time_unit: h?.unit ?? null,
    });
  } catch (e) {
    rows.push({ key, blueprint_id: p.blueprint_id, provider_id: p.provider_id, error: e.message.slice(0, 200) });
  }
}

const ok = rows.filter(r => r.handling_time_value != null);
const values = [...new Set(ok.map(r => `${r.handling_time_value} ${r.handling_time_unit}`))];
const worst = ok.length ? Math.max(...ok.map(r => r.handling_time_value)) : null;

console.log('\n  handling time, read from Printify\n');
for (const r of rows) {
  if (r.error) { console.log(`  !  ${r.key.padEnd(24)} ${r.error}`); continue; }
  console.log(`  ok ${r.key.padEnd(24)} ${String(r.handling_time_value).padStart(3)} ${r.handling_time_unit}(s)   ${r.provider} (bp${r.blueprint_id}/pp${r.provider_id})`);
}

const cfg = (() => { try { return loadConfig(); } catch { return null; } })();
const current = cfg?.processing?.days ?? null;

console.log('');
if (values.length === 1 && ok.length > 1) {
  console.log(`  Every provider returns the same value (${values[0]}).`);
  console.log('  Printify documents handling_time as the MAXIMUM time before an order ships.');
  console.log('  Identical values across unrelated providers means this is a platform ceiling,');
  console.log('  not a measurement of how fast any one of them actually prints. Treat it as the');
  console.log('  number you can safely PROMISE, not the number you should EXPECT.');
} else if (ok.length) {
  console.log(`  Values differ by provider: ${values.join(', ')} — the slowest governs a shop-wide promise.`);
}

if (worst != null) {
  console.log(`\n  safe shop-wide promise: ${worst} days`);
  console.log(`  ops/config.json processing.days is currently ${current === null || current === '' ? 'BLANK' : current}`);
  if (current === null || current === '') {
    console.log('\n  While it is blank: no shipping promise goes into any description, and the');
    console.log('  ship-by clock in `node ops.mjs orders` is off, so a stalled order raises no alarm.');
    console.log('  Quoting a lead time to buyers affects conversion, so that is your call:');
    console.log(`\n    node ops.mjs leadtime --write     set processing.days = ${worst} with its source`);
  }
}

mkdirSync(PATHS.state, { recursive: true });
writeFileSync(join(PATHS.state, 'leadtime.json'), JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'Printify GET /v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/shipping.json -> handling_time',
  produced_by: 'leadtime.mjs',
  caveat: 'handling_time is Printify\'s maximum time before shipment, not a production estimate. Identical values across all providers indicate a platform-wide ceiling.',
  worst_case_days: worst,
  distinct_values: values,
  providers: rows,
}, null, 2));
console.log(`\n  wrote state/leadtime.json`);

// --write is deliberately separate from the read. Filling in a customer-facing
// promise is a decision, not a side effect of looking something up.
if (process.argv.includes('--write')) {
  if (worst == null) { console.error('  nothing to write — no handling time came back'); process.exitCode = 1; }
  else {
    const cfgPath = PATHS.config;
    const raw = JSON.parse(readFileSync(cfgPath, 'utf8'));
    raw.processing = raw.processing || {};
    raw.processing.days = worst;
    raw.processing.source = `Printify shipping endpoint handling_time for all ${ok.length} pinned blueprint/provider pairs, each ${worst} days, read ${new Date().toISOString().slice(0, 10)}. This is Printify's stated maximum before shipment, not a production estimate.`;
    writeFileSync(cfgPath, JSON.stringify(raw, null, 2));
    console.log(`  set processing.days = ${worst} in ops/config.json`);
  }
}
