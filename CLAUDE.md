# PERPETUA ORBITAL — working context

A real, operating business. Real money, a real Etsy seller account, real
buyers, real platform accounts. Not a demo or a prototype.

## Read this first

**`PERPETUA ORBITAL/Home.md` is the map.** It is an Obsidian vault inside
this repo and it holds the current state of every lane, the doctrine, the
systems handbook, and the open to-do list. Read Home and follow its links
before asking the operator anything the vault already answers.

Vault notes: Home · Operations log (the whole story) · House rules
(doctrine) · Systems handbook (every machine + its commands) · KindlyPut
shop · Social playbook · YouTube channel · Trading lane · Apparel workbench ·
Open loops (living to-do) · Dashboard (52-lane research board).

## Rule zero

**Nothing is simulated, staged, estimated-as-fact, or filled in with a
plausible guess.** The operator's explicit, repeated instruction; it has
caught real defects many times.

- A number either traces to an API response or a file on disk, or it does
  not render. Empty is the honest state.
- Anything computed rather than fetched is labelled — see `derived_fields`
  in the state files.
- Where a value cannot be verified, say so out loud rather than defaulting.
  `ops/config.json` ships with a blank `processing.days` and
  `fees_confirmed: false` for exactly this reason.
- Guards fail **closed**. An unscreened trademark phrase blocks staging; an
  unverified margin blocks publishing.
- A gap in a platform's written policy is unallocated risk, **not**
  permission.

If tempted to write a placeholder, a sample value, or a "for now" constant
that looks like data — don't. Make it fail loudly instead.

## Hard operating rules (full list in `PERPETUA ORBITAL/House rules.md`)

- **Credentials never appear in chat.** They live in `ops/worker/.env`
  (gitignored). Verify by length/shape only. Any secret that lands in a
  transcript gets regenerated. Note `ETSY_KEYSTRING` (not `ETSY_API_KEY`);
  Etsy shared secrets are legitimately ~10 chars.
- **Never drive a logged-in browser session on Etsy** — automation-clause
  violation; their bot defense already flagged the home IP once. The
  seller-app API is the only sanctioned route. Same conservatism for Meta:
  official Graph API via Composio only, no automated account creation.
- **Operator approval before anything goes live** — listings, posts,
  uploads, spending. Drafts accumulate; approval releases them, and gets
  recorded to a state file with a timestamp.
- **Trademark screening before art or accounts**: Justia full-text
  discovery → verify every decisive hit on USPTO TSDR by serial.
  Containing marks are the killer pattern. TSDR rate-limits are reported
  as RATE-LIMITED, never as absence.
- **Trading lanes are log-only** until a measured post-fee edge exists;
  hard capital cap and kill criteria in writing before any deposit. No VPN
  circumvention of geo-blocks, ever.
- Never generate a fake seller photo. Real photos of the operator only.

## Architecture

Zero-dependency browser console (`index.html`, `js/`) that renders **only**
what is in `ops/state/*.json`. A Node worker in `ops/worker/` talks to the
real Printify and Etsy APIs. A video pipeline in `channel/` (scripts →
scene manifests → Remotion/Blender → mp4).

Single entry point: **`node ops.mjs`** from `ops/worker/`. Run bare and it
prints the one next action. Key commands: `status`, `doctor`, `verify`,
`station` (sync state + live API probes), `orders`, `ledger`, `etsy
connect`, `etsy-digital`, `vault` (regenerate the lane board), `console`.
Tests: `npm test` in `ops/worker/`.

## Where things stand (2026-08-21)

- **KindlyPut is LIVE** (Etsy, since 2026-07-29): 46 physical listings via
  Printify + 6 digital printables = 52 active. **$0 revenue, 0 orders** so
  far — that is the real number, not a placeholder.
- **The Etsy API app is DEAD** since a ~Aug 6 billing suspension: 403 on
  every endpoint including a bare `openapi-ping`, while the developer
  dashboard shows "Approved". Diagnosed exhaustively (REST, OAuth token,
  consent page); no self-service fix exists. Support ticket **#26418530**
  filed Aug 10, bump drafted Aug 21. Printify is unaffected. **Do not
  re-diagnose this from scratch** — read `PERPETUA ORBITAL/KindlyPut
  shop.md` first.
- **Social is live**: IG @kindly.put + FB Page KindlyPut, posting an
  operator-approved 9-post series one per day. ⚠ A second Instagram
  (@fhtautorepair) is connected in Composio and is the **default** — every
  KindlyPut post must explicitly target account `kindlyput` /
  ig_user_id 28354576864126987.
- **YouTube channel** ("Why Is My Car Doing That?"): all 16 season-one
  scripts written; 3 of ~15 hero 3D assets built; blocked on two operator
  gates — the 107-question `channel/TECH-CONFIRM-REVIEW.md` and an
  ElevenLabs decision for the voice.
- **Trading lane**: Kalshi/Polymarket Phase-0 monitor, log-only, zero real
  edges so far; verdict ~2026-09-04.

## Things that have already gone wrong here

Learn from these rather than rediscovering them:

- **`{SHOP}` placeholder** would have published "Designed by {SHOP}" to
  Etsy 40 times. Now double-gated.
- **Buyer PII** was being written into git and served to the browser by the
  ledger. Now redacted with a tripwire that aborts the write if redaction
  ever misses.
- **`--dry-run --force` issued real DELETEs** because the retire step sat
  above the dry-run guard.
- **`hasAlpha` is true for a fully-opaque alpha channel**, so transparency
  checks must sample pixels, not metadata.
- **40 listings shared 13 identical tag sets**, so Etsy's de-clumping meant
  most ranked nowhere.
- **A missing idempotency check** created duplicate digital drafts on a
  second run; state-file skips now guard it.
- **Session-bound cron jobs die with the session.** A 9-day gap (Aug 12–21)
  silently stopped the daily social post and all watchers. For automation
  that must survive, use scheduled cloud agents.
- **Renders must be watched, not assumed.** The `/watch` skill extracts
  frames so the agent can see its own output; it has caught a real flaw in
  every 3D asset built so far (shredded shading, invisible particles,
  label collisions). Never ship a render sight-unseen.

## Platform + tooling traps

- Etsy: `x-api-key` is the `keystring:shared_secret` composite (empirical,
  contradicts the docs); DELETE is `/listings/{id}`; titles ~15 words
  noun-first; 13 tags max, 20 chars each (a 21-char tag 400s the request).
- PowerShell `Select-Object -First N` kills upstream processes mid-write.
- `process.exit()` races sharp/libuv teardown — use `process.exitCode`.
- JS `String.replace` treats `$'` in the replacement as a token — use a
  function replacement when splicing code.
- Blender 5.x removed `Action.fcurves` (set interpolation prefs *before*
  keyframing); Remotion's webpack skips plain `.js` (use `.ts`/`.jsx`).
- Unescaped `&` kills SVG parsing (`&amp;` required).

## Style

Match the surrounding code: comments explain *why*, especially where a
non-obvious choice prevents a specific failure. Prefer a loud failure over
a quiet default. When a guard exists, the comment says what it caught.

Commit early and often — git is how parallel sessions stay coherent. Pull
before starting work.

## Read next

`PERPETUA ORBITAL/Home.md` → `Open loops.md` for what needs doing.
Deeper history: `ops/TODO.md`, `ops/LAUNCH-PLAYBOOK.md`, `ops/PLAN.md`,
design specs in `docs/superpowers/specs/`, and the raw session transcript
referenced from Home.
