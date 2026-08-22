---
tags: [lane, youtube]
updated: 2026-08-21
---

# YouTube channel — Why Is My Car Doing That?

Car-symptom explainers grounded in FHT Auto Repair experience — the
originality defense YouTube's AI enforcement demands. Approved design:
`docs/superpowers/specs/2026-08-05-yt-explainer-channel-distrokid-design.md`.

## Identity
- **Name:** Why Is My Car Doing That? · **Handle:** @WhyIsMyCarDoingThat
  (verified free 2026-08-07; TM screen pending — paste
  `ops/CHANNEL-NAME-SCREEN.md` into a terminal-2 session).
- Channel NOT yet created (operator, ~5 min, claims the handle).
- Policy posture: AI allowed if original + disclosed; enforcement harsher
  than the writing; disclosure on EVERY upload; low volume, high
  originality. $0 until YPP (1k subs + 4k watch-hours). 90-day kill
  decision after first upload. 2 uploads/week launch cadence.

## Season one — FULLY SCRIPTED (16/16, ~205 scenes)
`channel/scripts/01…16`. Clusters with continuity arcs and a signature
free-diagnosis teach per episode:
brakes ×4 (shake→squeak→grind→pedal-to-floor) · cooling ×3
(smoke→overheat→leak) · oil ×2 (leak→burn) · drivetrain/combustion ×4
(transmission, jerks, idle, rotten-egg) · steering sounds · AC (May
upload) · battery-light finale.
Raw estimates 6–9.5 min/ep — operator answers + shop stories are the
designed filler to 10–12.

## The operator gates (everything funnels here)
1. **TECH CONFIRM review** — `channel/TECH-CONFIRM-REVIEW.md`, 107 numbered
   questions covering ~140 inline flags (one cost table + one policy answer
   propagate everywhere). ~30–45 min, any format, any number of sittings.
2. **ElevenLabs Creator ($22/mo)** — unlocks the voice audition (3
   candidates, operator picks the permanent channel voice). ~150K chars for
   the season ≈ 2 months of Creator quota, per the design budget.

## Production pipeline (stage → status)
1. Topic bank ✅ (16 Semrush-verified, 8 benched)
2. Scripts ✅ 16/16
3. Voiceover ⬜ blocked on gate 2
4. Scene assembly 🟨 — Remotion proven; scene-manifest parser done;
   placeholder + callout components done; real diagrams replace by index
5. Render ✅ proven (EEVEE headless + ffmpeg)
6. Packaging ⬜ (thumbnails/metadata templates — quick once pilot exists)

## 3D asset library (the visual identity, post-"AI slop" verdict)
Style: real-3D Blender renders — scanned PBR metals, product-photo
lighting, speed-ramped cameras, dark cinematic grade. Built via the
render→watch→fix loop, every asset self-reviewed before delivery.

| Asset | Serves | Status |
|---|---|---|
| Brake corner (drilled rotor, red caliper) | eps 1,2,3,13,14 | ✅ |
| Engine cutaway (bores, coolant jackets, glowing gasket) | eps 4–8 | ✅ v1 (block brightness = polish debt) |
| Cooling loop (flowing coolant beads, fan) | eps 5,6 | ✅ |
| Air/fuel/spark path | eps 10,11 | next |
| Charging system · transmission · converter/exhaust · CV corner · brake hydraulics · AC loop · piston closeup | singles | queued |

Uploads are MANUAL (~2 min each): API uploads from un-audited apps get
locked private.

## Sequencing (per design spec — 16 videos, not 1)
Asset library → pilot assembled with voice → operator QC as a viewer
(accuracy/audio/visuals) → batch remaining 15 in waves of 5, each wave
QC'd → launch cadence into fall.

Sibling lane: **DistroKid AI music** — ~$40 EP experiment (Suno Pro month →
5–8 track EP, tracks double as channel background music). Not started.

Related: [[Systems handbook]] · [[Operations log]] · [[Open loops]]
