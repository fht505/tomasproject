# ops/state — the only data the station is allowed to show

Every file here is written by a worker run against a real API, with a
`fetchedAt` timestamp. Nothing hand-authored, nothing synthetic. If a file
doesn't exist, the station renders that panel empty — that's the truth.

Planned files:

| File | Written by | Source of truth |
|---|---|---|
| `orders.json` | LEDGER run | Printify orders API |
| `products.json` | MERCH run | Printify products API (drafts + published) |
| `signals.json` | NOVA run | real keyword/market research output |
| `ledger.json` | LEDGER run | revenue/cost roll-up computed from orders.json |
| `inbox.json` | ECHO run | real buyer messages (phase 2) |

This directory intentionally starts empty except for this README.
