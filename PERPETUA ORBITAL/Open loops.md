---
tags: [todo]
updated: 2026-08-21
---

# Open loops — the living to-do

Mirror of `ops/TODO.md`, vault-side. Updated 2026-08-21 post-restart.

## ✅ Closed 2026-08-21
- ~~Send the Etsy bump~~ — **moot, the API recovered on its own.** Ticket
  #26418530 resolved server-side. Do not send the drafted email.

## 🔴 The live emergency — ONE operator action decides everything
0. **Read Search Analytics impressions.** Shop Manager → Marketing →
   Search Analytics → Last 30 Days → total **impressions**. Free, 5 min.
   - **< ~100** → we're not being served to buyers → escalate on #26418530
   - **hundreds+** → we're shown and ignored → CTR/rank problem, never
     contact support
   Do NOT toggle vacation mode first (destroys the baseline). Full
   reasoning: [[Zero impressions diagnosis]].
   While on that screen, also check: Search Visibility page · verification
   status · open all 5 shipping profiles (calculated vs fixed, destination
   list) · one candle + one tee in buyer view (are category attributes
   filled? do the `\n` characters visibly render?).

0b. **Three real defects to fix regardless of the fork** —
   production_partners empty on all 52 (account risk: undeclared POD
   partner), shop has no policies at all, 12 candle descriptions render as
   literal `\n`. Agent can fix #3 via API on approval; #1 and #2 are
   dashboard work.

## 🔴 Operator — the bottleneck items
2. **TECH CONFIRM review** — `channel/TECH-CONFIRM-REVIEW.md` (107
   questions, ~30–45 min, any format). Gates the entire 16-video season.
   Confirmed still unanswered as of Aug 21.
3. **ElevenLabs go/no-go** ($22/mo) — gates voiceover for all 16.

## 🟡 Operator — when convenient
4. YouTube channel creation — claim @WhyIsMyCarDoingThat (~5 min).
5. Terminal-2 name screen — paste `ops/CHANNEL-NAME-SCREEN.md`.
6. IG bio/website check on @kindly.put → https://kindlyput.etsy.com.
7. Decide: migrate crons to scheduled cloud agents so automation survives
   closed sessions (recommended after the 9-day blackout).

## 🟢 Agent — running / queued
- Daily social post 10:23am (queue: A9→B12→P1→D4→B14→C1; then batch-2
  composition for approval) — [[Social playbook]]
- Arb scans 2-hourly; Phase-0 verdict ~Sep 4 — [[Trading lane]]
- Etsy watcher 2-hourly; on 200 → verification sweep + Ads decision auto
- 3D asset build continues: air/fuel/spark path next — [[YouTube channel]]
- On TECH CONFIRM answers: fold into scripts, thicken to 10–12 min
- On ElevenLabs: 3-voice audition → pilot assembly → operator QC → waves of 5

## 📅 Calendar
- **~Sep 4**: arb Phase-0 verdict (edge or kill, $0 spent either way)
- **On API restore**: views/favorites sweep → Etsy Ads decision (organic
  data long overdue)
- **~Oct**: Christmas apparel/printables listing window opens
- **Late Sept**: A12 "First Day of Fall 2026" listing aging check
- **May 2027**: AC episode upload window

## Parallel-session handoffs
- Apparel design work: [[Apparel workbench]] (+ handoff prompt in the
  transcript, Aug 10)
- @fhtautorepair Instagram connected by another session — purpose lives in
  that session's context; KindlyPut posting is safeguarded against it.

Related: [[Operations log]] · [[Systems handbook]]
