# PERPETUA ORBITAL — Real Operations Plan

**Rule zero: nothing staged.** The station shows $0.00 until real money moves.
The simulation engine gets removed and replaced by real connectors. Every
number on the dashboard traces to an API response or it doesn't render.

Written 2026-07-25 from live research (sources at bottom).

---

## Lane #1: Etsy print-on-demand via Printify

Chosen on real US search data (Semrush, July 2026), not vibes:

| Keyword | Vol/mo | Difficulty | Note |
|---|---:|---:|---|
| fall candles | 8,100 | 26 | Season peaks Aug–Oct — **window opens now** |
| teacher gifts | 12,100 | 40 | Back-to-school spike in August |
| teacher shirt | 1,600 | **6** | Near-zero SEO competition |
| girl dad shirt | 4,400 | **9** | High volume, tiny competition |
| retirement gifts for women | 9,900 | 40 | Evergreen gift intent |
| personalized cutting board | 8,100 | 21 | Printify has engravable boards |
| nurse gifts | 2,900 | 24 | Evergreen |
| custom pet portrait | 1,900 | 32 | Premium price point ($40–70) |
| personalized dog gifts | 1,600 | 26 | Evergreen |
| funny candles | 1,300 | 8 | Low competition |
| grandma shirt | 1,300 | 14 | Low competition |
| dog mom shirt | 1,000 | 11 | Low competition |

**Launch collections (first 40 listings):**
1. **Fall candle collection** (~12 listings) — custom-label scented candles via
   Printify. Rides the 8,100/mo seasonal wave that starts in August.
2. **Low-competition identity apparel** (~20 listings) — teacher / girl dad /
   dog mom / grandma / nurse shirts+sweatshirts. All KD ≤ 24.
3. **Cozy gift accents** (~8 listings) — mugs, totes in the same design
   families to multiply each design across products.

Lane #2 (later): Fiverr thumbnail gigs — demand is marketplace-internal, no
public API, human-fronted. Revisit after lane #1 ships.

## Why this is compliant (and stays up)

Etsy 2026 rules, baked into the pipeline as hard gates:
- **POD is allowed** with the production partner publicly disclosed →
  every listing description names the production partner, and Etsy's own
  production-partner field must be set. **This is not automatic.** Printify
  attaches the partner to a published listing only if a production partner
  already exists in the Etsy account; if none does, the listing publishes as
  "Made by seller", which is false and is a leading POD suspension trigger.
  Create the partner in Etsy before the first publish (SETUP.md step 2), then
  publish one listing and check the field on the live listing before the
  other 39 follow.
- **AI-assisted design is allowed when the seller directs creation** →
  the operator (Joe) sets creative direction via directives; agents execute
  and iterate. Prompts are ours, concepts are ours, no copied art.
- **Disclosure** → every listing description carries the AI-assisted
  disclosure and the "Designed by" attribution, written in by
  `gen-listings.mjs` from `ops/config.json`. Etsy's own listing-level
  attribution dropdown is set by the operator when the shop is created.
- **No trademarked phrases** → `node ops.mjs tm` screens every phrase we
  print and records a dated verdict; `stage` refuses to create a product
  whose phrase has no recorded PASS. It fails closed — an unscreened phrase
  is a blocked phrase. It cannot search on your behalf (there is no
  trademark API here, and a guess would be worse than nothing), so it hands
  over the exact USPTO and Etsy searches and keeps the record of what you
  found, which is also what you would want if a claim ever arrived.
- Research lab adapts *patterns* (niches, formats, price points) — never
  copies another seller's artwork or text.

## Architecture (real mode)

```
┌────────────── Claude Code Routines (the real agents) ─────────────┐
│ NOVA   nightly: niche/keyword research → signals.json             │
│ FLORA  design runs: concepts → image gen → upscale → print files  │
│ MERCH  listing runs: title/tags/desc/price → Printify draft       │
│ LEDGER daily: pull Printify orders + costs → ledger.json          │
│ ECHO   inbox runs: draft replies for operator approval            │
└──────────────────────────┬────────────────────────────────────────┘
                           │ writes/reads
                    ops/state/*.json  (repo = the archive, real one)
                           │
        Printify API ──────┤  POST /v1/shops/{id}/products.json
        (products, publish │  publish-to-Etsy, orders endpoints
         to Etsy, orders)  │  (200 publishes / 30 min cap)
                           │
                    station UI (REAL mode)
        renders ONLY ops/state — no synthetic orders, no fake feed
```

- **Agents = Routines in this environment.** No new framework. Each crew
  member is a scheduled run with a real job and real output committed to the
  repo. The archive room becomes literally true: every run, decision, and
  sale logged in git.
- **Publish gate:** agents create Printify *drafts*; nothing goes live on
  Etsy without operator approval in the station (one-click, like the comms
  lab). Loosen later if desired.
- **De-staging the station:** sim engine ripped out; HUD/feeds/rooms read
  `ops/state/`. Empty state renders as empty. First real order is the first
  dollar the HUD ever shows.

## Unit economics (estimates to validate, not promises)

- Shirt: Printify base ~$9–13 → sell $22–27 → ~$6–10 margin after Etsy fees
  (6.5% + processing + $0.20 listing).
- Candle: base ~$10–14 → sell $27–34 → ~$8–13 margin.
- Fixed costs: Etsy listing fees ($0.20 × listings), image-gen API
  (cents/design), inference. No ad spend until organic data says where.
- Reality: new Etsy shops typically see first sales 1–3 weeks after listing;
  velocity follows listing count and reviews. The metric we control week 1 is
  **listings shipped**, so that's the KPI until orders exist.

## Tonight's checklist (operator)

1. **Create the new GitHub repo** → tell me to add it; I migrate `station/`
   and build `ops/` there, out of the fht repo.
2. **Etsy seller account** — open shop (name TBD tonight; needs a bank
   account for Etsy Payments; ~$15 one-time shop setup fee applies in some
   regions).
3. **Printify account** (free) — connect it to the Etsy shop in Printify's
   UI (one OAuth click), then generate a **Printify API token** → give to me.
4. **Image-generation API key** — one of: OpenAI (gpt-image), Ideogram
   (best-in-class text-on-design, ideal for typographic shirts), or Recraft.
   Any one unblocks design runs → give to me.
5. **Anthropic API key** if you want the station's live uplink + agent runs
   billed to your key rather than run manually through sessions.
6. Decide **shop name** + whether pet portraits (personalized flow, more
   support load) join wave 1 or wait for wave 2.

With #3 and #4 in hand I can produce and stage the entire first batch as
Printify drafts the same night; you approve, we publish, the clock starts.

## Sources

- [Printify API reference](https://developers.printify.com/) — product
  create + publish endpoints, rate limits
- [Printify→Etsy integration guide 2026](https://listybox.com/blog/printify-etsy-integration-guide)
- [Etsy POD rules & strategy 2026](https://www.listadum.com/blog/understanding-etsys-rules-for-print-on-demand-sellers)
- [Etsy AI disclosure policy 2026](https://ngini.com/en-us/blog/etsy-ai-disclosure-policy-2026-explained)
- [Etsy AI art policy guide 2026](https://www.xhbt.org/open-calls/etsys-ai-art-policy-2026-complete-guide)
- Semrush keyword database (US, July 2026) — volumes/difficulty in the table
  above pulled live this session
