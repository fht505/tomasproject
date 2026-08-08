# Trademark screen — YouTube channel name (terminal-2 prompt)

Paste everything below the line into a fresh Claude session with web access.
Same method as BATCH-04-SCREEN. Report results back verbatim.

---

Screen the following phrase for US trademark conflicts. It will be used as
the NAME of a YouTube channel publishing car-repair explainer videos —
relevant classes: 41 (education/entertainment services), 9 (downloadable
media), 38 (broadcasting).

PHRASE: "WHY IS MY CAR DOING THAT"

Method (follow exactly):
1. Discovery on Justia full-text: trademarks.justia.com/search?q="why is my
   car doing that" — also run the containing searches "my car doing that"
   and "why is my car". Use a browser User-Agent if fetches are blocked.
2. For EVERY live or plausibly-relevant hit, verify on USPTO TSDR by serial
   number (tsdr.uspto.gov). A Justia listing alone is not a verdict.
3. Containing marks are the killer pattern: a live registered mark CONTAINED
   in the phrase (or containing it) in a related class fails the screen.
4. If TSDR returns 403s under rapid requests, report RATE-LIMITED for that
   serial — never report absence you didn't verify.

Report format per phrase: PASS / FAIL / RATE-LIMITED, with every decisive
serial number, its TSDR status (live/dead), owner, and class.
