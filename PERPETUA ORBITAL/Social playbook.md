---
tags: [lane, social]
updated: 2026-08-21
---

# Social playbook — KindlyPut on IG + FB

**Purpose:** shop marketing, NOT the parked audience-monetization lane.
External clicks feed Etsy's engagement loop; FB links earn 4% Share & Save.
Success metric = Etsy visits from social, not follower count.

## Accounts & plumbing
- **Instagram @kindly.put** (Business, ig_user_id 28354576864126987) —
  linked to the FB Page. ⚠ A second IG (@fhtautorepair) is connected in
  Composio and is the DEFAULT — **every KindlyPut call must pass
  account "kindlyput"** or the explicit ig_user_id.
- **Facebook Page "KindlyPut"** (page_id 1279433691919584, Gift Shop).
- Publishing via Composio Graph API only (see [[House rules]] browser
  red line). IG needs a public image URL → we use raw.githubusercontent
  from the public repo.
- Bio/website on both: https://kindlyput.etsy.com ("link in bio" target).

## The 9-post launch series (operator-approved 2026-08-10, all 9)
Images `ops/social/img/post-*.jpg` (brand cream + terracotta frame,
composed from live Printify mockups by `gen-posts.mjs`).

| # | Code | Status |
|---|---|---|
| 1 | intro | ✅ Aug 10 — IG p/Db3lt0GG23A |
| 2 | D1 "This Candle Owes Me Nothing" | ✅ Aug 11 — IG p/Db6KWpnIEnb |
| 3 | P4 table numbers | ✅ Aug 21 (gap recovery) |
| 4–9 | A9 → B12 → P1 → D4 → B14 → C1 | queued, one/day at 10:23am |

## Caption rules
- IG: wry-warm copy, ends "Link in bio", 8–10 hashtags rotated from the
  pool in `ops/social/PLAN.md`, never the same full set twice.
- FB: same copy, direct link replaces "link in bio".
- Voice = the candle labels' voice: warm, funny, specific.

## State files (the machine's memory)
`ops/state/social-posted.json` (log + queue) ·
`social-approval.json` (the Aug-10 batch approval) ·
`social-connections.json` (verified Composio accounts).

## After the series completes
Compose batch 2 (new products/angles, seasonal beats), operator approves,
same cadence. Candidates: remaining candles, printables in use (styled
table shots), grandma/nurse tees near gifting windows.

Related: [[KindlyPut shop]] · [[Systems handbook]] · [[Open loops]]
