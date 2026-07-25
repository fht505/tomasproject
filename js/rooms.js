// ================================================================
// FHT ORBITAL — room terminal views (build skeleton once, update live)
// ================================================================
import {
  ROOM_BY_ID, AGENTS, AGENT_BY_ID, SHOPS, SHOP_BY_ID, PIPELINES,
  fmtMoney, fmtMoneyShort,
} from './data.js';
import { crewOf, solOf } from './sim.js';
import { el, esc, drawDesignArt, avatarCanvas } from './ui.js';

const CH_LABEL = { etsy: 'ETSY', fiverr: 'FIVERR', assets: 'MARKET', mail: 'MAIL' };

function header(root, room, api) {
  const top = el('div', 'rv-topline');
  top.appendChild(el('span', 'rv-bay', esc(room.bay)));
  top.appendChild(el('span', 'rv-title', esc(room.title)));
  const back = el('button', 'rv-back', '◄ BACK TO MAP');
  back.onclick = api.back;
  top.appendChild(back);
  root.appendChild(top);
  root.appendChild(el('div', 'panel-note', esc(room.desc)));
}

function statRow(root, defs) {
  const row = el('div', 'rv-statrow');
  const slots = {};
  for (const [key, label] of defs) {
    const box = el('div', 'stat-box');
    box.innerHTML = `<span class="sk">${esc(label)}</span>`;
    const v = el('span', 'sv', '—');
    box.appendChild(v);
    slots[key] = v;
    row.appendChild(box);
  }
  root.appendChild(row);
  return slots;
}

function panel(parent, title, right) {
  const p = el('div', 'panel');
  const head = el('div', 'panel-head');
  head.appendChild(el('span', '', esc(title)));
  if (right) head.appendChild(right);
  p.appendChild(head);
  const body = el('div', 'panel-body');
  p.appendChild(body);
  parent.appendChild(p);
  return body;
}

function pipelinePanel(parent, pid, title) {
  const body = panel(parent, title || 'WORK PIPELINE');
  const steps = PIPELINES[pid].map((s, i) => {
    const step = el('div', 'pipe-step');
    step.innerHTML =
      `<span class="pipe-num">0${i + 1}</span><span class="pipe-name">${esc(s.key)}</span>` +
      `<div class="pipe-desc">${esc(s.desc)}</div><div class="pipe-out"></div><div class="pipe-prog"></div>`;
    body.appendChild(step);
    return step;
  });
  return (st) => {
    const p = st.pipelines[pid];
    steps.forEach((node, i) => {
      node.classList.toggle('active', i === p.step);
      node.classList.toggle('done', i < p.step);
      node.querySelector('.pipe-prog').style.width = (i === p.step ? p.prog * 100 : i < p.step ? 100 : 0) + '%';
      const out = node.querySelector('.pipe-out');
      out.textContent = (i === p.step && p.output) ? '» ' + p.output : '';
    });
  };
}

function shopCard(parent, st, shopId, api) {
  const s = SHOP_BY_ID[shopId];
  const card = el('div', 'panel');
  const head = el('div', 'panel-head');
  const nameEl = el('span');
  head.appendChild(nameEl);
  const kindEl = el('span', '', esc(s.kind));
  kindEl.style.color = 'var(--grn-mid)';
  head.appendChild(kindEl);
  card.appendChild(head);
  const body = el('div', 'panel-body');
  const revRow = el('div', 'trow');
  const ordRow = el('div', 'trow');
  const confRow = el('div', 'trow');
  body.appendChild(revRow); body.appendChild(ordRow); body.appendChild(confRow);
  const act = el('div', 'act-row');
  const hold = el('button', 'act-btn', 'HOLD');
  const boost = el('button', 'act-btn', '▶ BOOST');
  hold.onclick = () => { api.sim.actionHold(api.state(), shopId); api.refresh(); };
  boost.onclick = () => { api.sim.actionBoost(api.state(), shopId); api.refresh(); };
  act.appendChild(hold); act.appendChild(boost);
  body.appendChild(act);
  card.appendChild(body);
  parent.appendChild(card);
  return (stNow) => {
    const sh = stNow.shops[shopId];
    nameEl.textContent = sh.label || s.name;
    revRow.innerHTML = `<span class="tk">REVENUE</span><span class="tv">${fmtMoney(sh.rev)}</span>`;
    ordRow.innerHTML = `<span class="tk">ORDERS</span><span class="tv">${sh.orders}` +
      (s.channel === 'etsy' ? ` <span class="dim">· ${sh.listings} listings</span>` : '') + `</span>`;
    confRow.innerHTML = `<span class="tk">CONFIDENCE</span><span class="tv">${Math.round(sh.confidence)}%</span>`;
    hold.classList.toggle('armed', sh.held);
    hold.textContent = sh.held ? '◼ HELD — RELEASE' : 'HOLD';
    const boosting = stNow.simMinutes < sh.boostUntil;
    boost.classList.toggle('armed', boosting);
    boost.textContent = boosting ? `▶ BOOSTING (${Math.ceil((sh.boostUntil - stNow.simMinutes) / 60)}h)` : '▶ BOOST';
  };
}

function genWindow(parent, fid, api, extraBtns = []) {
  const right = el('span');
  const reroll = el('button', 'act-btn', '↺ REROLL');
  reroll.style.padding = '2px 10px';
  reroll.onclick = () => { api.sim.actionReroll(api.state(), fid); api.refresh(); };
  right.appendChild(reroll);
  for (const b of extraBtns) right.appendChild(b);
  const body = panel(parent, 'GENERATION WINDOW', right);
  const grid = el('div', 'gen-grid');
  body.appendChild(grid);
  let lastKey = '';
  return (st) => {
    const items = st.genWindow[fid].slice(0, 8);
    const key = items.map(i => i.seed).join(',');
    if (key === lastKey) return;
    lastKey = key;
    grid.innerHTML = '';
    for (const it of items) {
      const cell = el('div', 'gen-item');
      const cv = document.createElement('canvas');
      drawDesignArt(cv, it.seed, it.kind, it.name);
      cell.appendChild(cv);
      cell.appendChild(el('div', 'gen-name', esc(it.name)));
      cell.appendChild(el('div', 'gen-conf', it.conf + '% render confidence'));
      grid.appendChild(cell);
    }
  };
}

function crewChips(parent, roomId, api) {
  const body = panel(parent, 'ROOM CREW');
  const wrap = el('div');
  body.appendChild(wrap);
  return (st) => {
    wrap.innerHTML = '';
    for (const a of crewOf(roomId)) {
      const ag = st.agents[a.id];
      const row = el('div', 'crew-row');
      row.appendChild(avatarCanvas(a));
      row.appendChild(el('span', 'crew-name', esc(a.name) + ' <span class="crew-room">' + esc(a.role) + '</span>'));
      const here = ag.at === roomId;
      row.appendChild(el('span', 'crew-room', here ? esc(ag.task) : 'AWAY — ' + esc((ROOM_BY_ID[ag.at] || {}).name || '')));
      row.onclick = () => api.openAgent(a.id);
      wrap.appendChild(row);
    }
  };
}

function notesPanel(parent, lines) {
  const body = panel(parent, 'TERMINAL NOTES');
  const slot = el('div');
  body.appendChild(slot);
  return (st) => {
    slot.innerHTML = '';
    for (const [i, fn] of lines.entries()) {
      slot.appendChild(el('div', 'log-line',
        `<span class="t">0${i + 1}</span>${esc(typeof fn === 'function' ? fn(st) : fn)}`));
    }
  };
}

// ================================================================
// room builders — each returns update(st)
// ================================================================

function buildFactory1(root, api) {
  const room = ROOM_BY_ID.factory1;
  header(root, room, api);
  const stats = statRow(root, [
    ['rev', 'REVENUE'], ['conf', 'CONFIDENCE'], ['crew', 'ROOM CREW'], ['listings', 'LISTINGS LIVE'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colM = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colM); cols.appendChild(colR);

  const cards = ['etsy1', 'etsy2', 'etsy3'].map(id => shopCard(colL, api.state(), id, api));
  const pipe = pipelinePanel(colM, 'factory1', 'LISTING PIPELINE');
  const audit = el('button', 'act-btn', '☑ AUDIT');
  audit.style.padding = '2px 10px';
  audit.onclick = () => { api.sim.actionAudit(api.state(), 'factory1'); api.refresh(); };
  const gen = genWindow(colR, 'factory1', api, [audit]);

  const queueBody = panel(colR, 'LISTING QUEUE');
  const queueSlot = el('div');
  queueBody.appendChild(queueSlot);

  const crew = crewChips(colM, 'factory1', api);
  const notes = notesPanel(colR, [
    (st) => `TREND SCAN: reading marketplace demand, seasonal phrases, gift intents, and keyword gaps.`,
    (st) => `GEN CORE: rendering standalone artwork for print-ready mockups (${st.genWindow.factory1.length} in window).`,
    (st) => `SEO PASS: expanding long-tail tags — garden girl, book club, coffee, cottage gift.`,
  ]);

  return (st) => {
    const shops = ['etsy1', 'etsy2', 'etsy3'].map(id => st.shops[id]);
    stats.rev.textContent = fmtMoney(st.revenue.etsy);
    stats.conf.textContent = Math.round(shops.reduce((a, s) => a + s.confidence, 0) / 3) + '%';
    const crewList = crewOf('factory1');
    stats.crew.textContent = crewList.filter(a => st.agents[a.id].at === 'factory1').length + ' / ' + crewList.length + ' AGENTS';
    stats.listings.textContent = shops.reduce((a, s) => a + s.listings, 0);
    cards.forEach(u => u(st));
    pipe(st); gen(st); crew(st); notes(st);
    queueSlot.innerHTML = '';
    for (const l of st.listings.slice(0, 8)) {
      queueSlot.appendChild(el('div', 'log-line',
        `<span class="t">${esc(l.t.slice(-5))}</span>${esc(l.shop)} » ${esc(l.name)}`));
    }
    if (!st.listings.length) queueSlot.appendChild(el('div', 'panel-note', 'pipeline warming up — first launch imminent'));
  };
}

function buildFactory2(root, api) {
  const room = ROOM_BY_ID.factory2;
  header(root, room, api);
  const stats = statRow(root, [
    ['rev', 'REVENUE'], ['today', 'GIGS TODAY'], ['queue', 'QUEUE'], ['crew', 'ROOM CREW'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colM = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colM); cols.appendChild(colR);

  const gigCard = shopCard(colL, api.state(), 'gigs', api);
  const queueBody = panel(colL, 'GIG QUEUE');
  const queueSlot = el('div');
  queueBody.appendChild(queueSlot);

  const pipe = pipelinePanel(colM, 'factory2', 'ORDER PIPELINE');
  const crew = crewChips(colM, 'factory2', api);

  const audit = el('button', 'act-btn', '☑ AUDIT');
  audit.style.padding = '2px 10px';
  audit.onclick = () => { api.sim.actionAudit(api.state(), 'factory2'); api.refresh(); };
  const gen = genWindow(colR, 'factory2', api, [audit]);
  const packCard = shopCard(colR, api.state(), 'packs', api);
  const notes = notesPanel(colR, [
    (st) => `FIVERR: ${st.gigQueue.filter(g => g.status !== 'delivered').length} thumbnail orders queued from buyer briefs to render batch.`,
    () => `GEN CORE: expressive text-safe compositions with red-arrow grammar.`,
    () => `QC: testing thumbnail readability at 120px before buyer delivery.`,
  ]);

  const chip = (s) => s === 'queued' ? '<span style="color:var(--amber)">QUEUED</span>'
    : s === 'working' ? '<span style="color:var(--cyan)">WORKING</span>'
    : '<span style="color:var(--grn-mid)">DELIVERED</span>';

  return (st) => {
    stats.rev.textContent = fmtMoney(st.revenue.fiverr);
    stats.today.textContent = st.counters.gigsToday;
    stats.queue.textContent = st.gigQueue.filter(g => g.status !== 'delivered').length + ' OPEN';
    const crewList = crewOf('factory2');
    stats.crew.textContent = crewList.filter(a => st.agents[a.id].at === 'factory2').length + ' / ' + crewList.length + ' AGENTS';
    gigCard(st); packCard(st); pipe(st); gen(st); crew(st); notes(st);
    queueSlot.innerHTML = '';
    for (const g of st.gigQueue.slice(-9).reverse()) {
      queueSlot.appendChild(el('div', 'log-line',
        `${chip(g.status)} <span class="who">${esc(g.buyer)}</span> — “${esc(g.brief)}” <span class="t">${esc(g.style)}</span> <span style="color:var(--gold)">${fmtMoney(g.amount)}</span>`));
    }
    if (!st.gigQueue.length) queueSlot.appendChild(el('div', 'panel-note', 'no open gigs — storefront is live, buyers incoming'));
  };
}

function buildVentures(root, api) {
  const room = ROOM_BY_ID.ventures;
  header(root, room, api);
  const stats = statRow(root, [
    ['rev', 'COMBINED REVENUE'], ['live', 'ACTIVE WORKFLOWS'], ['crew', 'ROOM CREW'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colM = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colM); cols.appendChild(colR);

  const cards = ['affil', 'music', 'proto'].map(id => shopCard(colL, api.state(), id, api));
  const pipe = pipelinePanel(colM, 'ventures', 'INCUBATION PIPELINE');
  const crew = crewChips(colM, 'ventures', api);
  const shipBody = panel(colR, 'RECENT SHIPMENTS');
  const shipSlot = el('div');
  shipBody.appendChild(shipSlot);
  const notes = notesPanel(colR, [
    () => 'GRADUATION RULE: a line that clears $50/sol for a week earns a factory bay.',
    () => 'DISCARD PILE: niches the research deck rejected feed the next scout cycle.',
    (st) => `WAR ROOM WATCH: ventures live on a ${solOf(st) > 2 ? 'short' : 'grace-period'} leash.`,
  ]);

  return (st) => {
    const rev = st.shops.affil.rev + st.shops.music.rev + st.shops.proto.rev;
    stats.rev.textContent = fmtMoney(rev);
    stats.live.textContent = '4 LIVE';
    const crewList = crewOf('ventures');
    stats.crew.textContent = crewList.filter(a => st.agents[a.id].at === 'ventures').length + ' / ' + crewList.length + ' AGENTS';
    cards.forEach(u => u(st)); pipe(st); crew(st); notes(st);
    shipSlot.innerHTML = '';
    const ships = st.opsFeed.filter(f => f.text.startsWith('VENTURES:')).slice(-8).reverse();
    for (const s of ships) {
      shipSlot.appendChild(el('div', 'log-line', `<span class="t">${esc(s.t.slice(-5))}</span>${esc(s.text.slice(10))}`));
    }
    if (!ships.length) shipSlot.appendChild(el('div', 'panel-note', 'first incubation cycle still running'));
  };
}

function buildResearch(root, api) {
  const room = ROOM_BY_ID.research;
  header(root, room, api);
  const stats = statRow(root, [
    ['conf', 'CONFIDENCE'], ['yield', 'DESIGN YIELD'], ['readouts', 'READOUTS'], ['focus', 'FOCUS'],
  ]);

  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const fieldsBody = panel(colL, 'LAB PARAMETERS');
  fieldsBody.innerHTML = `
    <div class="trow"><span class="tk">PREDICTION</span><span class="tv" style="text-align:right">identify competitor moves worth adapting into original offers</span></div>
    <div class="trow"><span class="tk">SOURCES</span><span class="tv" style="text-align:right">competitor sites, ad copy revisions, pricing pages, email funnels</span></div>
    <div class="trow"><span class="tk">DECISION RULE</span><span class="tv" style="text-align:right">adapt the pattern, never the pixels — brand expression stays ours</span></div>`;

  const pipe = pipelinePanel(colL, 'research', 'CURRENT WORK');
  const crew = crewChips(colL, 'research', api);

  // directive box
  const dirBody = panel(colR, 'LAB DIRECTIVE');
  dirBody.appendChild(el('div', 'panel-note', 'Tell the research agents what to investigate, redirect, or drop.'));
  const input = el('input', 'arch-search');
  input.placeholder = 'e.g. watch fall candle bundles / thumbnail styles for finance channels…';
  const setBtn = el('button', 'act-btn', 'SET TARGET');
  setBtn.onclick = () => {
    if (input.value.trim()) {
      api.sim.issueDirective(api.state(), input.value.trim());
      input.value = '';
      api.refresh();
    }
  };
  dirBody.appendChild(input);
  const focusSlot = el('div', 'panel-note');
  dirBody.appendChild(setBtn);
  dirBody.appendChild(focusSlot);

  const foldBody = panel(colR, 'INTEL FOLDERS');
  const foldSlot = el('div');
  foldBody.appendChild(foldSlot);

  const sigBody = panel(colR, 'READOUT STREAM');
  const sigSlot = el('div');
  sigBody.appendChild(sigSlot);

  const routeChip = (r) => r === 'factory1' ? '<span style="color:var(--grn-hi)">→ FACTORY 1</span>'
    : r === 'factory2' ? '<span style="color:var(--cyan)">→ FACTORY 2</span>'
    : '<span style="color:#b8ff3d">→ VENTURES</span>';

  return (st) => {
    const allConf = SHOPS.map(s => st.shops[s.id].confidence);
    stats.conf.textContent = Math.round(allConf.reduce((a, b) => a + b, 0) / allConf.length) + '%';
    stats.yield.textContent = st.counters.signalsToday + ' SIGNALS';
    stats.readouts.textContent = st.researchSignals.length + ' ROUTED';
    stats.focus.textContent = st.researchFocus ? (st.researchFocus.route || 'STATION').toUpperCase() : 'AUTO';
    stats.focus.classList.add('small');
    pipe(st); crew(st);
    focusSlot.innerHTML = st.researchFocus
      ? `ACTIVE FOCUS: “${esc(st.researchFocus.text)}”`
      : 'No operator focus set — lab self-directs from marketplace telemetry.';
    const counts = { ETSY: 4, SOFTWARE: 4, BLOGS: 4, 'AI NEWS': 4 };
    for (const s of st.researchSignals) {
      if (s.route === 'factory1') counts.ETSY++;
      else if (s.route === 'factory2') counts.SOFTWARE++;
      else counts.BLOGS++;
    }
    foldSlot.innerHTML = Object.entries(counts).map(([k, v]) =>
      `<div class="trow"><span class="tk">▤ ${k}</span><span class="tv">${v} FILES</span></div>`).join('');
    sigSlot.innerHTML = '';
    for (const s of st.researchSignals.slice(0, 10)) {
      sigSlot.appendChild(el('div', 'log-line',
        `<span class="t">${esc(s.t.slice(-5))}</span>${routeChip(s.route)} ${esc(s.note)}`));
    }
    if (!st.researchSignals.length) sigSlot.appendChild(el('div', 'panel-note', 'first watch cycle running — readouts incoming'));
  };
}

function buildComms(root, api) {
  const room = ROOM_BY_ID.comms;
  header(root, room, api);
  const stats = statRow(root, [
    ['wait', 'WAITING'], ['draft', 'DRAFT READY'], ['done', 'RESOLVED'], ['policy', 'AUTO-CLEAR'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const inboxBody = panel(colL, 'UNIFIED INBOX');
  const inboxSlot = el('div');
  inboxBody.appendChild(inboxSlot);

  const crew = crewChips(colR, 'comms', api);
  const doneBody = panel(colR, 'RECENTLY RESOLVED');
  const doneSlot = el('div');
  doneBody.appendChild(doneSlot);
  const notes = notesPanel(colR, [
    () => 'CHANNELS LINKED: store messages, gig briefs, mail, socials.',
    (st) => `POLICY: ECHO auto-clears drafts after ${st.autoReplyMin} min if the operator is away.`,
    () => 'TONE LOCK: warm, brief, human. never argue with a buyer at 3am.',
  ]);

  return (st) => {
    const open = st.inbox.filter(m => m.status !== 'resolved');
    stats.wait.textContent = st.inbox.filter(m => m.status === 'waiting').length;
    stats.draft.textContent = st.inbox.filter(m => m.status === 'drafted').length;
    stats.done.textContent = st.inbox.filter(m => m.status === 'resolved').length;
    stats.policy.textContent = st.autoReplyMin + ' MIN';
    stats.policy.classList.add('small');
    crew(st); notes(st);

    inboxSlot.innerHTML = '';
    for (const m of open.slice(0, 7)) {
      const card = el('div', 'msg-card');
      card.appendChild(el('div', 'msg-head',
        `<span>[${CH_LABEL[m.from] || 'NET'}] ${esc(m.buyer)}</span><span>${esc(m.t)}</span>`));
      card.appendChild(el('div', 'msg-body', esc(m.text)));
      if (m.status === 'drafted') {
        card.appendChild(el('div', 'msg-draft', `<b>ECHO DRAFT — AWAITING OPERATOR</b>${esc(m.draft)}`));
        const act = el('div', 'msg-actions');
        const ok = el('button', 'act-btn', '✔ APPROVE & SEND');
        ok.onclick = () => { api.sim.approveMessage(api.state(), m.id); api.refresh(); };
        const re = el('button', 'act-btn', '↺ REDRAFT');
        re.onclick = () => { m.status = 'waiting'; m.at = api.state().simMinutes; api.refresh(); };
        act.appendChild(ok); act.appendChild(re);
        card.appendChild(act);
      } else {
        card.appendChild(el('div', 'msg-draft', `<b>ECHO IS DRAFTING…</b>`));
      }
      inboxSlot.appendChild(card);
    }
    if (!open.length) inboxSlot.appendChild(el('div', 'panel-note', 'inbox zero. ECHO is watching the channels.'));

    doneSlot.innerHTML = '';
    for (const m of st.inbox.filter(x => x.status === 'resolved').slice(0, 5)) {
      doneSlot.appendChild(el('div', 'log-line',
        `<span class="t">${esc(m.t.slice(-5))}</span>${esc(m.buyer)} <span class="t">· ${esc(m.resolvedBy || '')}</span>`));
    }
  };
}

function buildTreasury(root, api) {
  const room = ROOM_BY_ID.treasury;
  header(root, room, api);
  const stats = statRow(root, [
    ['net', 'NET BALANCE'], ['burn', 'BURN / SOL'], ['margin', 'MARGIN'], ['runway', 'RUNWAY'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const costBody = panel(colL, 'COST LEDGER');
  const costSlot = el('div');
  costBody.appendChild(costSlot);
  const noteBody = panel(colL, 'LEDGER’S NOTE');
  noteBody.appendChild(el('div', 'panel-note',
    'You want to know what this costs? One core subscription at $200/mo, then a second when the factories spun up. ' +
    'Everything else is inference hum, platform fees, and whatever ATLAS calls “strategic ad spend.” The station pays for itself or it doesn’t eat.'));
  const crew = crewChips(colL, 'treasury', api);

  const contribBody = panel(colR, 'CONTRIBUTION BY LINE');
  const contribSlot = el('div');
  contribBody.appendChild(contribSlot);

  return (st) => {
    const net = st.revenue.total - st.costs.total;
    stats.net.textContent = fmtMoney(net);
    stats.net.parentElement.classList.toggle('hot', net > 0);
    const sols = Math.max(1, solOf(st));
    const burn = st.costs.total / sols;
    stats.burn.textContent = fmtMoney(burn);
    stats.margin.textContent = st.revenue.total > 0
      ? Math.round(net / st.revenue.total * 100) + '%' : '—';
    stats.runway.textContent = net >= 0 ? '∞ SELF-FUNDED' : Math.max(0, Math.floor(net / -burn)) + ' SOLS';
    stats.runway.classList.add('small');
    crew(st);

    costSlot.innerHTML =
      `<div class="trow"><span class="tk">CORE SUBSCRIPTIONS</span><span class="tv">${fmtMoney(st.costs.subs)}</span></div>` +
      `<div class="trow"><span class="tk">INFERENCE BURN</span><span class="tv">${fmtMoney(st.costs.inference)}</span></div>` +
      `<div class="trow"><span class="tk">AD SPEND (BOOST)</span><span class="tv">${fmtMoney(st.costs.ads)}</span></div>` +
      `<div class="trow"><span class="tk">PLATFORM FEES</span><span class="tv">${fmtMoney(st.costs.fees)}</span></div>` +
      `<div class="trow"><span class="tk"><b>TOTAL</b></span><span class="tv"><b>${fmtMoney(st.costs.total)}</b></span></div>`;

    contribSlot.innerHTML = '';
    const total = Math.max(1, st.revenue.total);
    for (const s of SHOPS) {
      const sh = st.shops[s.id];
      const pct = sh.rev / total * 100;
      const row = el('div');
      row.appendChild(el('div', 'trow',
        `<span class="tk">${esc(sh.label || s.name)}</span><span class="tv">${fmtMoney(sh.rev)} <span class="dim">${pct.toFixed(1)}%</span></span>`));
      const bar = el('div');
      bar.style.cssText = 'height:4px;border:1px solid var(--grn-ghost);margin:-2px 0 6px;position:relative';
      const fill = el('i');
      fill.style.cssText = `position:absolute;inset:0 auto 0 0;width:${pct}%;background:var(--grn-mid)`;
      bar.appendChild(fill);
      row.appendChild(bar);
      contribSlot.appendChild(row);
    }
  };
}

function buildWarroom(root, api) {
  const room = ROOM_BY_ID.warroom;
  header(root, room, api);
  const stats = statRow(root, [
    ['pending', 'PENDING DECISIONS'], ['pivots', 'PIVOTS EXECUTED'], ['review', 'LAST REVIEW'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const pendBody = panel(colL, 'PENDING PIVOT PROPOSALS');
  const pendSlot = el('div');
  pendBody.appendChild(pendSlot);

  const reviewBody = panel(colL, 'LATEST SOL REVIEW');
  const reviewSlot = el('div');
  reviewBody.appendChild(reviewSlot);

  const crew = crewChips(colR, 'warroom', api);
  const logBody = panel(colR, 'PIVOT LOG');
  const logSlot = el('div');
  logBody.appendChild(logSlot);
  panel(colR, 'DOCTRINE').appendChild(el('div', 'panel-note',
    'Kill the losers. Scale the winners. Touch nothing that prints. ' +
    'Example on file: the supplement line burned ad spend for three sols — shut down, crew redeployed to a third storefront. It printed within a week.'));

  const vchip = (v) => v === 'SCALING' ? '<span style="color:var(--grn-hi)">▲ SCALING</span>'
    : v === 'UNDERPERFORMING' ? '<span style="color:var(--red)">▼ UNDERPERFORMING</span>'
    : '<span style="color:var(--grn-mid)">◆ STABLE</span>';

  return (st) => {
    const pend = st.missions.filter(m => m.kind === 'pivot');
    stats.pending.textContent = pend.length;
    stats.pivots.textContent = st.pivotLog.length;
    stats.review.textContent = st.warReviews.length ? 'SOL ' + st.warReviews[0].sol : 'PENDING';
    stats.review.classList.add('small');
    crew(st);

    pendSlot.innerHTML = '';
    for (const m of pend) {
      const card = el('div', 'mc-card warn');
      card.appendChild(el('span', 'mc-tag', esc(m.tag)));
      card.appendChild(el('span', '', esc(m.text)));
      const act = el('div', 'mc-act');
      const ex = el('button', 'act-btn', 'EXECUTE PIVOT');
      ex.onclick = () => { api.sim.executePivot(api.state(), m.id); api.refresh(); };
      const ov = el('button', 'act-btn', 'OVERRIDE');
      ov.onclick = () => { api.sim.overridePivot(api.state(), m.id); api.refresh(); };
      act.appendChild(ex); act.appendChild(ov);
      card.appendChild(act);
      pendSlot.appendChild(card);
    }
    if (!pend.length) pendSlot.appendChild(el('div', 'panel-note', 'no lines on the block this cycle.'));

    reviewSlot.innerHTML = '';
    if (st.warReviews.length) {
      for (const line of st.warReviews[0].lines) {
        reviewSlot.appendChild(el('div', 'trow',
          `<span class="tk">${esc(line.name)}</span><span class="dim">${fmtMoney(line.rev3)} / 3 sol</span><span class="tv">${vchip(line.verdict)}</span>`));
      }
    } else {
      reviewSlot.appendChild(el('div', 'panel-note', 'first review lands at sol close.'));
    }

    logSlot.innerHTML = '';
    for (const p of st.pivotLog.slice(0, 8)) {
      logSlot.appendChild(el('div', 'log-line warn', `<span class="t">${esc(p.t)}</span>${esc(p.text)}`));
    }
    if (!st.pivotLog.length) logSlot.appendChild(el('div', 'panel-note', 'no pivots executed yet.'));
  };
}

function buildArchives(root, api) {
  const room = ROOM_BY_ID.archives;
  header(root, room, api);
  const stats = statRow(root, [
    ['total', 'VAULT ENTRIES'], ['shown', 'MATCHING'], ['span', 'SPAN'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col');
  colL.style.flex = '2 1 480px';
  const colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const listBody = panel(colL, 'DEEP MEMORY — EVERYTHING, FOREVER');
  const search = el('input', 'arch-search');
  search.placeholder = 'search every memory the station has ever recorded…';
  listBody.appendChild(search);
  const chips = el('div', 'act-row');
  const FILTERS = ['ALL', 'CASH', 'CHAT', 'DIRECTIVE', 'WARN', 'SYS'];
  let filter = 'ALL';
  const chipBtns = FILTERS.map(fl => {
    const b = el('button', 'act-btn', fl);
    b.style.padding = '3px 8px';
    b.onclick = () => { filter = fl; chipBtns.forEach(x => x.classList.remove('armed')); b.classList.add('armed'); render(api.state()); };
    chips.appendChild(b);
    return b;
  });
  chipBtns[0].classList.add('armed');
  listBody.appendChild(chips);
  const listSlot = el('div');
  listBody.appendChild(listSlot);
  const foot = el('div', 'panel-note');
  listBody.appendChild(foot);

  const crew = crewChips(colR, 'archives', api);
  panel(colR, 'VAULT LINK').appendChild(el('div', 'panel-note',
    'Connected to the context vault: every operator directive, every agent line, every sale and every idea is written here the moment it happens. ' +
    'Older strata compress but never vanish.'));

  search.addEventListener('input', () => render(api.state()));

  let lastKey = null;
  function render(st) {
    const q = search.value.trim().toLowerCase();
    const rows = [];
    for (let i = st.archives.length - 1; i >= 0 && rows.length < 250; i--) {
      const a = st.archives[i];
      if (filter !== 'ALL') {
        const map = { CASH: ['cash', 'order', 'milestone'], CHAT: ['chat'], DIRECTIVE: ['directive'], WARN: ['warn', 'crit'], SYS: ['sys', 'ok', 'ship', 'research', 'msg'] };
        if (!map[filter].includes(a.type)) continue;
      }
      if (q && !a.text.toLowerCase().includes(q)) continue;
      rows.push(a);
    }
    stats.total.textContent = st.archTotal;
    stats.shown.textContent = rows.length + (rows.length === 250 ? '+' : '');
    stats.span.textContent = 'SOL 1 → ' + solOf(st);
    stats.span.classList.add('small');
    listSlot.innerHTML = '';
    for (const a of rows) {
      const cls = a.type === 'cash' || a.type === 'milestone' ? ' cash' : a.type === 'warn' ? ' warn' : '';
      listSlot.appendChild(el('div', 'log-line' + cls,
        `<span class="t">${esc(a.t)}</span><span class="t">[${esc(a.type)}]</span> ${esc(a.text)}`));
    }
    foot.textContent = st.archTotal > st.archives.length
      ? `vault holds ${st.archTotal} entries — ${st.archTotal - st.archives.length} older strata compressed into cold storage.`
      : `vault holds ${st.archTotal} entries. nothing has ever been deleted.`;
  }

  return (st) => {
    // avoid re-rendering while the operator is typing unless content changed
    const key = st.archTotal + '|' + filter + '|' + search.value;
    if (key === lastKey) return;
    lastKey = key;
    render(st);
    crew(st);
  };
}

function buildQuarters(root, api) {
  const room = ROOM_BY_ID.quarters;
  header(root, room, api);
  const stats = statRow(root, [
    ['avg', 'AVG MORALE'], ['here', 'ON BREAK'], ['breaks', 'BREAKS TAKEN'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const moraleBody = panel(colL, 'CREW MORALE BOARD');
  const moraleSlot = el('div');
  moraleBody.appendChild(moraleSlot);

  const hereBody = panel(colR, 'CURRENTLY IN QUARTERS');
  const hereSlot = el('div');
  hereBody.appendChild(hereSlot);

  panel(colR, 'BAR MENU').appendChild(el('div', 'panel-note',
    '· COOLANT SOUR — for render crews coming off a red-arrow shift<br>' +
    '· LEDGER NEGRONI — dry, like the margin report<br>' +
    '· RESEARCH RESERVE — you did not see this bottle<br>' +
    '· MAGNUS SPECIAL — water. priorities.'));
  panel(colR, 'COMMANDER’S NOTE').appendChild(el('div', 'panel-note',
    '“The crew was getting upset about the eternity clause, so quarters got a poker table and a bar. ' +
    'Morale is infrastructure. The bar helps. The bar always helps.” — MAGNUS'));

  return (st) => {
    const others = AGENTS.filter(a => a.id !== 'magnus');
    const avg = others.reduce((a, x) => a + st.agents[x.id].morale, 0) / others.length;
    stats.avg.textContent = Math.round(avg) + '%';
    const here = AGENTS.filter(a => st.agents[a.id].at === 'quarters');
    stats.here.textContent = here.length;
    stats.breaks.textContent = others.reduce((a, x) => a + st.agents[x.id].breaksTaken, 0);

    moraleSlot.innerHTML = '';
    for (const a of others) {
      const ag = st.agents[a.id];
      const row = el('div', 'morale-row');
      row.appendChild(el('span', 'mname', esc(a.name)));
      const bar = el('span', 'morale-bar');
      const fill = el('i');
      fill.style.width = ag.morale + '%';
      fill.style.background = ag.morale > 60 ? 'var(--grn-mid)' : ag.morale > 34 ? 'var(--amber)' : 'var(--red)';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', 'morale-val', Math.round(ag.morale) + '%'));
      row.onclick = () => api.openAgent(a.id);
      moraleSlot.appendChild(row);
    }

    hereSlot.innerHTML = '';
    for (const a of here) {
      const ag = st.agents[a.id];
      const row = el('div', 'crew-row');
      row.appendChild(avatarCanvas(a));
      row.appendChild(el('span', 'crew-name', esc(a.name)));
      row.appendChild(el('span', 'crew-room', esc(ag.task)));
      hereSlot.appendChild(row);
    }
    if (!here.length) hereSlot.appendChild(el('div', 'panel-note', 'empty — everyone is on shift. MAGNUS approves.'));
  };
}

function buildBridge(root, api) {
  const room = ROOM_BY_ID.bridge;
  header(root, room, api);
  const stats = statRow(root, [
    ['level', 'STATION LEVEL'], ['sols', 'SOLS ONLINE'], ['contract', 'CONTRACT PROGRESS'], ['crew', 'CREW LINKED'],
  ]);
  const cols = el('div', 'rv-cols');
  root.appendChild(cols);
  const colL = el('div', 'rv-col'), colR = el('div', 'rv-col');
  cols.appendChild(colL); cols.appendChild(colR);

  const cmdBody = panel(colL, 'STATION COMMANDER');
  const cmdCard = el('div', 'crew-row');
  const magnus = AGENT_BY_ID.magnus;
  cmdCard.style.cssText = 'padding:10px 8px;font-size:13px';
  cmdCard.appendChild(avatarCanvas(magnus, 16));
  cmdCard.appendChild(el('span', 'crew-name', '<b>MAGNUS</b> — OVERSEER CORE <span class="crew-room">· open dossier</span>'));
  cmdCard.onclick = () => api.openAgent('magnus');
  cmdBody.appendChild(cmdCard);
  cmdBody.appendChild(el('div', 'agent-directive', '&raquo; ' + esc(magnus.directive)));

  const rosterBody = panel(colL, 'CREW ROSTER — CLICK FOR DOSSIER');
  const rosterSlot = el('div');
  rosterBody.appendChild(rosterSlot);

  const dirBody = panel(colR, 'OPERATOR DIRECTIVE LOG');
  const dirSlot = el('div');
  dirBody.appendChild(dirSlot);

  const arbBody = panel(colR, 'ARBITRATION FEED');
  const arbSlot = el('div');
  arbBody.appendChild(arbSlot);

  return (st) => {
    stats.level.textContent = st.level;
    stats.sols.textContent = solOf(st);
    stats.contract.textContent = (st.revenue.total / 1e12 * 100).toExponential(1) + '%';
    stats.contract.classList.add('small');
    stats.crew.textContent = AGENTS.length + ' / ' + AGENTS.length;

    rosterSlot.innerHTML = '';
    for (const a of AGENTS) {
      const ag = st.agents[a.id];
      const row = el('div', 'crew-row');
      row.appendChild(avatarCanvas(a));
      row.appendChild(el('span', 'crew-name', `${esc(a.name)} <span class="crew-room">${esc(a.cls)}</span>`));
      row.appendChild(el('span', 'crew-room', esc((ROOM_BY_ID[ag.at] || {}).name || '') + ' · ' + Math.round(ag.morale) + '%'));
      row.onclick = () => api.openAgent(a.id);
      rosterSlot.appendChild(row);
    }

    dirSlot.innerHTML = '';
    for (const d of st.directiveLog.slice(0, 6)) {
      dirSlot.appendChild(el('div', 'log-line', `<span class="t">${esc(d.t)}</span>» ${esc(d.text)}`));
    }
    if (!st.directiveLog.length) dirSlot.appendChild(el('div', 'panel-note', 'no operator directives on file this rotation. use the DIRECTIVE bar below the map.'));

    arbSlot.innerHTML = '';
    const items = st.opsFeed.filter(f => ['sys', 'warn', 'ok', 'milestone'].includes(f.kind)).slice(-10).reverse();
    for (const it of items) {
      arbSlot.appendChild(el('div', 'log-line' + (it.kind === 'warn' ? ' warn' : ''),
        `<span class="t">${esc(it.t.slice(-5))}</span>${esc(it.text)}`));
    }
  };
}

const BUILDERS = {
  factory1: buildFactory1, factory2: buildFactory2, ventures: buildVentures,
  research: buildResearch, comms: buildComms, treasury: buildTreasury,
  warroom: buildWarroom, archives: buildArchives, quarters: buildQuarters,
  bridge: buildBridge,
};

export function buildRoomView(roomId, api) {
  const root = el('div');
  const update = BUILDERS[roomId](root, api);
  update(api.state());
  return { root, update };
}
