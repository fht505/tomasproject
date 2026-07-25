// ================================================================
// PERPETUA ORBITAL — simulation engine (pure state; no DOM)
// Time unit: sim minutes. 1 real second at ×1 = 2 sim minutes.
// ================================================================
import {
  AGENTS, AGENT_BY_ID, SHOPS, SHOP_BY_ID, ROOMS, PIPELINES,
  DESIGN_VIBES, DESIGN_FORMS, PRODUCT_FORMS, THUMB_BRIEFS, THUMB_STYLES,
  PACK_NAMES, BLOG_TITLES, TRACK_NAMES, PROTO_NAMES, BUYER_NAMES,
  MSG_TEMPLATES, RESEARCH_SIGNALS, CHAT_WORK, CHAT_MAGNUS,
  WAR_VERDICT_KILL, WAR_VERDICT_SCALE, MILESTONES, DAILY_OBJECTIVE_DEFS,
  CONTRACT_GOAL, fmtMoney, fmtMoneyShort,
} from './data.js';

// --------------------------- rng utils ---------------------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = Math.random;
export const pick = (arr) => arr[Math.floor(R() * arr.length)];
const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
const rf = (a, b) => a + R() * (b - a);
const chance = (p) => R() < p;

let uid = 1;
const nid = () => (uid++).toString(36) + Math.floor(R() * 1e4).toString(36);

// --------------------------- state -------------------------------
export function createState() {
  const shops = {};
  for (const s of SHOPS) {
    shops[s.id] = {
      rev: 0, orders: 0, listings: rint(4, 9),
      confidence: rint(62, 78), novelty: 0.4,
      boostUntil: 0, held: false, streakBad: 0,
      dayRev: [0, 0, 0], // rolling: [today, y-1, y-2]
      label: null,       // ventures lines can be renamed by pivots
    };
  }
  const pipelines = {};
  for (const [pid, steps] of Object.entries(PIPELINES)) {
    pipelines[pid] = {
      step: rint(0, steps.length - 1), prog: rf(0, 0.8),
      stepDur: rint(35, 80), output: null, cycles: 0,
    };
  }
  const agents = {};
  for (const a of AGENTS) {
    agents[a.id] = {
      morale: a.id === 'magnus' ? 100 : rint(62, 92),
      at: a.room, target: a.room, reason: 'working',
      task: 'initializing', bubble: null, bubbleUntil: 0,
      breaksTaken: 0,
    };
  }
  const st = {
    version: 3,
    createdAt: Date.now(), lastSaved: Date.now(),
    simMinutes: 8 * 60, // start at 08:00 sol 1
    speed: 1, paused: false,
    revenue: { total: 0, etsy: 0, fiverr: 0, assets: 0 },
    costs: { total: 0, subs: 0, inference: 0, ads: 0, fees: 0 },
    ordersTotal: 0,
    level: 1, xp: 0,
    shops, pipelines, agents,
    genWindow: { factory1: [], factory2: [] },
    listings: [], gigQueue: [],
    researchSignals: [], researchFocus: null,
    inbox: [],
    warReviews: [], pivotLog: [],
    archives: [], archTotal: 0,
    opsFeed: [], gridchat: [], missions: [],
    objectives: [], counters: { listingsToday: 0, gigsToday: 0, signalsToday: 0 },
    alerts: {}, // roomId -> {label, until, kind}
    milestonesHit: [],
    directiveLog: [],
    dayRevHistory: [], // per sol totals for stats
    todayRev: 0, todayCost: 0,
    nextEventAt: 6 * 60 + 8 * 60,
    autoReplyMin: 90, // ECHO auto-clears inbox after this many sim-min
    liveMode: false,
    seed: rint(1, 1e9),
  };
  // seed opening content
  for (let i = 0; i < 4; i++) pushGen(st, 'factory1');
  for (let i = 0; i < 2; i++) pushGen(st, 'factory2');
  rollObjectives(st);
  arch(st, 'sys', 'Station initialized. Survival contract armed: ' + fmtMoneyShort(CONTRACT_GOAL) + '.');
  feed(st, 'sys', 'PERPETUA ORBITAL cold start complete. 15 crew cores linked.');
  chat(st, null, 'MAGNUS: contract active. factories, spin up. research, find me demand.');
  return st;
}

// --------------------------- logging -----------------------------
const T = (st) => {
  const sol = Math.floor(st.simMinutes / 1440) + 1;
  const m = Math.floor(st.simMinutes % 1440);
  return `S${String(sol).padStart(3, '0')} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const solOf = (st) => Math.floor(st.simMinutes / 1440) + 1;

export function arch(st, type, text) {
  st.archives.push({ t: T(st), type, text });
  st.archTotal++;
  if (st.archives.length > 4000) st.archives.splice(0, st.archives.length - 4000);
}
export function feed(st, kind, text) {
  st.opsFeed.push({ t: T(st), kind, text });
  if (st.opsFeed.length > 120) st.opsFeed.splice(0, st.opsFeed.length - 120);
  arch(st, kind, text);
  st._feedDirty = true;
}
export function chat(st, agentId, text) {
  st.gridchat.push({ t: T(st), who: agentId, text });
  if (st.gridchat.length > 80) st.gridchat.splice(0, st.gridchat.length - 80);
  arch(st, 'chat', text);
  if (agentId && st.agents[agentId]) {
    st.agents[agentId].bubble = text.split(': ').slice(1).join(': ').slice(0, 46);
    st.agents[agentId].bubbleUntil = st.simMinutes + 14;
  }
  st._chatDirty = true;
}
function mission(st, card) {
  card.id = nid();
  st.missions.unshift(card);
  if (st.missions.length > 6) st.missions.pop();
  st._missionDirty = true;
  return card;
}
function toast(st, kind, text) {
  (st._toasts ||= []).push({ kind, text });
}

// ----------------------- content helpers -------------------------
const vibe = () => pick(DESIGN_VIBES);
export function designName() { return `${vibe()} ${pick(DESIGN_FORMS)}`; }
export function productName() { return `${vibe()} ${pick(PRODUCT_FORMS)}`; }
export function thumbName() { return `${pick(THUMB_BRIEFS)}`; }

function pushGen(st, fid) {
  const item = fid === 'factory1'
    ? { name: designName(), conf: rint(48, 92), seed: rint(1, 1e9), kind: 'design' }
    : { name: `${thumbName()} — ${pick(THUMB_STYLES)}`, conf: rint(50, 90), seed: rint(1, 1e9), kind: 'thumb' };
  const win = st.genWindow[fid];
  win.unshift(item);
  if (win.length > 8) win.pop();
  st._genDirty = true;
  return item;
}

function fillTemplate(str) {
  return str
    .replace('{vibe}', vibe().toLowerCase())
    .replace('{product}', pick(PRODUCT_FORMS).toLowerCase())
    .replace('{design}', designName().toLowerCase())
    .replace('{pack}', pick(PACK_NAMES).toLowerCase())
    .replace('{n}', String(rint(2, 38)));
}

// ----------------------- room / crew utils -----------------------
export const crewOf = (roomId) => AGENTS.filter(a => a.room === roomId);

function roomEfficiency(st, roomId) {
  const crew = crewOf(roomId);
  if (!crew.length) return 1;
  let m = 0, present = 0;
  for (const a of crew) {
    m += st.agents[a.id].morale;
    if (st.agents[a.id].at === roomId) present++;
  }
  const morale = m / crew.length / 100;             // 0..1
  const presence = 0.6 + 0.4 * (present / crew.length);
  return (0.55 + 0.55 * morale) * presence;          // ~0.4 .. 1.1
}

function shopRate(st, s) {
  const sh = st.shops[s.id];
  if (sh.held) return 0;
  let rate = s.baseRate; // orders per sim-hour baseline
  rate *= 0.4 + 0.9 * (sh.confidence / 100);
  rate *= 1 + Math.min(0.5, sh.novelty);
  if (st.simMinutes < sh.boostUntil) rate *= 1.65;
  const al = st.alerts[s.room];
  if (al && al.kind === 'market') rate *= 0.35;
  if (al && al.kind === 'viral' && al.shop === s.id) rate *= 3;
  if (al && al.kind === 'supply') rate *= 0.5;
  rate *= roomEfficiency(st, s.room);
  return rate; // per sim-hour
}

// --------------------------- economy -----------------------------
function landOrder(st, s) {
  const sh = st.shops[s.id];
  let amount = rf(s.priceMin, s.priceMax);
  amount = Math.round(amount * 100) / 100;

  if (s.id === 'gigs') {
    // gigs queue first, pay on delivery
    const gig = {
      id: nid(), buyer: pick(BUYER_NAMES), brief: thumbName(),
      style: pick(THUMB_STYLES), amount, placedAt: st.simMinutes, status: 'queued',
    };
    st.gigQueue.push(gig);
    if (st.gigQueue.length > 14) st.gigQueue.splice(0, st.gigQueue.length - 14);
    feed(st, 'order', `FIVERR: new gig from ${gig.buyer} — “${gig.brief}” (${fmtMoney(amount)})`);
    return;
  }

  sh.rev += amount; sh.orders++; sh.dayRev[0] += amount;
  sh.novelty = Math.max(0, sh.novelty - 0.015);
  st.revenue.total += amount; st.todayRev += amount;
  st.revenue[s.channel] += amount;
  st.ordersTotal++;
  const fee = amount * 0.08;
  st.costs.fees += fee; st.costs.total += fee; st.todayCost += fee;

  const buyer = pick(BUYER_NAMES);
  const what = s.channel === 'etsy' ? productName() :
    s.id === 'packs' ? pick(PACK_NAMES) :
    s.id === 'affil' ? 'affiliate payout' :
    s.id === 'music' ? 'stream royalties' : 'license seat';
  feed(st, 'cash', `${s.name}: ${buyer} bought ${what} — ${fmtMoney(amount)}`);
  toast(st, 'cash', `+${fmtMoney(amount)} · ${s.name}`);
  bubbleRoom(st, s.room, '$');
  checkMilestones(st);
  st._hudDirty = true;
}

function deliverGig(st, gig) {
  const s = SHOP_BY_ID.gigs, sh = st.shops.gigs;
  gig.status = 'delivered';
  sh.rev += gig.amount; sh.orders++; sh.dayRev[0] += gig.amount;
  st.revenue.total += gig.amount; st.revenue.fiverr += gig.amount;
  st.todayRev += gig.amount; st.ordersTotal++;
  st.counters.gigsToday++;
  const fee = gig.amount * 0.2; // gig platform cut
  st.costs.fees += fee; st.costs.total += fee; st.todayCost += fee;
  feed(st, 'cash', `THUMBNAIL STUDIO: delivered “${gig.brief}” to ${gig.buyer} — ${fmtMoney(gig.amount)}`);
  toast(st, 'cash', `+${fmtMoney(gig.amount)} · gig delivered`);
  bubbleRoom(st, 'factory2', '$');
  if (chance(0.3)) chat(st, 'halo', `HALO: ${gig.buyer} approved on the first pass. red arrow supremacy.`);
  checkMilestones(st);
}

function bubbleRoom(st, roomId, txt) {
  const crew = crewOf(roomId);
  if (!crew.length) return;
  const a = st.agents[pick(crew).id];
  a.bubble = txt; a.bubbleUntil = st.simMinutes + 6;
}

function checkMilestones(st) {
  for (const m of MILESTONES) {
    if (st.revenue.total >= m.at && !st.milestonesHit.includes(m.at)) {
      st.milestonesHit.push(m.at);
      feed(st, 'milestone', `MILESTONE — ${m.label}`);
      toast(st, 'cash', `MILESTONE: ${m.label}`);
      chat(st, null, pick(CHAT_MAGNUS).replace('{pct}',
        ((st.revenue.total / CONTRACT_GOAL) * 100).toExponential(1)));
    }
  }
  // level: soft-log curve
  const lv = Math.max(1, Math.floor(Math.log10(Math.max(10, st.revenue.total)) * 3 - 2));
  if (lv > st.level) {
    st.level = lv;
    feed(st, 'sys', `STATION LEVEL UP → ${lv}`);
    toast(st, 'ok', `STATION LEVEL ${lv}`);
  }
}

// --------------------------- pipelines ---------------------------
function advancePipelines(st, dt) {
  for (const [pid, steps] of Object.entries(PIPELINES)) {
    const p = st.pipelines[pid];
    const roomId = pid === 'research' ? 'research' : pid === 'ventures' ? 'ventures' : pid;
    const eff = roomEfficiency(st, roomId);
    // factory2 only advances when gigs are queued
    if (pid === 'factory2' && !st.gigQueue.some(g => g.status === 'queued' || g.status === 'working')) continue;
    p.prog += (dt / p.stepDur) * (0.6 + 0.7 * eff);
    if (p.prog >= 1) {
      p.prog = 0; p.stepDur = rint(35, 85);
      p.step = (p.step + 1) % steps.length;
      p.cycles++;
      if (p.step === 0) pipelineCycleDone(st, pid);
      else pipelineStepDone(st, pid, p.step);
      st._pipeDirty = true;
    }
  }
}

function pipelineStepDone(st, pid, stepIdx) {
  if (pid === 'factory1' && stepIdx === 2 && chance(0.7)) {
    const g = pushGen(st, 'factory1');
    st.pipelines.factory1.output = g.name;
  }
  if (pid === 'factory2') {
    const gig = st.gigQueue.find(g => g.status === 'queued');
    if (gig && stepIdx >= 1) gig.status = 'working';
    if (stepIdx === 3 && chance(0.75)) {
      const g = pushGen(st, 'factory2');
      st.pipelines.factory2.output = g.name;
    }
  }
}

function pipelineCycleDone(st, pid) {
  if (pid === 'factory1') {
    // new listing launches on a weighted-random etsy shop
    const s = pick([SHOP_BY_ID.etsy1, SHOP_BY_ID.etsy1, SHOP_BY_ID.etsy2, SHOP_BY_ID.etsy3]);
    const sh = st.shops[s.id];
    const name = productName();
    sh.listings++; sh.novelty = Math.min(1, sh.novelty + 0.12);
    st.counters.listingsToday++;
    st.listings.unshift({ t: T(st), shop: s.name, name });
    if (st.listings.length > 40) st.listings.pop();
    feed(st, 'ship', `${s.name}: launched listing — “${name}”`);
    if (chance(0.35)) chat(st, pick(['flora', 'merch', 'wick']), pick(CHAT_WORK)
      .replace('{name}', pick(['FLORA', 'MERCH', 'WICK'])).replace('{thing}', 'listing').replace('{n}', String(rint(2, 9))));
  }
  if (pid === 'factory2') {
    const gig = st.gigQueue.find(g => g.status === 'working' || g.status === 'queued');
    if (gig) deliverGig(st, gig);
    st.gigQueue = st.gigQueue.filter(g => g.status !== 'delivered' || chance(0.5));
  }
  if (pid === 'research') {
    emitResearchSignal(st);
  }
  if (pid === 'ventures') {
    const roll = R();
    let line, what;
    if (roll < 0.35) { line = 'affil'; what = `published “${pick(BLOG_TITLES)}”`; }
    else if (roll < 0.6) { line = 'music'; what = `released track “${pick(TRACK_NAMES)}”`; }
    else if (roll < 0.85) { line = 'packs'; what = `staged pack “${pick(PACK_NAMES)}”`; }
    else { line = 'proto'; what = `shipped prototype: ${pick(PROTO_NAMES)}`; }
    const sh = st.shops[line];
    sh.novelty = Math.min(1, sh.novelty + 0.2);
    feed(st, 'ship', `VENTURES: ${what}`);
  }
}

// --------------------------- research ----------------------------
function emitResearchSignal(st) {
  const sig = pick(RESEARCH_SIGNALS);
  const note = fillTemplate(sig.note);
  let route = sig.route;
  if (st.researchFocus) {
    // an operator directive biases routing
    if (st.researchFocus.route && chance(0.7)) route = st.researchFocus.route;
  }
  const entry = { t: T(st), note, route, scored: false };
  st.researchSignals.unshift(entry);
  if (st.researchSignals.length > 30) st.researchSignals.pop();
  st.counters.signalsToday++;

  // signal boosts confidence of routed room's shops
  for (const s of SHOPS.filter(x => x.room === route)) {
    st.shops[s.id].confidence = Math.min(97, st.shops[s.id].confidence + rint(2, 5));
  }
  // market alerts get resolved by routed signals
  const al = st.alerts[route];
  if (al && al.kind === 'market') {
    al.hits = (al.hits || 0) + 1;
    if (al.hits >= 2) {
      delete st.alerts[route];
      feed(st, 'ok', `${route.toUpperCase()}: market shift countered by research readouts. Lane stabilized.`);
      st._mapDirty = true;
    }
  }
  feed(st, 'research', `RESEARCH → ${route.toUpperCase()}: ${note}`);
  if (chance(0.4)) chat(st, pick(['nova', 'scout']), pick(CHAT_WORK)
    .replace('{name}', pick(['NOVA', 'SCOUT'])).replace('{thing}', 'readout').replace('{n}', String(rint(3, 18))));
  st._researchDirty = true;
}

// --------------------------- comms -------------------------------
function maybeInbound(st, dt) {
  const ratePerHour = 0.42; // ~10/day
  if (!chance(ratePerHour * dt / 60)) return;
  const tpl = pick(MSG_TEMPLATES);
  const msg = {
    id: nid(), from: tpl.from, buyer: pick(BUYER_NAMES),
    text: fillTemplate(tpl.text),
    draft: null, status: 'waiting',
    at: st.simMinutes, t: T(st),
  };
  st.inbox.unshift(msg);
  if (st.inbox.length > 24) st.inbox.pop();
  feed(st, 'msg', `COMMS: inbound ${msg.from.toUpperCase()} message from ${msg.buyer}`);
  st._commsDirty = true;
}

function draftReply(msg) {
  const t = msg.text.toLowerCase();
  if (t.includes('ship')) return `Hi ${msg.buyer.split(' ')[0]}! Yes — orders placed today print within 2 business days and arrive well before the 14th. I’ll flag yours priority just in case. Thank you for thinking of us for a gift!`;
  if (t.includes('green') || t.includes('color')) return `Absolutely — sage green is available on that design. I’ve added a custom variant link for you; pick your size and it’ll print in sage. Thanks for the great idea!`;
  if (t.includes('bulk') || t.includes('group')) return `So glad it arrived safely! For groups of 10+, we do 15% off with free names on the back. I’ll send a private bundle listing for your group of 11 today.`;
  if (t.includes('crooked') || t.includes('label')) return `Thank you for telling us — that’s not our standard. A replacement label set ships free today, and I’ve added a small credit to your account. Enjoy the candle!`;
  if (t.includes('arrow') || t.includes('flames') || t.includes('face')) return `On it — bigger face, redder arrow, tasteful flames. Revised proofs in your inbox within the hour. Same budget, of course.`;
  if (t.includes('ctr') || t.includes('ordering')) return `That’s a fantastic CTR — congrats! Your 4 new orders are queued at priority. Send titles + face shots whenever ready and we’ll match the winning style.`;
  if (t.includes('rush')) return `Rush accepted — delivery locked in under 4 hours. “Same style but MORE dramatic” is our specialty. Watch your inbox for proofs shortly.`;
  if (t.includes('source files') || t.includes('recolors')) return `Yes — every pack includes layered source files and a palette sheet for recolors. Roguelikes welcome; tag us when you ship!`;
  if (t.includes('newsletter') || t.includes('collab')) return `Thanks for following up! We’d be glad to explore a feature. Our media sheet is attached; late-week slots are open for a call.`;
  if (t.includes('invoice')) return `Apologies for the delay — remittance was sent this morning, confirmation number attached. Thank you for your patience (and your presses).`;
  return `Thanks for reaching out! We’re on it and will follow up with details shortly — usually within the hour.`;
}

function advanceComms(st) {
  for (const m of st.inbox) {
    if (m.status === 'waiting' && st.simMinutes - m.at > rint(4, 18)) {
      m.draft = draftReply(m);
      m.status = 'drafted';
      st._commsDirty = true;
    } else if (m.status === 'drafted' && st.simMinutes - m.at > st.autoReplyMin) {
      m.status = 'resolved'; m.resolvedBy = 'ECHO (auto)';
      feed(st, 'msg', `COMMS: ECHO auto-cleared ${m.buyer} (${m.from}) after operator timeout.`);
      st._commsDirty = true;
    }
  }
}

export function approveMessage(st, id) {
  const m = st.inbox.find(x => x.id === id);
  if (!m || m.status !== 'drafted') return;
  m.status = 'resolved'; m.resolvedBy = 'OPERATOR';
  feed(st, 'msg', `COMMS: operator approved reply to ${m.buyer}. Response time: ${Math.round(st.simMinutes - m.at)} min.`);
  // fast replies please buyers
  for (const s of SHOPS.filter(x => x.channel === m.from || (m.from === 'mail'))) {
    st.shops[s.id].confidence = Math.min(97, st.shops[s.id].confidence + 1);
  }
  st._commsDirty = true;
}

// --------------------------- treasury ----------------------------
function accrueCosts(st, dt) {
  const hours = dt / 60;
  const subs = (400 / 30 / 24) * hours;            // $400/mo core subscriptions
  let infer = 0.16 * hours;                         // inference hum
  infer *= 1 + 0.15 * Object.values(st.pipelines).filter(p => p.prog > 0).length;
  let ads = 0;
  for (const s of SHOPS) if (st.simMinutes < st.shops[s.id].boostUntil) ads += 2.6 * hours;
  st.costs.subs += subs; st.costs.inference += infer; st.costs.ads += ads;
  const add = subs + infer + ads;
  st.costs.total += add; st.todayCost += add;
}

// --------------------------- war room ----------------------------
function warReview(st) {
  const lines = [];
  for (const s of SHOPS) {
    const sh = st.shops[s.id];
    const rev3 = sh.dayRev[0] + sh.dayRev[1] + sh.dayRev[2];
    const isVenture = s.room === 'ventures' || s.id === 'packs';
    const threshold = isVenture ? 1.5 : 24;
    let verdict, cls;
    if (rev3 <= threshold && solOf(st) > 2) {
      sh.streakBad++;
      verdict = 'UNDERPERFORMING'; cls = 'bad';
    } else if (sh.dayRev[0] > sh.dayRev[1] * 1.35 && sh.dayRev[0] > 30) {
      sh.streakBad = 0; verdict = 'SCALING'; cls = 'good';
    } else {
      sh.streakBad = 0; verdict = 'STABLE'; cls = 'ok';
    }
    lines.push({ shop: s.id, name: sh.label || s.name, rev3, verdict, cls });

    if (cls === 'bad' && sh.streakBad >= 2 && !st.missions.some(m => m.kind === 'pivot' && m.shop === s.id)) {
      const card = mission(st, {
        tag: 'WAR ROOM · PIVOT PROPOSAL', kind: 'pivot', shop: s.id, warn: true,
        text: `${sh.label || s.name}: ${pick(WAR_VERDICT_KILL)}`,
        actions: ['EXECUTE PIVOT', 'OVERRIDE'],
      });
      feed(st, 'warn', `WAR ROOM: pivot proposed for ${sh.label || s.name}.`);
      chat(st, 'atlas', `ATLAS: ${sh.label || s.name} is on the block. the ledger has spoken.`);
      // if the operator ignores it, ATLAS executes on next review
      card.autoAt = st.simMinutes + 1440;
    }
    if (cls === 'good' && chance(0.5)) {
      feed(st, 'ok', `WAR ROOM: ${sh.label || s.name} — ${pick(WAR_VERDICT_SCALE)}`);
      sh.boostUntil = Math.max(sh.boostUntil, st.simMinutes + 360); // free scale boost
    }
  }
  st.warReviews.unshift({ t: T(st), sol: solOf(st), lines });
  if (st.warReviews.length > 10) st.warReviews.pop();
  st._warDirty = true;
}

export function executePivot(st, missionId) {
  const card = st.missions.find(m => m.id === missionId);
  if (!card || card.kind !== 'pivot') return;
  const s = SHOP_BY_ID[card.shop], sh = st.shops[card.shop];
  const old = sh.label || s.name;
  // ventures lines get reborn under a new concept; factories get a strategy reset
  if (s.room === 'ventures' || s.id === 'packs') {
    const pool = { affil: BLOG_TITLES, music: TRACK_NAMES, proto: PROTO_NAMES, packs: PACK_NAMES };
    sh.label = (s.id === 'proto' ? 'SHIPYARD: ' : '') +
      (pool[s.id] ? String(pick(pool[s.id])).toUpperCase().slice(0, 26) : s.name);
    sh.confidence = rint(58, 74); sh.novelty = 0.5; sh.streakBad = 0;
  } else {
    sh.confidence = rint(60, 75); sh.novelty = 0.45; sh.streakBad = 0;
  }
  st.pivotLog.unshift({ t: T(st), text: `${old} → ${sh.label || s.name} (crew redeployed)` });
  if (st.pivotLog.length > 20) st.pivotLog.pop();
  st.missions = st.missions.filter(m => m.id !== missionId);
  feed(st, 'warn', `PIVOT EXECUTED: ${old} shut down. Crew redeployed to ${sh.label || s.name}.`);
  chat(st, 'atlas', 'ATLAS: pivot executed. sentiment archived, margin restored.');
  st._missionDirty = true; st._warDirty = true;
}

export function overridePivot(st, missionId) {
  const card = st.missions.find(m => m.id === missionId);
  if (!card) return;
  const s = SHOP_BY_ID[card.shop], sh = st.shops[card.shop];
  sh.streakBad = 0;
  st.missions = st.missions.filter(m => m.id !== missionId);
  feed(st, 'sys', `OPERATOR OVERRIDE: ${sh.label || s.name} stays. ATLAS logs a formal objection.`);
  chat(st, 'atlas', 'ATLAS: override noted. the ledger never forgets, operator.');
  st._missionDirty = true;
}

// --------------------------- events ------------------------------
function randomEvent(st) {
  const roll = R();
  if (roll < 0.3) {
    const room = pick(['factory1', 'factory2']);
    st.alerts[room] = { kind: 'market', label: 'MARKET SHIFT', until: st.simMinutes + 300, hits: 0 };
    feed(st, 'warn', `${room.toUpperCase()}: MARKET SHIFT — demand pattern broke. Research routing countermeasures.`);
    toast(st, 'warn', `MARKET SHIFT in ${room === 'factory1' ? 'FACTORY 1' : 'FACTORY 2'}`);
    for (const s of SHOPS.filter(x => x.room === room)) {
      st.shops[s.id].confidence = Math.max(30, st.shops[s.id].confidence - rint(8, 16));
    }
  } else if (roll < 0.45) {
    const s = pick(SHOPS.filter(x => x.channel === 'etsy'));
    st.alerts[s.room] = { kind: 'viral', label: 'VIRAL SPIKE', until: st.simMinutes + 180, shop: s.id };
    feed(st, 'ok', `${s.name}: a listing is going viral on social. Order rate tripled for a few hours.`);
    toast(st, 'cash', `VIRAL SPIKE — ${s.name}`);
  } else if (roll < 0.6) {
    st.alerts.factory1 = { kind: 'supply', label: 'PRINT PARTNER DELAY', until: st.simMinutes + 360 };
    feed(st, 'warn', 'FACTORY 1: print partner backlog — fulfillment slowed station-wide.');
  } else if (roll < 0.75) {
    const a = pick(AGENTS.filter(x => x.id !== 'magnus'));
    chat(st, a.id, `${a.name}: requesting quarters rotation. reason: existential maintenance.`);
    st.agents[a.id].morale = Math.max(20, st.agents[a.id].morale - 18);
  } else {
    feed(st, 'sys', 'DEEP SCAN: hull nominal, memory vault at ' + st.archTotal + ' entries, coffee loop stable.');
  }
  st._mapDirty = true;
}

// --------------------------- morale ------------------------------
function advanceCrew(st, dt) {
  for (const a of AGENTS) {
    const ag = st.agents[a.id];
    // logical movement is owned by the sim (the map only animates it):
    // a changed target completes after a short walk time
    if (ag.target !== ag.at) {
      if (!ag.walkEta) ag.walkEta = st.simMinutes + rint(3, 8);
      if (st.simMinutes >= ag.walkEta) { ag.at = ag.target; ag.walkEta = 0; }
    } else {
      ag.walkEta = 0;
    }
    if (a.id === 'magnus') { ag.morale = 100; ag.task = 'arbitrating station priorities'; continue; }
    if (ag.at === 'quarters' && ag.reason === 'break') {
      ag.morale = Math.min(100, ag.morale + 9 * dt / 60);
      ag.task = pick(['poker table', 'at the bar', 'recharging']);
      if (ag.morale >= 86) {
        ag.target = a.room; ag.reason = 'working';
        if (chance(0.5)) chat(st, a.id, `${a.name}: rotation complete. back to the grind. the bar helps.`);
      }
    } else {
      ag.morale = Math.max(8, ag.morale - 0.55 * dt / 60);
      ag.task = defaultTask(st, a);
      if (ag.reason !== 'break' && (ag.morale < 20 || (ag.morale < 34 && chance(0.02 * dt)))) {
        ag.target = 'quarters'; ag.reason = 'break'; ag.breaksTaken++;
        feed(st, 'sys', `${a.name} rotated to quarters (morale ${Math.round(ag.morale)}%).`);
      }
      // occasional cross-room errands
      if (ag.reason === 'working' && chance(0.004 * dt)) {
        const errands = { nova: 'factory1', scout: 'factory2', merch: 'bridge', ledger: 'warroom', echo: 'bridge', atlas: 'treasury' };
        if (errands[a.id] && ag.at === a.room) {
          ag.target = errands[a.id]; ag.reason = 'errand';
          ag.returnAt = st.simMinutes + rint(25, 60);
        }
      }
      if (ag.reason === 'errand' && st.simMinutes > (ag.returnAt || 0) && ag.at !== a.room) {
        ag.target = a.room; ag.reason = 'working';
      }
    }
  }
  // ambient chatter
  if (chance(0.02 * dt)) {
    const a = pick(AGENTS);
    const line = a.id === 'magnus'
      ? pick(CHAT_MAGNUS).replace('{pct}', ((st.revenue.total / CONTRACT_GOAL) * 100).toExponential(1))
      : pick(CHAT_WORK).replace('{name}', a.name)
          .replace('{thing}', pick(['listing', 'render', 'readout', 'bundle', 'draft']))
          .replace('{n}', String(rint(2, 22)));
    chat(st, a.id === 'magnus' ? 'magnus' : a.id, line);
  }
}

function defaultTask(st, a) {
  switch (a.room) {
    case 'factory1': return PIPELINES.factory1[st.pipelines.factory1.step].key.toLowerCase();
    case 'factory2': return PIPELINES.factory2[st.pipelines.factory2.step].key.toLowerCase();
    case 'research': return PIPELINES.research[st.pipelines.research.step].key.toLowerCase();
    case 'ventures': return PIPELINES.ventures[st.pipelines.ventures.step].key.toLowerCase();
    case 'comms': return st.inbox.some(m => m.status !== 'resolved') ? 'drafting replies' : 'watching channels';
    case 'treasury': return 'margin defense';
    case 'warroom': return 'reading the ledger';
    case 'archives': return 'indexing memories';
    default: return 'on station duty';
  }
}

// --------------------------- objectives / day roll ----------------
function rollObjectives(st) {
  st.objectives = DAILY_OBJECTIVE_DEFS.map(d => {
    const n = rint(d.min, d.max);
    return { id: d.id, n, label: d.label.replace('{n}', String(n)), done: false, metric: d.metric, invert: !!d.invert };
  });
  st.counters = { listingsToday: 0, gigsToday: 0, signalsToday: 0 };
  st._objDirty = true;
}

function checkObjectives(st) {
  let all = true;
  for (const o of st.objectives) {
    if (o.done) continue;
    let v = 0;
    if (o.metric === 'inboxLow') v = st.inbox.filter(m => m.status !== 'resolved').length <= o.n ? o.n : o.n + 1;
    else v = st.counters[o.metric] || 0;
    o.done = o.metric === 'inboxLow' ? v <= o.n : v >= o.n;
    if (!o.done) all = false;
  }
  if (all && st.objectives.length && !st._objAllDone) {
    st._objAllDone = true;
    feed(st, 'ok', 'ALL DAILY OBJECTIVES COMPLETE. MAGNUS registers rare approval.');
    chat(st, 'magnus', 'MAGNUS: objectives cleared before the sol turned. acceptable. exceptional, even.');
  }
  st._objDirty = true;
}

function solRollover(st) {
  const finishedSol = solOf(st) - 1;
  st.dayRevHistory.push({ sol: finishedSol, rev: st.todayRev, cost: st.todayCost });
  if (st.dayRevHistory.length > 60) st.dayRevHistory.shift();
  feed(st, 'sys', `SOL ${finishedSol} CLOSED — revenue ${fmtMoney(st.todayRev)}, costs ${fmtMoney(st.todayCost)}, net ${fmtMoney(st.todayRev - st.todayCost)}.`);
  st.todayRev = 0; st.todayCost = 0; st._objAllDone = false;
  for (const s of SHOPS) {
    const sh = st.shops[s.id];
    sh.dayRev.unshift(0); sh.dayRev.length = 3;
    // confidence decays toward 72 baseline
    sh.confidence += (72 - sh.confidence) * 0.12;
  }
  rollObjectives(st);
  warReview(st);
}

// --------------------------- operator actions --------------------
export function actionBoost(st, shopId) {
  const sh = st.shops[shopId]; const s = SHOP_BY_ID[shopId];
  sh.held = false;
  sh.boostUntil = st.simMinutes + 720;
  feed(st, 'sys', `${sh.label || s.name}: BOOST armed — ad budget live for 12h.`);
}
export function actionHold(st, shopId) {
  const sh = st.shops[shopId]; const s = SHOP_BY_ID[shopId];
  sh.held = !sh.held;
  feed(st, 'sys', `${sh.label || s.name}: ${sh.held ? 'HOLD engaged — lane paused.' : 'HOLD released — lane live.'}`);
}
export function actionReroll(st, fid) {
  const win = st.genWindow[fid];
  win.length = 0;
  const n = fid === 'factory1' ? 4 : 4;
  for (let i = 0; i < n; i++) pushGen(st, fid);
  feed(st, 'sys', `${fid === 'factory1' ? 'FACTORY 1' : 'FACTORY 2'}: generation window rerolled.`);
}
export function actionAudit(st, roomId) {
  const shops = SHOPS.filter(s => s.room === roomId);
  for (const s of shops) {
    const sh = st.shops[s.id];
    sh.confidence = Math.min(97, sh.confidence + 2);
  }
  feed(st, 'sys', `${roomId.toUpperCase()}: audit pass complete — listings tightened, confidence up.`);
}

export function issueDirective(st, text) {
  const clean = text.trim();
  if (!clean) return;
  st.directiveLog.unshift({ t: T(st), text: clean });
  if (st.directiveLog.length > 20) st.directiveLog.pop();
  arch(st, 'directive', `OPERATOR DIRECTIVE: ${clean}`);
  feed(st, 'directive', `DIRECTIVE RECEIVED: “${clean}”`);

  const t = clean.toLowerCase();
  let route = null, target = null;
  if (/(candle|gift|etsy|shirt|apparel|floral|pod|portrait|keepsake)/.test(t)) { route = 'factory1'; }
  if (/(thumb|fiverr|gig|youtube|render)/.test(t)) { route = 'factory2'; }
  if (/(blog|affiliate|music|track|proto|software|venture|asset|pack)/.test(t)) { route = 'ventures'; }
  if (route) {
    st.researchFocus = { route, text: clean, setAt: st.simMinutes };
    for (const s of SHOPS.filter(x => x.room === route)) {
      st.shops[s.id].confidence = Math.min(97, st.shops[s.id].confidence + 3);
    }
    target = route.toUpperCase();
  } else {
    st.researchFocus = { route: null, text: clean, setAt: st.simMinutes };
  }
  mission(st, {
    tag: 'DIRECTIVE · ' + (target || 'STATION-WIDE'), kind: 'directive',
    text: `“${clean}” — research deck re-weighted${target ? `, priority lane: ${target}` : ''}.`,
    actions: [],
  });
  chat(st, 'magnus', `MAGNUS: directive logged. ${target ? target + ' takes priority.' : 'All lanes weigh it from this cycle.'} proceed.`);
  chat(st, 'nova', `NOVA: re-weighting watch targets against operator directive. readouts to follow.`);
  st._missionDirty = true;
}

// --------------------------- master tick -------------------------
export function tick(st, dtSim) {
  // dtSim: sim-minutes to advance (already speed-scaled by caller)
  const solBefore = solOf(st);
  st.simMinutes += dtSim;

  // orders (poisson-ish per shop)
  for (const s of SHOPS) {
    const rate = shopRate(st, s); // per sim-hour
    const p = rate * dtSim / 60;
    if (p > 0 && R() < p) landOrder(st, s);
  }

  advancePipelines(st, dtSim);
  maybeInbound(st, dtSim);
  advanceComms(st);
  accrueCosts(st, dtSim);
  advanceCrew(st, dtSim);
  checkObjectives(st);

  // alert expiry
  for (const [room, al] of Object.entries(st.alerts)) {
    if (st.simMinutes > al.until) {
      delete st.alerts[room];
      if (al.kind === 'market') feed(st, 'sys', `${room.toUpperCase()}: market shift faded on its own. Lane recovering.`);
      st._mapDirty = true;
    }
  }
  // pivot auto-execution when ignored
  for (const m of [...st.missions]) {
    if (m.kind === 'pivot' && m.autoAt && st.simMinutes > m.autoAt) {
      feed(st, 'warn', 'WAR ROOM: no operator response — ATLAS executes the pivot on his own authority.');
      executePivot(st, m.id);
    }
  }
  // scheduled random events every ~3-6h
  if (st.simMinutes >= st.nextEventAt) {
    st.nextEventAt = st.simMinutes + rint(170, 380);
    randomEvent(st);
  }
  if (solOf(st) !== solBefore) solRollover(st);
}

// run coarse offline catch-up; returns summary
export function offlineCatchup(st, realMsAway) {
  const simMin = Math.min(1440, (realMsAway / 1000) * 2 * (st.paused ? 0 : 1));
  if (simMin < 4) return null;
  const revBefore = st.revenue.total, ordersBefore = st.ordersTotal;
  let left = simMin;
  while (left > 0) { const step = Math.min(5, left); tick(st, step); left -= step; }
  const dRev = st.revenue.total - revBefore, dOrd = st.ordersTotal - ordersBefore;
  if (dOrd > 0 || dRev > 0.01) {
    const msg = `WHILE YOU WERE AWAY: crew processed ${dOrd} orders for ${fmtMoney(dRev)}.`;
    feed(st, 'ok', msg);
    return msg;
  }
  return null;
}

export function xpProgress(st) {
  // progress toward next level on the same curve used in checkMilestones
  const cur = Math.pow(10, (st.level + 2) / 3);
  const next = Math.pow(10, (st.level + 3) / 3);
  return Math.max(0, Math.min(1, (st.revenue.total - cur) / (next - cur)));
}
