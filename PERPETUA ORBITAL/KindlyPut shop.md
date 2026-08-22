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
- **Aug 21:** still 403 (15 days). Bump email drafted referencing the
  ticket. 2-hourly watcher armed; on 200 → verification sweep + Ads
  decision fire automatically.
- **Impact**: buyers unaffected (storefront works); we're blind on
  views/favorites; the ~Aug 11 Etsy Ads decision remains parked on data.

## Sales state
$0 revenue, 0 orders as of Aug 21 (per Printify ledger pulls). First-sale
silence of 1–3 weeks was the community norm at launch… we're past that;
social marketing (see [[Social playbook]]) is the active lever while the
API outage blocks paid ads analysis.

## Queued when signals arrive
Christmas printables shelf (same-day build) · batch-5 (niche chosen by
sales data) · Halloween SVGs · eBay lane (wakes on sales) · Gumroad
(digital catalog ready) · late-Sept check on A12 "First Day of Fall 2026".

Related: [[Dashboard]] · [[Operations log]] · [[House rules]]
