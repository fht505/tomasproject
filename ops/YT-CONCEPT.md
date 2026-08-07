# YouTube lane — channel concept (draft, pre-approval)

Reference points the operator picked: @MackExplains7 (fully AI-run, 4M+ views)
and Millionaire Problems' "The Economics of Owning a Casino" (@millyproblems).
Both live in the same shape: faceless business-economics explainers, "how does
X actually make money," with a voice — Mack plays it straight, Millionaire
Problems runs a comedic persona. The niche supports multiple entrants because
it is topic-limited, not competitor-limited: nobody owns "the economics of a
laundromat."

## Format

- 6–10 min explainers: "The Economics of X" — businesses with surprising
  unit economics.
- Original researched script per topic (real numbers with sources — this is
  what clears YouTube's "not mass-produced" bar and makes the video good).
- AI voiceover, comedic-dry read. Same writer's room as the KindlyPut candle
  labels: wry, warm, specific.
- Visuals: programmatic animated diagrams (extend the existing SVG→sharp
  pipeline to frame sequences → ffmpeg) + licensed stock b-roll. Custom
  diagrams per video is exactly what separates us from the banned
  same-narration-slideshow class.

## Policy guardrails (from lane research, verified 2026-08-04)

- AI content is YPP-eligible if original + disclosed; enforcement is harsher
  than the written policy. Low volume, high originality — 1 video/week max.
- Disclose AI voiceover in the description; use the altered-content flag only
  where media is realistic-synthetic.
- $0 until YPP: 1,000 subs + 4,000 public watch-hours. Audience bet, not
  fast cash. Runs alongside Etsy, never ahead of it.

## Topic bank (12 — pilot marked)

| # | Topic | Hook |
|---|---|---|
| 1 | **The Economics of an Auto Repair Shop** ← PILOT CANDIDATE | Operator has insider ground truth — real labor-rate/parts-margin texture no AI channel can fake. Genuinely original research. |
| 2 | The Economics of a Laundromat | The internet's favorite "passive income" myth vs the real math |
| 3 | The Economics of a Car Wash | Subscription models turned a $4 wash into Wall Street darling |
| 4 | The Economics of Self-Storage | America pays $40B/yr to not look at its stuff |
| 5 | The Economics of Owning a McDonald's | The franchise fee is the cheap part |
| 6 | The Economics of Vending Machines | The $20/week machine vs the Instagram course fantasy |
| 7 | The Economics of a Golf Course | 150 acres of grass that loses money on golf |
| 8 | The Economics of Funeral Homes | The last business Amazon can't disrupt (mostly) |
| 9 | The Economics of Billboards | The best real estate is 40 feet in the air |
| 10 | The Economics of Claw Machines | Rigged is legal, and profitable |
| 11 | The Economics of a Ski Resort | Selling frozen water at 400% markup, weather permitting |
| 12 | The Economics of Christmas Tree Farms | A crop that takes 8 years and sells in 3 weeks (seasonal, Nov upload) |

## Build sequence

1. Operator picks channel name + confirms pilot topic → I write the full
   pilot script with sourced numbers.
2. Extend render pipeline: script → scenes → animated diagram frames →
   ffmpeg assembly → voiceover mix. Pilot rendered end-to-end.
3. Operator judges the pilot before any cadence commitment.
4. Uploads are MANUAL (~2 min each): YouTube Data API uploads from
   un-audited apps are locked private automatically. Channel creation is a
   ~5 min operator task on a Google account.

Nothing publishes without operator approval — standing gate.
