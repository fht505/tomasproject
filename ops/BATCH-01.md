# BATCH-01 — Creative Direction & Listing Specs

This document is the **seller's creative direction** for the first 40
listings — the thing Etsy's 2026 AI policy requires the human seller to own.
Concepts, phrases, and art direction below are authored here, first; agents
execute this direction. Nothing is copied from another seller.

Status: SPEC (no keys yet). Becomes production input the moment the
Printify token + image key land.

---

## Hard gates (every listing, enforced in pipeline)

1. **AI disclosure ON**, attribution "Designed by [shop]", never "Made by".
2. **Printify declared** as production partner on the shop + listings.
3. **Phrase screen** before any draft: no exact match to live trademarks.
   Enforced, not just documented — `node ops.mjs tm` records a dated verdict
   per printed phrase and `stage` refuses anything without a PASS.
   Known red-list from screening (2026-07-25):
   - `GIRL DAD` standalone on apparel — contested (2020 athletic-apparel
     filing; "GIRL DAD GANG" registered for embroidered clothing; sellers
     have received infringement notices). **Do not print.** Use original
     constructions; the phrase may appear only descriptively in tags
     ("gift for girl dad") — never as the printed design.
   - No team names, brands, celebrities, song lyrics, movie quotes.
   - Pipeline gate: query USPTO public search for each printed phrase at
     draft time; exact live Class-25 match on the dominant wording = block +
     flag for operator.
4. **Text must be renderable**: ≤ 6 words primary text, high contrast,
   print file 4500×5400 px transparent PNG (upscaled), no clipping.

## Art direction (house style, wave 1)

- **Apparel**: vintage-wash typographic designs — arched retro serif or
  hand-script primary phrase, small botanical/star accents, distressed
  texture. 1-2 ink colors that pop on both black and heather shirts.
  NOT: clip-art collages, gradients, thin hairlines (print poorly).
- **Candle labels**: warm cream label, modern serif + script pairing,
  small line-art motif (leaf/flame/pumpkin), muted autumn palette
  (terracotta, ochre, sage). Reads clearly at 3-inch label size.

## Pricing (validate against Printify base costs at draft time)

| Product | Base est. | List price | Margin est. after Etsy ~10% |
|---|---:|---:|---:|
| Unisex tee (Bella 3001) | $9–11 | $23.95 | ~$9 |
| Sweatshirt (Gildan 18000) | $15–17 | $34.95 | ~$13 |
| Scented candle 9oz | $10–14 | $28.95 | ~$11 |
| Mug 11oz | $6–8 | $17.95 | ~$7 |
| Tote | $8–10 | $19.95 | ~$8 |

---

## Collection A — Fall Candle Lab (12 listings)

Riding: fall candles 8,100/mo KD26 (season opens August), funny candles
1,300/mo KD8, personalized candle 590/mo KD18.

| # | Label design (our direction) | Prompt seed for image gen |
|---|---|---|
| A1 | "PUMPKIN SEASON" arched serif, tiny pumpkin line-art | cream candle label, modern serif "PUMPKIN SEASON", minimal pumpkin line drawing, terracotta+ochre, vintage apothecary feel |
| A2 | "SWEATER WEATHER" script + knit-texture border | script typography label, soft knit pattern border, sage+cream |
| A3 | "COZY ERA" bold retro serif, sunburst accent | 70s retro serif, warm sunset arc, muted browns |
| A4 | "FALLING LEAVES" serif, scattered leaf line-art | falling oak+maple leaves line art, autumn palette |
| A5 | "HARVEST MOON" serif, moon-over-field motif | minimal moon and wheat-field line art, deep amber |
| A6 | "BONFIRE NIGHTS" condensed caps, ember specks | campfire spark motif, charcoal+orange on cream |
| A7 | "HOT CIDER SZN" playful script, mug motif | steaming mug line art, cinnamon tones |
| A8 | "SMELLS LIKE FALL" tall serif, minimal | oversized typography only, tone-on-tone cream |
| A9 | funny: "EMOTIONAL SUPPORT CANDLE" small-caps clinical label | deadpan apothecary label parody, prescription-style layout |
| A10 | funny: "LIGHT ME WHEN THE KIDS ARE ASLEEP" script | wry script, tiny stars, midnight blue on cream |
| A11 | funny: "THIS CANDLE SMELLS LIKE I FINISHED MY TO-DO LIST" | typewriter font, checklist motif |
| A12 | "FIRST DAY OF FALL 2026" dated collectible serif | commemorative label, laurel accents |

Titles follow: `{Phrase} Candle | Fall Candle | Autumn Decor | Cozy Gift |
Soy Blend 9oz`. Tag bank A: fall candles, autumn candle, cozy gift, fall
decor, pumpkin candle, sweater weather, hostess gift, fall gift for her,
autumn home, harvest decor, funny candle, candle gift, seasonal candle.

## Collection B — Identity Apparel (20 listings)

**Teacher (5)** — teacher shirt 1,600/mo KD6; teacher gifts 12,100/mo KD40;
back-to-school spike in August:
- B1 "TEACHER ERA" retro arched serif, tee + sweatshirt
- B2 "PROFESSIONAL CHAOS COORDINATOR" typewriter stack
- B3 "TEACH · LOVE · INSPIRE" varsity arch, apple line-art
- B4 "FUELED BY COFFEE AND LESSON PLANS" script/serif mix
- B5 "BEST CLASS EVER · EST. 2026" collegiate crest

**Dads of daughters (4)** — demand 4,400/mo; phrase gate applies (§gates):
- B6 "PROUD DAD OF GIRLS" varsity arch, star accents
- B7 "OUTNUMBERED & LOVING IT" bold stack, arrow motif
- B8 "DAD OF DAUGHTERS · BEST JOB EVER" badge layout
- B9 "RAISING STRONG GIRLS" hand-script, lightning accent
- Tags may include "girl dad gift" descriptively; printed text never
  the standalone contested mark.

**Dog mom (4)** — 1,000/mo KD11 + personalized dog gifts 1,600/mo:
- B10 "DOG MAMA" retro script, paw accent
- B11 "PROFESSIONAL DOG CUDDLER" clinical small-caps parody
- B12 "MY DOG IS MY THERAPIST" typewriter, couch line-art
- B13 "RAISED ON BELLY RUBS" vintage wash serif

**Grandma (4)** — grandma shirt 1,300/mo KD14, nana gifts 1,000/mo:
- B14 "GRANDMA ERA" retro arched serif
- B15 "PROMOTED TO NANA · 2026" announcement badge
- B16 "GRANDMA'S GARDEN CLUB" botanical crest
- B17 "SPOILING IS MY LOVE LANGUAGE" script

**Nurse (3)** — nurse gifts 2,900/mo KD24:
- B18 "NURSE ERA" retro serif, heartbeat underline
- B19 "COFFEE · SCRUBS · REPEAT" stacked caps
- B20 "EMOTIONAL SUPPORT NURSE" small-caps parody

Title formula: `{Phrase} Shirt | {Niche} Gift | {Style} Tee | {Occasion}`,
then padded from the listing's own tags up to ~115 characters (Etsy allows
140 and every unused character is search surface left silent). Never name a
brand the garment is not: "Comfort Colors" is a Gildan trademark and this
pipeline resolves a Bella+Canvas 3001, so `gen-listings.mjs` fails the build
if a title contains it. Tag banks per niche assembled from the researched keywords
(teacher gifts, nurse gifts, grandma shirt, dog mom shirt, gift for her,
back to school, appreciation gift, …) — 13 tags each at draft time.

## Collection C — Gift Accents (8 listings)

Reuse the strongest A/B art on: mug versions of A9/A11/B2/B18, tote
versions of A2/B16, sweatshirt-only colorways of B1/B14. Zero new art cost;
multiplies keyword surface (custom dog mug 480/mo KD11, personalized
tumbler 1,900/mo KD28 informs later wave).

## Description template (all listings, compliance built in)

> {Hook line about the design}
> • Printed and shipped by our production partner (Printify network) in the
>   USA • {Product specs: fabric/size/care or wax/burn time}
> • Designed by {SHOP} — original design; created with AI-assisted tools
>   under our art direction (disclosed per Etsy policy)
> • Ships in 2–5 business days · Gift-ready
> {Sizing/care block per product type}

## Wave-1 KPI

The only number that matters before first sale: **40 listings live**.
Target: within 48h of keys landing. Then: listings→views→favorites→orders
tracked daily by LEDGER from real Etsy/Printify data only.
