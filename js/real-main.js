// ================================================================
// PERPETUA ORBITAL — REAL operations console
//
// Policy: nothing simulated. This module renders only:
//   - ops/state/*.json   (written by real worker/agent runs)
//   - ops/BATCH-01.listings.json (the seller-authored production spec)
// A panel with no real data behind it renders empty and says so.
// ================================================================
import { ROOMS, ROOM_BY_ID, AGENTS, AGENT_BY_ID, PIPELINES, BOOT_LINES, CONTRACT_GOAL, fmtMoney } from './data.js';
import { initMap, drawMap, centerOn } from './map.js';

const $ = (id) => document.getElementById(id);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// --------------------------- real state --------------------------
// No 'inbox': Etsy's Open API v3 exposes no messages/conversations endpoint, so
// no state file can ever back an inbox feed. Listing one implied a connection
// that cannot exist.
const FEEDS = ['station', 'ledger', 'orders', 'products', 'signals', 'art', 'lanes', 'shops'];

// Channels a customer can actually buy from, vs internal/API stores. The
// custom_integration store exists so cost probes never touch a storefront.
const LIVE_CHANNELS = new Set(['etsy', 'amazon', 'shopify', 'ebay', 'walmart', 'wix', 'squarespace', 'bigcommerce', 'woocommerce', 'tiktok']);
const S = {
  files: {},           // name -> parsed json | null
  batch: null,
  feed: [],            // console event lines (load results only — real events)
  loadedAt: null,
};

async function fetchJson(path) {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

function pushFeed(kind, text) {
  S.feed.unshift({ t: new Date(), kind, text });
  if (S.feed.length > 60) S.feed.pop();
}

async function loadState(announce) {
  for (const f of FEEDS) S.files[f] = await fetchJson(`ops/state/${f}.json`);
  S.batch = await fetchJson('ops/BATCH-01.listings.json');
  S.loadedAt = new Date();
  if (announce) {
    for (const f of FEEDS) {
      const d = S.files[f];
      if (d) pushFeed('ok', `${f}.json live — fetched ${new Date(d.fetchedAt).toLocaleString()}`);
    }
    const absent = FEEDS.filter(f => !S.files[f]);
    if (absent.length) pushFeed('sys', `awaiting real data: ${absent.map(a => a + '.json').join(', ')}`);
    if (S.batch) pushFeed('ok', `batch spec loaded — ${S.batch.count} listings authored`);
  }
  renderAll();
}

// Staleness: a state file is a snapshot, not a live feed. Anything older than
// this is labelled in the UI so an old pull is never read as current money.
const STALE_MS = 6 * 60 * 60 * 1000;
function ageLabel(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60 * 1000) return 'just now';
  if (ms < 60 * 60 * 1000) return Math.floor(ms / 60000) + 'm ago';
  if (ms < 24 * 60 * 60 * 1000) return Math.floor(ms / 3600000) + 'h ago';
  return Math.floor(ms / 86400000) + 'd ago';
}
const isStale = (iso) => !!iso && (Date.now() - new Date(iso).getTime()) > STALE_MS;

// derived — all from real files, zeros when absent
function revenue() {
  const led = S.files.ledger;
  return {
    total: led?.revenue?.total ?? 0,
    etsy: led?.revenue?.etsy ?? 0,
    fiverr: led?.revenue?.fiverr ?? 0,
    costs: led?.costs?.total ?? 0,
  };
}

// how many distinct art files the batch actually needs — derived from the
// batch spec, never a hardcoded number (the C-series reuses A/B artwork, so
// this is fewer than the listing count and would drift if the batch changed)
function artRequired() {
  if (S.files.art?.required) return S.files.art.required;
  if (!S.batch) return null;
  return new Set(S.batch.listings.map(l => l.art_file)).size;
}

function checklist() {
  const st = S.files.station;
  const orders = S.files.orders;
  const orderCount = orders?.data?.data?.length ?? orders?.data?.length ?? 0;
  const phys = st?.physical?.length ?? 0;
  const digi = st?.digitalItems?.length ?? 0;
  const soc = st?.social;
  const yt = st?.youtube;
  return [
    { label: 'KindlyPut catalog live (physical + digital)', done: phys + digi >= 52, detail: st ? `${phys} + ${digi} listings` : 'no station sync' },
    { label: 'Etsy API operational', done: !!st?.probes?.etsyApi?.ok, detail: st ? `probe ${st.probes.etsyApi.status} — ${st.probes.etsyApi.note}` : '—' },
    { label: 'Social batch approved by operator', done: !!soc?.operator_approved, detail: soc ? `${soc.posts_composed} posts staged` : '—' },
    { label: 'Social channels connected (IG + FB)', done: !!(soc?.instagram_connected && soc?.facebook_connected), detail: soc ? [soc.instagram_connected ? 'IG ✔' : 'IG ✕', soc.facebook_connected ? 'FB ✔' : 'FB ✕'].join(' · ') : '—' },
    { label: 'Channel created (media bay)', done: !!yt?.channel_created, detail: yt ? `${yt.scripts_drafted} script(s), ${yt.topics_banked} topics banked` : 'not started' },
    { label: 'First real order', done: orderCount > 0, detail: orderCount ? `${orderCount} orders` : '—' },
  ];
}

// --------------------------- HUD ---------------------------------
function renderHUD() {
  const rev = revenue();
  $('hud-rev').textContent = fmtMoney(rev.total);
  $('hud-etsy').textContent = fmtMoney(rev.etsy);
  $('hud-fiverr').textContent = fmtMoney(rev.total - rev.costs);
  $('hud-assets').textContent = `${FEEDS.filter(f => S.files[f]).length}/${FEEDS.length}`;
  document.querySelector('#hud-assets').previousElementSibling.textContent = 'FEEDS';
  const st = S.files.station;
  if (st?.probes) {
    $('hud-ops').textContent = `ETSY ${st.probes.etsyApi.ok ? '✔' : '✕'} · PFY ${st.probes.printifyApi.ok ? '✔' : '✕'}`;
    document.querySelector('#hud-ops').previousElementSibling.textContent = 'APIS';
  } else {
    $('hud-ops').textContent = `${AGENTS.length} PLANNED`;
  }
  const cl = checklist();
  const pct = cl.filter(c => c.done).length / cl.length;
  $('hud-level').textContent = `${Math.round(pct * 100)}%`;
  document.querySelector('.hud-cell.wide .hud-k').innerHTML = 'LAUNCH <b id="hud-level">' + Math.round(pct * 100) + '%</b>';
  $('hud-xp').style.width = (pct * 100).toFixed(0) + '%';
  const goalPct = Math.min(100, rev.total / CONTRACT_GOAL * 100);
  $('goal-fill').style.width = Math.max(rev.total > 0 ? 0.5 : 0, goalPct) + '%';
  $('goal-text').textContent = `${fmtMoney(rev.total)} / $1T`;

  // never let an old pull read as current money
  const led = S.files.ledger;
  const onlineCell = $('hud-online');
  if (led && isStale(led.fetchedAt)) {
    onlineCell.textContent = `LEDGER ${ageLabel(led.fetchedAt)}`;
    onlineCell.style.color = 'var(--amber)';
  } else {
    onlineCell.textContent = led ? 'LIVE' : 'NO LEDGER';
    onlineCell.style.color = '';
  }
}

function renderClock() {
  const n = new Date();
  $('hud-clock').textContent =
    n.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() +
    ' ' + n.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

// --------------------------- rails -------------------------------
// an agent counts as having run only when a real state file proves it.
// File-name entries require the feed to exist; function entries test a field
// inside station.json (itself built from real files and live probes).
// ECHO is absent on purpose: there is no API that could prove it ran, so it
// reads as never-run rather than borrowing another agent's evidence.
const AGENT_EVIDENCE = {
  nova: 'signals', scout: 'lanes', flora: 'art', merch: 'products', ledger: 'ledger',
  wick:  (f) => (f.station?.physical?.length ?? 0) > 0,
  forge: (f) => (f.station?.digitalItems?.length ?? 0) > 0,
  halo:  (f) => (f.station?.social?.posts_composed ?? 0) > 0,
  prism: (f) => (f.station?.youtube?.scripts_drafted ?? 0) > 0,
};
const agentHasRun = (id) => {
  const ev = AGENT_EVIDENCE[id];
  if (!ev) return false;
  return typeof ev === 'function' ? !!ev(S.files) : !!S.files[ev];
};
const agentEvidenceLabel = (id) => {
  const ev = AGENT_EVIDENCE[id];
  return typeof ev === 'function' ? 'ops/state/station.json' : `ops/state/${ev}.json`;
};

function moduleStatus(roomId) {
  const st = S.files.station;
  switch (roomId) {
    case 'factory1': return st?.physical ? `${st.physical.length} live` : (S.batch ? `${S.batch.count} spec` : '—');
    case 'factory2': return st?.digitalItems ? `${st.digitalItems.length} live` : '—';
    case 'comms': return st?.social ? `${st.social.posts_composed} staged` : '—';
    case 'quarters': return st?.youtube ? `${st.youtube.scripts_drafted} script` : '—';
    case 'ventures': return st?.lanes ? `${st.lanes.total} lanes` : '—';
    case 'research': return S.files.signals ? `${S.files.signals.signals.length} sig` : '—';
    case 'treasury': return fmtMoney(revenue().total - revenue().costs).replace('.00', '');
    default: return '—';
  }
}

function renderRailLeft() {
  const list = $('module-list');
  $('module-count').textContent = ROOMS.length + ' MODULES';
  list.innerHTML = '';
  for (const r of ROOMS) {
    const row = el('div', 'mod-row' + (openRoomId === r.id ? ' active' : ''));
    const dot = el('span', 'mod-dot');
    dot.style.background = r.color;
    dot.style.boxShadow = `0 0 5px ${r.color}`;
    row.appendChild(dot);
    row.appendChild(el('span', 'mod-name', esc(r.name)));
    row.appendChild(el('span', 'mod-rev', esc(moduleStatus(r.id))));
    row.onclick = () => openRoom(r.id);
    list.appendChild(row);
  }
  const crew = $('crew-list');
  crew.innerHTML = '';
  // honest header: these are planned runs, not staff currently working
  const ranCount = AGENTS.filter(a => agentHasRun(a.id)).length;
  document.querySelectorAll('#rail-left .rail-head')[1].textContent =
    `CREW — ${ranCount}/${AGENTS.length} HAVE RUN`;
  for (const a of AGENTS) {
    const row = el('div', 'crew-row');
    row.appendChild(el('span', 'crew-name', esc(a.name)));
    row.appendChild(el('span', 'crew-room', esc(a.role)));
    row.appendChild(el('span', 'crew-room', agentHasRun(a.id) ? 'RAN' : 'NOT YET RUN'));
    row.onclick = () => openAgent(a.id);
    crew.appendChild(row);
  }
}

function renderFeeds() {
  const feedEl = $('ops-feed');
  feedEl.innerHTML = '';
  if (!S.feed.length) feedEl.appendChild(el('div', 'panel-note', 'console online. no events yet.'));
  for (const it of S.feed) {
    feedEl.appendChild(el('div', 'log-line' + (it.kind === 'warn' ? ' warn' : ''),
      `<span class="t">${it.t.toLocaleTimeString('en-US', { hour12: false })}</span>${esc(it.text)}`));
  }

  const mc = $('mission-control');
  mc.innerHTML = '';
  const cl = checklist();
  const next = cl.find(c => !c.done);
  if (next) {
    const card = el('div', 'mc-card warn');
    card.appendChild(el('span', 'mc-tag', 'NEXT ACTION'));
    card.appendChild(el('span', '', esc(`${next.label} — ${next.detail}`)));
    mc.appendChild(card);
  } else {
    mc.appendChild(el('div', 'mc-card', '<span class="mc-tag">LIVE</span>All launch gates passed. Scale mode.'));
  }
  const chan = el('div', 'mc-card');
  chan.appendChild(el('span', 'mc-tag', 'OPERATOR CHANNEL'));
  chan.appendChild(el('span', '', 'Directives route through the agent chat — this console is read-only by design.'));
  mc.appendChild(chan);

  const ob = $('objectives');
  ob.innerHTML = '';
  for (const c of cl) {
    const row = el('div', 'obj-row' + (c.done ? ' done' : ''));
    row.appendChild(el('span', 'obj-check', c.done ? '✔' : ''));
    row.appendChild(el('span', '', esc(c.label)));
    row.appendChild(el('span', 'obj-count', esc(c.detail)));
    ob.appendChild(row);
  }

  const gc = $('gridchat');
  gc.innerHTML = '';
  const runs = [];
  if (S.files.station) runs.push({ who: 'STATION SYNC', what: `station sync — ${S.files.station.physical?.length ?? 0} physical · ${S.files.station.digitalItems?.length ?? 0} digital · probes etsy ${S.files.station.probes.etsyApi.status} / printify ${S.files.station.probes.printifyApi.status}`, when: S.files.station.fetchedAt });
  if (S.files.signals) runs.push({ who: 'RESEARCH', what: `research run — ${S.files.signals.signals.length} signals`, when: S.files.signals.fetchedAt });
  if (S.files.lanes) runs.push({ who: 'LANE SCOUT', what: `lane research — ${S.files.lanes.lanes.length} lanes ranked`, when: S.files.lanes.fetchedAt });
  if (S.files.art) runs.push({ who: 'ART INTAKE', what: `art intake — ${S.files.art.ok.length} validated`, when: S.files.art.fetchedAt });
  if (S.files.products) runs.push({ who: 'PRODUCT SYNC', what: `product sync`, when: S.files.products.fetchedAt });
  if (S.files.orders) runs.push({ who: 'LEDGER RUN', what: `orders pull`, when: S.files.orders.fetchedAt });
  if (!runs.length) gc.appendChild(el('div', 'panel-note', 'no agent runs recorded yet. first crew shift starts when the keys land.'));
  for (const r of runs) {
    gc.appendChild(el('div', 'chat-line',
      `<span class="who">${esc(r.who)}</span>: ${esc(r.what)} <span class="dim">· ${new Date(r.when).toLocaleString()}</span>`));
  }
}

// --------------------------- rooms -------------------------------
let openRoomId = null;

function panel(parent, title) {
  const p = el('div', 'panel');
  p.appendChild(el('div', 'panel-head', `<span>${esc(title)}</span>`));
  const body = el('div', 'panel-body');
  p.appendChild(body);
  parent.appendChild(p);
  return body;
}

function header(root, room) {
  const top = el('div', 'rv-topline');
  top.appendChild(el('span', 'rv-bay', esc(room.bay)));
  top.appendChild(el('span', 'rv-title', esc(room.title)));
  const back = el('button', 'rv-back', '◄ BACK TO MAP');
  back.onclick = closeRoom;
  top.appendChild(back);
  root.appendChild(top);
}

const listingStatus = (l) => {
  const art = S.files.art;
  const products = S.files.products;
  if (products?.data?.some?.((p) => p.spec_code === l.code && (p.external?.length || p.is_published))) return 'LIVE';
  if (products?.data?.some?.((p) => p.spec_code === l.code)) return 'DRAFT';
  if (art?.ok?.includes(l.art_file)) return 'ART OK';
  return 'SPEC';
};

function buildRoom(root, roomId) {
  const room = ROOM_BY_ID[roomId];
  header(root, room);

  switch (roomId) {
    case 'factory1': {
      const st = S.files.station;
      if (!st?.physical) {
        panel(root, 'PHYSICAL SHELF').appendChild(el('div', 'panel-note',
          'no station sync yet — run: node ops.mjs station'));
        break;
      }
      const byProduct = {};
      for (const p of st.physical) (byProduct[p.product] ??= []).push(p);
      const body = panel(root, `KINDLYPUT PHYSICAL — ${st.physical.length} STAGED/LIVE · synced ${new Date(st.fetchedAt).toLocaleString()}`);
      if (!st.probes.etsyApi.ok) {
        body.appendChild(el('div', 'panel-note',
          `⚠ Etsy API probe: ${st.probes.etsyApi.status} — live listing states unverifiable until the key is fixed; rows below are the staged catalog of record.`));
      }
      for (const [prod, items] of Object.entries(byProduct)) {
        body.appendChild(el('div', 'panel-note', `${esc(prod)} × ${items.length}`));
        for (const p of items) {
          body.appendChild(el('div', 'trow',
            `<span class="tk">${esc(p.code)} · ${esc(p.title.slice(0, 55))}</span>` +
            `<span class="dim">$${p.price_usd}</span>` +
            `<span class="tv">${esc(new Date(p.staged_at).toLocaleDateString())}</span>`));
        }
      }
      break;
    }
    case 'research': {
      const sig = S.files.signals;
      const body = panel(root, sig ? `SIGNALS — REAL PULL · ${new Date(sig.fetchedAt).toLocaleString()}` : 'SIGNALS');
      if (!sig) { body.appendChild(el('div', 'panel-note', 'no research runs recorded yet.')); break; }
      body.appendChild(el('div', 'panel-note', esc(sig.source)));
      for (const s of sig.signals) {
        body.appendChild(el('div', 'trow',
          `<span class="tk">${esc(s.keyword)}</span>` +
          `<span class="dim">${esc(s.note)}</span>` +
          `<span class="tv">${s.volume.toLocaleString()}/mo · KD${s.kd}</span>`));
      }
      break;
    }
    case 'treasury': {
      const rev = revenue();
      const body = panel(root, 'REAL LEDGER');
      body.appendChild(el('div', 'trow', `<span class="tk">REVENUE RECORDED</span><span class="tv">${fmtMoney(rev.total)}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">COSTS RECORDED</span><span class="tv">${fmtMoney(rev.costs)}</span>`));
      if (S.files.ledger) {
        const led = S.files.ledger;
        body.appendChild(el('div', 'trow', `<span class="tk">ORDERS COUNTED</span><span class="tv">${led.orders ?? 0}</span>`));
        if (led.excluded_orders) {
          body.appendChild(el('div', 'trow', `<span class="tk">EXCLUDED (cancelled/refunded)</span><span class="tv">${led.excluded_orders}</span>`));
        }
        body.appendChild(el('div', 'panel-note',
          `ledger fetched ${new Date(led.fetchedAt).toLocaleString()} (${ageLabel(led.fetchedAt)})` +
          (isStale(led.fetchedAt) ? ' — STALE, re-run ledger.mjs before trusting these figures' : '')));
        if (led.derived_fields) {
          body.appendChild(el('div', 'panel-note', 'derived (not raw API values): ' + esc(led.derived_fields.join('; '))));
        }
      } else {
        body.appendChild(el('div', 'panel-note',
          'No money has moved yet. Planned launch spend: Etsy shop setup ~$15 · 40 listings $8 · image gen $0 (operator ChatGPT sub). Fulfillment charges only on real orders.'));
      }
      break;
    }
    case 'factory2': {
      const st = S.files.station;
      if (!st?.digitalItems) {
        panel(root, 'DIGITAL PRESS').appendChild(el('div', 'panel-note',
          'no digital shelf recorded yet.'));
        break;
      }
      const body = panel(root, `DIGITAL SHELF — ${st.digitalItems.length} LISTED VIA ETSY API`);
      for (const d of st.digitalItems) {
        body.appendChild(el('div', 'trow',
          `<span class="tk">${esc(d.code)}</span>` +
          `<span class="dim">listing ${esc(String(d.listing_id))}</span>` +
          `<span class="tv">${d.built ? 'PDF BUILT' : 'build artifacts absent'}</span>`));
      }
      body.appendChild(el('div', 'panel-note',
        'Rendered from SVG primitives (no image model) — ops/worker/printables/. Activated 2026-08-05 after operator approval.'));
      break;
    }
    case 'ventures': {
      const board = S.files.station?.lanes;
      if (!board) {
        panel(root, 'LANE BOARD').appendChild(el('div', 'panel-note',
          'No lane board recorded yet.'));
        break;
      }
      const sum = panel(root, `LANE BOARD — ${board.total} LANES RESEARCHED`);
      for (const [verdict, n] of Object.entries(board.by_verdict)) {
        sum.appendChild(el('div', 'trow',
          `<span class="tk">${esc(verdict.toUpperCase())}</span><span class="tv">${n}</span>`));
      }
      const bBody = panel(root, 'BUILDING');
      for (const name of board.building) bBody.appendChild(el('div', 'trow', `<span class="tk">▶ ${esc(name)}</span>`));
      const cBody = panel(root, 'CANDIDATES ON DECK');
      for (const c of board.candidates) {
        cBody.appendChild(el('div', 'trow',
          `<span class="tk">${esc(c.name)}</span><span class="tv">checked ${esc(c.checked)}</span>`));
      }
      panel(root, 'FULL BOARD').appendChild(el('div', 'panel-note',
        'Per-lane verdicts, policies, and risks: PERPETUA ORBITAL/Dashboard.md (Obsidian vault, generated from ops/lanes.data.json).'));
      break;
    }
    case 'comms': {
      const soc = S.files.station?.social;
      const body = panel(root, 'SOCIAL LAUNCH — KINDLYPUT');
      if (!soc) { body.appendChild(el('div', 'panel-note', 'no station sync yet.')); break; }
      body.appendChild(el('div', 'trow', `<span class="tk">POST IMAGES COMPOSED</span><span class="tv">${soc.posts_composed}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">WEEK-1 PLAN (ops/social/PLAN.md)</span><span class="tv">${soc.plan_written ? 'WRITTEN' : 'absent'}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">OPERATOR APPROVAL</span><span class="tv">${soc.operator_approved ? 'APPROVED' : 'PENDING'}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">INSTAGRAM (via Composio)</span><span class="tv">${soc.instagram_connected ? 'CONNECTED — @' + esc(soc.instagram_username ?? '') : 'NOT CONNECTED'}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">FACEBOOK PAGE (via Composio)</span><span class="tv">${soc.facebook_connected ? 'CONNECTED' : 'NOT CONNECTED'}</span>`));
      if (soc.posts_published) {
        body.appendChild(el('div', 'trow', `<span class="tk">POSTS PUBLISHED</span><span class="tv">${soc.posts_published} live · ${soc.queue_remaining ?? '?'} queued daily</span>`));
        if (soc.latest_post?.ig_permalink) {
          body.appendChild(el('div', 'trow', `<span class="tk">LATEST</span><span class="dim">${esc(soc.latest_post.code)} · ${esc(soc.latest_post.ig_permalink)}</span>`));
        }
      }
      body.appendChild(el('div', 'panel-note',
        'Nothing posts without operator approval. Buyer-message note: Etsy\'s Open API exposes no conversations endpoint — inbound buyer messages can never render here.'));
      break;
    }
    case 'warroom': {
      panel(root, 'DOCTRINE').appendChild(el('div', 'panel-note',
        'Kill the losers, scale the winners, touch nothing that prints. First review convenes after 14 days of real sales data — no verdicts without evidence.'));
      break;
    }
    case 'archives': {
      const body = panel(root, 'THE REAL ARCHIVE');
      body.appendChild(el('div', 'panel-note',
        'The archive is the git history — every spec, decision, run, and state pull is committed. This console lists live state files:'));
      for (const f of FEEDS) {
        const d = S.files[f];
        body.appendChild(el('div', 'trow',
          `<span class="tk">ops/state/${f}.json</span>` +
          `<span class="tv">${d ? 'LIVE · ' + new Date(d.fetchedAt).toLocaleString() : 'absent'}</span>`));
      }
      break;
    }
    case 'quarters': {
      const yt = S.files.station?.youtube;
      const body = panel(root, 'MEDIA BAY — YOUTUBE CHANNEL');
      if (!yt) { body.appendChild(el('div', 'panel-note', 'channel build not started.')); break; }
      body.appendChild(el('div', 'trow', `<span class="tk">CHANNEL NAME</span><span class="tv">${esc(yt.name)}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">HANDLE (verified free 2026-08-07)</span><span class="tv">${esc(yt.handle)}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">TOPIC BANK (Semrush-verified)</span><span class="tv">${yt.topics_banked} topics</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">SCRIPTS DRAFTED</span><span class="tv">${yt.scripts_drafted}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">NAME TM SCREEN</span><span class="tv">${esc(yt.tm_screen)}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">CHANNEL CREATED</span><span class="tv">${yt.channel_created ? 'YES' : 'NOT YET (operator)'}</span>`));
      body.appendChild(el('div', 'trow', `<span class="tk">NARRATOR VOICE</span><span class="tv">${yt.voice_chosen ? 'CHOSEN' : 'pending ElevenLabs'}</span>`));
      body.appendChild(el('div', 'panel-note', 'Design spec: ' + esc(yt.design_spec)));
      break;
    }
    case 'bridge': {
      // Every sales channel connected in Printify is a real route to a
      // customer. Rendered from state/shops.json, so an empty panel means
      // nothing is connected rather than nothing has been checked.
      const shops = S.files.shops;
      const ch = panel(root, `SALES CHANNELS${shops ? ` — ${shops.count} CONNECTED` : ''}`);
      if (!shops) {
        ch.appendChild(el('div', 'panel-note',
          'No channel data yet. Run: node ops.mjs verify'));
      } else if (!shops.shops.length) {
        ch.appendChild(el('div', 'panel-note',
          'Printify reports no connected stores. Connect one in Printify → My stores.'));
      } else {
        for (const s of shops.shops) {
          // A blank title means Printify has the connection but the storefront
          // has not finished setup — worth showing, not hiding.
          const name = s.title || '(unnamed — store setup incomplete)';
          const live = LIVE_CHANNELS.has(s.sales_channel);
          ch.appendChild(el('div', 'trow',
            `<span class="tk">${esc(String(s.sales_channel).toUpperCase().replace(/_/g, ' '))}</span>` +
            `<span class="dim">${esc(name)} · id ${esc(String(s.id))}</span>` +
            `<span class="tv">${live ? 'STOREFRONT' : 'INTERNAL'}</span>`));
        }
        ch.appendChild(el('div', 'panel-note',
          `checked ${ageLabel(shops.fetchedAt)}. STOREFRONT = a marketplace customers can buy from; ` +
          `INTERNAL = an API/custom store with no public listing, which is where cost probes run.`));
      }

      const roster = panel(root, 'CREW ROSTER — PLANNED RUNS');
      for (const a of AGENTS) {
        const row = el('div', 'trow',
          `<span class="tk">${esc(a.name)} — ${esc(a.role)}</span>` +
          `<span class="dim">${esc(a.duty)}</span>` +
          `<span class="tv">${agentHasRun(a.id) ? 'RAN' : 'NOT YET RUN'}</span>`);
        row.style.cursor = 'pointer';
        row.onclick = () => openAgent(a.id);
        roster.appendChild(row);
      }
      const cl = panel(root, 'LAUNCH CHECKLIST');
      for (const c of checklist()) {
        cl.appendChild(el('div', 'trow',
          `<span class="tk">${c.done ? '✔' : '·'} ${esc(c.label)}</span><span class="tv">${esc(c.detail)}</span>`));
      }
      break;
    }
  }
}

function openRoom(roomId) {
  openRoomId = roomId;
  const rv = $('room-view');
  rv.innerHTML = '';
  buildRoom(rv, roomId);
  rv.classList.remove('hidden');
  rv.scrollTop = 0;
  centerOn(roomId);
  renderRailLeft();
}
function closeRoom() {
  openRoomId = null;
  $('room-view').classList.add('hidden');
  renderRailLeft();
}

// --------------------------- modal -------------------------------
function openModal(content) {
  const modal = $('modal');
  modal.innerHTML = '';
  const close = el('button', 'modal-close', 'CLOSE ✕');
  close.onclick = () => $('modal-backdrop').classList.add('hidden');
  modal.appendChild(close);
  modal.appendChild(content);
  $('modal-backdrop').classList.remove('hidden');
}

function openAgent(id) {
  const a = AGENT_BY_ID[id];
  const wrap = el('div');
  wrap.appendChild(el('div', 'agent-role-title', esc(a.role)));
  wrap.appendChild(el('div', 'agent-name', esc(a.name)));
  const card = el('div', 'agent-card');
  const fields = el('div', 'agent-fields');
  const f = (k, v) => fields.appendChild(el('div', 'afield', `<span class="fk">${esc(k)}</span><span class="fv">${esc(v)}</span>`));
  f('AGENT CLASS', a.cls);
  f('RUNTIME', 'Scheduled agent run (Claude) — not yet armed');
  f('DUTY', a.duty);
  f('FUNCTION', a.func);
  f('STATUS', agentHasRun(a.id)
    ? `HAS RUN — evidence: ${agentEvidenceLabel(a.id)}`
    : 'NOT YET RUN — no real output exists for this agent');
  fields.appendChild(el('div', 'agent-directive', '&raquo; ' + esc(a.directive)));
  card.appendChild(fields);
  const port = el('div', 'agent-portrait');
  const pre = el('pre');
  pre.textContent = a.portrait;
  pre.style.color = a.color;
  port.appendChild(pre);
  card.appendChild(port);
  wrap.appendChild(card);
  openModal(wrap);
}

function checklistModal() {
  const wrap = el('div');
  wrap.appendChild(el('div', 'rv-title', 'LAUNCH CHECKLIST'));
  for (const c of checklist()) {
    const row = el('div', 'mile-row ' + (c.done ? 'unlocked' : 'locked'));
    row.appendChild(el('span', 'badge', c.done ? '★' : '·'));
    row.appendChild(el('span', '', `${esc(c.label)} — <b>${esc(c.detail)}</b>`));
    wrap.appendChild(row);
  }
  wrap.appendChild(el('div', 'panel-note',
    'Operator gates: Etsy shared secret → .env · social approval + FB/IG accounts · channel creation. Everything else is agent work.'));
  return wrap;
}

function batchModal() {
  const wrap = el('div');
  wrap.appendChild(el('div', 'rv-title', 'BATCH-01'));
  if (!S.batch) { wrap.appendChild(el('div', 'panel-note', 'batch spec not loaded')); return wrap; }
  for (const l of S.batch.listings) {
    wrap.appendChild(el('div', 'trow',
      `<span class="tk">${esc(l.code)}</span><span class="dim">${esc(l.title)}</span><span class="tv">${listingStatus(l)}</span>`));
  }
  return wrap;
}

// --------------------------- map state ---------------------------
// Sprites are representation of the planned crew, not data: everyone idles
// in their module; the offline dot is on until that agent has a real run.
const mapState = {
  agents: Object.fromEntries(AGENTS.map(a => [a.id, {
    at: a.room, target: a.room, offline: true, bubble: null, bubbleUntil: 0,
  }])),
  alerts: {}, paused: false, speed: 1, simMinutes: 0,
};

function syncMapState() {
  for (const a of AGENTS) mapState.agents[a.id].offline = !agentHasRun(a.id);
  mapState.simMinutes = new Date().getHours() * 60 + new Date().getMinutes();
}

// --------------------------- boot --------------------------------
async function bootSequence() {
  const log = $('boot-log');
  for (const line of BOOT_LINES) {
    const div = document.createElement('div');
    div.textContent = '> ' + line;
    log.appendChild(div);
    await new Promise(r => setTimeout(r, line.startsWith('WELCOME') ? 380 : 190));
    div.className = 'ok';
  }
  await new Promise(r => setTimeout(r, 400));
  $('boot-screen').classList.add('done');
  setTimeout(() => $('boot-screen').remove(), 800);
}

function renderAll() {
  syncMapState();
  renderHUD();
  renderClock();
  renderRailLeft();
  renderFeeds();
  if (openRoomId) { const rv = $('room-view'); rv.innerHTML = ''; buildRoom(rv, openRoomId); }
}

function wireControls() {
  // speed cluster is meaningless in real mode — hide it
  document.querySelector('.speed-cell').style.display = 'none';
  $('btn-settings').textContent = 'REFRESH';
  $('btn-settings').onclick = () => { pushFeed('sys', 'manual state refresh'); loadState(false); };
  $('btn-map').onclick = closeRoom;
  $('btn-milestones').textContent = 'CHECKLIST';
  $('btn-milestones').onclick = () => openModal(checklistModal());
  $('btn-stats').textContent = 'BATCH';
  $('btn-stats').onclick = () => openModal(batchModal());
  $('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === $('modal-backdrop')) $('modal-backdrop').classList.add('hidden');
  });
  // directive bar → honest operator-channel note
  const wrap = $('directive-wrap');
  wrap.innerHTML = '<span class="dir-label">OPERATOR&gt;</span>' +
    '<span style="font-size:11px;color:var(--grn-mid)">read-only console — directives go through the agent chat; every number here is a real API pull</span>';
  $('map-hint').textContent = 'CLICK A MODULE · DRAG TO PAN · WHEEL TO ZOOM · REAL MODE';
}

let lastTs = 0;
function frame(ts) {
  const dtMs = Math.min(250, ts - lastTs || 16);
  lastTs = ts;
  drawMap(dtMs);
  requestAnimationFrame(frame);
}

(async function start() {
  initMap($('map-canvas'), $('minimap'), mapState, {
    onRoomClick: openRoom,
    onAgentClick: openAgent,
  });
  wireControls();
  pushFeed('sys', 'PERPETUA ORBITAL ops console online — real mode');
  await loadState(true);
  bootSequence();
  requestAnimationFrame(frame);
  setInterval(renderClock, 1000);
  setInterval(() => loadState(false), 60000);
})();
