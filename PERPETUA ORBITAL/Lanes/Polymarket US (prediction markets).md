---
lane: "Polymarket US (prediction markets)"
category: "Trading"
verdict: flagged
ai-policy: not-applicable
automation-policy: sanctioned-api
checked: 2026-08-10
tags:
  - lane/flagged
  - category/trading
---

# ⚠️ Polymarket US (prediction markets)

| | |
|---|---|
| **Verdict** | `flagged` |
| **AI policy** | not-applicable |
| **Automation policy** | sanctioned via official API |
| **Economics** | Re-entered the US late 2025 via the QCEX/QCX acquisition (CFTC-licensed DCM); API open to US developers; fully collateralized contracts only, no leverage |
| **Time to cash** | immediate on a winning trade - same negative-sum caveat as Kalshi |
| **Last verified** | 2026-08-10 |

## What we found

Legal for US users again through the QCX designated contract market, and the API is open. Flagged rather than candidate for one reason: a fresh CFTC probe opened June 2026 while its application to fully reopen the main exchange is still pending - regulatory posture is in motion. Useful immediately as the second leg of a Kalshi arb MONITOR (log-only), which risks nothing while the dust settles.

## Risks

- Active CFTC probe (June 2026) during a pending application - rules could shift under an open position
- Same negative-sum trading risks as Kalshi
- Crypto-adjacent rails add operational complexity vs Kalshi USD-native accounts

---
Generated from `ops/lanes.data.json` — edit there, not here. See [[Dashboard]].