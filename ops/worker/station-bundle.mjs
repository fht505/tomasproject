// Bundle the PERPETUA ORBITAL console into one self-contained HTML file for
// publishing as a claude.ai Artifact. The live app fetches ops/state/*.json at
// runtime; an artifact has no server, so this bakes the CURRENT state files
// into the page and patches fetchJson to read from the baked snapshot. Every
// number in the artifact is therefore a real pull as of bundle time, and the
// console's own fetchedAt/staleness labels keep that honest.
//
// Usage: node station-bundle.mjs [outPath]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = process.argv[2] ?? join(root, 'ops', 'state', 'station-artifact.html');

const strip = (s) => s
  .replace(/^import .*$/gm, '')
  .replace(/^export default /gm, '')
  .replace(/^export /gm, '');

// mirror FEEDS in real-main.js — the console requests exactly these paths
const FEEDS = ['station', 'ledger', 'orders', 'products', 'signals', 'art', 'lanes', 'shops'];
const state = {};
for (const f of FEEDS) {
  const p = join(root, 'ops', 'state', `${f}.json`);
  if (existsSync(p)) state[`ops/state/${f}.json`] = JSON.parse(readFileSync(p, 'utf8'));
}
const batchPath = join(root, 'ops', 'BATCH-01.listings.json');
if (existsSync(batchPath)) state['ops/BATCH-01.listings.json'] = JSON.parse(readFileSync(batchPath, 'utf8'));

let main = readFileSync(join(root, 'js', 'real-main.js'), 'utf8');
const FETCH_FN = /async function fetchJson\(path\) \{[\s\S]*?\n\}/;
if (!FETCH_FN.test(main)) throw new Error('fetchJson not found in real-main.js — bundle patch would silently no-op');
main = main.replace(FETCH_FN,
  'async function fetchJson(path) {\n  return EMBEDDED_STATE[path] ?? null;\n}');
main = main.replace(
  "pushFeed('sys', 'PERPETUA ORBITAL ops console online — real mode');",
  () => `pushFeed('sys', 'artifact snapshot — state baked ${new Date().toISOString()}');\n  pushFeed('sys', 'PERPETUA ORBITAL ops console online — real mode');`);

// </script> inside a JSON string would terminate the script tag early
const embedded = 'const EMBEDDED_STATE = ' +
  JSON.stringify(state).replaceAll('</script', '<\\/script') + ';\n';

const bundle = embedded + ['data', 'map'].map(n =>
  `// ---- js/${n}.js ----\n` + strip(readFileSync(join(root, 'js', `${n}.js`), 'utf8'))
).join('\n') + '\n// ---- js/real-main.js ----\n' + strip(main);

let html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css', 'station.css'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script[^>]*src="js\/[^"]+"[^>]*><\/script>\s*/g, '');
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];

// artifact wrapper supplies doctype/head/body — emit page content only,
// and concatenate with functions nowhere so no $-pattern mangling is possible
const page = '<title>PERPETUA ORBITAL — Station</title>\n' + style + '\n' + body +
  '\n<script type="module">\n' + bundle + '\n</script>';
writeFileSync(out, page);
console.log('bundled', page.length, 'bytes ->', out);
console.log('baked feeds:', Object.keys(state).join(', ') || 'NONE');
