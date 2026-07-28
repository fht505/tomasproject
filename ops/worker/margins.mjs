#!/usr/bin/env node
// What the fee schedule does to every product, before you go and read it.
//
//   node ops.mjs margins
//
// ops/config.json carries Etsy's PUBLISHED rates, not rates read from your
// account, and the difference is not cosmetic. Offsite Ads is the one that
// moves real money: sellers under $10k/yr may opt out, above it they may not,
// and the rate is 12% or 15%. Nobody should discover mid-launch that half the
// batch no longer clears the floor.
//
// So this prices every product against the REAL measured base costs in
// state/costs.json under each scenario, and says plainly which listings die.
// It changes nothing — it is a calculator, not a gate.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, loadConfig, netMargin, minPriceFor } from './config.mjs';

const costsPath = join(PATHS.state, 'costs.json');
if (!existsSync(costsPath)) {
  console.error('no state/costs.json — run: node ops.mjs probe');
  process.exit(1);
}
const costs = JSON.parse(readFileSync(costsPath, 'utf8'));
const cfg = loadConfig();
const floor = cfg.min_margin_usd;

// Worst-case variant, always. A batch that only works on the cheapest colour is
// not a batch that works.
const rows = costs.products
  .filter(p => p.margin && typeof p.max === 'number')
  .map(p => ({ label: p.label, provider: p.provider, price: p.margin.price, cost: p.max }));

const SCENARIOS = [
  { name: 'as configured', offsite: cfg.fees.offsite_ads_pct },
  { name: 'Offsite Ads 12%', offsite: 12 },
  { name: 'Offsite Ads 15%', offsite: 15 },
];

const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2);
console.log(`\n  Net per unit at the WORST-case variant, on measured costs (${costs.fetchedAt.slice(0, 10)})`);
console.log(`  floor $${floor.toFixed(2)} · fees ${cfg.fees.fees_confirmed ? 'operator-confirmed' : 'UNCONFIRMED — from Etsy\'s published schedule'}\n`);

const head = '  ' + 'product'.padEnd(12) + 'price'.padStart(8) + 'cost'.padStart(9)
  + SCENARIOS.map(s => s.name.padStart(17)).join('');
console.log(head);
console.log('  ' + '-'.repeat(head.length - 2));

const failures = [];
for (const r of rows) {
  let line = '  ' + r.label.padEnd(12) + money(r.price).padStart(8) + money(r.cost).padStart(9);
  for (const s of SCENARIOS) {
    const fees = { ...cfg.fees, offsite_ads_pct: s.offsite };
    const m = netMargin({ priceUsd: r.price, baseCostUsd: r.cost, fees });
    const bad = m.net < floor;
    if (bad) failures.push({ product: r.label, scenario: s.name, net: m.net, fees });
    line += (money(m.net) + (bad ? ' ✗' : '  ')).padStart(17);
  }
  console.log(line);
}

console.log('');
if (!failures.length) {
  console.log(`  every product clears $${floor.toFixed(2)} under all three scenarios\n`);
} else {
  const byScenario = new Map();
  for (const f of failures) {
    if (!byScenario.has(f.scenario)) byScenario.set(f.scenario, []);
    byScenario.get(f.scenario).push(f);
  }
  for (const [scenario, fs] of byScenario) {
    console.log(`  ${scenario}: ${fs.length} product(s) fall below the $${floor.toFixed(2)} floor`);
    for (const f of fs) {
      const r = rows.find(x => x.label === f.product);
      const need = minPriceFor({ baseCostUsd: r.cost, target: floor, fees: f.fees });
      console.log(`    ${f.product.padEnd(12)} nets ${money(f.net)} — would need to be priced at $${need.toFixed(2)} (currently $${r.price.toFixed(2)})`);
    }
  }
  console.log('\n  The margin guard deletes a draft that lands here, so this is what would');
  console.log('  silently shrink the batch rather than fail loudly.\n');
}

writeFileSync(join(PATHS.state, 'margin-scenarios.json'), JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: 'computed from state/costs.json (real measured base costs) against ops/config.json fee schedule',
  produced_by: 'margins.mjs',
  fees_confirmed: cfg.fees.fees_confirmed,
  min_margin_usd: floor,
  scenarios: SCENARIOS.map(s => ({
    name: s.name,
    offsite_ads_pct: s.offsite,
    products: rows.map(r => ({
      label: r.label,
      price: r.price,
      worst_case_cost: r.cost,
      ...netMargin({ priceUsd: r.price, baseCostUsd: r.cost, fees: { ...cfg.fees, offsite_ads_pct: s.offsite } }),
    })),
  })),
}, null, 2));
console.log('  wrote state/margin-scenarios.json\n');
