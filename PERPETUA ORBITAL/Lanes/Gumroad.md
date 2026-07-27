---
lane: "Gumroad"
category: "Payment rail"
verdict: candidate
ai-policy: none-found
automation-policy: sanctioned-api
checked: 2026-07-26
tags:
  - lane/candidate
  - category/payment-rail
---

# ✅ Gumroad

| | |
|---|---|
| **Verdict** | `candidate` |
| **AI policy** | NO POLICY FOUND — a gap |
| **Automation policy** | sanctioned via official API |
| **Economics** | 10% + $0.50 PLUS 2.9% + $0.30 processing — 29% at $5, 21% at $10, 15% at $35 |
| **Time to cash** | $100 payout minimum (raised from $10 on 2026-03-23) |
| **Last verified** | 2026-07-26 |

> [!warning] A gap is not permission
> No rule was located. That is unallocated risk, not approval. Absence of
> an AI or automation policy means nobody has told us the answer yet.

## What we found

Inverts the Redbubble pattern — actively built FOR agent automation. The official CLI README reads 'Designed for humans and AI agents alike', it documents GUMROAD_ACCESS_TOKEN for CI and agents, exposes POST /v2/products for programmatic creation, carries an ai_product_details_generations endpoint, and explicitly permits multiple accounts. True worldwide merchant of record, so it carries the EU/UK VAT liability.

## Corrections

> [!note] These overturned something previously believed

- The $100 threshold claim was TRUE — pinned to a commit in Gumroad's own open-source repo dated 2026-03-23, corroborated by Wayback snapshots either side

## Risks

- The advertised '10% + $0.50' EXCLUDES card processing — its own help article says so. Real cost roughly doubles at low price points
- $100 payout minimum means ~50 sales at $10 before you see money
- Bans reselling PLR/MRR outright, naming our exact categories: ebooks, courses, prompts, notion planners, templates, fonts, presets

## Sources

- Gumroad open-source repo commit #4038

---
Generated from `ops/lanes.data.json` — edit there, not here. See [[Dashboard]].