#!/usr/bin/env node
// Etsy Open API v3 client + OAuth2 PKCE handshake.
//
//   node ops.mjs etsy connect     one-time: authorize this app against the shop
//   node ops.mjs etsy me          prove the token works (read-only)
//   node ops.mjs etsy shop        the shop record Etsy holds for us
//
// Why this exists: everything inside Shop Manager — About text, listing
// photos, shop stats — was operator-only, because driving a logged-in browser
// session is what Etsy's automation clause prohibits (and what got this
// network's IP flagged once already). A seller app is the sanctioned route to
// the same data.
//
// Credentials live in ops/worker/.env, never in a transcript:
//   ETSY_KEYSTRING=...      public app key
//   ETSY_SHARED_SECRET=...  password — regenerate it if it ever lands in chat
//   ETSY_SHOP_ID=...        filled in by `etsy connect`
//   ETSY_ACCESS_TOKEN=...   filled in by `etsy connect`
//   ETSY_REFRESH_TOKEN=...  filled in by `etsy connect`
//
// Access tokens last 1 hour; the refresh token is good for 90 days and is used
// automatically. Scopes requested are the narrowest set that covers the work —
// no payment scopes, ever.

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, env } from './config.mjs';

const BASE = 'https://openapi.etsy.com/v3/application';
const REDIRECT = 'http://localhost:3003/oauth/callback';
const SCOPES = [
  'shops_r', 'shops_w',            // shop record: title, announcement, About
  'listings_r', 'listings_w', 'listings_d',   // listing text, tags, images, delete
  'transactions_r',                // orders, for the ledger
  'profile_r',                     // whoami, to confirm the right account
];

const b64url = (buf) => buf.toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ------------------------------------------------------------------ .env io
// The token file is the one place these ever live. Rewriting a single key
// rather than the whole file keeps the Printify credentials untouched.
function writeEnv(updates) {
  const path = PATHS.env;
  let lines = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/) : [];
  for (const [k, v] of Object.entries(updates)) {
    const i = lines.findIndex(l => l.startsWith(k + '='));
    if (i >= 0) lines[i] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  writeFileSync(path, lines.filter((l, i, a) => l !== '' || i < a.length - 1).join('\n') + '\n');
}

function creds() {
  const key = env('ETSY_KEYSTRING');
  if (!key) {
    throw new Error('ETSY_KEYSTRING is not set in ops/worker/.env — paste the app keystring there first');
  }
  const secret = env('ETSY_SHARED_SECRET');
  if (!secret) {
    throw new Error('ETSY_SHARED_SECRET is not set in ops/worker/.env');
  }
  return { key, secret };
}

// x-api-key is "keystring:shared_secret", NOT the keystring alone. Etsy's docs
// and every example show the keystring by itself; this app rejects that with
// "Shared secret is required in x-api-key header", and rejects the bare secret
// with "incorrect shared secret for API key". Only the colon-joined pair
// returns 200. Determined empirically against the live API — if a future app
// behaves differently, test all three forms again rather than trusting docs.
const apiKeyHeader = () => {
  const { key, secret } = creds();
  return `${key}:${secret}`;
};

// ---------------------------------------------------------------- transport
// config.mjs parses .env ONCE at module load, so a token written to disk mid-run
// is invisible to env() for the rest of the process. The 401-refresh-retry path
// therefore refreshed correctly, wrote the new token, and then retried with the
// dead one — surfacing as "access token is expired" an hour into any session.
// Hold the live token here and prefer it over the file.
let liveAccessToken = null;
let liveRefreshToken = null;

async function refreshAccessToken() {
  const { key } = creds();
  const refresh = liveRefreshToken || env('ETSY_REFRESH_TOKEN');
  if (!refresh) throw new Error('no ETSY_REFRESH_TOKEN — run: node ops.mjs etsy connect');
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', client_id: key, refresh_token: refresh }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`etsy token refresh -> ${res.status}: ${text.slice(0, 300)}`);
  const j = JSON.parse(text);
  liveAccessToken = j.access_token;
  liveRefreshToken = j.refresh_token;
  writeEnv({ ETSY_ACCESS_TOKEN: j.access_token, ETSY_REFRESH_TOKEN: j.refresh_token });
  return j.access_token;
}

// Every call goes through here so a 401 refreshes once and retries, rather
// than surfacing an expiry as a mysterious failure an hour into a session.
export async function call(method, path, body, { retried = false } = {}) {
  let token = liveAccessToken || env('ETSY_ACCESS_TOKEN');
  if (!token) token = await refreshAccessToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'x-api-key': apiKeyHeader(),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'perpetua-orbital-ops',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && !retried) {
    await refreshAccessToken();
    return call(method, path, body, { retried: true });
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`etsy ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

export const etsy = {
  me: () => call('GET', '/users/me'),
  shop: (shopId) => call('GET', `/shops/${shopId}`),
  updateShop: (shopId, fields) => call('PUT', `/shops/${shopId}`, fields),
  listings: (shopId, state = 'active', limit = 100) =>
    call('GET', `/shops/${shopId}/listings?state=${state}&limit=${limit}`),
  listing: (listingId) => call('GET', `/listings/${listingId}`),
  updateListing: (shopId, listingId, fields) =>
    call('PATCH', `/shops/${shopId}/listings/${listingId}`, fields),
};

// ------------------------------------------------------------------ connect
// PKCE, so the shared secret never travels in the authorization request. The
// loopback server exists only for the seconds it takes Etsy to redirect back.
async function connect() {
  const { key } = creds();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(16));

  const url = new URL('https://www.etsy.com/oauth/connect');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('client_id', key);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  // Also write the URL to a file. When this runs as a background task, stdout
  // can sit in a pipe buffer until the process exits — and this process
  // deliberately does not exit until the redirect arrives, so the URL would
  // never appear. The file always lands immediately.
  const urlFile = join(PATHS.state, 'etsy-authorize-url.txt');
  mkdirSync(PATHS.state, { recursive: true });
  writeFileSync(urlFile, url.toString() + '\n');
  console.log('\n  Open this in the browser where you are logged into Etsy:\n');
  console.log('  ' + url.toString() + '\n');
  console.log(`  (also written to ${urlFile})`);
  console.log('  Approve the scopes. This window is waiting for the redirect…\n');

  // Open it directly unless told not to. Handing a human three near-identical
  // 300-character URLs and asking them to pick the newest is a trap; launching
  // the right one removes the choice.
  if (!process.argv.includes('--no-open')) {
    const { spawn } = await import('node:child_process');
    try {
      spawn('cmd', ['/c', 'start', '', url.toString()], { detached: true, stdio: 'ignore' }).unref();
      console.log('  (opened in your default browser)\n');
    } catch { /* printing the URL is the fallback */ }
  }

  // Accept any authorization THIS TOOL issued and has not expired — not only
  // the newest. Two attempts failed with "state mismatch" because the operator
  // clicked a link from an earlier attempt, which is the obvious thing to do
  // with three links on screen. The check still does its real job (rejecting a
  // state we never issued); it just stops punishing the wrong mistake.
  const pendingPath = join(PATHS.state, 'etsy-oauth-pending.json');
  const now = Date.now();
  let pending = {};
  try { pending = JSON.parse(readFileSync(pendingPath, 'utf8')); } catch { /* first run */ }
  for (const [k, v] of Object.entries(pending)) {
    if (now - (v.at || 0) > 1800000) delete pending[k];   // 30-minute expiry
  }
  pending[state] = { verifier, at: now };
  writeFileSync(pendingPath, JSON.stringify(pending, null, 1));

  const { code, usedVerifier } = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (!u.pathname.startsWith('/oauth/callback')) { res.writeHead(404).end(); return; }
      const got = u.searchParams.get('code');
      const gotState = u.searchParams.get('state');
      const known = gotState && pending[gotState];
      if (!known || !got) {
        // Keep listening: a stale click must not kill the window the operator
        // is about to use correctly.
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h2>That link was stale.</h2><p>Still waiting — use the newest link.</p>');
        console.log('  · ignored a callback with an unrecognised state — still waiting');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>FondlyMade Ops connected.</h2><p>You can close this tab.</p>');
      server.close();
      resolve({ code: got, usedVerifier: known.verifier });
    });
    server.listen(3003);
    // 15 minutes, not 5: the operator has to switch browsers, read a consent
    // screen and approve. A 5-minute window expired underneath them once.
    setTimeout(() => { server.close(); reject(new Error('timed out waiting for the Etsy redirect — re-run: node ops.mjs etsy connect')); }, 900000);
  });

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: key,
      redirect_uri: REDIRECT,
      code,
      code_verifier: usedVerifier,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`etsy token exchange -> ${res.status}: ${text.slice(0, 300)}`);
  const j = JSON.parse(text);
  writeEnv({ ETSY_ACCESS_TOKEN: j.access_token, ETSY_REFRESH_TOKEN: j.refresh_token });

  const me = await call('GET', '/users/me');
  if (me?.shop_id) writeEnv({ ETSY_SHOP_ID: String(me.shop_id) });
  console.log(`  connected · user ${me.user_id}${me.shop_id ? ` · shop ${me.shop_id}` : ''}`);
  console.log('  tokens written to ops/worker/.env (gitignored)\n');
}

// ----------------------------------------------------------------- dispatch
const invoked = process.argv[1] && process.argv[1].endsWith('etsy.mjs');
if (invoked) {
  const cmd = process.argv[2] || 'me';
  try {
    if (cmd === 'connect') await connect();
    else if (cmd === 'me') {
      const me = await etsy.me();
      console.log(JSON.stringify(me, null, 2));
    } else if (cmd === 'shop') {
      const shopId = env('ETSY_SHOP_ID');
      if (!shopId) throw new Error('no ETSY_SHOP_ID — run: node ops.mjs etsy connect');
      const s = await etsy.shop(shopId);
      console.log(`  ${s.shop_name} · ${s.listing_active_count} active listings`);
      console.log(`  title:        ${s.title || '(empty)'}`);
      console.log(`  announcement: ${s.announcement ? s.announcement.slice(0, 70) + '…' : '(empty)'}`);
      console.log(`  digital:      ${s.is_shop_us_based ? 'US-based' : 'non-US'} · currency ${s.currency_code}`);
    } else {
      console.error('commands: connect | me | shop');
      process.exitCode = 2;
    }
  } catch (e) {
    console.error(`\n  ${e.message}\n`);
    process.exitCode = 1;
  }
}
