// ================================================================
// FHT ORBITAL — canvas station map: rooms, corridors, crew sprites
// World units are tiles; TILE px at zoom 1.
// ================================================================
import { ROOMS, ROOM_BY_ID, SPINES, AGENTS, AGENT_BY_ID } from './data.js';
import { mulberry32 } from './sim.js';

const TILE = 10;
const WORLD_W = 200, WORLD_H = 132;

// --------------------------- graph -------------------------------
// nodes: keyed string -> {x, y}; edges: adjacency list
const nodes = new Map();
const adj = new Map();

function nkey(x, y) { return x + ',' + y; }
function addNode(x, y) {
  const k = nkey(x, y);
  if (!nodes.has(k)) { nodes.set(k, { x, y }); adj.set(k, new Set()); }
  return k;
}
function addEdge(a, b) { adj.get(a).add(b); adj.get(b).add(a); }

function buildGraph() {
  const northJ = [], southJ = [];
  for (const r of ROOMS) {
    for (const d of r.doors) {
      const dk = addNode(d.x, d.y);
      const jk = addNode(d.jx, d.jy);
      addEdge(dk, jk);
      d._dk = dk; d._jk = jk;
      if (d.jy === SPINES.north.y) northJ.push(d.jx);
      if (d.jy === SPINES.south.y) southJ.push(d.jx);
    }
    // interior anchor + door connections
    const c = addNode(r.rect.x + Math.floor(r.rect.w / 2), r.rect.y + Math.floor(r.rect.h / 2));
    r._ck = c;
    for (const d of r.doors) addEdge(d._dk, c);
  }
  // spine runs
  for (const [spine, list] of [[SPINES.north, northJ], [SPINES.south, southJ]]) {
    const xs = [...new Set([spine.x0, spine.x1, ...list])].sort((a, b) => a - b);
    let prev = null;
    for (const x of xs) {
      const k = addNode(x, spine.y);
      if (prev) addEdge(prev, k);
      prev = k;
    }
  }
}
buildGraph();

function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const prev = new Map([[fromKey, null]]);
  const q = [fromKey];
  while (q.length) {
    const k = q.shift();
    if (k === toKey) break;
    for (const n of adj.get(k) || []) {
      if (!prev.has(n)) { prev.set(n, k); q.push(n); }
    }
  }
  if (!prev.has(toKey)) return null;
  const path = [];
  for (let k = toKey; k; k = prev.get(k)) path.push(k);
  return path.reverse();
}

function nearestDoor(room, x, y) {
  let best = room.doors[0], bd = Infinity;
  for (const d of room.doors) {
    const dd = Math.abs(d.x - x) + Math.abs(d.y - y);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

function interiorPoint(room, rng = Math.random) {
  return {
    x: room.rect.x + 2 + rng() * (room.rect.w - 4),
    y: room.rect.y + 3 + rng() * (room.rect.h - 5),
  };
}

// route between rooms as a list of world points
function routePoints(fromRoom, fromPos, toRoomId) {
  const toRoom = ROOM_BY_ID[toRoomId];
  const target = interiorPoint(toRoom);
  if (fromRoom === toRoomId) return [target];
  const src = ROOM_BY_ID[fromRoom];
  const d1 = nearestDoor(src, fromPos.x, fromPos.y);
  const d2 = nearestDoor(toRoom, target.x, target.y);
  const keyPath = bfsPath(d1._dk, d2._dk);
  if (!keyPath) return [target];
  const pts = keyPath.map(k => nodes.get(k));
  return [...pts, target];
}

// --------------------------- world bake --------------------------
let worldCanvas = null;

function bakeWorld() {
  worldCanvas = document.createElement('canvas');
  worldCanvas.width = WORLD_W * TILE;
  worldCanvas.height = WORLD_H * TILE;
  const g = worldCanvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  // space
  g.fillStyle = '#010604';
  g.fillRect(0, 0, worldCanvas.width, worldCanvas.height);
  const rng = mulberry32(777);
  for (let i = 0; i < 640; i++) {
    const x = rng() * worldCanvas.width, y = rng() * worldCanvas.height;
    const b = rng();
    g.fillStyle = b > 0.92 ? '#9fffce' : b > 0.6 ? '#3f8f63' : '#1c4030';
    g.fillRect(x, y, b > 0.95 ? 2 : 1, b > 0.95 ? 2 : 1);
  }
  // faint grid
  g.strokeStyle = 'rgba(44,255,106,0.045)';
  g.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += 4) {
    g.beginPath(); g.moveTo(x * TILE + .5, 0); g.lineTo(x * TILE + .5, worldCanvas.height); g.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += 4) {
    g.beginPath(); g.moveTo(0, y * TILE + .5); g.lineTo(worldCanvas.width, y * TILE + .5); g.stroke();
  }

  drawCorridors(g);
  for (const r of ROOMS) drawRoom(g, r);
}

function drawCorridors(g) {
  const segs = [];
  for (const [a, set] of adj) {
    for (const b of set) {
      if (a < b) {
        const p1 = nodes.get(a), p2 = nodes.get(b);
        // skip interior edges (either endpoint strictly inside a room)
        const inRoom = (p) => ROOMS.some(r =>
          p.x > r.rect.x && p.x < r.rect.x + r.rect.w &&
          p.y > r.rect.y && p.y < r.rect.y + r.rect.h &&
          !(r.doors.some(d => d.x === p.x && d.y === p.y)));
        if (inRoom(p1) || inRoom(p2)) continue;
        segs.push([p1, p2]);
      }
    }
  }
  for (const [p1, p2] of segs) {
    const x1 = p1.x * TILE, y1 = p1.y * TILE, x2 = p2.x * TILE, y2 = p2.y * TILE;
    const horiz = y1 === y2;
    // tube
    g.fillStyle = '#04140b';
    if (horiz) g.fillRect(Math.min(x1, x2) - 3, y1 - 4, Math.abs(x2 - x1) + 6, 8);
    else g.fillRect(x1 - 4, Math.min(y1, y2) - 3, 8, Math.abs(y2 - y1) + 6);
    // rails
    g.strokeStyle = '#0d5a28'; g.lineWidth = 1.4;
    g.beginPath();
    if (horiz) {
      g.moveTo(Math.min(x1, x2) - 3, y1 - 4); g.lineTo(Math.max(x1, x2) + 3, y1 - 4);
      g.moveTo(Math.min(x1, x2) - 3, y1 + 4); g.lineTo(Math.max(x1, x2) + 3, y1 + 4);
    } else {
      g.moveTo(x1 - 4, Math.min(y1, y2) - 3); g.lineTo(x1 - 4, Math.max(y1, y2) + 3);
      g.moveTo(x1 + 4, Math.min(y1, y2) - 3); g.lineTo(x1 + 4, Math.max(y1, y2) + 3);
    }
    g.stroke();
    // ties
    g.strokeStyle = 'rgba(23,179,74,0.5)'; g.lineWidth = 1;
    const len = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    const n = Math.floor(len / 14);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      g.beginPath();
      if (horiz) { g.moveTo(x, y - 4); g.lineTo(x, y + 4); }
      else { g.moveTo(x - 4, y); g.lineTo(x + 4, y); }
      g.stroke();
    }
  }
}

function drawRoom(g, r) {
  const { x, y, w, h } = r.rect;
  const px = x * TILE, py = y * TILE, pw = w * TILE, ph = h * TILE;
  const rng = mulberry32(r.id.length * 1337 + x * 7 + y * 13);

  // hull glow
  g.save();
  g.shadowColor = r.color; g.shadowBlur = 14;
  g.fillStyle = '#020a06';
  g.fillRect(px, py, pw, ph);
  g.restore();

  // floor
  const grad = g.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, shade(r.dark, 1.25));
  grad.addColorStop(1, shade(r.dark, 0.7));
  g.fillStyle = grad;
  g.fillRect(px + 2, py + 2, pw - 4, ph - 4);

  // floor grid
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
  for (let gx = px + TILE; gx < px + pw; gx += TILE) {
    g.beginPath(); g.moveTo(gx + .5, py + 2); g.lineTo(gx + .5, py + ph - 2); g.stroke();
  }
  for (let gy = py + TILE; gy < py + ph; gy += TILE) {
    g.beginPath(); g.moveTo(px + 2, gy + .5); g.lineTo(px + pw - 2, gy + .5); g.stroke();
  }

  furnish(g, r, rng);

  // walls
  g.strokeStyle = r.color; g.lineWidth = 2;
  g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  g.strokeStyle = shade(r.dark, 2.2); g.lineWidth = 1;
  g.strokeRect(px + 4, py + 4, pw - 8, ph - 8);

  // corner studs
  g.fillStyle = r.color;
  for (const [cx, cy] of [[px, py], [px + pw - 4, py], [px, py + ph - 4], [px + pw - 4, py + ph - 4]]) {
    g.fillRect(cx, cy, 4, 4);
  }

  // doors
  for (const d of r.doors) {
    const dx = d.x * TILE, dy = d.y * TILE;
    g.fillStyle = '#020a06';
    if (d.y === r.rect.y || d.y === r.rect.y + r.rect.h) g.fillRect(dx - 6, dy - 3, 12, 6);
    else g.fillRect(dx - 3, dy - 6, 6, 12);
    g.fillStyle = r.color;
    g.fillRect(dx - 2, dy - 2, 4, 4);
  }

  // label plate
  const label = r.name;
  g.font = 'bold 9px monospace';
  const tw = g.measureText(label).width + 10;
  g.fillStyle = 'rgba(1,8,4,0.9)';
  g.fillRect(px + pw / 2 - tw / 2, py - 13, tw, 12);
  g.strokeStyle = r.color; g.lineWidth = 1;
  g.strokeRect(px + pw / 2 - tw / 2 + .5, py - 12.5, tw - 1, 11);
  g.fillStyle = r.color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, px + pw / 2, py - 7);
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const gg = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${gg},${b})`;
}

// per-room pixel furniture
function furnish(g, r, rng) {
  const { x, y, w, h } = r.rect;
  const px = x * TILE, py = y * TILE, pw = w * TILE, ph = h * TILE;
  const C = r.color, D = shade(r.dark, 1.9);

  const console_ = (cx, cy, cw = 16, chh = 10) => {
    g.fillStyle = '#0a0f0c'; g.fillRect(cx, cy, cw, chh);
    g.fillStyle = D; g.fillRect(cx + 2, cy + 2, cw - 4, chh - 5);
    if (rng() > 0.35) { g.fillStyle = C; g.fillRect(cx + 3 + rng() * (cw - 8), cy + 3, 3, 2); }
  };

  switch (r.id) {
    case 'bridge': {
      // command ring + dais
      const cx = px + pw / 2, cy = py + ph / 2;
      g.strokeStyle = D; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = C; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.stroke();
      g.fillStyle = D; g.fillRect(cx - 8, cy - 8, 16, 16);
      g.fillStyle = C; g.fillRect(cx - 3, cy - 3, 6, 6);
      for (let i = 0; i < 6; i++) console_(px + 10 + (i % 3) * 24, py + (i < 3 ? 8 : ph - 20));
      break;
    }
    case 'factory1': {
      // press tables + fabric rolls
      for (let i = 0; i < 4; i++) {
        const tx = px + 12 + i * ((pw - 40) / 3), ty = py + 12;
        g.fillStyle = '#0a0f0c'; g.fillRect(tx, ty, 20, 34);
        g.fillStyle = shade('#ff9c45', 0.8); g.fillRect(tx + 3, ty + 3, 14, 8);
        g.fillStyle = shade('#ff6ad5', 0.7); g.fillRect(tx + 3, ty + 14, 14, 8);
        g.fillStyle = D; g.fillRect(tx + 3, ty + 25, 14, 6);
      }
      for (let i = 0; i < 5; i++) console_(px + 10 + i * ((pw - 36) / 4), py + ph - 22);
      break;
    }
    case 'factory2': {
      // render wall: grid of tiny screens
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        const sx = px + 12 + i * 16, sy = py + 10 + j * 13;
        g.fillStyle = '#06110d'; g.fillRect(sx, sy, 13, 10);
        g.fillStyle = rng() > 0.4 ? shade(C, 0.55) : '#0a231d';
        g.fillRect(sx + 1, sy + 1, 11, 8);
      }
      for (let i = 0; i < 4; i++) console_(px + 12 + i * ((pw - 44) / 3), py + ph - 22);
      break;
    }
    case 'research': {
      // dish + map table
      const cx = px + 26, cy = py + ph / 2 + 6;
      g.strokeStyle = C; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy, 13, 0.2 * Math.PI, 1.4 * Math.PI); g.stroke();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 9, cy - 9); g.stroke();
      g.fillStyle = D; g.fillRect(px + pw / 2 - 4, py + 12, pw / 2 - 14, ph - 34);
      g.strokeStyle = shade(C, 0.8);
      g.strokeRect(px + pw / 2 - 4, py + 12, pw / 2 - 14, ph - 34);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = i % 2 ? C : '#9fffce';
        g.fillRect(px + pw / 2 + rng() * (pw / 2 - 26), py + 16 + rng() * (ph - 44), 2, 2);
      }
      console_(px + 10, py + 10); console_(px + 10, py + ph - 22);
      break;
    }
    case 'comms': {
      for (let i = 0; i < 3; i++) {
        const ax = px + 14 + i * ((pw - 34) / 2), ay = py + 10;
        g.strokeStyle = C; g.lineWidth = 1;
        g.beginPath(); g.moveTo(ax, ay + 12); g.lineTo(ax, ay); g.stroke();
        g.beginPath(); g.arc(ax, ay, 4, Math.PI, 2 * Math.PI); g.stroke();
      }
      for (let i = 0; i < 4; i++) console_(px + 10 + (i % 2) * ((pw - 36) / 1.8), py + ph / 2 - 4 + Math.floor(i / 2) * 14);
      break;
    }
    case 'treasury': {
      // vault door
      const cx = px + 24, cy = py + ph / 2;
      g.fillStyle = '#0a0f0c'; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
      g.strokeStyle = C; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1;
      for (let a = 0; a < 8; a++) {
        g.beginPath();
        g.moveTo(cx + Math.cos(a * Math.PI / 4) * 7, cy + Math.sin(a * Math.PI / 4) * 7);
        g.lineTo(cx + Math.cos(a * Math.PI / 4) * 14, cy + Math.sin(a * Math.PI / 4) * 14);
        g.stroke();
      }
      // coin stacks
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ffd84d' : '#c9a227';
        g.fillRect(px + pw - 46 + (i % 4) * 10, py + 14 + Math.floor(i / 4) * 22 + rng() * 8, 6, 3);
      }
      console_(px + pw - 50, py + ph - 22, 34, 12);
      break;
    }
    case 'warroom': {
      // strategy table + wall charts
      g.fillStyle = shade('#4a1c08', 1.6);
      g.fillRect(px + pw / 2 - 26, py + ph / 2 - 12, 52, 24);
      g.strokeStyle = C; g.strokeRect(px + pw / 2 - 26, py + ph / 2 - 12, 52, 24);
      g.strokeStyle = shade(C, 0.8); g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const wx = px + 12 + i * ((pw - 40) / 2), wy = py + 8;
        g.strokeRect(wx, wy, 18, 12);
        g.beginPath(); g.moveTo(wx + 2, wy + 9 - rng() * 3);
        for (let s = 1; s <= 4; s++) g.lineTo(wx + 2 + s * 3.5, wy + 9 - rng() * 7);
        g.stroke();
      }
      break;
    }
    case 'archives': {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = '#0a0f0c';
        g.fillRect(px + 10, py + 9 + i * ((ph - 24) / 4), pw - 20, 7);
        for (let b = 0; b < 12; b++) {
          g.fillStyle = rng() > 0.5 ? shade(C, 0.75) : shade(C, 0.4);
          g.fillRect(px + 12 + b * ((pw - 26) / 12), py + 10 + i * ((ph - 24) / 4), 3, 5);
        }
      }
      break;
    }
    case 'quarters': {
      // poker table
      const cx = px + pw / 2 - 14, cy = py + ph / 2 + 6;
      g.fillStyle = '#0c4a20';
      g.beginPath(); g.ellipse(cx, cy, 20, 12, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a2a12'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, cy, 20, 12, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(cx - 4, cy - 2, 3, 4);
      g.fillStyle = '#ff4d4d'; g.fillRect(cx + 2, cy - 2, 3, 4);
      // bar
      g.fillStyle = '#3a2a12'; g.fillRect(px + pw - 40, py + 8, 30, 8);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ['#35e0ff', '#ffd84d', '#ff6ad5', '#b8ff3d', '#b17bff'][i];
        g.fillRect(px + pw - 38 + i * 6, py + 4, 3, 4);
      }
      // bunks
      for (let i = 0; i < 2; i++) {
        g.fillStyle = '#0a0f0c'; g.fillRect(px + 8, py + 8 + i * 14, 24, 10);
        g.fillStyle = shade('#ff6ad5', 0.5); g.fillRect(px + 10, py + 10 + i * 14, 20, 6);
      }
      break;
    }
    case 'ventures': {
      // three mini-cells: blog desk, synth, shipyard bench
      console_(px + 10, py + 10, 20, 12);
      g.fillStyle = D; g.fillRect(px + pw / 2 - 8, py + 10, 22, 10);
      g.fillStyle = C;
      for (let i = 0; i < 5; i++) g.fillRect(px + pw / 2 - 6 + i * 4, py + 12 + (i % 2) * 3, 2, 4);
      g.fillStyle = '#0a0f0c'; g.fillRect(px + pw - 36, py + 10, 26, 14);
      g.strokeStyle = C; g.strokeRect(px + pw - 36, py + 10, 26, 14);
      g.strokeStyle = shade(C, 0.7);
      g.beginPath(); g.moveTo(px + pw - 33, py + 20); g.lineTo(px + pw - 23, py + 13); g.lineTo(px + pw - 13, py + 20); g.stroke();
      for (let i = 0; i < 3; i++) console_(px + 12 + i * ((pw - 44) / 2), py + ph - 22);
      break;
    }
  }
}

// --------------------------- sprites -----------------------------
const spriteVisual = new Map(); // agentId -> {x,y,path:[],pathI,speed,walkT}

function ensureVisual(st, a) {
  let v = spriteVisual.get(a.id);
  if (!v) {
    const room = ROOM_BY_ID[st.agents[a.id].at] || ROOM_BY_ID[a.room];
    const p = interiorPoint(room);
    v = { x: p.x, y: p.y, path: null, pathI: 0, speed: 2.6 + Math.random() * 1.2, walkT: 0, room: room.id, idleT: Math.random() * 6 };
    spriteVisual.set(a.id, v);
  }
  return v;
}

function stepSprites(st, dtSec) {
  const speedFactor = Math.min(3, st.paused ? 0.4 : st.speed);
  for (const a of AGENTS) {
    const ag = st.agents[a.id];
    const v = ensureVisual(st, a);
    // need a new path?
    if (!v.path && ag.target && ag.target !== v.room) {
      const pts = routePoints(v.room, v, ag.target);
      v.path = pts; v.pathI = 0; v.targetRoom = ag.target;
    }
    if (v.path) {
      const tgt = v.path[v.pathI];
      const dx = tgt.x - v.x, dy = tgt.y - v.y;
      const dist = Math.hypot(dx, dy);
      const step = v.speed * dtSec * speedFactor;
      if (dist <= step) {
        v.x = tgt.x; v.y = tgt.y; v.pathI++;
        if (v.pathI >= v.path.length) {
          // visual arrival only — the sim owns the logical ag.at transition
          v.path = null; v.room = v.targetRoom || v.room;
        }
      } else {
        v.x += dx / dist * step; v.y += dy / dist * step;
        v.walkT += dtSec * 8 * speedFactor;
      }
    } else {
      // idle wander inside room
      v.idleT -= dtSec * speedFactor;
      if (v.idleT <= 0) {
        v.idleT = 3 + Math.random() * 9;
        const room = ROOM_BY_ID[v.room];
        if (room && Math.random() < 0.6) {
          const p = interiorPoint(room);
          v.path = [p]; v.pathI = 0; v.targetRoom = v.room;
        }
      }
    }
  }
}

// corridor packets (little light dots for life)
const packets = [];
function stepPackets(dtSec, speed) {
  if (packets.length < 7 && Math.random() < dtSec * 0.7) {
    const roomA = ROOMS[Math.floor(Math.random() * ROOMS.length)];
    const roomB = ROOMS[Math.floor(Math.random() * ROOMS.length)];
    if (roomA !== roomB) {
      const pts = routePoints(roomA.id, { x: roomA.rect.x + roomA.rect.w / 2, y: roomA.rect.y + roomA.rect.h / 2 }, roomB.id);
      packets.push({ pts, i: 0, x: pts[0].x, y: pts[0].y, sp: 9 + Math.random() * 8, hue: Math.random() });
    }
  }
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    const tgt = p.pts[p.i];
    const dx = tgt.x - p.x, dy = tgt.y - p.y, dist = Math.hypot(dx, dy);
    const step = p.sp * dtSec * Math.min(3, speed || 1);
    if (dist <= step) {
      p.x = tgt.x; p.y = tgt.y; p.i++;
      if (p.i >= p.pts.length) packets.splice(i, 1);
    } else { p.x += dx / dist * step; p.y += dy / dist * step; }
  }
}

// --------------------------- camera / io -------------------------
export const camera = { x: WORLD_W * TILE / 2, y: WORLD_H * TILE / 2, zoom: 1 };

let canvas, ctx, mini, minictx, stateRef, callbacks = {};
let hoverRoom = null, hoverAgent = null;

export function initMap(cv, mn, st, cbs) {
  canvas = cv; ctx = canvas.getContext('2d');
  mini = mn; minictx = mini.getContext('2d');
  stateRef = st; callbacks = cbs || {};
  bakeWorld();
  fitView();

  let dragging = false, moved = 0, lx = 0, ly = 0;
  canvas.addEventListener('mousedown', e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.classList.add('dragging'); });
  window.addEventListener('mouseup', () => { dragging = false; canvas.classList.remove('dragging'); });
  window.addEventListener('mousemove', e => {
    if (dragging) {
      camera.x -= (e.clientX - lx) / camera.zoom;
      camera.y -= (e.clientY - ly) / camera.zoom;
      moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      clampCamera();
    } else if (e.target === canvas) {
      updateHover(e);
    }
  });
  canvas.addEventListener('click', e => {
    if (moved > 6) return;
    updateHover(e);
    if (hoverAgent) callbacks.onAgentClick && callbacks.onAgentClick(hoverAgent);
    else if (hoverRoom) callbacks.onRoomClick && callbacks.onRoomClick(hoverRoom);
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const w = worldAt(e);
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    camera.zoom = Math.max(0.45, Math.min(3, camera.zoom * f));
    // keep cursor-anchored
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    camera.x = w.x * TILE - (cx - rect.width / 2) / camera.zoom;
    camera.y = w.y * TILE - (cy - rect.height / 2) / camera.zoom;
    clampCamera();
  }, { passive: false });

  window.addEventListener('resize', resize);
  resize();
}

export function setMapState(st) { stateRef = st; spriteVisual.clear(); }

function fitView() {
  camera.x = (WORLD_W / 2) * TILE;
  camera.y = (WORLD_H / 2 + 2) * TILE;
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0) {
    camera.zoom = Math.max(0.45, Math.min(
      rect.width / (WORLD_W * TILE),
      rect.height / ((WORLD_H - 10) * TILE)) * 0.98);
  } else {
    camera.zoom = 0.65;
  }
}

export function centerOn(roomId) {
  const r = ROOM_BY_ID[roomId];
  if (!r) return;
  camera.x = (r.rect.x + r.rect.w / 2) * TILE;
  camera.y = (r.rect.y + r.rect.h / 2) * TILE;
}

function clampCamera() {
  camera.x = Math.max(0, Math.min(WORLD_W * TILE, camera.x));
  camera.y = Math.max(0, Math.min(WORLD_H * TILE, camera.y));
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mrect = mini.getBoundingClientRect();
  mini.width = 148; mini.height = 104;
}

function worldAt(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  return {
    x: (camera.x + (cx - rect.width / 2) / camera.zoom) / TILE,
    y: (camera.y + (cy - rect.height / 2) / camera.zoom) / TILE,
  };
}

function updateHover(e) {
  const w = worldAt(e);
  hoverAgent = null; hoverRoom = null;
  for (const a of AGENTS) {
    const v = spriteVisual.get(a.id);
    if (v && Math.abs(v.x - w.x) < 1.1 && Math.abs(v.y - w.y) < 1.6) { hoverAgent = a.id; break; }
  }
  if (!hoverAgent) {
    for (const r of ROOMS) {
      if (w.x >= r.rect.x && w.x <= r.rect.x + r.rect.w && w.y >= r.rect.y && w.y <= r.rect.y + r.rect.h) {
        hoverRoom = r.id; break;
      }
    }
  }
  canvas.style.cursor = (hoverAgent || hoverRoom) ? 'pointer' : 'grab';
}

// --------------------------- draw --------------------------------
let pulseT = 0;

export function drawMap(dtMs) {
  if (!ctx || !stateRef) return;
  const dtSec = Math.min(0.1, dtMs / 1000);
  pulseT += dtSec;
  stepSprites(stateRef, dtSec);
  stepPackets(dtSec, stateRef.paused ? 0.4 : stateRef.speed);

  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  ctx.fillStyle = '#010604';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(worldCanvas, 0, 0);

  // alerts overlay
  for (const [roomId, al] of Object.entries(stateRef.alerts || {})) {
    const r = ROOM_BY_ID[roomId];
    if (!r) continue;
    const { x, y, w, h } = r.rect;
    const flash = 0.45 + 0.4 * Math.sin(pulseT * 6);
    const color = al.kind === 'viral' ? `rgba(255,216,77,${flash})` : `rgba(255,122,69,${flash})`;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.strokeRect(x * TILE - 2, y * TILE - 2, w * TILE + 4, h * TILE + 4);
    // warning chip
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    const label = (al.kind === 'viral' ? '▲ ' : '⚠ ') + al.label;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(10,3,0,0.92)';
    ctx.fillRect(x * TILE + w * TILE / 2 - tw / 2, y * TILE + h * TILE + 4, tw, 12);
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.strokeRect(x * TILE + w * TILE / 2 - tw / 2, y * TILE + h * TILE + 4, tw, 12);
    ctx.fillStyle = al.kind === 'viral' ? '#ffd84d' : '#ff9a45';
    ctx.fillText(label, x * TILE + w * TILE / 2, y * TILE + h * TILE + 13);
  }

  // packets
  for (const p of packets) {
    const c = p.hue > 0.66 ? '#35e0ff' : p.hue > 0.33 ? '#2cff6a' : '#ff6ad5';
    ctx.fillStyle = c;
    ctx.fillRect(p.x * TILE - 1.5, p.y * TILE - 1.5, 3, 3);
  }

  // agents
  ctx.textAlign = 'center';
  for (const a of AGENTS) {
    const v = spriteVisual.get(a.id);
    if (!v) continue;
    drawAgent(ctx, a, v, stateRef);
  }

  // bubbles last (on top)
  for (const a of AGENTS) {
    const v = spriteVisual.get(a.id); if (!v) continue;
    const ag = stateRef.agents[a.id];
    if (ag.bubble && stateRef.simMinutes < ag.bubbleUntil) drawBubble(ctx, v, ag.bubble);
  }

  ctx.restore();
  drawMini(W, H);
}

function drawAgent(g, a, v, st) {
  const x = v.x * TILE, y = v.y * TILE;
  const walking = !!v.path;
  const legPhase = walking ? Math.sin(v.walkT) : 0;
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(x - 4, y + 5, 8, 2);
  // legs
  g.fillStyle = '#0a1410';
  g.fillRect(x - 3, y + 1, 2.6, 4 + legPhase * 1.4);
  g.fillRect(x + 0.6, y + 1, 2.6, 4 - legPhase * 1.4);
  // torso
  g.fillStyle = a.color2;
  g.fillRect(x - 4, y - 5, 8, 7);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(x - 4, y - 5, 8, 2);
  // head
  g.fillStyle = a.color;
  g.fillRect(x - 3, y - 11, 6, 6);
  // visor
  g.fillStyle = '#04140b';
  g.fillRect(x - 2, y - 9.4, 4, 2);
  // commander crest
  if (a.id === 'magnus') {
    g.fillStyle = '#ffd84d';
    g.fillRect(x - 1, y - 13, 2, 2);
  }
  // low morale indicator
  const ag = st.agents[a.id];
  if (ag.morale < 35 && a.id !== 'magnus') {
    g.fillStyle = '#ff4d4d';
    g.fillRect(x + 3, y - 13, 2, 2);
  }
  // name tag at zoom
  if (camera.zoom >= 1.25 || hoverAgent === a.id) {
    g.font = '8px monospace';
    g.fillStyle = hoverAgent === a.id ? '#ffffff' : a.color;
    g.fillText(a.name, x, y - 14);
  }
}

function drawBubble(g, v, text) {
  const x = v.x * TILE, y = v.y * TILE - 18;
  g.font = '8px monospace';
  const t = text.length > 44 ? text.slice(0, 43) + '…' : text;
  const tw = Math.min(160, g.measureText(t).width + 10);
  const isCash = t === '$';
  const w = isCash ? 12 : tw, h = isCash ? 12 : 13;
  g.fillStyle = isCash ? 'rgba(20,14,0,0.95)' : 'rgba(2,12,6,0.95)';
  g.fillRect(x - w / 2, y - h, w, h);
  g.strokeStyle = isCash ? '#ffd84d' : '#2cff6a'; g.lineWidth = 1;
  g.strokeRect(x - w / 2 + .5, y - h + .5, w - 1, h - 1);
  g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y); g.lineTo(x, y + 3); g.closePath();
  g.fillStyle = isCash ? '#ffd84d' : '#2cff6a'; g.fill();
  g.fillStyle = isCash ? '#ffd84d' : '#a6ffc3';
  g.textAlign = 'center';
  g.fillText(t, x, y - 4);
}

function drawMini(W, H) {
  const mw = mini.width, mh = mini.height;
  minictx.imageSmoothingEnabled = false;
  minictx.fillStyle = '#010604';
  minictx.fillRect(0, 0, mw, mh);
  minictx.drawImage(worldCanvas, 0, 0, mw, mh);
  // alert blips
  for (const [roomId] of Object.entries(stateRef.alerts || {})) {
    const r = ROOM_BY_ID[roomId]; if (!r) continue;
    minictx.fillStyle = Math.sin(pulseT * 6) > 0 ? '#ff7a45' : 'transparent';
    minictx.fillRect(r.rect.x / WORLD_W * mw, r.rect.y / WORLD_H * mh,
      r.rect.w / WORLD_W * mw, r.rect.h / WORLD_H * mh);
  }
  // viewport
  const rect = canvas.getBoundingClientRect();
  const vw = rect.width / camera.zoom / TILE / WORLD_W * mw;
  const vh = rect.height / camera.zoom / TILE / WORLD_H * mh;
  const vx = (camera.x / TILE / WORLD_W) * mw - vw / 2;
  const vy = (camera.y / TILE / WORLD_H) * mh - vh / 2;
  minictx.strokeStyle = '#a6ffc3'; minictx.lineWidth = 1;
  minictx.strokeRect(vx, vy, vw, vh);
}
