# Preflight Review — 2026-07-25

Adversarial pass over the ops pipeline before launch night. What was actually
verified, what was fixed, and what remains unproven until we hold the real
Printify token.

## Fixed (verified by test)

**1. Art reuse built print masters at the wrong resolution — HIGH.**
`intake.mjs` keyed listings by `art_file` in a Map. Eight C-series listings
reuse A/B artwork on different products, and a Map keeps only the *last*
value per key — so a file used by both a tee (4500px target) and a mug
(2700px) was built at 2700px and would have printed soft on the shirt.
Affected 6 of 32 art files, including B18, B10, B16, B2, A9, A11.
Fixed: each master is now sized for the **largest** target among all listings
that use it (Printify downscales cleanly; it cannot invent detail upward).
Proven with a test render — B18 now builds at 4500px and reports `[B18,C4]`.

**2. Ledger silently under-reported revenue — HIGH (honesty violation).**
`ledger.mjs` stopped paginating when a page returned fewer than 10 rows,
guessing Printify's page size. If the real page size is 20 or 50, we would
have stopped after page one and displayed a *fraction* of real revenue as
though it were the total. Fixed: walk until a page comes back **empty**, honor
`last_page` when the envelope provides it, and record how many pages were
walked in the state file. Same fix applied to the products sync.

**3. Cancelled/refunded orders would inflate revenue — HIGH.**
Fixed: orders whose status matches cancel/refund/void are excluded from the
roll-up and reported separately as `excluded_orders`, so the exclusion is
visible rather than silent.

**4. Derived numbers were indistinguishable from API values — MEDIUM.**
Etsy fees are computed by formula, not returned by Printify. The ledger now
carries a `derived_fields` list and the treasury panel labels them as derived.

**5. Crash mid-staging orphaned drafts — MEDIUM.**
`stage.mjs` wrote `staged.json` only at the end, so a crash or rate-limit
partway through 40 products left drafts live on Printify with no local record
— and a re-run would duplicate them. Fixed: persist after every successful
create, and stop cleanly on a rate-limit response.

**6. Silent-guess failure modes in the product payload — MEDIUM.**
The print placeholder position defaulted to the string `front` when the
blueprint didn't expose one; for a mug wrap or candle label that is wrong and
would have produced a badly-placed print rather than an error. Now it throws.
Also added a guard when a blueprint yields more than 24 variants at a single
flat price (risk of selling an oversized variant below cost).

**7. Console honesty — MEDIUM.**
- The art-progress denominator was a hardcoded `32`; now derived from the
  batch spec so it can never drift out of sync.
- Added staleness: a ledger older than 6 hours is labelled in the HUD and the
  treasury panel, so an old pull can never read as current money.
- Agent status is now evidence-based — every crew member reads `NOT YET RUN`
  unless a specific state file proves it ran, and the roster header shows the
  honest count (`CREW — 2/15 HAVE RUN`).

## Not verified — open until we have the token

`developers.printify.com` returns 403 to automated fetches, so the following
are written from secondary sources and **must be confirmed on the first real
run**. Each has a defensive failure path rather than a silent wrong result:

- Exact product-creation payload shape (`print_areas` / `placeholders` /
  normalized x,y,scale). If it's wrong, `stage.mjs run` errors on product #1 —
  loud, cheap to fix, no bad data.
- Whether `GET /v1/shops.json` returns a bare array or a wrapped envelope.
  `cli.mjs verify` is the first command we run; if it prints nothing, that's
  the answer.
- Money field names and units in the orders response (`total_price`,
  `total_shipping`, `total_cost`; cents assumed).
- The publish body's exact key names, including the camelCase `keyFeatures`.
- Whether `publishing_succeeded` must be called to unlock a product after
  publish, or the Etsy integration handles it.
- Real page size for orders/products (now irrelevant to correctness — we
  paginate until empty).

**Also unverified and material to the batch:** whether Printify's catalog
actually carries a ~9oz custom-label scented candle from a US provider.
Twelve of our forty listings depend on it. `stage.mjs plan` answers this in one
command against the live catalog before anything is created — run it first.

## Run order tonight (unchanged, but plan is now load-bearing)

```
cli.mjs verify        -> proves auth + shop id, answers the envelope question
stage.mjs plan        -> proves the candle/tee/sweatshirt/mug/tote blueprints exist
intake.mjs            -> validates art, builds correctly-sized masters
stage.mjs run         -> creates drafts (idempotent, crash-safe)
publish.mjs approve   -> operator gate
publish.mjs run       -> live on Etsy
ledger.mjs            -> real numbers to the console
```
