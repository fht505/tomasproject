# Design: Car-Symptom Explainer YouTube Channel + DistroKid AI Music Lane

**Date:** 2026-08-05
**Status:** Approved by Tomas (design conversation, 2026-08-05)
**Context:** Two lanes deliberately un-parked from the Etsy-first gate (explicit decision, not drift; memory updated). Round-6 lane research (`ops/lanes.data.json`): YouTube = flagged (AI allowed if disclosed and materially original; enforcement harsher than written policy; YPP gate at 1k subs + 4k watch hours); DistroKid = candidate (AI music allowed in writing; mass-generation banned, so low-volume quality lane only). Inspiration: @MackExplains7, a fully-AI explainer channel with 4M+ views.

---

## Part 1: The channel

### Concept

Symptom-first car explainers: "Why does my car shake when I brake?" — not "how brakes work." Every established animation channel in the niche (Animagraffs, Lesics) explains how parts work; nobody systematically explains *why your car is doing that thing right now* in that visual style. FHT Auto Repair diagnostic experience grounds every script — that domain grounding is the originality defense YouTube's "inauthentic content" policy demands of AI-produced material.

### Decisions made

| Decision | Choice |
|---|---|
| Structure | Two separate lanes (channel and music are independent builds) |
| Niche | Cars & repair, symptom-first framing |
| Production | Fully AI, zero filming (accepted risk; mitigated by script-level originality + disclosure) |
| Visual style | Approach A + pinch of B: diagram-first motion graphics (Remotion), occasional licensed stock clips for real-world grounding |
| Batch size | **16 videos, 10–12 minutes each, all produced before anything is uploaded** |
| Home | `channel/` directory in `tomasproject` |

### Pipeline architecture

Six stages; every stage persists output to disk so any stage re-runs without redoing the others (also lets one bad scene re-render/re-narrate alone, protecting TTS quota):

```
topic bank → script → voiceover → scene assembly → render → package
   (json)     (md)      (mp3)       (Remotion)      (mp4)    (thumb+meta)
```

1. **Topic bank** — 16 symptom-first topics from real FHT diagnostic patterns, each demand-checked (search volume) before it earns a slot.
2. **Script** — ~1,700–1,900 words, scene-annotated (each paragraph tagged `[cutaway: …]`, `[flow: …]`, `[broll: …]`, `[callout: …]`). Fixed structure: cold-open hook → symptom → mechanism → causes ranked most-to-least likely → what the repair involves → urgent vs. ignorable. Claims the AI can't ground get flagged `[TECH CONFIRM]` for Tomas (same convention as the Mitchell write-up skill).
3. **Voiceover** — ElevenLabs, one consistent voice (chosen once in Phase 0; the voice is the channel identity). Per-scene audio files; scene durations derive from audio lengths.
4. **Scene assembly** — Remotion template library, ~6 scene types: animated cutaway (SVG schematics), flow animation, callout cards, comparison/ranking layouts, title/transition cards, stock b-roll inserts (Pexels/Pixabay). Built once, reused across all videos.
5. **Render** — Remotion → 1080p mp4, ffmpeg mux, local.
6. **Package** — SEO title/description/tags/chapters, thumbnail from a consistent brand template, **AI-content disclosure flagged on every upload** (non-negotiable).

### Tooling (verified 2026-08-05: licenses real, quality-first)

| Slot | Tool | Cost | Verification |
|---|---|---|---|
| Narration | ElevenLabs Creator | $22/mo (~2 production months), then Starter $5/mo | Premium pick on purpose — ranked #1 for long-form narration quality in 2026 comparisons; commercial license included. Batch needs ~176k chars; Creator ≈100 min/mo covers it in 2 months |
| Video engine | Remotion | $0 | License verified: free for individuals/teams ≤3 incl. commercial; free version identical to paid; not a trial. Also the *correct* tool — After Effects can't be pipeline-automated |
| Stock clips | Pexels / Pixabay | $0 | Irrevocable, perpetual, royalty-free commercial licenses; no attribution; not trials. Each downloaded clip's URL + license snapshot recorded for dispute evidence |
| Stock upgrade (only if pilot shows free libraries too thin for car footage) | Envato Elements | $16.50/mo | 26M+ assets; also covers music/SFX/graphics; beats Storyblocks on price + breadth |
| Assembly/mux | ffmpeg, Node | $0 | Open-source infrastructure; no paid tier exists |
| Thumbnails | Canva (connected) | $0 | Existing account |

Budget: ~$22–38.50/mo for ~2 production months; ~$5/mo maintenance after.

### Production order

- **Phase 0 — Identity (half a day):** channel name (3–4 candidates presented, Tomas picks), narrator voice (3 ElevenLabs candidates, Tomas picks — permanent choice), thumbnail template, channel art.
- **Phase 1 — Pilot:** build only the templates video #1 needs; produce it end-to-end; Tomas reviews as a viewer ("would I watch 11 minutes of this?"). Iterate until it passes. **No batch until the pilot passes.**
- **Phase 2 — Batch:** remaining 15 videos in waves of 5; each wave QC'd before the next starts.
- **Phase 3 — Packaging:** metadata + thumbnails for all 16.
- **Phase 4 — Launch:** channel live, uploads begin.

### QC gate (Tomas signs off every video on three axes)

1. **Technical accuracy** — cause rankings and cost ranges must match real shop experience; `[TECH CONFIRM]` flags resolved.
2. **Audio** — mispronunciations (pronunciation overrides for part names/acronyms), pacing.
3. **Visuals** — no fictional parts in diagrams; animation matches narration.

### Launch cadence + kill criteria

- **2 uploads/week for 8 weeks** (consistent cadence > day-one dump); early CTR/retention data informs later titles/thumbnails.
- **Decision point 90 days after first upload:** trending toward YPP (1k subs / 4k watch hours) → keep producing; flat → freeze production, library stays up at zero carrying cost. No unbounded grind.

### Risks (accepted, from round-6 research)

- Fully-AI production is the profile enforcement targets; mitigations: disclosure on every upload, symptom-first original scripts grounded in FHT cases, diagram visual identity (not the stock+AI-voice slop profile).
- Disclosure may carry a reach/monetization penalty (the no-penalty claim was REFUTED in verification).
- A 4M-view AI channel (Mack) proves distribution, not 2026 payout — its growth predates current enforcement posture.
- Zero revenue before YPP gate; this is an investment lane bounded by the 90-day decision point.

---

## Part 2: DistroKid AI music lane (deliberately small)

One artist identity, one coherent instrumental genre, quality over volume (mass-generation is banned by DistroKid's terms — this is the opposite of a flood play).

- **Generate:** one month Suno Pro ($10) — paid plan required for commercial rights. Generate widely, curate ruthlessly to a **5–8 track EP**. Genre chosen so tracks double as the channel's background music.
- **Distribute:** DistroKid Musician plan (~$27/yr, verify at signup), AI-disclosure checkbox at upload, no voice impersonation, cover art via Canva.
- **Measure:** streams monthly; royalties lag 2–3 months → first signal ~November 2026.
- **Success bar:** any organic streams is data; this is a cheap option purchase (~$40 cap), not a revenue projection.

---

## Out of scope

- Any other parked lane (everything else stays behind FondlyMade's first sale).
- Shorts/vertical content, second channels, sponsorships, affiliate links — not before the 90-day decision point.
- High-volume music automation (banned by DistroKid terms).
