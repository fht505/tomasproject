# PERPETUA ORBITAL — full to-do (2026-08-10, overnight build)

Ordering rule you set: **station app real and wired first** (done tonight),
then wire everything else up. Anything marked AGENT was done or is doable
without you; OPERATOR items are yours — most are minutes, not hours.

## ✅ Done overnight (agent)

- [x] Station app era-2 refit — rooms, crew, checklist, HUD now render the
      real operation: KindlyPut physical shelf (46, grouped by product),
      Digital Press (6 printables + listing IDs), Media Bay (YT channel
      state), Comms (social launch status), Ventures (52-lane board),
      live API probes in the HUD (`ETSY ✕ · PFY ✔`)
- [x] `station-sync.mjs` — one command (`node ops.mjs station`) refreshes
      the whole feed incl. live Etsy/Printify probes; `station-bundle.mjs`
      rebuilds the publishable artifact
- [x] Ledger/orders/products refreshed from Printify (0 orders, $0.00 — honest)
- [x] Kalshi (candidate) + Polymarket US (flagged) added to lane board (52)
- [x] Arb research filed: 1.5–4.5% pre-cost spreads real, liquid windows
      2–7s (crowded), our niche = thin markets + single-venue bracket arb

## 🔴 OPERATOR — the bottleneck three (~15 min total)

1. **Etsy shared secret → `.env`** (2 min) — confirmed rotated during the
   billing suspension; dashboard → copy keystring + shared secret into
   `ops/worker/.env`. Unblocks: views data, listing verification, the
   (overdue) Ads decision, station probe turning green.
2. **Social accounts** (~10 min) — FB Page "KindlyPut" + IG Business,
   linked; then tell the agent to generate the two Composio OAuth links.
3. **Social approval** (2 min) — yes/no/swaps on the 9-post contact sheet
   + captions (ops/social/PLAN.md).

## 🟡 OPERATOR — when convenient

4. YouTube channel creation — claim **@WhyIsMyCarDoingThat** (~5 min).
5. Pilot script review — `channel/scripts/01-car-shakes-when-braking.md`,
   7 × [TECH CONFIRM]: cause ranking, three cost ranges from real
   invoices, machine-vs-replace policy, urgency tiers.
6. Terminal-2 trademark screen — paste `ops/CHANNEL-NAME-SCREEN.md`.
7. ElevenLabs Creator ($22/mo) when ready → voice audition (3 candidates).
8. Kalshi: nothing to fund yet — monitor must prove edge first.

## 🟢 AGENT — queued next (in your stated order)

9. **Etsy verification sweep** (the moment #1 lands): views/favorites on
   all 52 listings, shop health, then the **Ads decision** with real data.
10. **Social go-live** (after #2+#3): Composio connections verified,
    day-1 intro post out, then one post/day per PLAN.md.
11. **Kalshi/Polymarket arb monitor** (Phase 0, $0 at risk): log-only bot —
    bracket-sum scans, cross-venue divergence with realistic-fill and
    resolution-match grading, two weeks of data → edge verdict.
12. YT pipeline build (post-TECH-CONFIRM): Remotion scene templates for
    the pilot, thumbnail template, channel art.
13. DistroKid EP experiment (~$40 cap) — parked until you fund Suno Pro.
14. Christmas printables shelf — same-day build when wanted.
15. Batch-5 candles / freed TM slots — wakes on first sales data.

## Decision points on the calendar

- **Etsy Ads** — was slated ~Aug 11 with two weeks of organic data; now
  gated on #1. Decide same day the API returns.
- **Kalshi funding** — only after monitor shows repeatable post-fee edge;
  hard cap + kill criteria set in writing before deposit one.
- **YT 90-day call** — starts counting at first upload, per design spec.
- Late Sept: A12 "First Day of Fall 2026" listing aging check.
