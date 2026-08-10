// Stage 2→4 bridge: parse a scene-annotated script (channel/scripts/*.md)
// into a scene manifest the assembly stage renders from. Each [tag: …]
// opens a scene; narration paragraphs attach to the open scene until the
// next tag or heading. Durations are estimates (narration words / WPS)
// until real voiceover audio exists — then per-scene mp3 lengths replace
// them, per the design spec's stage separation.
//
// Usage: node pipeline/scenes.mjs <script.md> [--write]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const WPS = 2.4; // conversational explainer pace, words per second

const TAG = /^\[(cutaway|flow|broll|callout):\s*([^\]]+)\]$/;
const src = process.argv[2];
if (!src) { console.error('usage: node pipeline/scenes.mjs <script.md> [--write]'); process.exit(1); }

const lines = readFileSync(src, 'utf8').split(/\r?\n/);
const scenes = [];
let current = null;
let section = null;
let inMeta = true; // skip everything before the first `---` rule (the header block)

for (const raw of lines) {
  const line = raw.trim();
  if (inMeta) { if (line === '---') inMeta = false; continue; }
  if (line.startsWith('## DESCRIPTION-BLOCK')) break; // packaging notes, not narration
  if (line.startsWith('## ')) { section = line.slice(3); continue; }
  if (line.startsWith('#') || line === '---') continue;
  const tag = line.match(TAG);
  if (tag) {
    current = { section, kind: tag[1], spec: tag[2].trim(), narration: [] };
    scenes.push(current);
    continue;
  }
  if (!line) continue;
  if (line.startsWith('- ') || line.toLowerCase().startsWith('target ') || line.toLowerCase().startsWith('structure') || line.toLowerCase().startsWith('scene tags') || line.startsWith('`[')) continue;
  // narration before any tag in a section gets a plain "talk" scene
  if (!current || current.section !== section) {
    current = { section, kind: 'talk', spec: null, narration: [] };
    scenes.push(current);
  }
  current.narration.push(line);
}

const manifest = scenes
  .filter(s => s.narration.length || s.kind !== 'talk')
  .map((s, i) => {
    const text = s.narration.join(' ');
    const words = text ? text.split(/\s+/).length : 0;
    return {
      idx: i + 1, section: s.section, kind: s.kind, spec: s.spec,
      narration: text || null, words,
      est_seconds: +Math.max(words / WPS, s.kind === 'callout' ? 2.5 : 1.5).toFixed(1),
      tech_confirm: /\[TECH CONFIRM/.test(text),
    };
  });

const total = manifest.reduce((s, m) => s + m.est_seconds, 0);
const flagged = manifest.filter(m => m.tech_confirm).length;
console.log(`${basename(src)}: ${manifest.length} scenes · est ${(total / 60).toFixed(1)} min · ${flagged} scene(s) carry TECH CONFIRM flags`);
for (const m of manifest) console.log(`  ${String(m.idx).padStart(2)} ${m.kind.padEnd(7)} ${String(m.est_seconds).padStart(6)}s  ${(m.spec ?? m.narration ?? '').slice(0, 60)}`);

if (process.argv.includes('--write')) {
  const out = join(dirname(src), '..', 'video', 'manifests');
  mkdirSync(out, { recursive: true });
  const dest = join(out, basename(src).replace(/\.md$/, '.scenes.json'));
  writeFileSync(dest, JSON.stringify({ source: basename(src), generatedAt: new Date().toISOString(), wps: WPS, est_total_seconds: +total.toFixed(0), scenes: manifest }, null, 2));
  console.log('wrote', dest);
}
