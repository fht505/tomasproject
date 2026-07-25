// Config + credential loading. One place, validated, fails loudly.
//
// Secrets:  ops/worker/.env   (gitignored, never committed)
// Settings: ops/config.json   (committed, no secrets)

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const PATHS = {
  here,
  ops: join(here, '..'),
  state: join(here, '..', 'state'),
  art: join(here, '..', 'art'),
  print: join(here, '..', 'art', 'print'),
  listings: join(here, '..', 'BATCH-01.listings.json'),
  config: join(here, '..', 'config.json'),
  env: join(here, '.env'),
};

// minimal .env parser — no dependency, ignores comments and blank lines
function loadEnvFile() {
  if (!existsSync(PATHS.env)) return {};
  const out = {};
  for (const raw of readFileSync(PATHS.env, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvFile();
// real environment wins over the file, so one-off overrides still work
export const env = (key) => process.env[key] || fileEnv[key] || '';

const FEE_DEFAULTS = {
  fees_confirmed: false,
  transaction_pct: 6.5,
  payment_processing_pct: 3.0,
  payment_processing_flat_usd: 0.25,
  listing_fee_usd: 0.20,
  offsite_ads_pct: 0,
  free_shipping: false,
};

export function loadConfig() {
  if (!existsSync(PATHS.config)) throw new Error('missing ops/config.json');
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(PATHS.config, 'utf8'));
  } catch (e) {
    throw new Error(`ops/config.json is not valid JSON — ${e.message}`);
  }
  cfg.fees = { ...FEE_DEFAULTS, ...(cfg.fees || {}) };

  const num = (k, v, { min = 0 } = {}) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min) {
      throw new Error(`ops/config.json: ${k} must be a number >= ${min} (got ${JSON.stringify(v)})`);
    }
  };
  num('min_margin_usd', cfg.min_margin_usd);
  num('max_products_per_run', cfg.max_products_per_run, { min: 1 });
  for (const k of ['transaction_pct', 'payment_processing_pct', 'payment_processing_flat_usd',
    'listing_fee_usd', 'offsite_ads_pct']) {
    num(`fees.${k}`, cfg.fees[k]);
  }
  return cfg;
}

// The inverse of netMargin: the lowest price that still clears `target` once
// Printify's cost and Etsy's percentage cuts are taken. A rejection that only
// says "too thin" leaves the operator guessing; one that names the price does not.
export function minPriceFor({ baseCostUsd, shippingUsd = 0, target, fees }) {
  const f = { ...FEE_DEFAULTS, ...(fees || {}) };
  const pct = (f.transaction_pct + f.payment_processing_pct + f.offsite_ads_pct) / 100;
  const flat = f.payment_processing_flat_usd + f.listing_fee_usd;
  const price = (target + baseCostUsd + shippingUsd + flat) / (1 - pct);
  return Math.ceil(price * 100) / 100;
}

// ---------------------------------------------------------------------------
// Margin. Two inputs, two provenances:
//   baseCostUsd   REAL — comes straight off the Printify product/variant
//   fees          OPERATOR-SUPPLIED — Etsy's schedule, typed into config.json
// Never blend them silently. netMargin returns the breakdown so callers can
// show their work instead of asserting a number.
// ---------------------------------------------------------------------------
export function netMargin({ priceUsd, baseCostUsd, shippingUsd = 0, fees }) {
  const f = { ...FEE_DEFAULTS, ...(fees || {}) };
  const transaction = priceUsd * (f.transaction_pct / 100);
  const processing = priceUsd * (f.payment_processing_pct / 100) + f.payment_processing_flat_usd;
  const offsiteAds = priceUsd * (f.offsite_ads_pct / 100);
  const platform = transaction + processing + offsiteAds + f.listing_fee_usd;
  const net = priceUsd - baseCostUsd - shippingUsd - platform;
  const r = (n) => Number(n.toFixed(2));
  return {
    price: r(priceUsd),
    base_cost: r(baseCostUsd),
    shipping: r(shippingUsd),
    platform_fees: r(platform),
    net: r(net),
    fees_confirmed: !!f.fees_confirmed,
  };
}

export function requireShopName() {
  const cfg = loadConfig();
  const name = (cfg.shop_name || '').trim();
  if (!name) {
    throw new Error('shop_name is empty in ops/config.json — set it to the real Etsy shop name first');
  }
  return name;
}

export function credentials(need = ['token']) {
  const token = env('PRINTIFY_API_TOKEN');
  const shopId = env('PRINTIFY_SHOP_ID');
  if (need.includes('token') && !token) {
    throw new Error('PRINTIFY_API_TOKEN not set — add it to ops/worker/.env (see .env.example)');
  }
  if (need.includes('shop') && !shopId) {
    throw new Error('PRINTIFY_SHOP_ID not set — run `node ops.mjs verify` to list shops, then add it to .env');
  }
  return { token, shopId };
}

// Guard: nothing containing an unsubstituted {placeholder} may ever be sent to
// a marketplace. This caught 40 listings about to publish "Designed by {SHOP}".
export function assertNoPlaceholders(listing) {
  const fields = ['title', 'description', ...(listing.tags || [])];
  for (const f of fields) {
    const m = String(f).match(/\{[A-Z_]+\}/);
    if (m) throw new Error(`${listing.code}: unsubstituted placeholder ${m[0]} — re-run \`node ops.mjs listings\` after setting shop_name`);
  }
}
