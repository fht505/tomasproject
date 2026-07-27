# BATCH-01 — TEST BATCH (3 images)

One candle, one tee, one mug — enough to prove the directives work before committing to the full 34. Generate these three, then hand me the folder.

> **What changed after batch 1.** Asking for a "transparent background" made the
> model draw a picture of a checkerboard, which cannot be keyed out. It now asks
> for solid white, which `art key` removes cleanly. And every candle label
> invented a net weight (8oz and 12oz against a real 9oz product), a burn time,
> and "hand-poured" claims that nothing asked for — so the prompts now forbid any
> text beyond the phrase itself.

## How to run this

1. In Gemini, set the model to **3.1 Pro / Nano Banana 2** and output to **4K** if the option is offered.
2. Paste a prompt. The aspect ratio and background directive are already in it.
3. **Check the spelling letter by letter before saving.** This is the one defect nothing downstream catches — a misspelled print is a refund and a bad review.
4. Save the image anywhere. The filename does not matter.
5. When a batch is done, drop them all in one folder and tell me where.

> Why 4K: the tee print area is 2767x3362 and the tote is 3000x3600. At 4096px every product **downscales**, so nothing is ever upscaled and no detail is invented.

---

## 1/3 · A1

**Printed text:** `Pumpkin Season`  
**Print area:** 900x600 label · **ratio:** 3:2

```
Design a premium candle label, flat vector style, wide landscape label. Cream background. Arched modern serif text "PUMPKIN SEASON" in terracotta, small minimalist pumpkin line drawing beneath, thin ochre border frame. Vintage apothecary feel, muted autumn palette, no photo elements, crisp printable edges. Aspect ratio 3:2. Render at the highest resolution available. Flat artwork only — no product mockup, no scene, no hands, no shadow. The ONLY text anywhere in the image must be "PUMPKIN SEASON", spelled letter for letter. Do NOT add any other words, numbers, net weight, volume, ounces, grams, burn time, scent numbers, dates, website, brand name, taglines, or product claims such as "hand-poured" or "small batch". Text must be crisp and legible at full size.
```

## 2/3 · B1 — used by B1, C7

**Printed text:** `Teacher Era`  
**Print area:** 2767x3362 front · **ratio:** 4:5

```
Design a t-shirt print, no mockup. Retro arched varsity-serif text "TEACHER ERA" in faded burgundy with cream outline, subtle distressed vintage texture, small star accents left and right. Two ink colors max, bold, printable. Aspect ratio 4:5. Render at the highest resolution available. Put the artwork on a SOLID PURE WHITE background (#FFFFFF), filling the frame edge to edge. Do NOT render a transparency checkerboard, grey squares, or any grid pattern. No mockup, no garment, no shadow, no frame, no border. The ONLY text anywhere in the image must be "TEACHER ERA", spelled letter for letter. Do NOT add any other words, numbers, net weight, volume, ounces, grams, burn time, scent numbers, dates, website, brand name, taglines, or product claims such as "hand-poured" or "small batch". Text must be crisp and legible at full size.
```

## 3/3 · C1

**Printed text:** `Emotional Support Coffee`  
**Print area:** 2700x1120 wrap · **ratio:** 21:9

```
Design a coffee mug print, no mockup. Prescription-label parody reading "EMOTIONAL SUPPORT COFFEE" in clean pharmacy sans-serif capitals, thin rounded rectangle border, small "REFILL AS NEEDED" line beneath, one ink color, faded black, dry humor, highly legible. Aspect ratio 21:9. Render at the highest resolution available. Flat artwork only — no product mockup, no scene, no hands, no shadow. The ONLY text anywhere in the image must be "EMOTIONAL SUPPORT COFFEE" and "REFILL AS NEEDED" — and nothing else, spelled letter for letter. Do NOT add any other words, numbers, net weight, volume, ounces, grams, burn time, scent numbers, dates, website, brand name, taglines, or product claims such as "hand-poured" or "small batch". Text must be crisp and legible at full size.
```

---

## When the batch is done

Tell me the folder. I will, for every file:

- read it and **verify the printed text letter by letter** against the phrase above
- check resolution, aspect and transparency against the real print area
- key out a white background if the model ignored the transparency directive
- file it under the right code and build the print master

Anything that fails comes back to you with the specific reason and the prompt to re-run.
