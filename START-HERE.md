# Start here

You are on a fresh machine. Three commands, then the pipeline tells you what
to do next by itself.

```bash
cd station/ops/worker
npm install          # one dependency (sharp), ~30s
node ops.mjs doctor  # proves this machine can run everything
node ops.mjs         # where you are, and the single next action
```

`node ops.mjs` is the only command you have to remember. Run it any time you
lose your place — it reads the real files and prints the one thing to do next.

---

## What you need before starting

| | Why | Time |
|---|---|---|
| **Node 20 or newer** | the whole toolchain | 5 min if not installed |
| **An Etsy shop** | the storefront | ~20 min incl. bank + ID |
| **A Printify account, connected to Etsy** | the manufacturer | ~10 min |
| **Your ChatGPT app** | the 34 designs | — |
| **~$100–200 headroom on a card** | Printify charges base cost at order time, Etsy pays out later | — |

Full step-by-step, with the exact Etsy and Printify settings that matter:
**`ops/SETUP.md`**. Read section 2 before publishing anything — the production
partner setting is the one that gets POD shops suspended when it is missed.

---

## The whole pipeline

```bash
node ops.mjs doctor             # can this machine run it
node ops.mjs verify             # prove the token, find the shop id
node ops.mjs listings           # generate the 40 listings
node ops.mjs plan               # real blueprints, providers, costs, margins
node ops.mjs tm                 # trademark-screen every printed phrase
node ops.mjs art next           # which design to make, with its prompt
node ops.mjs art add <file>     # file a download under the right code
node ops.mjs art                # build print masters
node ops.mjs stage --dry-run    # build every payload, send nothing
node ops.mjs stage              # create the drafts
node ops.mjs review --mockups   # look at the artwork
node ops.mjs approve all        # your gate
node ops.mjs publish            # live on Etsy
node ops.mjs orders             # daily: ship-by clock + stuck-order alarm
node ops.mjs ledger             # daily: real revenue
```

Every command is safe to re-run. Nothing publishes without `approve`.

---

## Where the time actually goes

Roughly 4 hours to launch, and about 3 of them are drawing:

- accounts and settings — ~35 min
- **34 designs in ChatGPT — ~2–3 hrs** ← the real cost
- trademark screen — ~20 min
- review, approve, publish — ~30 min

Then ~5 minutes a day: `node ops.mjs orders`, then `node ops.mjs ledger`.

---

## What protects you

- **Margin floor.** Every draft's real base cost is read back from Printify
  and priced against your fee schedule. Anything under `min_margin_usd` is
  deleted immediately, and told you the price it would have needed.
- **Nothing publishes at unknown fees.** Publish refuses until you confirm the
  Etsy rates against your own account.
- **Trademark gate fails closed.** An unscreened phrase cannot be staged.
- **Art gates are print-fatal.** No transparent background on a garment, or
  resolution too low, and it does not enter the batch.
- **Runaway guards.** Per-run and cumulative product ceilings, counted from
  the live Printify shop before anything is written.
- **No buyer PII in the repo.** Order pulls are redacted before writing, and
  the write aborts if redaction ever misses.

`node ops.mjs test` re-proves the margin arithmetic and the ship-by clock
(36 checks) any time you want to trust it again.

---

## Reading order, if you want the background

1. `ops/SETUP.md` — the operator runbook. The one to actually follow.
2. `ops/PLAN.md` — what the business is and why it is compliant.
3. `ops/LANES.md` — the four other revenue channels, ranked, with the
   disqualified ones and why.
4. `ops/RUNBOOK-FULFILLMENT.md` — what to do when an order goes wrong. Fill in
   its deadline table before you need it.
5. `ops/PREFLIGHT.md` — what is still unverified about the Printify API.

## The console

```bash
cd station && python3 -m http.server 8080   # then open http://localhost:8080
```

It is read-only, and it renders only what is in `ops/state/`. Empty panels
mean nothing has run yet — that is the honest state, not a bug.
