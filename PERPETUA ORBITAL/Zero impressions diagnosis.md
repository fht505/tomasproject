---
tags: [diagnosis, etsy]
created: 2026-08-21
---

# Why KindlyPut has ~7 views in 24 days

Four independent investigations against the live Etsy API (traffic stats,
search-visibility probes, config audit, external research) plus an
adversarial synthesis. ~110 API calls, all read-only.

## The fork that decides everything

**Views ≠ impressions.** A *view* = someone clicked into the listing. An
*impression* = the thumbnail appeared in search results. Impressions live
only in Shop Manager → Search Analytics, **not** in the API.

- **Fork A — impressions exist, clicks don't.** We're shown and ignored.
  Listing-level problem (thumbnails, titles, rank depth). Fixable by us.
- **Fork B — impressions don't exist.** We're never shown. Account/
  eligibility problem. Not fixable by editing listings.

7 views is consistent with *both*: ~350–700 impressions at a poor 1–2%
CTR, or ~0 impressions with a handful of direct hits. **Same number,
opposite remedies.** No public API call can tell them apart.

> [!important] THE DECISIVE TEST — free, 5 minutes, operator-only
> Shop Manager → Marketing → **Search Analytics** → Last 30 Days → read
> total **impressions**.
> - **< ~100** → Fork B. Escalate on ticket #26418530 (wording below).
> - **hundreds–thousands** → Fork A. Stop worrying about suppression
>   forever; it's a CTR/rank problem. Never contact support.
>
> Do NOT toggle vacation mode before reading this — it's a legitimate
> re-index trigger but it destroys the baseline measurement.

## Ranked causes

1. **Rank depth on a zero-history shop in saturated niches** —
   moderate-high. The specificity ladder proves ordinary ranking:
   "apple orchard candle" (pool 593) → not in top 100; "…autumn candle"
   (277) → #100; "…afternoon candle" (2) → #1. Same monotonic pattern on
   5 listings. We target brutal terms (chaos coordinator mug 1,808;
   grandma era sweatshirt 2,327; thanksgiving menu printable 2,067).
   **Against:** magnitude. 0.0056 views/listing-day is ~7× below even the
   pessimistic new-shop anecdote. Bad rank still leaks views.
2. **Account-level "reduced visibility" state** — moderate, unresolvable
   from here. Etsy has *admitted* to a state where a listing reads active
   to the seller but isn't served to buyers (Feb 2024 sweep), plus an
   unfixed platform de-indexing bug running Nov 2025 → 2026. Note the
   unexplained **bulk state change on all 52 listings inside a 7-second
   window, 2026-08-07 16:09:09–16:09:16 UTC**, plus a second bulk touch
   at 19:00:56. Machine-driven, actor unknown.
3. **Shipping profile / region exclusion** — genuinely untested. Etsy
   filters search to items that ship to the buyer. `item_weight` and all
   dimensions are **null on all 46 physical listings** while the shop is
   `is_calculated_eligible: true`. If any profile is calculated-rate,
   rates are uncomputable. The audit hit 401 (needs `shops_r`) and could
   not open a single profile. **3 minutes in the dashboard.**
4. **Undeclared production partners** — low as cause, HIGH as risk.
5. **Shop-quality gates** — real contributor. See fixes below.
6. **The Aug 6 billing suspension — EXONERATED.** Traffic was already
   ~1 view/day shop-wide *before* it, and 14.6 confirmed-active days
   since produced a lifetime total of 7. No source ties a resolved
   *billing* suspension to lasting suppression (Etsy treats them as
   administrative/auto-reversing; the "weeks-to-months" claims all attach
   to *policy* violations).

## Real defects found (fix regardless of the fork)

| # | Defect | Severity |
|---|---|---|
| 1 | **`production_partners` empty on 52/52** while 46 descriptions say "Printed and shipped by our production partner (Printify network)" and `who_made: i_did`. Verified not an API artifact (157 of 400 foreign listings return populated arrays). Undeclared POD partners are a **listing-removal risk**. | 🔴 account risk |
| 2 | **Shop has no policies at all** — every `policy_*` null, structured policies never onboarded. Etsy officially ties missing return policy to reduced search visibility. (A listing-level return policy *is* attached to all 46 physical.) | 🔴 |
| 3 | **12 of 22 candles have corrupted descriptions** — 11 store literal `\n`, 1 stores literal `<br>`. All from the Aug-5 batch; the Jul-29 candles are clean. Renders as a wall of visible escape characters. | 🔴 |
| 4 | No alt text on any image, 52/52 | 🟡 |
| 5 | `materials` + `style` empty 52/52; category attributes (scent, wax, size, color) **unmeasurable via API** — check dashboard | 🟡 |
| 6 | No weight/dimensions on 46 physical (see cause #3) | 🟡 |
| 7 | Thin images: 4 mugs at 1 image, printables 1–2, vs candles at 20 | 🟡 |
| 8 | **6 digital listings have auto-renew OFF and expire 2026-12-05** — they go dark unless renewed | 🟡 scheduled |
| 9 | No shop banner; buyer-promise off; no sale message | 🟡 |
| 10 | 2 printables mis-categorised into Digital Prints (wall art) vs Templates | 🟡 |

## Ruled out — stop worrying

The billing suspension · classic de-indexing (52/52 retrievable, shop
resolves in shop search) · listing state (all active, none private, none
sold out, nothing ever relisted) · **tags** (13/13 everywhere, 52 distinct
sets, none over 20 chars — genuinely well-built, **do not "refresh" them**;
micro-edits accomplish nothing and mass edits reset accumulated performance
data) · missing images · required-field errors · vacation mode/payments/
currency · the dead API key as a symptom · conversion and pricing
(unmeasurable at 7 views — **do not change prices**) · the "older listings
do better" effect (Poisson noise on n=7, p=0.380) · absence of *sales* at
24 days (normal; the absence of *views* is what's anomalous).

## Ads decision

**Not today — Search Analytics answers the same question for $0.** Then:
- **Impressions ~0** → run ads as a *diagnostic*: $3–5/day, 7 days, hard
  cap ~$35. Ads require a non-suspended shop and buy impressions directly.
  Paying for impressions and getting zero is the strongest possible
  evidence of an account restriction — and converts the support ticket
  from "I have no views" (canned reply) to "your ad system won't serve my
  listings" (routed). Ads *are a thermometer here, not medicine.*
- **Impressions in the hundreds+** → **skip ads entirely.** Paying for
  clicks into a funnel already failing at the click is a donation.
- Either way: fix defects 1–3 first. Don't buy traffic to a wall of `\n`.

## Support ticket wording (ONLY if impressions ~0)

Reply on #26418530, subject changed to include **"shop not indexed"**.
Full pre-written text lives in this diagnosis's source (workflow output);
the three questions that matter:
1. Is there any search-visibility limitation/restriction/reduced-visibility
   flag on this shop or any listing, including automated moderation?
2. What was the bulk state change on all 52 listings at 2026-08-07
   16:09:09–16:09:16 UTC? I didn't perform it. Prior state? Re-indexed?
3. Confirm the listings are **served in buyer-facing search**, not merely
   present in the index. If they simply rank low, say so plainly and I'll
   treat it as SEO and stop contacting you.

Related: [[KindlyPut shop]] · [[Open loops]] · [[Operations log]]
