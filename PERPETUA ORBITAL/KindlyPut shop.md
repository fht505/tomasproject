---
tags: [lane, etsy]
updated: 2026-08-21
---

# KindlyPut — the Etsy shop

**Live since 2026-07-29** · https://kindlyput.etsy.com · shop ID 67181250
(named FondlyMade in early docs; renamed at registration).

## Catalog — 52 active listings
- **22 candles** ($28.95, net ~$14.08) — the strongest niche ("fall candle"
  44K competitors vs 870K for teacher shirts). Batch-1 (A-series) +
  batch-3 (D-series, funny/fall split into sections).
- **17 tees** ($23.95, worst-case net $8.72 w/ 2XL+$2/3XL+$4 ladder) +
  **2 crewnecks** ($35.95, net $9.19) — niches: teacher, dad-of-daughters,
  dog, grandma, nurse. Full table: [[Apparel workbench]].
- **4 mugs** ($9.35 net) · **1 tote** ($8.12 net) — mugs limited to one
  mockup photo (blueprint 68 exposes one camera).
- **6 digital printables** (P1–P6 Thanksgiving, $4.99–$6.99, ~100% margin) —
  rendered from SVG primitives, listed directly via Etsy API.

## Trademark ledger
- Cleared and live: 29/34 batch-1/2 phrases + batch-3 (15 pass/4 fail,
  failures replaced) + printables (GATHER failed → shipped
  thankful/grateful/botanical variants).
- **5 freed slots** never refilled: A2, A5, B3, B10/C6, B17.
- Standing caveat: "Emotionally Unavailable" = candles ONLY (live Cl-25 mark
  Reg 5323922).

## The API outage saga (ongoing)
- **~Aug 6:** shop billing suspension (operator resolved same day). Shop
  restored; API app killed.
- **Aug 7–10:** diagnosed exhaustively. Key dead in all three Etsy systems —
  REST (`openapi-ping` 403 with bare keystring), OAuth token endpoint,
  consent page ("application not recognized") — while dashboard shows
  Approved. Credentials verified char-for-char. No self-service fix exists
  (no regenerate, no second seller app allowed, callback re-save no-op).
- **Aug 10:** ticket **#26418530** to developer@etsy.zendesk.com with the
  full evidence table. Auto-ack same day ("few business days").
- **Aug 21, late evening: RESOLVED.** The API came back — 200 on
  `openapi-ping`, `GET /shops/67181250`, and OAuth endpoints (stored access
  token was merely expired; the refresh path rotated it automatically).
  Ticket #26418530 appears to have been fixed server-side with no visible
  reply. **The drafted bump email is moot — do not send it.**
- Lasting gotcha: a bare keystring still 403s with "Shared secret is
  required" — that is the documented composite-key quirk, not an outage.
- **Cost of the outage**: 15 days blind on views/favorites, and the Etsy Ads
  decision parked the whole time.

## 🔴 The number the outage was hiding

First stats pull since Aug 6, taken 2026-08-21:

- **~7 total views · 1 favorite · 0 shop favorers · 0 receipts · 0 sales**
  across **52 listings in 24 days live**.
- **47 of 52 listings have exactly zero views.** Best performer ~3.

This reframes the lane completely. $0 revenue was being read as a
cold-start/conversion problem. It is a **zero-impressions problem** —
nothing is reaching search at all. A healthy new shop sees orders of
magnitude more than this in three weeks.

**Ruled out:** tag clumping. Live check shows 52 listings / 52 distinct tag
sets / none untagged — the old 13-shared-sets defect is genuinely fixed and
is not the cause. Shop is not on vacation (`is_vacation: false`).

**Leading suspicion:** the ~Aug 6 billing suspension de-indexed the shop
from Etsy search and it never recovered. Under active investigation
(traffic pattern by listing age, direct search-visibility probes, config
audit, external research).

> [!warning] Do not buy Etsy Ads until this resolves
> Ads purchase impressions directly, which papers over an organic-search
> problem but proves nothing if the shop is suppressed — and spends real
> money into a void. Resolve visibility first.

## Sales state
$0 revenue, 0 orders — now authoritative from Etsy's own `receipts` count,
not inferred from Printify. Social marketing ([[Social playbook]]) is the
one channel currently able to reach buyers, since it bypasses Etsy search
entirely.

## Queued when signals arrive
Christmas printables shelf (same-day build) · batch-5 (niche chosen by
sales data) · Halloween SVGs · eBay lane (wakes on sales) · Gumroad
(digital catalog ready) · late-Sept check on A12 "First Day of Fall 2026".

Related: [[Dashboard]] · [[Operations log]] · [[House rules]]
