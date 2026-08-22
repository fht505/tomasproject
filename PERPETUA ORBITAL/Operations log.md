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

## Aug 21 (late) — the API returns, and the real problem appears
- A second session opened on the vault, read the map, and did the right
  thing: **checked every claim against live APIs instead of trusting the
  chronicle.** It found the Etsy API answering 200 — independently
  re-verified here. 15-day outage over; ticket resolved with no reply.
- First stats pull since Aug 6 exposed the actual business problem:
  **7 views / 1 favorite / 52 listings / 24 days, 47 listings at zero.**
  Zero-impressions, not conversion. See [[KindlyPut shop]].
- Tag clumping ruled out live (52 distinct tag sets).
- Four-lane diagnostic launched: traffic-pattern-by-age, direct
  search-visibility probes, config audit, external research.
- Coordination note: the second session reported "crons are dead" — that
  was a false alarm born of scoping (cron lists are per-session, so it
  could not see this session's three live jobs). Re-arming would have
  double-posted to a live storefront. **One session owns the crons.**

## Standing lessons
1. Session-bound crons die with the session. For automation that must
   survive, use scheduled cloud agents. Everything else — state files,
   scripts, git — survives on disk.
2. **The vault is a chronicle, not an oracle.** Probe before reporting;
   state changes underneath the notes. The second session's instinct to
   verify is exactly right and should be the norm.
3. **Crons are session-scoped.** A session seeing an empty cron list has
   learned nothing about other sessions. Never re-arm on that evidence
   alone — confirm with the operator which session owns the loops.

Related: [[Systems handbook]] · [[House rules]] · [[Open loops]]
