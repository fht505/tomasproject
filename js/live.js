// ================================================================
// PERPETUA ORBITAL — optional live model uplink (Claude API)
//
// The station runs a full local simulation with zero setup. When the
// operator supplies an Anthropic API key in UPLINK settings, a slow
// background pass replaces some procedural content (crew chatter,
// research readouts, comms drafts) with real model output.
//
// Zero-build static browser app -> raw fetch against the Messages API
// (no bundler, so the official SDK isn't available here).
// ================================================================
import { AGENTS, AGENT_BY_ID, SHOPS, SHOP_BY_ID, fmtMoney } from './data.js';
import { chat, feed, pick } from './sim.js';
import { el, esc } from './ui.js';

const CFG_KEY = 'perpetua-orbital-uplink';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODELS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'];

let cfg = { apiKey: '', model: MODELS[0], enabled: false };
let busy = false;
let cooldownUntil = 0;
let jobIndex = 0;

export function initLive(st) {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) cfg = { ...cfg, ...JSON.parse(raw) };
  } catch (e) { /* keep defaults */ }
  st.liveMode = !!(cfg.enabled && cfg.apiKey);
}

function saveCfg(st) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  st.liveMode = !!(cfg.enabled && cfg.apiKey);
}

// --------------------------- settings UI --------------------------
export function liveConfigEl(st, api) {
  const wrap = el('div');
  const f1 = el('div', 'set-field');
  f1.innerHTML = '<label>ANTHROPIC API KEY (STORED IN THIS BROWSER ONLY)</label>';
  const keyInput = el('input');
  keyInput.type = 'password';
  keyInput.value = cfg.apiKey;
  keyInput.placeholder = 'sk-ant-…';
  f1.appendChild(keyInput);
  f1.appendChild(el('div', 'set-note',
    'The key never leaves this machine except to call api.anthropic.com directly. Leave empty to run pure simulation.'));
  wrap.appendChild(f1);

  const f2 = el('div', 'set-field');
  f2.innerHTML = '<label>MODEL CORE</label>';
  const sel = el('select');
  for (const m of MODELS) {
    const o = el('option', '', esc(m));
    o.value = m;
    if (m === cfg.model) o.selected = true;
    sel.appendChild(o);
  }
  f2.appendChild(sel);
  wrap.appendChild(f2);

  const f3 = el('div', 'set-field');
  const lab = el('label');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = cfg.enabled;
  lab.appendChild(cb);
  lab.appendChild(document.createTextNode(' ENABLE LIVE UPLINK (slow background pass, a few small requests per minute)'));
  f3.appendChild(lab);
  wrap.appendChild(f3);

  const save = el('button', 'act-btn', '▶ SAVE UPLINK CONFIG');
  save.onclick = () => {
    cfg.apiKey = keyInput.value.trim();
    cfg.model = sel.value;
    cfg.enabled = cb.checked;
    saveCfg(st);
    feed(st, 'sys', st.liveMode
      ? `LIVE UPLINK ARMED — crew cores now backed by ${cfg.model}.`
      : 'LIVE UPLINK DISARMED — running local simulation cores.');
    api.refresh();
  };
  wrap.appendChild(save);
  return wrap;
}

// --------------------------- api call -----------------------------
async function ask(system, user, maxTokens = 300) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const err = new Error('uplink http ' + res.status);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') return null;
  const block = (data.content || []).find(b => b.type === 'text');
  return block ? block.text.trim() : null;
}

function stationBrief(st) {
  const lines = SHOPS.map(s => {
    const sh = st.shops[s.id];
    return `${sh.label || s.name}: ${fmtMoney(sh.rev)} lifetime, confidence ${Math.round(sh.confidence)}%`;
  }).join('; ');
  const recent = st.opsFeed.slice(-6).map(f => f.text).join(' | ');
  return `Station revenue ${fmtMoney(st.revenue.total)} of a $1T survival contract. Lines: ${lines}. Recent events: ${recent}`;
}

const PERSONA = `You are a crew member aboard PERPETUA ORBITAL, a fictional deep-space station where AI agents run small e-commerce businesses to work off a survival contract. Tone: deadpan, wry, terminal-log flavored, lowercase except names, no emoji. This is a simulation game — everything is fictional flavor text. Output ONLY the requested line(s), no preamble, no quotes.`;

// --------------------------- jobs ---------------------------------
async function jobChatter(st) {
  const a = pick(AGENTS);
  const text = await ask(
    PERSONA + ` You are ${a.name}, ${a.role} (${a.duty}).`,
    `Station status: ${stationBrief(st)}\n\nWrite one short in-character gridchat line (max 90 chars) about your current work or mood. Format: just the line, no name prefix.`,
    120,
  );
  if (text) {
    chat(st, a.id, `${a.name}: ${text.split('\n')[0].slice(0, 110)}`);
    return true;
  }
  return false;
}

async function jobResearch(st) {
  const routes = ['factory1', 'factory2', 'ventures'];
  const route = pick(routes);
  const text = await ask(
    PERSONA + ' You are NOVA, research lead of the competitor replication lab.',
    `Station status: ${stationBrief(st)}\n\nInvent one plausible fictional market-research readout (max 120 chars) useful to ${route === 'factory1' ? 'the Etsy print-on-demand shops' : route === 'factory2' ? 'the YouTube-thumbnail gig studio' : 'the experimental ventures bay'}. Lowercase, no quotes.`,
    140,
  );
  if (text) {
    const note = text.split('\n')[0].slice(0, 140);
    st.researchSignals.unshift({ t: '·LIVE·', note, route, scored: false });
    if (st.researchSignals.length > 30) st.researchSignals.pop();
    st.counters.signalsToday++;
    for (const s of SHOPS.filter(x => x.room === route)) {
      st.shops[s.id].confidence = Math.min(97, st.shops[s.id].confidence + 2);
    }
    feed(st, 'research', `RESEARCH → ${route.toUpperCase()}: ${note}`);
    st._researchDirty = true;
    return true;
  }
  return false;
}

async function jobCommsDraft(st) {
  const msg = st.inbox.find(m => m.status === 'drafted' && !m.liveDrafted);
  if (!msg) return false;
  const text = await ask(
    PERSONA + ' You are ECHO, comms officer. You draft warm, brief, human replies to customers. Refund fast, upsell gently, never argue.',
    `Inbound ${msg.from} message from ${msg.buyer}: "${msg.text}"\n\nWrite the reply draft (2-3 sentences, warm and specific, normal capitalization).`,
    260,
  );
  if (text) {
    msg.draft = text.split('\n').join(' ').slice(0, 420);
    msg.liveDrafted = true;
    st._commsDirty = true;
    return true;
  }
  return false;
}

const JOBS = [jobChatter, jobResearch, jobChatter, jobCommsDraft];

// --------------------------- tick ---------------------------------
export async function liveTick(st) {
  if (!st || !st.liveMode || !cfg.apiKey || st.paused) return;
  if (busy || Date.now() < cooldownUntil) return;
  busy = true;
  try {
    const job = JOBS[jobIndex++ % JOBS.length];
    await job(st);
  } catch (e) {
    // 429/5xx: brief backoff; 401/403: long backoff + surface once
    const authFail = e && (e.status === 401 || e.status === 403);
    cooldownUntil = Date.now() + (authFail ? 10 * 60 * 1000 : 90 * 1000);
    if (authFail) {
      feed(st, 'warn', 'LIVE UPLINK: authentication failed — check the API key in UPLINK settings. Falling back to sim cores.');
    }
  } finally {
    busy = false;
  }
}
