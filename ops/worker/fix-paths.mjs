#!/usr/bin/env node
// One-shot: rewrite .gitignore after this project becomes its own repo.
//
//   node ops/worker/fix-paths.mjs
//
// Inside fht, the ignore rules name paths like `station/ops/state/*`. Once
// `station/` is the repository root those patterns match nothing, and the very
// first `git add -A` would commit buyer-order state and print masters. This
// strips the prefix and reports exactly what changed.
//
// Safe to run twice: with no `station/` prefixes left, it says so and exits.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = join(repoRoot, '.gitignore');

if (!existsSync(target)) {
  console.error(`no .gitignore at ${target}`);
  console.error('Run this from the new repository, where ops/ sits at the root.');
  process.exit(1);
}

const before = readFileSync(target, 'utf8');
const changed = [];
const after = before.split('\n').map((line) => {
  const t = line.trim();
  if (!t || t.startsWith('#')) return line;
  const rewritten = line.replace(/(^!?)station\//, '$1');
  if (rewritten !== line) changed.push([line.trim(), rewritten.trim()]);
  return rewritten;
}).join('\n');

if (!changed.length) {
  console.log('.gitignore has no station/ prefixes — nothing to do.');
  process.exit(0);
}

writeFileSync(target, after);
console.log(`rewrote ${changed.length} rule${changed.length === 1 ? '' : 's'} in .gitignore:\n`);
for (const [from, to] of changed) console.log(`  ${from}\n    -> ${to}`);
console.log('\nNow confirm nothing sensitive is about to be committed:');
console.log('  git status --short');
console.log('  git check-ignore -v ops/worker/.env ops/state/orders.json ops/art');
