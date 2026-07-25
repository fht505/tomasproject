# PERPETUA ORBITAL — Real Operations Console

The command center for a real business run by AI agents with a human
operator. **Nothing on screen is simulated**: every number renders from
`ops/state/*.json`, which only real worker/agent runs write (API pulls,
validated files, actual research). Empty panels are the honest state.

The earlier simulation prototype was removed by design — see git history.

## Run the console

```bash
cd station
python3 -m http.server 8080
# open http://localhost:8080
```

## Layout

- `ops/PLAN.md` — the operating plan (lane #1: Etsy POD via Printify)
- `ops/BATCH-01.md` — seller-authored creative direction (Etsy AI-policy
  compliance lives here)
- `ops/PROMPTS.md` — copy-paste design prompts for image generation
- `ops/BATCH-01.listings.json` — generated production listing copy
- `ops/worker/` — real connectors and tools:
  - `cli.mjs` — Printify: verify token, browse blueprints, pull orders
  - `gen-listings.mjs` — regenerates the listings file from spec tables
  - `intake.mjs` — validates design PNGs, produces print-res masters,
    writes the art manifest
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
