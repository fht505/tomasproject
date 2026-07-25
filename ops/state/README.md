# ops/state — the only data the station is allowed to show

Every file here is written by a worker run against a real API, with a
`fetchedAt` timestamp and a `source`. Nothing hand-authored, nothing
synthetic. If a file doesn't exist, the station renders that panel empty —
that's the truth.

| File | Written by | Source of truth |
|---|---|---|
| `orders.json` | `ops.mjs ledger` | Printify orders API, **redacted** (see below) |
| `products.json` | `ops.mjs ledger` | Printify products API (drafts + published) |
| `ledger.json` | `ops.mjs ledger` | revenue/cost roll-up computed from orders.json |
| `plan.json` | `ops.mjs plan` | resolved blueprints, providers, real base costs, margins |
| `staged.json` | `ops.mjs stage` | spec code → Printify product id, with its verified margin |
| `dry-run.json` | `ops.mjs stage --dry-run` | the exact payloads a real run would POST |
| `art.json` | `ops.mjs art` | PNG validation + print-master build results |
| `signals.json` | research run | real keyword/market research output |
| `lanes.json` | research run | scored expansion lanes |

There is no `inbox.json`, and there will not be one: Etsy's Open API v3
exposes no messages or conversations endpoint, so no buyer message can ever
be fetched into this directory.

## Two rules this directory enforces

**Derived numbers are labelled.** Anything computed rather than returned by
an API is named in a `derived_fields` array in the same file — for example
`ledger.json`'s platform fees, which apply your `ops/config.json` fee
schedule to real order totals.

**Buyer PII never lands here.** Printify order payloads carry `address_to`
with the customer's name, email, phone and street address. `ledger.mjs`
projects every order down to ids, status, timestamps and money before
writing, records what it dropped in `redacted_fields`, and aborts the write
outright if the result still matches an address- or email-shaped pattern.
This matters twice over: these files are served to the browser, and this
directory used to be committed.

Everything except this README is gitignored — it is per-shop runtime state,
not source.
