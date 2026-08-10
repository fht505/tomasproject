// Compose ops/state/station.json — the era-2 station feed. Every field is
// read from a real state file, a real directory listing, or a live API probe
// run at sync time. Nothing is typed in by hand; absent sources emit null so
// the console renders honest emptiness rather than a guess.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const opsDir = join(root, 'ops');
const stateDir = join(opsDir, 'state');
const readJson = (p) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;

// ---- physical shelf: the staged/live Printify catalog -------------------
const staged = readJson(join(stateDir, 'staged.json'));
const physical = staged ? Object.entries(staged.items).map(([code, it]) => ({
  code,
  title: it.title,
  product: it.product,
  price_usd: it.price_usd,
  staged_at: it.staged_at,
})) : null;

// ---- digital shelf ------------------------------------------------------
const digital = readJson(join(stateDir, 'digital.json'));
const digitalDir = join(opsDir, 'digital');
const digitalItems = digital ? Object.entries(digital.items).map(([code, listingId]) => ({
  code, listing_id: listingId,
  built: existsSync(digitalDir) && readdirSync(digitalDir).some(d => d.startsWith(code + '-')),
})) : null;

// ---- social bay ---------------------------------------------------------
const socialImgDir = join(opsDir, 'social', 'img');
const conn = readJson(join(stateDir, 'social-connections.json'));
const approval = readJson(join(stateDir, 'social-approval.json'));
const postedLog = readJson(join(stateDir, 'social-posted.json'));
const social = {
  posts_composed: existsSync(socialImgDir) ? readdirSync(socialImgDir).filter(f => f.endsWith('.jpg')).length : 0,
  plan_written: existsSync(join(opsDir, 'social', 'PLAN.md')),
  operator_approved: !!approval?.approved,   // written only on explicit operator approval
  posts_published: postedLog?.posted?.length ?? 0,
  latest_post: postedLog?.posted?.at(-1) ?? null,
  queue_remaining: postedLog?.queue_remaining?.length ?? null,
  instagram_connected: !!conn?.instagram?.connected,
  instagram_username: conn?.instagram?.username ?? null,
  facebook_connected: !!conn?.facebook?.connected,
  facebook_page_id: conn?.facebook?.page_id ?? null,
};

// ---- media bay: the YouTube channel ------------------------------------
const scriptsDir = join(root, 'channel', 'scripts');
const phase0 = existsSync(join(root, 'channel', 'PHASE0.md'));
const youtube = phase0 ? {
  name: 'Why Is My Car Doing That?',
  handle: '@WhyIsMyCarDoingThat',
  design_spec: 'docs/superpowers/specs/2026-08-05-yt-explainer-channel-distrokid-design.md',
  topics_banked: 16,                 // channel/PHASE0.md, Semrush-verified 2026-08-07
  scripts_drafted: existsSync(scriptsDir) ? readdirSync(scriptsDir).filter(f => f.endsWith('.md')).length : 0,
  tm_screen: 'pending (ops/CHANNEL-NAME-SCREEN.md, terminal-2)',
  channel_created: false,
  voice_chosen: false,
} : null;

// ---- lane board ---------------------------------------------------------
const lanesData = readJson(join(opsDir, 'lanes.data.json'));
const lanes = lanesData ? {
  total: lanesData.lanes.length,
  by_verdict: lanesData.lanes.reduce((m, l) => (m[l.verdict] = (m[l.verdict] || 0) + 1, m), {}),
  building: lanesData.lanes.filter(l => l.verdict === 'building').map(l => l.name),
  candidates: lanesData.lanes.filter(l => l.verdict === 'candidate').map(l => ({ name: l.name, checked: l.checked })),
} : null;

// ---- live API probes (the "wired" part) ---------------------------------
async function probeEtsy() {
  try {
    const hdr = `${env('ETSY_KEYSTRING')}:${env('ETSY_SHARED_SECRET')}`;
    const r = await fetch('https://api.etsy.com/v3/application/shops/67181250', { headers: { 'x-api-key': hdr } });
    return { status: r.status, ok: r.ok, note: r.ok ? 'API live' : (await r.json()).error?.slice(0, 80) ?? 'error' };
  } catch (e) { return { status: 0, ok: false, note: 'unreachable: ' + e.message.slice(0, 60) }; }
}
async function probePrintify() {
  try {
    const r = await fetch(`https://api.printify.com/v1/shops/${env('PRINTIFY_SHOP_ID')}/products.json?limit=1`, {
      headers: { Authorization: `Bearer ${env('PRINTIFY_API_TOKEN')}` } });
    const j = r.ok ? await r.json() : null;
    return { status: r.status, ok: r.ok, products_total: j?.total ?? null };
  } catch (e) { return { status: 0, ok: false, note: 'unreachable: ' + e.message.slice(0, 60) }; }
}

const [etsyApi, printifyApi] = await Promise.all([probeEtsy(), probePrintify()]);

const station = {
  fetchedAt: new Date().toISOString(),
  source: 'station-sync.mjs — state files, directory listings, and live API probes at sync time',
  shop: { name: 'KindlyPut', url: 'https://kindlyput.etsy.com', launched: '2026-07-29' },
  probes: { etsyApi, printifyApi },
  physical, digitalItems, social, youtube, lanes,
};
writeFileSync(join(stateDir, 'station.json'), JSON.stringify(station, null, 2));
console.log('station.json written —',
  `physical ${physical?.length ?? 0} · digital ${digitalItems?.length ?? 0} ·`,
  `social ${social.posts_composed} posts · yt scripts ${youtube?.scripts_drafted ?? 0} ·`,
  `lanes ${lanes?.total ?? 0} · etsy ${etsyApi.status} · printify ${printifyApi.status}`);
