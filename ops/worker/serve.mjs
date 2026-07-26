#!/usr/bin/env node
// Serve the operations console and open it in a browser.
//
//   node ops.mjs console            serve on 8080 and open a browser
//   node ops.mjs console 9000       pick a port
//   node ops.mjs console --no-open  serve only
//
// The console reads ops/state/*.json over fetch(), which the file:// scheme
// blocks, so it genuinely needs a server rather than a double-clicked file.
// Zero dependencies, and it only ever serves files from the repo root.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { PATHS } from './config.mjs';

const root = join(PATHS.ops, '..');           // repo root: index.html, js/, css/, ops/
const args = process.argv.slice(2);
const port = Number(args.find(a => /^\d+$/.test(a))) || 8080;
const open = !args.includes('--no-open');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Resolve inside the root and refuse anything that escapes it. This binds to
    // localhost only, but path traversal is not a bug worth leaving in.
    const rel = normalize(urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, ''));
    if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const file = join(root, rel);
    const info = await stat(file);
    const body = await readFile(info.isDirectory() ? join(file, 'index.html') : file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      // state files change under the console; never let a browser cache them
      'Cache-Control': 'no-store',
    }).end(body);
  } catch {
    // A missing state file is the normal case before anything has run — the
    // console treats a 404 as "this panel has no real data yet".
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`port ${port} is already in use — it may already be running at http://localhost:${port}`);
    console.error(`or pick another:  node ops.mjs console ${port + 1}`);
    process.exitCode = 1;
  } else {
    console.error(e.message);
    process.exitCode = 1;
  }
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  PERPETUA ORBITAL console  ->  ${url}`);
  console.log(`  serving ${root}`);
  console.log(`  Ctrl+C to stop\n`);
  if (open) {
    // start/xdg-open/open per platform; failure here is not worth crashing over
    const [cmd, cmdArgs] = process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    try { spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' }).unref(); }
    catch { console.log(`  (could not open a browser — paste ${url} in yourself)`); }
  }
});
