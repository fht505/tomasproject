// ================================================================
// PERPETUA ORBITAL — DOM UI: HUD, rails, feeds, modals, toasts, art
// ================================================================
import {
  ROOMS, ROOM_BY_ID, AGENTS, AGENT_BY_ID, SHOPS, SHOP_BY_ID,
  MILESTONES, CONTRACT_GOAL, fmtMoney, fmtMoneyShort,
} from './data.js';
import { mulberry32, xpProgress, solOf, crewOf } from './sim.js';

export const $ = (id) => document.getElementById(id);

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// ---------------------------------------------------------------
// procedural product/thumbnail art
// ---------------------------------------------------------------
const PASTELS = ['#f6e7d8', '#efe3f2', '#e2efe0', '#f9f0e1', '#e8eef7', '#f7e4e4'];
const INKS = ['#8a6d5c', '#7c6b8f', '#6b8f70', '#a2836a', '#6d7f9c', '#9c6d6d'];

export function drawDesignArt(cv, seed, kind, label) {
  const rng = mulberry32(seed);
  const W = cv.width = 96, H = cv.height = 96;
  const g = cv.getContext('2d');
  if (kind === 'thumb') return drawThumbArt(g, rng, W, H, label);

  // cozy pastel POD design
  g.fillStyle = PASTELS[(seed >>> 3) % PASTELS.length];
  g.fillRect(0, 0, W, H);
  const ink = INKS[(seed >>> 5) % INKS.length];

  // wreath / flowers ring
  const cx = W / 2, cy = H / 2 - 4, R0 = 26 + rng() * 8;
  const petals = ['#d98a9e', '#c9a7d9', '#8fbf94', '#e0b070', '#9ab3d9', '#d9767a'];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rng() * 0.2;
    const rr = R0 + (rng() - 0.5) * 6;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.85;
    g.fillStyle = petals[Math.floor(rng() * petals.length)];
    g.beginPath(); g.arc(x, y, 2.2 + rng() * 2.4, 0, Math.PI * 2); g.fill();
    if (rng() > 0.6) {
      g.fillStyle = '#7d9b6a';
      g.fillRect(x - 1, y + 3, 1.6, 4 + rng() * 3);
    }
  }
  // center motif: watering can / mug / book stack
  const motif = Math.floor(rng() * 3);
  g.fillStyle = ink;
  if (motif === 0) {           // watering can
    g.fillRect(cx - 8, cy - 3, 15, 10);
    g.fillRect(cx + 6, cy - 6, 3, 6);
    g.beginPath(); g.moveTo(cx - 8, cy - 1); g.lineTo(cx - 15, cy - 7); g.lineTo(cx - 13, cy - 9); g.lineTo(cx - 6, cy - 3); g.closePath(); g.fill();
    g.strokeStyle = ink; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy - 5, 5, Math.PI, 2 * Math.PI); g.stroke();
  } else if (motif === 1) {    // mug
    g.fillRect(cx - 7, cy - 5, 13, 12);
    g.strokeStyle = ink; g.lineWidth = 2;
    g.beginPath(); g.arc(cx + 8, cy + 1, 4, -0.5 * Math.PI, 0.5 * Math.PI); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(cx - 3, cy - 9); g.quadraticCurveTo(cx - 1, cy - 12, cx + 1, cy - 9); g.stroke();
  } else {                     // book stack
    const cols = ['#b0715f', '#5f8bb0', '#7fae6d'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = cols[i];
      g.fillRect(cx - 11 + i, cy + 4 - i * 6, 22 - i * 2, 5);
    }
  }
  // script text band
  g.fillStyle = ink;
  g.font = 'italic bold 9px Georgia, serif';
  g.textAlign = 'center';
  const words = (label || 'in my garden era').toLowerCase().split(' ').slice(0, 3).join(' ');
  g.fillText(words, cx, H - 10, W - 10);
  return cv;
}

function drawThumbArt(g, rng, W, H, label) {
  // dramatic YouTube-thumbnail parody
  const hues = [[16, 6, 26], [26, 6, 6], [6, 16, 30], [10, 24, 10]];
  const [r0, g0, b0] = hues[Math.floor(rng() * hues.length)];
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `rgb(${r0 * 6},${g0 * 4},${b0 * 4})`);
  grad.addColorStop(1, `rgb(${r0 * 2},${g0 * 2},${b0 * 2})`);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // split line
  if (rng() > 0.5) {
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(W * 0.55, 0); g.lineTo(W * 0.45, H); g.stroke();
  }
  // shocked face blob
  const fx = W * (0.25 + rng() * 0.15), fy = H * (0.4 + rng() * 0.2);
  g.fillStyle = '#e8b88a';
  g.beginPath(); g.arc(fx, fy, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2a1a';
  g.fillRect(fx - 8, fy - 6, 5, 3); g.fillRect(fx + 3, fy - 6, 5, 3);
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(fx - 5, fy - 2, 2.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(fx + 5, fy - 2, 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#802020';
  g.beginPath(); g.ellipse(fx, fy + 6, 4, 5 + rng() * 2, 0, 0, Math.PI * 2); g.fill();
  // money / object on other side
  g.fillStyle = '#2f8f4f';
  for (let i = 0; i < 5; i++) g.fillRect(W * 0.62 + rng() * 22, H * 0.3 + rng() * 30, 12, 7);
  // big red arrow
  g.strokeStyle = '#ff2222'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(W * 0.2, H * 0.85);
  g.quadraticCurveTo(W * 0.5, H * 0.95, W * 0.72, H * 0.55);
  g.stroke();
  g.fillStyle = '#ff2222';
  g.beginPath();
  g.moveTo(W * 0.72 + 6, H * 0.55 - 2);
  g.lineTo(W * 0.72 - 8, H * 0.55 - 6);
  g.lineTo(W * 0.72 - 2, H * 0.55 + 9);
  g.closePath(); g.fill();
  // caps text
  g.font = 'bold 13px Arial Black, sans-serif';
  g.textAlign = 'center';
  const word = (label || 'EXPOSED').split(' ')[0].toUpperCase().slice(0, 8);
  g.lineWidth = 3; g.strokeStyle = '#000';
  g.strokeText(word, W / 2, 16);
  g.fillStyle = '#ffe32e';
  g.fillText(word, W / 2, 16);
  return g.canvas;
}

// tiny crew avatar (head+torso pixel style)
export function avatarCanvas(agent, size = 16) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  cv.className = 'crew-avatar';
  const g = cv.getContext('2d');
  g.fillStyle = agent.color2; g.fillRect(3, 9, 10, 6);
  g.fillStyle = agent.color; g.fillRect(4, 2, 8, 7);
  g.fillStyle = '#04140b'; g.fillRect(5, 4, 6, 2.5);
  if (agent.id === 'magnus') { g.fillStyle = '#ffd84d'; g.fillRect(7, 0, 2, 2); }
  return cv;
}

// ---------------------------------------------------------------
// HUD
// ---------------------------------------------------------------
export function renderHUD(st) {
  $('hud-rev').textContent = fmtMoney(st.revenue.total);
  $('hud-etsy').textContent = fmtMoney(st.revenue.etsy);
  $('hud-fiverr').textContent = fmtMoney(st.revenue.fiverr);
  $('hud-assets').textContent = fmtMoney(st.revenue.assets);
  $('hud-ops').textContent = AGENTS.length + ' LINKED';
  $('hud-level').textContent = st.level;
  $('hud-xp').style.width = (xpProgress(st) * 100).toFixed(1) + '%';
  const m = Math.floor(st.simMinutes % 1440);
  $('hud-clock').textContent =
    String(solOf(st)).padStart(3, '0') + ' ' +
    String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const pct = st.revenue.total / CONTRACT_GOAL * 100;
  $('goal-fill').style.width = Math.max(0.5, Math.min(100, pct)) + '%';
  $('goal-text').textContent = fmtMoneyShort(st.revenue.total) + ' / $1T';
  $('hud-online').textContent = st.paused ? 'PAUSED' : 'ONLINE';
}

// ---------------------------------------------------------------
// left rail
// ---------------------------------------------------------------
export function roomRevenue(st, roomId) {
  let v = 0;
  for (const s of SHOPS) if (s.room === roomId) v += st.shops[s.id].rev;
  return v;
}

export function renderRailLeft(st, activeRoom, onRoom, onAgent) {
  const list = $('module-list');
  $('module-count').textContent = ROOMS.length + ' MODULES';
  list.innerHTML = '';
  for (const r of ROOMS) {
    const row = el('div', 'mod-row' + (activeRoom === r.id ? ' active' : '') + (st.alerts[r.id] ? ' alerted' : ''));
    const dot = el('span', 'mod-dot');
    dot.style.background = r.color;
    dot.style.boxShadow = `0 0 5px ${r.color}`;
    row.appendChild(dot);
    row.appendChild(el('span', 'mod-name', esc(r.name)));
    const rev = roomRevenue(st, r.id);
    row.appendChild(el('span', 'mod-rev', rev > 0 ? fmtMoneyShort(rev) : '—'));
    row.onclick = () => onRoom(r.id);
    list.appendChild(row);
  }

  const crew = $('crew-list');
  crew.innerHTML = '';
  for (const a of AGENTS) {
    const ag = st.agents[a.id];
    const row = el('div', 'crew-row');
    row.appendChild(avatarCanvas(a));
    row.appendChild(el('span', 'crew-name', esc(a.name)));
    row.appendChild(el('span', 'crew-room', esc((ROOM_BY_ID[ag.at] || {}).name || '')));
    const pip = el('span', 'morale-pip');
    const fill = el('i');
    fill.style.width = ag.morale + '%';
    fill.style.background = ag.morale > 60 ? 'var(--grn-mid)' : ag.morale > 34 ? 'var(--amber)' : 'var(--red)';
    pip.appendChild(fill);
    row.appendChild(pip);
    row.onclick = () => onAgent(a.id);
    crew.appendChild(row);
  }
}

// ---------------------------------------------------------------
// right rail feeds
// ---------------------------------------------------------------
const FEED_ICONS = {
  cash: '$', order: '◇', ship: '▲', research: '≡', msg: '✉',
  warn: '⚠', crit: '✖', ok: '✔', sys: '·', milestone: '★', directive: '»',
};

export function renderFeeds(st, handlers) {
  if (st._feedDirty) {
    const feedEl = $('ops-feed');
    feedEl.innerHTML = '';
    const items = st.opsFeed.slice(-40).reverse();
    for (const it of items) {
      const cls = it.kind === 'cash' || it.kind === 'milestone' ? 'cash'
        : it.kind === 'warn' ? 'warn' : it.kind === 'crit' ? 'crit' : '';
      const line = el('div', 'log-line ' + cls,
        `<span class="t">${esc(it.t)}</span>${FEED_ICONS[it.kind] || '·'} ${esc(it.text)}`);
      feedEl.appendChild(line);
    }
    st._feedDirty = false;
  }
  if (st._missionDirty) {
    const mc = $('mission-control');
    mc.innerHTML = '';
    if (!st.missions.length) {
      mc.appendChild(el('div', 'mc-card', '<span class="mc-tag">IDLE</span>No open decisions. The station runs itself — for now.'));
    }
    for (const m of st.missions) {
      const card = el('div', 'mc-card' + (m.warn ? ' warn' : ''));
      card.appendChild(el('span', 'mc-tag', esc(m.tag)));
      card.appendChild(el('span', '', esc(m.text)));
      if (m.actions && m.actions.length) {
        const act = el('div', 'mc-act');
        for (const label of m.actions) {
          const b = el('button', 'act-btn', esc(label));
          b.onclick = () => handlers.onMissionAction(m, label);
          act.appendChild(b);
        }
        card.appendChild(act);
      }
      mc.appendChild(card);
    }
    st._missionDirty = false;
  }
  if (st._objDirty) {
    const ob = $('objectives');
    ob.innerHTML = '';
    for (const o of st.objectives) {
      const row = el('div', 'obj-row' + (o.done ? ' done' : ''));
      row.appendChild(el('span', 'obj-check', o.done ? '✔' : ''));
      row.appendChild(el('span', '', esc(o.label)));
      let progress = '';
      if (o.metric === 'inboxLow') {
        progress = st.inbox.filter(x => x.status !== 'resolved').length + ' open';
      } else {
        progress = (st.counters[o.metric] || 0) + '/' + o.n;
      }
      row.appendChild(el('span', 'obj-count', esc(progress)));
      ob.appendChild(row);
    }
    st._objDirty = false;
  }
  if (st._chatDirty) {
    const gc = $('gridchat');
    gc.innerHTML = '';
    for (const c of st.gridchat.slice(-18).reverse()) {
      const [who, ...rest] = c.text.split(': ');
      gc.appendChild(el('div', 'chat-line',
        `<span class="t dim">${esc(c.t.slice(-5))}</span> <span class="who">${esc(who)}</span>: ${esc(rest.join(': '))}`));
    }
    st._chatDirty = false;
  }
}

// ---------------------------------------------------------------
// toasts
// ---------------------------------------------------------------
export function drainToasts(st) {
  if (!st._toasts || !st._toasts.length) return;
  const wrap = $('toast-wrap');
  for (const t of st._toasts.splice(0)) {
    const node = el('div', 'toast ' + (t.kind || ''), esc(t.text));
    wrap.appendChild(node);
    setTimeout(() => { node.style.opacity = '0'; node.style.transition = 'opacity .5s'; }, 2600);
    setTimeout(() => node.remove(), 3200);
    while (wrap.children.length > 4) wrap.firstChild.remove();
  }
}

// ---------------------------------------------------------------
// modal
// ---------------------------------------------------------------
export function openModal(contentEl) {
  const back = $('modal-backdrop');
  const modal = $('modal');
  modal.innerHTML = '';
  const close = el('button', 'modal-close', 'CLOSE ✕');
  close.onclick = closeModal;
  modal.appendChild(close);
  modal.appendChild(contentEl);
  back.classList.remove('hidden');
}
export function closeModal() { $('modal-backdrop').classList.add('hidden'); }

export function agentProfileEl(st, agentId) {
  const a = AGENT_BY_ID[agentId];
  const ag = st.agents[agentId];
  const room = ROOM_BY_ID[a.room];
  const wrap = el('div');
  wrap.appendChild(el('div', 'agent-role-title', esc(a.role)));
  wrap.appendChild(el('div', 'agent-name', esc(a.name)));
  const card = el('div', 'agent-card');
  const fields = el('div', 'agent-fields');
  const f = (k, v) => fields.appendChild(el('div', 'afield',
    `<span class="fk">${esc(k)}</span><span class="fv">${esc(v)}</span>`));
  f('AGENT CLASS', a.cls);
  f('MODEL CORE', st.liveMode ? 'CLAUDE (LIVE UPLINK)' : a.model);
  f('ROLE', a.role);
  f('ASSIGNED ROOM', room.name);
  f('ROOM FUNCTION', a.func);
  f('CURRENT DUTY', a.duty);
  f('STATUS', `${ag.reason.toUpperCase()} — ${ag.task} (${(ROOM_BY_ID[ag.at] || room).name})`);
  f('MORALE', a.id === 'magnus' ? 'NOT APPLICABLE (COMMAND CORE)' : Math.round(ag.morale) + '% · breaks taken: ' + ag.breaksTaken);
  fields.appendChild(el('div', 'agent-directive', '&raquo; ' + esc(a.directive)));
  card.appendChild(fields);
  const port = el('div', 'agent-portrait');
  const pre = el('pre');
  pre.textContent = a.portrait;
  pre.style.color = a.color;
  port.appendChild(pre);
  card.appendChild(port);
  wrap.appendChild(card);
  return wrap;
}

export function milestonesEl(st) {
  const wrap = el('div');
  wrap.appendChild(el('div', 'rv-title', 'MILESTONES'));
  wrap.appendChild(el('div', 'panel-note',
    `Survival contract: generate ${fmtMoneyShort(CONTRACT_GOAL)}. Current: ${fmtMoney(st.revenue.total)} — ` +
    (st.revenue.total / CONTRACT_GOAL * 100).toExponential(2) + '% complete.'));
  for (const m of MILESTONES) {
    const hit = st.milestonesHit.includes(m.at);
    const row = el('div', 'mile-row ' + (hit ? 'unlocked' : 'locked'));
    row.appendChild(el('span', 'badge', hit ? '★' : '·'));
    row.appendChild(el('span', '', `<b>${fmtMoneyShort(m.at)}</b> — ${esc(m.label)}`));
    wrap.appendChild(row);
  }
  return wrap;
}

export function statsEl(st) {
  const wrap = el('div');
  wrap.appendChild(el('div', 'rv-title', 'STATION STATS'));
  const grid = el('div', 'rv-statrow');
  const box = (k, v) => grid.appendChild(el('div', 'stat-box', `<span class="sk">${k}</span><span class="sv small">${v}</span>`));
  box('LIFETIME REVENUE', fmtMoney(st.revenue.total));
  box('LIFETIME COSTS', fmtMoney(st.costs.total));
  box('NET', fmtMoney(st.revenue.total - st.costs.total));
  box('ORDERS', st.ordersTotal);
  box('SOLS ELAPSED', solOf(st));
  box('MEMORY VAULT', st.archTotal + ' entries');
  wrap.appendChild(grid);

  wrap.appendChild(el('div', 'panel-head', 'NET PER SOL (LAST ' + Math.min(60, st.dayRevHistory.length) + ')'));
  const cv = document.createElement('canvas');
  cv.className = 'spark';
  cv.width = 560; cv.height = 120;
  const g = cv.getContext('2d');
  g.fillStyle = '#021008'; g.fillRect(0, 0, 560, 120);
  const hist = st.dayRevHistory.slice(-60);
  if (hist.length) {
    const vals = hist.map(h => h.rev - h.cost);
    const mx = Math.max(10, ...vals.map(Math.abs));
    const bw = 560 / Math.max(14, hist.length);
    vals.forEach((v, i) => {
      const h = Math.abs(v) / mx * 52;
      g.fillStyle = v >= 0 ? '#2cff6a' : '#ff4d4d';
      g.fillRect(i * bw + 1, v >= 0 ? 60 - h : 60, Math.max(2, bw - 2), Math.max(1, h));
    });
    g.strokeStyle = '#0d5a28';
    g.beginPath(); g.moveTo(0, 60.5); g.lineTo(560, 60.5); g.stroke();
  } else {
    g.fillStyle = '#0d5a28'; g.font = '12px monospace'; g.textAlign = 'center';
    g.fillText('first sol still in progress…', 280, 64);
  }
  wrap.appendChild(cv);

  wrap.appendChild(el('div', 'panel-head', 'REVENUE BY LINE'));
  for (const s of SHOPS) {
    const sh = st.shops[s.id];
    wrap.appendChild(el('div', 'trow',
      `<span class="tk">${esc(sh.label || s.name)}</span>` +
      `<span class="dim">${sh.orders} orders</span>` +
      `<span class="tv">${fmtMoney(sh.rev)}</span>`));
  }
  return wrap;
}
