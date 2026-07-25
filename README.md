# PERPETUA ORBITAL — Autonomous Commerce Station

A retro-terminal "space station" dashboard where a crew of AI agents lives and
runs small e-commerce businesses, working off a survival contract of
**$1,000,000,000,000**. Inspired by the agent-station tour videos: pixel crew
walking between modules, an Etsy print-on-demand factory, a gig thumbnail
studio, a competitor-research lab, a war room that kills underperforming
lines, an archive that remembers everything, and a bar to keep morale up.

Everything runs locally in your browser — no accounts, no backend, no build
step, no dependencies.

## Run it

Any static file server works:

```bash
cd station
python3 -m http.server 8080
# open http://localhost:8080
```

(Opening `index.html` directly won't work in most browsers because the app
uses ES modules, which require http(s).)

## What's inside

| Module | What it does |
|---|---|
| **BRIDGE** | Commander MAGNUS, crew roster/dossiers, operator directive log |
| **FACTORY 1** | Etsy Production Terminal — 3 storefronts, 6-step listing pipeline, procedurally rendered design previews |
| **FACTORY 2** | Autonomous Output Terminal — $20 thumbnail gigs with an order queue, plus a 2D game-asset forge |
| **VENTURES BAY** | Affiliate blog, music channel, prototype shipyard — low revenue, high option value |
| **RESEARCH LAB** | Competitor Replication Lab — watches "what sells", routes readouts that boost factory confidence |
| **COMMS LAB** | Unified inbox; ECHO drafts replies, you approve with one click |
| **TREASURY** | Burn rate, margin, cost ledger, contribution by line |
| **WAR ROOM** | Sol reviews, pivot proposals (EXECUTE / OVERRIDE), pivot log |
| **ARCHIVES** | Every event, chat line, sale, and directive ever — searchable, never deleted |
| **QUARTERS** | Morale board, poker table, the bar (the bar helps) |

Plus: live station map with walking crew sprites and speech bubbles, revenue
HUD, operations feed, mission control cards, daily objectives, milestones,
market-shift / viral-spike events, offline progress ("while you were away"),
and a directive bar — type an order and the research lab re-weights around it.

The simulation persists to `localStorage`. `UPLINK → FACTORY RESET` wipes it.

## Time

1 real second = 2 station minutes at ×1 speed (a "sol" ≈ 12 real minutes).
Speed controls: pause / ×1 / ×4 / ×16. Closing the tab is fine — the crew
keeps working while you're away (capped at one sol of catch-up).

## Optional: live model uplink

Out of the box every agent runs on a deterministic local simulation core.
If you want the crew's chatter, research readouts, and customer-reply drafts
written by a real model, open **UPLINK** (top right) and paste an Anthropic
API key. The key is stored only in your browser's localStorage and is used
only for direct calls to `api.anthropic.com`. Default model: `claude-opus-5`
(selectable). A few small requests per minute; disable any time.

Simulation revenue is fictional. The station does not actually sell candles
to middle America. Yet.

## Files

```
station/
├── index.html        app shell
├── css/station.css   CRT terminal theme
└── js/
    ├── data.js       modules, crew, generators, milestones
    ├── sim.js        simulation engine (economy, pipelines, events, morale)
    ├── map.js        canvas station map, corridors, crew sprites, minimap
    ├── ui.js         HUD, rails, feeds, modals, procedural design art
    ├── rooms.js      the 10 room terminal views
    ├── live.js       optional Claude API uplink
    └── main.js       boot, game loop, wiring, persistence
```
