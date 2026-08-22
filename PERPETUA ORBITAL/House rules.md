---
tags: [doctrine]
updated: 2026-08-21
---

# House rules — the operating doctrine

The non-negotiables every session works under. If a future session drifts
from these, redirect it here.

## Rule zero
**Nothing staged or simulated.** Every number traces to an API response or a
file on disk. Empty panels are the honest truth. A gap in a platform's
policy is unallocated risk, not permission.

## Credentials
- Never pasted into chat (transcripts are stored). They live in
  `ops/worker/.env` (gitignored) only.
- Verified by length/shape, never echoed. Any secret that lands in a
  transcript gets regenerated.
- Env names that matter: `ETSY_KEYSTRING` (not ETSY_API_KEY — cost us an
  hour once), `ETSY_SHARED_SECRET` (Etsy's are legitimately ~10 chars),
  `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`.

## The browser red line
**Never drive a logged-in browser session on Etsy.** Automation-clause
violation; their bot defense flagged the home IP once. The seller-app API is
the only sanctioned route. Same conservatism applies to Meta: no automated
account creation or logged-in browsing — Composio's official Graph API
connections only.

## Approval gates
- Operator approval before anything goes live: listings, posts, uploads,
  spending. Drafts accumulate; approval releases them.
- Batch approvals are recorded to state files
  (e.g. `ops/state/social-approval.json`) with timestamps.
- Never generate a fake seller photo — real photos of the operator only.

## Trademark discipline
- Screen the PRINTED TEXT (or the service name) before any art or account.
- Method: Justia full-text discovery → verify EVERY decisive hit on USPTO
  TSDR by serial. Containing marks are the killer pattern. TSDR 403s are
  reported RATE-LIMITED, never as absence.
- When Justia blocks fetches: terminal-2 method — a paste-ready screen
  prompt file the operator runs in a second session.

## Etsy listing format
- Titles ~15 words, noun-first, no gift-phrases (Aug-2025 guidance).
- 13 tags max, 20 chars each (a 21-char tag 400s the whole request).
- x-api-key header is `keystring:shared_secret` composite (determined
  empirically; docs say otherwise). DELETE is `/listings/{id}`.

## Money discipline
- Trading lanes: log-only until a measured post-fee edge exists; hard
  capital cap + kill criteria in writing before any deposit. VPN
  circumvention of geo-blocks is a hard no (CFTC settlement + confiscation
  risk).
- Every lane carries kill criteria before it carries costs.

## Windows/tooling traps (hard-won)
- PowerShell `Select-Object -First N` kills upstream processes mid-write.
- `process.exit()` races sharp/libuv teardown — use `process.exitCode`.
- JS `String.replace` treats `$'` in replacements as a token — use function
  replacements when splicing code.
- Blender 5.x: no `Action.fcurves` (set interpolation prefs before
  keyframing), no plain `.js` in Remotion's webpack (use .ts/.jsx), cube
  scale = full size not half-extents.
- Poly Haven/ambientCG direct-download URLs work headless; Justia 403s now.

Related: [[Systems handbook]] · [[Operations log]]
