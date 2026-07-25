# PERPETUA ORBITAL — Real Operations Console

The command center for a real business run by AI agents with a human
operator. **Nothing on screen is simulated**: every number renders from
`ops/state/*.json`, which only real worker/agent runs write (API pulls,
validated files, actual research). Empty panels are the honest state.

The earlier simulation prototype was removed by design — see git history.

## New here? → **[START-HERE.md](START-HERE.md)**

Three commands to get running on a fresh machine, and what the whole pipeline
does. The operator runbook is `ops/SETUP.md`.

## Run the console

```bash
cd station
python3 -m http.server 8080
# open http://localhost:8080
```

## Layout

- `START-HERE.md` — first thing to read on a new machine
- `ops/SETUP.md` — the operator runbook, start to first sale
- `ops/PLAN.md` — the operating plan (lane #1: Etsy POD via Printify)
- `ops/LANES.md` — the other four revenue channels, ranked and researched
- `ops/RUNBOOK-FULFILLMENT.md` — who pays when an order goes wrong
- `ops/MIGRATE.md` — moving this into its own repository
- `ops/BATCH-01.md` — seller-authored creative direction (Etsy AI-policy
  compliance lives here)
- `ops/PROMPTS.md` — copy-paste design prompts for image generation
- `ops/config.json` — the settings you edit; no secrets
- `ops/BATCH-01.listings.json` — generated production listing copy
  (built locally, not committed — it bakes in the real shop name)
- `ops/worker/` — real connectors and tools, all reached through `ops.mjs`:
  - `ops.mjs` — the single entry point; run it with no arguments
  - `doctor.mjs` — proves this machine can run everything
  - `cli.mjs` — Printify: verify token, browse blueprints
  - `gen-listings.mjs` — regenerates the listings file from spec tables
  - `tm.mjs` — trademark screen; staging fails closed without it
  - `intake.mjs` — design intake, validation, keying, print masters
  - `stage.mjs` — draft creation with the real margin guard
  - `publish.mjs` — approve, publish, unstage
  - `orders.mjs` — ship-by clock and stuck-order alarm
  - `ledger.mjs` — real orders into revenue state
  - `test-margin.mjs` — 36 checks over the money and deadline math
- `ops/state/` — **the only data source the console renders.** Every file
  has a `fetchedAt` and a real origin.
- `js/` — the console app (`real-main.js`, `map.js`, `data.js`)

## Crew

The pixel crew on the map represents the planned agent runs (research,
design intake, listings, ledger, comms). A grey dot = that agent has no
real run behind it yet; it lights up when its state file exists. Sprites
are representation; numbers are never invented.

## Launch gates (live in the console)

research → batch spec → art files → Printify token → drafts → published
→ first order. The console computes these from state files only.
