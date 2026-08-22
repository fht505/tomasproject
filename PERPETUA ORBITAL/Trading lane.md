---
tags: [lane, trading]
updated: 2026-08-21
---

# Trading lane — Kalshi + Polymarket US (Phase 0)

**Round-7 verdicts** (2026-08-10): Kalshi = candidate (CFTC-regulated,
bots explicitly allowed, demo env, the cleanest automation posture on the
whole board). Polymarket US = flagged (legal again via QCX DCM; fresh CFTC
probe June 2026). The category's defining risk, in writing: **trading is
the first lane where downside is losing the stake.**

> [!warning] Hard lines
> Log-only until a measured post-fee edge exists. Hard capital cap + kill
> criteria in writing before deposit one. No VPN circumvention of the
> offshore Polymarket geo-block — it flouts a CFTC settlement and their
> standard remedy is balance confiscation. Rejected explicitly on Aug 10.

## Strategy shortlist (from the brainstorm, ranked)
1. **Bracket-sum arb** (intra-Kalshi): mutually-exclusive set with YES bids
   summing > $1 → sell the set (sound under exclusivity alone). Buy-the-set
   requires an EXHAUSTIVE outcome list — Kalshi's flag doesn't guarantee
   coverage, so the monitor marks buy-side non-actionable by construction.
2. **Cross-venue divergence** (Kalshi ↔ Polymarket): 1.5–4.5% pre-cost
   spreads documented, but liquid windows close in 2–7s (crowded by
   open-source bots) and resolution-wording mismatch is the classic killer
   ("who will RUN" ≠ "who will WIN"). Our niche = thin markets +
   match-confidence grading.
3. **Near-resolution favorites** (favorite-longshot bias) — testable from
   logs; not yet formalized.
4. **Model-driven niches** (weather vs NWS, CPI vs nowcasts) — where edge
   is knowledge, not speed. Next pivot if passive arb stays dry.
5. Shelved: market-making (inventory risk) · copy-trading (impossible on
   Kalshi; only exists as a Polymarket-wallet signal).

## The monitor
`ops/worker/arb/monitor.mjs` — public APIs only, no accounts. Hourly-ish
scans → `ops/state/arb/scan-*.jsonl` with fees (Kalshi 0.07·P·(1−P);
Poly flat 0.10%), book depth per leg, and structural caveats baked into
every record.

## Phase-0 data so far (honest read)
- 45 scans Aug 10–12, then a 9-day session gap; resumed Aug 21,
  **verdict due ~Sep 4** (continuous 14-day sample).
- Zero durable edges. One true sell-set hit (Italy PM, +$0.39/set) died on
  carry (~3.4%/yr on collateral locked to Dec 2027) and ~zero depth —
  correctly graded worthless.
- Interpretation if the pattern holds: passive structural arb is competed
  below usefulness → pivot to strategy 4 or kill the lane at $0 spent.

Related: [[Dashboard]] · [[House rules]] · [[Operations log]]
