---
tags: [reference]
updated: 2026-08-21
---

# Systems handbook — every machine and how to run it

All commands run from `ops/worker/` unless noted. Repo: `fht505/tomasproject`.

## Shop operations (`node ops.mjs <cmd>`)
| Command | What |
|---|---|
| `status` / `doctor` | Health overview |
| `orders` / `ledger` | Printify orders pull + revenue/cost rollup (daily once selling) |
| `station` | **Sync ops/state/station.json** — state files + LIVE Etsy/Printify probes |
| `etsy connect` | OAuth2 PKCE flow (localhost:3003 listener, 15-min window) |
| `etsy-digital` | Digital-listing creation (idempotent via state/digital.json) |
| `etsy-sections`, `etsy-tags`, `etsy-retag`, `etsy-demand` | Shop management |
| `vault` | Regenerate this Obsidian lane board from ops/lanes.data.json |
| `console` | Serve the station app locally (truly live) |

## The station console
- App: `index.html` + `js/` (data/map/real-main) — renders ONLY real state.
- `station-bundle.mjs <out.html>` bakes state into a self-contained page for
  publishing as a claude.ai artifact (URL stays stable across republishes).
- Era-2 rooms: KindlyPut shelf, Digital Press, Media Bay (YouTube), Comms
  (social status incl. post log), Ventures (lane board), live API probes in
  the HUD.

## Social machine
- Composer: `social/gen-posts.mjs` — 1080×1080 brand-framed posts from live
  Printify mockups. Output `ops/social/img/` (committed; repo is PUBLIC so
  raw.githubusercontent URLs feed Instagram).
- Plan + captions: `ops/social/PLAN.md`. State: `ops/state/social-posted.json`
  (queue + permalinks), `social-approval.json`, `social-connections.json`.
- Publishing: Composio — `FACEBOOK_CREATE_PHOTO_POST` (page_id
  1279433691919584) and Instagram two-step (`INSTAGRAM_POST_IG_USER_MEDIA` →
  `..._PUBLISH`), **always with account "kindlyput" / ig_user_id
  28354576864126987** (a second IG, @fhtautorepair, is connected — never
  default-post).

## Arb monitor (Phase 0)
- `node arb/monitor.mjs scan` — public Kalshi events + Polymarket gamma
  markets; bracket-sum + cross-venue detectors; JSONL logs in
  `ops/state/arb/`. `summary` mode aggregates.
- Structural honesty baked in: buy-set flagged non-actionable
  (exhaustiveness), cross matches graded match-risky, depth recorded.
- Details: [[Trading lane]].

## Video pipeline (YouTube)
- Scripts: `channel/scripts/*.md` (scene-annotated). Parser:
  `node pipeline/scenes.mjs <script> --write` → `video/manifests/*.scenes.json`.
- Remotion assembly: `channel/video/` (`npx remotion render src/index.ts
  Pilot out/x.mp4 --frames=A-B`). Real diagrams map by scene idx in
  `src/Root.jsx`.
- Blender (portable, `C:\Users\tomas\tools\blender-5.1.2-windows-x64\`):
  headless scene scripts in `channel/video/blender/` (brake_corner,
  engine_cutaway, cooling_loop) →
  `blender.exe --background --python <scene>.py -- <outdir> <frames>`,
  then ffmpeg to mp4.
- **The render→watch→fix loop**: `/watch` skill
  (`python ~/.claude/skills/watch/scripts/watch.py <mp4> --no-dedup
  --max-frames N --resolution 1024 --no-whisper`) → Read the frames →
  fix what you see BEFORE shipping. Non-negotiable QA step; it has caught
  a flaw in every asset so far.
- Full pipeline map: [[YouTube channel]].

## Skills installed on this rig
`watch` (see own renders) · 13 Blender skills (turntable/dolly/crane/
polyhaven-* — security-screened, Meshy-dependent ones excluded) ·
superpowers · claude-mem · gstack suite · FHT shop skills.

## Recurring automation (SESSION-BOUND — re-arm after any restart)
1. Daily social post 10:23am
2. Arb scan every 2h at :07
3. Etsy key probe every 2h at :43
Crons die with the session and auto-expire in 7 days. For persistence,
migrate to scheduled cloud agents.

Related: [[House rules]] · [[Operations log]] · [[Open loops]]
