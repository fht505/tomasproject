// ================================================================
// FHT ORBITAL — boot, loop, wiring, persistence
// ================================================================
import { BOOT_LINES, ROOM_BY_ID, fmtMoney } from './data.js';
import {
  createState, tick, offlineCatchup, issueDirective,
  actionBoost, actionHold, actionReroll, actionAudit,
  approveMessage, executePivot, overridePivot,
} from './sim.js';
import { initMap, drawMap, setMapState, centerOn } from './map.js';
import {
  $, el, esc, renderHUD, renderRailLeft, renderFeeds, drainToasts,
  openModal, closeModal, agentProfileEl, milestonesEl, statsEl,
} from './ui.js';
import { buildRoomView } from './rooms.js';
import { initLive, liveTick, liveConfigEl } from './live.js';

const SAVE_KEY = 'fht-orbital-v1';
let st = null;
let openRoomId = null;
let roomView = null;

const simApi = {
  actionBoost, actionHold, actionReroll, actionAudit,
  approveMessage, executePivot, overridePivot, issueDirective,
};

const api = {
  state: () => st,
  sim: simApi,
  back: () => closeRoom(),
  openAgent: (id) => openModal(agentProfileEl(st, id)),
  refresh: () => { if (roomView) roomView.update(st); refreshRails(); },
};

// --------------------------- persistence -------------------------
function save() {
  try {
    const clean = { ...st };
    for (const k of Object.keys(clean)) if (k.startsWith('_')) delete clean[k];
    clean.lastSaved = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
  } catch (e) { /* storage full or blocked — sim continues in memory */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 3) return null;
    return parsed;
  } catch (e) { return null; }
}

export function hardReset() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

// --------------------------- rooms -------------------------------
function openRoom(roomId) {
  openRoomId = roomId;
  const rv = $('room-view');
  rv.innerHTML = '';
  roomView = buildRoomView(roomId, api);
  rv.appendChild(roomView.root);
  rv.classList.remove('hidden');
  rv.scrollTop = 0;
  centerOn(roomId);
  refreshRails();
}

function closeRoom() {
  openRoomId = null; roomView = null;
  $('room-view').classList.add('hidden');
  refreshRails();
}

// --------------------------- rails / feeds -----------------------
function refreshRails() {
  renderRailLeft(st, openRoomId,
    (roomId) => openRoom(roomId),
    (agentId) => openModal(agentProfileEl(st, agentId)));
}

function missionAction(m, label) {
  if (m.kind === 'pivot') {
    if (label === 'EXECUTE PIVOT') executePivot(st, m.id);
    else overridePivot(st, m.id);
  }
  api.refresh();
}

// --------------------------- settings ----------------------------
function settingsEl() {
  const wrap = el('div');
  wrap.appendChild(el('div', 'rv-title', 'STATION UPLINK'));
  wrap.appendChild(el('div', 'panel-note',
    'The station runs a full local simulation out of the box. ' +
    'Connect a live model uplink to let a real LLM write the crew’s chatter, research readouts, and comms drafts.'));

  wrap.appendChild(liveConfigEl(st, api));

  const dz = el('div', 'set-danger');
  dz.appendChild(el('div', 'panel-note', 'DANGER PLATE — wipes the vault, the ledger, and every memory. The crew will not remember you.'));
  const rst = el('button', 'act-btn', '✖ FACTORY RESET STATION');
  rst.onclick = () => { if (confirm('Wipe the station and start over?')) hardReset(); };
  dz.appendChild(rst);
  wrap.appendChild(dz);
  return wrap;
}

// --------------------------- boot --------------------------------
async function bootSequence() {
  const log = $('boot-log');
  for (const line of BOOT_LINES) {
    const div = document.createElement('div');
    div.textContent = '> ' + line;
    log.appendChild(div);
    await new Promise(r => setTimeout(r, line.startsWith('WELCOME') ? 420 : 210));
    div.className = 'ok';
  }
  await new Promise(r => setTimeout(r, 500));
  $('boot-screen').classList.add('done');
  setTimeout(() => $('boot-screen').remove(), 800);
}

function wireControls() {
  const speeds = [['spd-pause', 0], ['spd-1', 1], ['spd-4', 4], ['spd-16', 16]];
  for (const [id, sp] of speeds) {
    $(id).onclick = () => {
      st.paused = sp === 0;
      if (sp > 0) st.speed = sp;
      for (const [oid] of speeds) $(oid).classList.remove('on');
      $(id).classList.add('on');
      renderHUD(st);
    };
  }
  $('btn-map').onclick = () => closeRoom();
  $('btn-milestones').onclick = () => openModal(milestonesEl(st));
  $('btn-stats').onclick = () => openModal(statsEl(st));
  $('btn-settings').onclick = () => openModal(settingsEl());
  $('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === $('modal-backdrop')) closeModal();
  });
  const fire = () => {
    const v = $('directive-input').value.trim();
    if (!v) return;
    issueDirective(st, v);
    $('directive-input').value = '';
    api.refresh();
  };
  $('btn-directive').onclick = fire;
  $('directive-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') fire(); });
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}

// --------------------------- main loop ---------------------------
let lastTs = 0, simCarry = 0, uiTimer = 0, saveTimer = 0;

function frame(ts) {
  const dtMs = Math.min(250, ts - lastTs || 16);
  lastTs = ts;

  if (!st.paused) {
    // 1 real second = 2 sim minutes at ×1
    simCarry += (dtMs / 1000) * 2 * st.speed;
    let guard = 0;
    while (simCarry >= 1 && guard < 300) {
      const step = Math.min(5, simCarry);
      tick(st, step);
      simCarry -= step;
      guard++;
    }
  }

  drawMap(dtMs);
  drainToasts(st);

  uiTimer += dtMs;
  if (uiTimer > 450) {
    uiTimer = 0;
    renderHUD(st);
    renderFeeds(st, { onMissionAction: missionAction });
    if (roomView) roomView.update(st);
    if (st._railsTick === undefined || ++st._railsTick > 3) { st._railsTick = 0; refreshRails(); }
  }

  saveTimer += dtMs;
  if (saveTimer > 8000) { saveTimer = 0; save(); }

  requestAnimationFrame(frame);
}

// --------------------------- start -------------------------------
(function start() {
  const loaded = load();
  if (loaded) {
    st = loaded;
    const away = Date.now() - (st.lastSaved || Date.now());
    if (away > 90 * 1000) {
      const msg = offlineCatchup(st, away);
      if (msg) (st._toasts ||= []).push({ kind: 'cash', text: msg });
    }
  } else {
    st = createState();
  }
  st._feedDirty = st._chatDirty = st._missionDirty = st._objDirty = true;

  initMap($('map-canvas'), $('minimap'), st, {
    onRoomClick: (id) => openRoom(id),
    onAgentClick: (id) => openModal(agentProfileEl(st, id)),
  });
  initLive(st);
  wireControls();
  refreshRails();
  renderHUD(st);
  renderFeeds(st, { onMissionAction: missionAction });
  bootSequence();
  requestAnimationFrame(frame);

  // periodic live-uplink content pass (no-op unless configured)
  setInterval(() => liveTick(st), 20000);
})();
