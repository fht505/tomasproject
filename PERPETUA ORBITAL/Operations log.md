---
tags: [chronicle]
updated: 2026-08-21
---

# Operations log — the story so far

The complete arc of PERPETUA ORBITAL, distilled from the primary working
session. Raw transcript (word-for-word, includes every command and result):
`C:\Users\tomas\.claude\projects\C--Users-tomas-fht\812d7f2e-ef9c-4bc9-9cdb-416efccc85f9.jsonl`

## July 2026 — foundation
- Pipeline moved to Windows; Printify integration built; 40 products validated.
- 41 platforms vetted → lane research method born (AI clause vs automation
  clause checked separately). See [[Dashboard]].
- **FondlyMade → KindlyPut** Etsy shop launched **2026-07-29** with 34
  listings (name taken at registration; systems renamed). OAuth2 PKCE client
  built (`ops/worker/etsy.mjs`), TM screening method established (29/34
  phrases cleared).

## Aug 4–5 — expansion
- 5-day/3-view diagnostic: verified cold start, not misconfiguration; fixed
  shipping contradiction; auto-renew on; 10 shop sections.
- Batch-3: 12 fall/funny candles published → 46 physical listings.
- Batch-4: 6 Thanksgiving printables designed, TM-screened (terminal-2
  method), rendered programmatically (SVG→sharp→pdf-lib, no image model),
  listed via Etsy API as digital downloads → **52 active listings**.
- YouTube + DistroKid lanes deliberately un-parked; car-symptom channel
  designed (see [[YouTube channel]]).

## Aug 6–7 — the Etsy outage begins
- Shop billing suspension (operator fixed same day) killed the API app.
  Dashboard says "Approved"; every API call 403s. Full saga in
  [[KindlyPut shop]].
- Composio verified for Instagram/Facebook posting; social plan drafted.

## Aug 10 — the marathon day
- **Etsy key diagnosed to the endpoint**: dead in all three Etsy systems
  (REST ping, OAuth token, consent page) with correct credentials — server-
  side deactivation only Etsy can fix. Ticket **#26418530** filed.
- **Social launched**: FB Page KindlyPut + IG @kindly.put created,
  Composio connected, 9-post batch approved, intro post live on both.
- **Arb monitor built** (Kalshi + Polymarket US, log-only). See
  [[Trading lane]].
- **Station app era-2 refit**: console renders real state incl. live API
  probes; published as private artifact.
- **All 16 season scripts written** for the YouTube channel + 107-question
  TECH CONFIRM review doc.
- **Blender pipeline stood up from zero**: 3 hero 3D assets built (brake
  corner, engine cutaway, cooling loop), each iterated via the
  render→watch→fix loop (the `/watch` skill lets the agent see its own
  renders).
- Apparel workbench pushed to vault for parallel session ([[Apparel workbench]]).
- Kalshi (candidate) + Polymarket US (flagged) added to lane board (52 lanes).

## Aug 11–12 — steady state
- D1 candle post published (cron missed its window; posted manually).
- Hourly Etsy + arb watchers ran; 45 arb scans logged, zero real edges
  (filters correctly killing fake ones — the honest baseline).

## Aug 12–21 — the gap
- Session closed ~Aug 12; all session-bound crons died. Social went dark
  after D1; arb logging stopped; Etsy stayed 403 with no visible support
  reply.

## Aug 21 — restart
- P4 post published (both platforms), daily cron re-armed with the
  two-IG-account safeguard (@fhtautorepair was connected by another session;
  KindlyPut posts target `kindlyput` explicitly).
- Etsy bump drafted for ticket #26418530 (15 days dead at this point).
- Arb Phase-0 resumed; verdict pushed to ~Sep 4 for a continuous sample.
- This vault chronicle written.

## Standing lesson
Session-bound crons die with the session. For automation that must survive,
use scheduled cloud agents. Everything else — state files, scripts, git —
survives on disk.

Related: [[Systems handbook]] · [[House rules]] · [[Open loops]]
