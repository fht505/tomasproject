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

## Community-tier addendum (round 5, 2026-07-29) — read the epistemics first

A second run targeted what real sellers report (Reddit seller subs, Etsy
Community, YouTube postmortems, 2024-2026) with a stated bar of 3+ unrelated
dated seller reports per pattern. **Zero findings met that bar.** Reddit is
effectively closed to automated research (1 fetch survived), and the entire
surviving evidence base is one heavily monetized coaching blog plus Printify's
own Shopify app review page. Everything below is LEAD-TIER — leads to test
against our own shop data, not facts.

- **Niche warning (one seller, incentive-biased, directly on point):** an
  established POD seller warns "Mamas, Nurses, Teachers are too broad for
  beginners" — our exact lineup. She sells a keyword-research product, so
  "do more research" is her funnel. Recorded because it is the only strategic
  signal found and it may well be right; the designs are made and staged, so
  the launch itself is the cheap demand test.
- **Q4 shape (same single seller):** Nov 2024, 10-15 orders/day before
  Nov 15, rarely under 20/day after, Black Friday best day (38). One shop's
  seasonality, least marketing-sensitive number on the page.
- **Scale + trend (same seller):** $21K gross / $9.3K net in Nov 2024;
  full-year revenue DOWN ~$26K to $109K in 2025 — the decline is an admission
  against interest, so it is the most credible number she publishes.
- **Printify aggregate:** 4.7 stars across 4,272 Shopify-app reviews (~4% at
  1-3 stars) — Shopify merchants, not Etsy sellers, cumulative since launch.
  Two mid-2026 1-star leads: ruined prints with a 3-attempt partial-refund
  fight, and providers creating tracking labels without shipping, with
  Printify siding with its partners. Nothing provider-specific survived on
  Printify Choice / Candle Builders / SPOKE / Fulfill Engine — unanswered,
  not cleared.
- **14 claims REFUTED**, including every specific suspension-mechanic and
  reserve-percentage figure circulating in seller-services marketing (25%/45
  days, 75%/90 days, "AI non-disclosure = suspension trigger", "one IP
  complaint = review within hours"). Those all trace to vendors selling
  suspension/protection services. The official-docs findings above remain the
  only verified reserve facts.
- Still unanswered after both runs: time-to-first-sale base rates, reserves
  in practice, real suspension stories. **Our own shop stats become the best
  data available the day we publish.**

## Operator-supplied Reddit evidence (2026-07-29, 11 screenshots)

The operator hand-delivered what automation could not: two threads
(r/EtsySellers ~Nov 2025, r/Etsy ~2024), ~15 distinct sellers. This is the
first genuinely independent seller-voice data in the whole research set, and
several patterns now MEET the 3+ unrelated-sellers bar. Venue bias noted:
r/EtsySellers skews negative on POD and complainers self-select — treat the
magnitudes with care, the mechanics as real.

**Patterns that clear the bar:**

1. **Reserve float is the #1 repeated warning (4 sellers).** "Plan on
   financing out of pocket for the first six months"; "if you're selling ten
   shirts a day that's hundreds or thousands fronted until the reserve
   lifts"; "you might have to front a lot of money until you get paid."
   Confirms the official-docs finding from the seller side. At our realistic
   early volume (0-3 orders/day) the float is modest — low hundreds — but it
   must be AVAILABLE. Failure mode named by a top-1% commenter: unable to pay
   Printify -> unfulfilled orders -> "a direct pipeline to getting booted."

2. **The $1-3/shirt trap (5 voices).** Sellers who priced to compete at the
   bottom report $1-3 profit per shirt, negative with ads, and burnout into
   quitting POD. This is the counterfactual that justifies our $5 floor and
   $23.95 premium pricing: the model that fails on Reddit is the one our
   margin guard already refuses to run. The open risk is the flip side —
   whether a zero-review shop converts at premium prices. Unknown until live.

3. **First sale takes weeks, not days (3 timelines).** ~1 month (POD,
   ~30-40 sales in year one); just over a month (non-POD 3D shop); 3 weeks
   WITH daily ads and daily listing optimization. Calibration: silence in
   weeks 1-3 is the NORM, not a signal to thrash the shop's SEO.

4. **Who eats fulfillment failures (3 sources).** Seller refunds the buyer
   in full including shipping; IF Printify accepts photo proof it refunds
   the ITEM only, never the shipping — the gap is the seller's. One seller
   reports wrong items shipped to 3 different customers; late-shipping dings
   on Etsy metrics also reported (matches the mid-2026 Shopify reviews).
   Plan: assume a low single-digit % defect/mistake rate in mental math, log
   every incident in the ledger, and remember on-time-ship feeds ranking.

5. **Niche focus — the strongest strategic signal across ALL rounds, with a
   recorded split.** Two sellers: multiple niches tank conversion / "pick one
   niche, dominate it, then expand" (one reports first-page domination of an
   unsaturated niche after a few sales). One seller: multi-niche launch is
   fine, refine later. Adding the round-5 blogger's "Mamas, Nurses, Teachers
   are too broad for beginners", three independent sources now point the
   same direction. Our 34 listings span 5 niches. The batch is built and
   staged - unstaging is waste - but the POST-LAUNCH plan should follow the
   signal: watch 2-4 weeks of stats, identify the niche that moves, and
   point batch 3 plus shop sections at THAT niche instead of widening.

**Split evidence, recorded as such:** free shipping — one seller saw a small
maybe-real lift, one (UK, cheap shipping) swears by it for visibility and
conversion, one says it only worked after repricing ("perceived value"), the
2024 thread warns it just moves cost. Consistent with the official sub-$6
rule: fold shipping into price when the price still reads right, not as
dogma. Etsy Ads — one seller went NEGATIVE per shirt with ads on; one
credits daily ads for a 3-week first sale. Both can be true: ads buy speed,
not margin. Our sequencing (launch organic, decide ads from data) stands.

**Lead-tier only:** "99% of new shops fail" — one commenter, no source.

## Applied 2026-07-29 (~03:15) — research converted into changes

1. **Titles rewritten to the Aug-2025 guidance** across all 40 listings:
   ≤15 words, item noun attached to the phrase, recipient/occasion phrases
   stripped from titles (they already live in the tags). Done in
   gen-listings.mjs (trimTitle), and the old "under 90 chars = wasted
   surface" warning inverted — long is the smell now.
2. **Apparel price ladder**: 2XL +$2, 3XL +$4 (4XL/5XL mapped if ever
   enabled). Fixes the $5.10 worst-case tee net revealed by the first cost
   readback without touching the $23.95 base price buyers compare on. The
   margin guard now evaluates every variant at ITS OWN price and lets the
   thinnest decide.
3. **Drafts restaged** with both changes — they were unpublished, so the
   rewrite cost zero ranking history.
4. **ops/SHOP-COPY.md** — paste-ready About section (verified ranking
   input), announcement, and a photos-first replacement policy that routes
   defects to Printify reprints instead of open-ended returns (three sellers
   independently reported the seller eats the refund gap otherwise).

Deliberate NON-changes, with reasons:
- **Niche spread stays for launch.** Three sources say focus; the batch is
  built and unstaging is pure waste. The signal becomes the BATCH 3 rule:
  2-4 weeks of live stats pick the winning niche, new designs and the five
  trademark-replacement slots go there, shop sections reorganize around it.
- **Shipping model unchanged for launch** (buyer pays). Folding shipping
  into prices requires the real per-product US rates and a deliberate
  repricing pass — queued as the first post-launch experiment, not a 3am
  edit. Sub-$6/free shipping evidence is real but split on mechanism.
- **No Etsy Ads at launch.** Split evidence — ads buy speed, not margin
  (one seller went negative per shirt). Decision point: after 2 weeks of
  organic data, or sooner if traffic is literally zero.
- **The 5 rejected phrases stay unreplaced** until niche data exists —
  those slots are ammunition for the winner.

Standing operational rules (from verified findings):
- Use fondlymade.etsy.com links exclusively for any external posting.
- Answer every buyer message same-day — response rate is a ranking input.
- Expect a possible reserve on sale #1; tracking releases it; keep a small
  float for early Printify costs.
- Weeks 1-3 silence is the community norm — do not thrash titles over it.
- No Etsy Plus, no ads-for-ranking — verified zero organic effect.
