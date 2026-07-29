# Etsy launch playbook — FondlyMade

Distilled from the 2026-07-29 deep-research run (106 agents, 24+ sources, every
claim 3-vote adversarially verified; 9 findings survived, 0 refuted). Sources
are Etsy's own Seller Handbook / legal Ranking Disclosures unless noted.
Caveat that governs everything: etsy.com 403s automated fetches, so quotes were
triangulated via search-indexed and Wayback copies rather than fetched live.

## What actually ranks a zero-review shop (verified)

1. **Query matching is wider than titles.** Tags, titles, DESCRIPTIONS,
   categories and attributes are all indexed; descriptions since 2022, with
   keywords wanted in the first few sentences (not a verbatim copy of the
   title). All 13 tags, varied; all relevant attributes; most specific
   category. Exact keyword matches can outrank partials.

2. **Conversion is a ranking INPUT.** Clicks, favorites and purchases on a
   query raise rank for that query — early conversion compounds. New shops
   start neutral, not penalized.

3. **The "new listing boost" is real but tiny and brief** (hours-to-days
   official; minutes-scale per an Etsy search engineer). Etsy itself says
   renewing/dripping to chase it is not a strategy. All-34-at-once vs drip
   should be decided by other factors; the boost is not one of them.

4. **Customer-service metrics feed ranking directly**: average review rating,
   message response rate, case rate (trailing 3 months). About-section
   completion may help. IP infractions hurt — which is why the trademark gate
   exists.

5. **Star Seller does NOT affect ranking** — it is a badge. But its underlying
   metrics (on-time ship, reviews, responsiveness) DO, via customer-experience
   scores. Chase the behaviors, not the badge. Etsy Plus and Etsy Ads do not
   influence organic placement either.

6. **Sub-$6 US shipping is prioritized in search** (since 2024-10-01;
   exception: $35+ free-shipping guarantee). Etsy's documented recommendation
   is to fold shipping cost into item price. Independent measurement found the
   immediate ranking effect small — but it also removes the #1 documented
   purchase barrier (shipping sticker shock).

## The August 2025 title guidance — decision needed before publish

Etsy now scores listings holistically and officially recommends titles that:
- state the item noun once, objective traits (color/material/size) up front
- run under ~15 words
- **exclude gifting phrases** — "gift for her", "teacher appreciation gift",
  "birthday present" belong in tags/attributes, not titles

Our 34 staged titles are the pre-2025 pattern this deprecates: 90-110
characters, pipe-separated, gift-phrase heavy. Because the drafts are
UNPUBLISHED, rewriting now costs nothing in ranking history — there is none.
Counterweights, recorded honestly: the guidance is recommendation-level, not
enforced; sellers report mixed results from bulk rewrites; and exact-match
still matters, so keywords must land in tags/attributes when they leave the
title. Decision at mockup review: rewrite titles noun-first (keeping every
removed phrase as a tag/attribute), or publish as-is and A/B later.

## Share & Save (fully verified mechanics)

4% instant refund on orders within 30 days of a click on a trackable link
(yourshopname.etsy.com, listing share links, promo-code links). Calculated on
order total incl. shipping/gift wrap, pre-tax. Last-click attribution; links
never expire; an Offsite-Ads last click disqualifies (we are opted out).
**Links inside Etsy Messages or listing descriptions earn nothing** — only
externally-driven traffic counts. Implication: every link we ever post
anywhere off-Etsy should be the fondlymade.etsy.com form.

## The documented worst case: payment reserve on the FIRST sale

Etsy explicitly lists "you recently made your first sale" as a reserve
trigger. Under a reserve, 50-100% of each sale (Etsy's own worked examples)
is withheld until 45 days after the sale — released early when Etsy can
verify tracking showing the order in transit. (This mechanic passed 2-1;
the tracking-release wording is load-bearing and reportedly fails
operationally for some POD shipping tiers.)

Operational consequences:
- Printify production costs are paid upfront; reserve means fronting cash on
  early orders. Not a reason to delay launch — a reason not to panic when it
  happens, and to keep a small float available.
- Tracking is the release valve: our US providers ship tracked, and
  `node ops.mjs orders` already watches tracking. Sync tracking to Etsy
  promptly (Printify does this automatically on fulfilled orders).

## What the research did NOT establish (open, not settled)

- First-sale base rates (30/60/90-day) and median first-year POD revenue —
  no credible dataset survived verification.
- Etsy Ads minimum budget / realistic ROAS for a zero-review POD shop, and
  day-1 vs later start.
- Printify defect/reprint/refund rates by product type; who eats return costs
  in practice.
- Q4 2026 seasonal timing: "fall candle" search peak, order-by deadlines for
  Halloween/Thanksgiving/Christmas against 10-day production, Cyber-event
  seller requirements. Re-research closer to the ramp or learn from our own
  shop stats.

## Launch actions distilled

Before publish (operator decisions at mockup review):
1. Title rewrite question above — yes/no.
2. Shipping: consider folding shipping into price for sub-$6 or free shipping
   (search priority + removes top purchase barrier). Interacts with the thin
   3XL tee margin — reprice tees at the same time if done.

At/after publish (no decision needed):
3. Complete the shop About section (ranking-relevant, verified).
4. Use fondlymade.etsy.com links exclusively for any external posting.
5. Answer every buyer message fast — response rate is a ranking input.
6. Expect a possible reserve on sale #1; tracking releases it.
7. Do not buy Etsy Plus or ads for ranking — verified to have zero organic
   effect.
