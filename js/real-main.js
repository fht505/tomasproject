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
const FEEDS = ['ledger', 'orders', 'products', 'signals', 'art', 'inbox'];
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

function checklist() {
  const art = S.files.art;
  const products = S.files.products;
  const orders = S.files.orders;
  const artOk = art?.ok?.length ?? 0;
  const artNeeded = (art?.ok?.length ?? 0) + (art?.missing?.length ?? 32);
  const drafts = products?.data?.length ?? 0;
  const published = products?.data?.filter?.((p) => p.external?.length || p.is_published)?.length ?? 0;
  const orderCount = orders?.data?.data?.length ?? orders?.data?.length ?? 0;
  return [
    { label: 'Niche research (real Semrush pull)', done: !!S.files.signals, detail: S.files.signals ? `${S.files.signals.signals.length} signals` : 'pending' },
    { label: 'Batch-01 spec authored', done: !!S.batch, detail: S.batch ? `${S.batch.count}/40 listings` : 'pending' },
    { label: 'Design art generated + validated', done: artOk >= artNeeded && artOk > 0, detail: `${artOk}/${artNeeded || 32} files` },
    { label: 'Printify token verified (shop linked)', done: !!products, detail: products ? 'connected' : 'waiting on operator' },
    { label: 'Drafts staged on Printify', done: drafts >= 40, detail: `${drafts}/40` },
    { label: 'Listings published to Etsy', done: published >= 40, detail: `${published}/40` },
    { label: 'First real order', done: orderCount > 0, detail: orderCount ? `${orderCount} orders` : '—' },
  ];
}

// --------------------------- HUD ---------------------------------
function renderHUD() {
  const rev = revenue();
  $('hud-rev').textContent = fmtMoney(rev.total);
  $('hud-etsy').textContent = fmtMoney(rev.etsy);
  $('hud-fiverr').textContent = fmtMoney(rev.fiverr);
  $('hud-assets').textContent = `${FEEDS.filter(f => S.files[f]).length}/${FEEDS.length}`;
  document.querySelector('#hud-assets').previousElementSibling.textContent = 'FEEDS';
  $('hud-ops').textContent = `${AGENTS.length} PLANNED`;
  const cl = checklist();
  const pct = cl.filter(c => c.done).length / cl.length;
  $('hud-level').textContent = `${Math.round(pct * 100)}%`;
  document.querySelector('.hud-cell.wide .hud-k').innerHTML = 'LAUNCH <b id="hud-level">' + Math.round(pct * 100) + '%</b>';
  $('hud-xp').style.width = (pct * 100).toFixed(0) + '%';
  const goalPct = Math.min(100, rev.total / CONTRACT_GOAL * 100);
  $('goal-fill').style.width = Math.max(rev.total > 0 ? 0.5 : 0, goalPct) + '%';
  $('goal-text').textContent = `${fmtMoney(rev.total)} / $1T`;
}

function renderClock() {
  const n = new Date();
  $('hud-clock').textContent =
    n.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() +
    ' ' + n.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

// --------------------------- rails -------------------------------
function moduleStatus(roomId) {
  switch (roomId) {
    case 'factory1': return S.batch ? `${S.batch.count} spec` : '—';
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
  for (const a of AGENTS) {
    const row = el('div', 'crew-row');
    row.appendChild(el('span', 'crew-name', esc(a.name)));
    row.appendChild(el('span', 'crew-room', esc(a.role)));
    row.appendChild(el('span', 'crew-room', a.id === 'nova' && S.files.signals ? 'RAN' : 'QUEUED'));
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
  if (S.files.signals) runs.push({ who: 'NOVA', what: `research run — ${S.files.signals.signals.length} signals`, when: S.files.signals.fetchedAt });
  if (S.files.art) runs.push({ who: 'FLORA', what: `art intake — ${S.files.art.ok.length} validated`, when: S.files.art.fetchedAt });
  if (S.files.products) runs.push({ who: 'MERCH', what: `product sync`, when: S.files.products.fetchedAt });
  if (S.files.orders) runs.push({ who: 'LEDGER', what: `orders pull`, when: S.files.orders.fetchedAt });
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
      const flow = panel(root, 'PRODUCTION FLOW (PROCESS PLAN)');
      flow.appendChild(el('div', 'panel-note',
        PIPELINES.factory1.map((s, i) => `0${i + 1} ${s.key}`).join('  →  ') +
        ' — executes as real agent runs once keys land.'));
      const body = panel(root, `BATCH-01 — ${S.batch ? S.batch.count : 0} LISTINGS`);
      if (!S.batch) { body.appendChild(el('div', 'panel-note', 'batch spec not loaded.')); break; }
      for (const l of S.batch.listings) {
        body.appendChild(el('div', 'trow',
          `<span class="tk">${esc(l.code)} · ${esc(l.title.slice(0, 60))}…</span>` +
          `<span class="dim">${esc(l.product)} · $${l.price_usd}</span>` +
          `<span class="tv">${listingStatus(l)}</span>`));
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
      body.appendChild(el('div', 'panel-note', S.files.ledger
        ? `ledger fetched ${new Date(S.files.ledger.fetchedAt).toLocaleString()}`
        : 'No money has moved yet. Planned launch spend: Etsy shop setup ~$15 · 40 listings $8 · image gen $0 (operator ChatGPT sub). Fulfillment charges only on real orders.'));
      break;
    }
    case 'factory2': {
      panel(root, 'LANE 2 STATUS').appendChild(el('div', 'panel-note',
        'Not launched. Fiverr thumbnail studio is queued behind lane 1 — demand is marketplace-internal, no public API, human-fronted account. Revisit after first Etsy orders.'));
      break;
    }
    case 'ventures': {
      panel(root, 'LANE PIPELINE').appendChild(el('div', 'panel-note',
        'Idea scout run is in progress (background agent evaluating adjacent lanes on real platform data). Results land here as a ranked queue.'));
      break;
    }
    case 'comms': {
      const inbox = S.files.inbox;
      const body = panel(root, 'CHANNELS');
      body.appendChild(el('div', 'panel-note', inbox
        ? `inbox synced ${new Date(inbox.fetchedAt).toLocaleString()}`
        : 'No channels connected yet. Etsy messages hook up after the shop exists; replies will be drafted for one-tap operator approval.'));
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
      panel(root, 'CREW QUARTERS').appendChild(el('div', 'panel-note',
        'Cosmetic deck. The bar opens when the crew has runs to recover from.'));
      break;
    }
    case 'bridge': {
      const roster = panel(root, 'CREW ROSTER — PLANNED RUNS');
      for (const a of AGENTS) {
        const row = el('div', 'trow',
          `<span class="tk">${esc(a.name)} — ${esc(a.role)}</span>` +
          `<span class="dim">${esc(a.duty)}</span>` +
          `<span class="tv">${a.id === 'nova' && S.files.signals ? 'RAN' : 'QUEUED'}</span>`);
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
  f('STATUS', a.id === 'nova' && S.files.signals ? 'FIRST RUN COMPLETE (research pull)' : 'QUEUED — awaiting launch gates');
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
    'Operator gates tonight: new repo · Etsy shop · Printify token · (optional) image API key. Everything else is agent work.'));
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
  mapState.agents.nova.offline = !S.files.signals;
  mapState.agents.flora.offline = !S.files.art;
  mapState.agents.merch.offline = !S.files.products;
  mapState.agents.ledger.offline = !S.files.orders;
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
