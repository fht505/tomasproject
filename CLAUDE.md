# Perpetua Orbital — working context

A real print-on-demand business: original designs sold on Etsy, manufactured
and shipped by Printify. Not a demo, not a prototype. Real money, a real
seller account, real buyers.

## Rule zero

**Nothing is simulated, staged, estimated-as-fact, or filled in with a
plausible guess.** This is the operator's explicit and repeated instruction,
and it has already caught real defects three separate times.

In practice:

- A number either traces to an API response or a file on disk, or it does not
  render. Empty is the honest state.
- Anything computed rather than fetched is labelled — see `derived_fields` in
  the state files.
- Where a value cannot be verified, the code says so out loud rather than
  defaulting. `ops/config.json` ships with a blank `processing.days` and
  `fees_confirmed: false` for exactly this reason.
- Guards fail **closed**. An unscreened trademark phrase blocks staging; an
  unverified margin blocks publishing.

If you are tempted to write a placeholder, a sample value, or a "for now"
constant that looks like data — don't. Make it fail loudly instead.

## Architecture

Zero-dependency browser console (`index.html`, `js/`) that renders **only**
what is in `ops/state/*.json`. Plus a Node worker in `ops/worker/` that talks
to the real Printify API.

The single entry point is **`node ops.mjs`**. Run it with no arguments and it
reads the real files and prints the one next action. Everything else
dispatches through it — `doctor`, `verify`, `listings`, `plan`, `tm`, `art`,
`stage`, `review`, `approve`, `publish`, `unstage`, `orders`, `ledger`,
`test`. Only dependency is `sharp`.

## Where things stand

**Built and tested. Never run against a live Printify account.** No credentials
have ever been connected. Nothing has been published to Etsy. There are no
orders.

- 40 listings across 34 designs, generated from tables in `gen-listings.mjs`
- `ops/BATCH-01.listings.json` is **generated, not committed** — it bakes in
  the real shop name. Build it with `node ops.mjs listings`.
- 36 tests (`npm test`) cover the margin arithmetic, its boundaries, the
  accept/reject decision, and the ship-by clock
- The designs do not exist yet — that is ~34 images, the operator's biggest
  time cost, and the step gated behind `plan` on purpose

## The Printify API contract is UNVERIFIED

`developers.printify.com` returned 403 to every fetch attempt, so the request
and response shapes in `printify.mjs` come from prior knowledge, not from
reading the current docs. See `ops/PREFLIGHT.md`.

Consequences that are already handled — do not "simplify" these away:

- `stage --dry-run` builds every payload and sends nothing. Use it first.
- Base cost is read back from the **created product**, because the catalog
  endpoint may not expose it. If it is absent the draft is kept but marked
  `margin_verified: false` and publish refuses it.
- Every assumption about response shape throws with a message naming what to
  inspect, rather than silently defaulting.

## Gate order matters

`plan` comes **before** art deliberately. It proves the blueprints exist and
prices the real margins. If this account has no 9oz candle blueprint, twelve
of the forty listings are void — better to know that before drawing 34
designs, not after.

## Money

Margin = price − real Printify base cost − Etsy fees, where fees come from
`ops/config.json` and are **operator-supplied, not fetched**. `stage` computes
this per product from the worst-case enabled variant (flat pricing means the
most expensive variant decides profitability) and **deletes any draft under
`min_margin_usd`**, reporting the price it would have needed.

Publish refuses to run until `fees.fees_confirmed` is true.

## Things that have already gone wrong here

Learn from these rather than rediscovering them:

- **`{SHOP}` placeholder** would have published "Designed by {SHOP}" to Etsy
  40 times. Now double-gated.
- **Buyer PII** — name, email, phone, street address — was being written into
  git and served to the browser by the ledger. Now redacted with a tripwire
  that aborts the write if redaction ever misses.
- **`--dry-run --force` issued real DELETEs** because the retire step sat above
  the dry-run guard.
- **The alpha gate nearly blocked the whole project**: apparel needs
  transparent backgrounds, ChatGPT cannot produce them, and that is 22 of 40
  listings. Hence `ops.mjs art key`.
- **`hasAlpha` is true for a fully-opaque alpha channel**, so the transparency
  check has to sample pixels, not metadata.
- **A subtree split left the `.gitignore` behind**, because it lived above the
  split prefix. The token was one `git add -A` from being committed.
- **40 listings shared 13 identical tag sets**, so Etsy's de-clumping meant
  most paid their fee and ranked nowhere.

## Style

Match the surrounding code: comments explain *why*, especially where a
non-obvious choice prevents a specific failure. Prefer a loud failure over a
quiet default. When a guard exists, the comment says what it caught.

## Read next

`START-HERE.md`, then `ops/SETUP.md`. Business context in `ops/PLAN.md`, the
other four revenue channels in `ops/LANES.md`, order problems in
`ops/RUNBOOK-FULFILLMENT.md`.
