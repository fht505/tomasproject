#!/usr/bin/env node
// Generate the Obsidian vault from ops/lanes.data.json.
//
//   node ops.mjs vault
//
// The vault is GENERATED, never hand-edited. Edit ops/lanes.data.json and
// re-run. This is the same discipline as gen-listings.mjs: a hand-maintained
// vault would become a second copy of LANES.md that silently diverges the
// first time a policy changes, and platform policies changed four times
// during our own research window.
//
// Every note carries a `checked` date, because that is the field that decays.
// Alamy's AI ban was thirteen days old when we found it. Two seller agreements
// were withdrawn from public view mid-research. A verdict without a date is a
// guess wearing a fact's clothes.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.mjs';

const VAULT = join(PATHS.ops, '..', 'PERPETUA ORBITAL');
const LANES_DIR = join(VAULT, 'Lanes');
const data = JSON.parse(readFileSync(join(PATHS.ops, 'lanes.data.json'), 'utf8'));

// ---------------------------------------------------------------- helpers
const VERDICT_ICON = {
  building: '🔨', candidate: '✅', flagged: '⚠️',
  disqualified: '❌', unresearched: '❓',
};
const AI_LABEL = {
  'allowed-written': 'allowed (in writing)',
  'allowed-disclosed': 'allowed with disclosure',
  'none-found': 'NO POLICY FOUND — a gap',
  banned: 'BANNED',
  'n/a': 'not applicable',
};
const AUTO_LABEL = {
  'sanctioned-api': 'sanctioned via official API',
  'none-found': 'NO RULE FOUND — a gap',
  prohibited: 'PROHIBITED',
  'n/a': 'not applicable',
};

// Obsidian note titles cannot contain these
const safe = (s) => s.replace(/[\\/:*?"<>|#^[\]]/g, '-').trim();
const link = (s) => `[[${safe(s)}]]`;
const bullets = (arr) => (arr || []).map(x => `- ${x}`).join('\n');

// ---------------------------------------------------------------- notes
function noteFor(lane) {
  const fm = [
    '---',
    `lane: "${lane.name.replace(/"/g, "'")}"`,
    `category: "${lane.category}"`,
    `verdict: ${lane.verdict}`,
    `ai-policy: ${lane.ai}`,
    `automation-policy: ${lane.automation}`,
    `checked: ${lane.checked || 'never'}`,
    'tags:',
    `  - lane/${lane.verdict}`,
    `  - category/${lane.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    lane.automation === 'prohibited' ? '  - automation/blocked' : null,
    lane.ai === 'banned' ? '  - ai/banned' : null,
    '---',
  ].filter(Boolean).join('\n');

  const parts = [fm, '', `# ${VERDICT_ICON[lane.verdict] || ''} ${lane.name}`, ''];

  // The two fields that decide viability, up top
  parts.push('| | |', '|---|---|',
    `| **Verdict** | \`${lane.verdict}\` |`,
    `| **AI policy** | ${AI_LABEL[lane.ai] || lane.ai} |`,
    `| **Automation policy** | ${AUTO_LABEL[lane.automation] || lane.automation} |`,
    `| **Economics** | ${lane.economics || '—'} |`,
    `| **Time to cash** | ${lane.timeToCash || '—'} |`,
    `| **Last verified** | ${lane.checked || '**never**'} |`, '');

  if (lane.ai === 'none-found' || lane.automation === 'none-found') {
    parts.push('> [!warning] A gap is not permission',
      '> No rule was located. That is unallocated risk, not approval. Absence of',
      '> an AI or automation policy means nobody has told us the answer yet.', '');
  }

  parts.push('## What we found', '', lane.summary, '');

  if (lane.corrections?.length) {
    parts.push('## Corrections', '',
      '> [!note] These overturned something previously believed', '',
      bullets(lane.corrections), '');
  }
  if (lane.risks?.length) parts.push('## Risks', '', bullets(lane.risks), '');
  if (lane.killCriteria) {
    parts.push('## Kill criteria', '',
      '> [!danger] Decided in advance, on purpose', `> ${lane.killCriteria}`, '');
  }
  if (lane.reconsiderIf) {
    parts.push('## Reconsider if', '', lane.reconsiderIf, '');
  }
  if (lane.sources?.length) parts.push('## Sources', '', bullets(lane.sources), '');

  parts.push('---', `Generated from \`ops/lanes.data.json\` — edit there, not here. See ${link('Dashboard')}.`);
  return parts.join('\n');
}

// ---------------------------------------------------------------- dashboard
function dashboard(lanes) {
  const order = ['building', 'candidate', 'flagged', 'disqualified', 'unresearched'];
  const by = (v) => lanes.filter(l => l.verdict === v);
  const row = (l) =>
    `| ${link(l.name)} | ${l.category} | ${AI_LABEL[l.ai]} | ${AUTO_LABEL[l.automation]} | ${l.checked || '**never**'} |`;
  const table = (rows) => rows.length
    ? ['| Lane | Category | AI | Automation | Checked |', '|---|---|---|---|---|', ...rows.map(row)].join('\n')
    : '_none_';

  const gaps = lanes.filter(l => l.ai === 'none-found' || l.automation === 'none-found');
  const blocked = lanes.filter(l => l.automation === 'prohibited');

  return [
    '---', 'tags:', '  - dashboard', '---', '',
    '# Revenue lanes — decision board', '',
    `${lanes.length} lanes researched. Generated from \`ops/lanes.data.json\`.`,
    '**Do not edit these notes by hand** — edit the data file and run `node ops.mjs vault`.', '',
    '## The two rules that decide everything', '',
    '> [!tip] Check the automation clause SEPARATELY from the AI clause',
    '> They are different rules and the automation one is usually stricter.',
    '> Redbubble publishes no AI policy at all, yet makes it an account-deletion',
    '> trigger to upload "using any bot, scraper, or other automated means".',
    '> That restricts the operating model itself.', '',
    '> [!tip] Rank by throughput compatibility, then by rate',
    '> Framer pays 100% with no review gate — the best raw terms found anywhere —',
    '> and is still not first, because it has no authoring API so a human must',
    '> assemble every canvas. The best economics are on the lane we cannot automate.', '',
    ...order.flatMap(v => [
      `## ${VERDICT_ICON[v]} ${v} (${by(v).length})`, '', table(by(v)), '',
    ]),
    '## ⚠️ Lanes resting on a gap', '',
    `${gaps.length} lanes have no located AI or automation policy. A gap is unallocated risk, not permission — and it can close overnight. Fine Art America's terms are dated **June 2020**, before generative AI existed.`, '',
    gaps.map(l => `- ${link(l.name)}`).join('\n'), '',
    '## 🚫 Automation contractually prohibited', '',
    `${blocked.length} lanes ban automated access outright. Unworkable however friendly the AI stance.`, '',
    blocked.map(l => `- ${link(l.name)}`).join('\n'), '',
    '## Staleness', '',
    'Policies moved four times during our own research window. Alamy banned AI thirteen days before we read it; two seller agreements were withdrawn from public view mid-research. **Re-verify anything before acting on it.**', '',
    '| Lane | Last checked |', '|---|---|',
    ...lanes.slice().sort((a, b) => String(a.checked).localeCompare(String(b.checked)))
      .map(l => `| ${link(l.name)} | ${l.checked || '**never**'} |`),
  ].join('\n');
}

// ---------------------------------------------------------------- write
mkdirSync(LANES_DIR, { recursive: true });
// clear only generated notes; never touch .obsidian or hand-written notes
if (existsSync(LANES_DIR)) rmSync(LANES_DIR, { recursive: true, force: true });
mkdirSync(LANES_DIR, { recursive: true });

for (const lane of data.lanes) {
  writeFileSync(join(LANES_DIR, `${safe(lane.name)}.md`), noteFor(lane));
}
writeFileSync(join(VAULT, 'Dashboard.md'), dashboard(data.lanes));

const counts = data.lanes.reduce((a, l) => ({ ...a, [l.verdict]: (a[l.verdict] || 0) + 1 }), {});
console.log(`\n  wrote ${data.lanes.length} lane notes + Dashboard.md`);
console.log(`  ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  vault: ${VAULT}\n`);
