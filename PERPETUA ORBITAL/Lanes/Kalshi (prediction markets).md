---
lane: "Kalshi (prediction markets)"
category: "Trading"
verdict: candidate
ai-policy: not-applicable
automation-policy: sanctioned-api
checked: 2026-08-10
tags:
  - lane/candidate
  - category/trading
---

# ✅ Kalshi (prediction markets)

| | |
|---|---|
| **Verdict** | `candidate` |
| **AI policy** | not-applicable |
| **Automation policy** | sanctioned via official API |
| **Economics** | CFTC-regulated US exchange; official API explicitly supports bots/algorithmic trading; API access free, per-trade fees apply; demo environment exists for zero-money paper trading |
| **Time to cash** | immediate on a winning trade - but negative-sum after fees without real edge |
| **Last verified** | 2026-08-10 |

## What we found

The cleanest bot-friendly venue found anywhere in the table: a regulated US exchange that PUBLISHES a trading API and allows automated strategies outright. The catch is the category, not the platform: trading is the first lane where the downside is losing the stake, not merely earning zero. Documented retail edges are narrow: cross-venue arbitrage vs Polymarket and market-making illiquid books. Anything else is disguised gambling.

## Risks

- Zero-sum minus fees: without a measured edge the expected value is negative, unlike every product lane
- Edge decays: arb spreads close as more bots chase them
- Capital is at risk the moment real money funds the account - hard cap and kill criteria are mandatory before deposit one

---
Generated from `ops/lanes.data.json` — edit there, not here. See [[Dashboard]].