# KindlyPut — social launch plan, week 1

Nine composed post images in `ops/social/img/`, built from the live Printify
mockups and digital previews on the brand cream with the terracotta frame — the
feed and the shop read as one hand.

Cadence: 1 post/day, both platforms, same image. IG caption ends "link in
bio"; FB caption carries the Share & Save link directly (external clicks earn
4% back and feed Etsy's engagement loop — the whole point of this exercise).

Bio (both platforms):
> Warm, funny designs for the people you love most. Candles, tees, mugs &
> printables — printed in the USA. 🕯️
> IG bio link / FB about link: https://kindlyput.etsy.com

Hashtag pool (IG, rotate 8-10 per post, never the same full set twice):
fallcandles cozyseason funnycandles thanksgivingtable candlelover
fallhomedecor etsyfinds smallbusiness giftideas dogmom teachergift
grandmagift printables thanksgivingprintables autumnvibes handpickedgifts

## The nine posts, in order

| Day | Image | Product | IG caption (FB adds the link, drops "link in bio") |
|---|---|---|---|
| 1 | post-intro.jpg | Shop intro | We make warm, funny things for the people who hold everything together — teachers, nurses, dog moms, grandmas. Candles, tees, mugs, and printables, printed in the USA. New shop, first fall. Come say hi — link in bio. 🕯️🍂 |
| 2 | post-D1.jpg | D1 candle | It has done its part. You're on your own now. "This Candle Owes Me Nothing" — 9oz soy, 8 scents. Link in bio. |
| 3 | post-P4.jpg | Table numbers | Hosting Thanksgiving? The table can look composed even if the kitchen isn't. Printable table numbers 1–12 — download, print, done. Link in bio. |
| 4 | post-A9.jpg | A9 candle | For daily use as needed: the Emotional Support Candle. Side effects include calm. 9oz soy, 8 scents. Link in bio. |
| 5 | post-B12.jpg | B12 tee | Cheaper than sessions, better at listening. Soft cotton, S–3XL, lots of colors. Link in bio. |
| 6 | post-P1.jpg | Conversation cards | 24 questions that get better answers than "fine." Print them, deal them, one house rule: no one-word answers. Link in bio. |
| 7 | post-D4.jpg | D4 candle | The most peaceful sentence in the English language. "The Kids Are Finally Asleep" — light it the moment the door clicks. Link in bio. |
| 8 | post-B14.jpg | B14 tee | Grandma Era: the best era. Soft crewneck tee, also on a sweatshirt for maximum coziness. Link in bio. |
| 9 | post-C1.jpg | C1 mug | Emotional Support Coffee — refill as needed. 11oz ceramic, prescription-strength comfort. Link in bio. |

## Mechanics (once Composio is connected)

- IG: two-step publish (create container → publish) via the official Graph
  API; needs the image at a public URL — I will host each from the Etsy CDN
  (mockup URLs are already public) or upload via Composio's file path.
- FB: single CREATE_PHOTO_POST with caption + link.
- Both drafted → operator approves the batch → I schedule day by day.
  Nothing posts without the approval, same gate as everything else.

## What this is NOT

Not the audience-monetization lane (still parked). This is shop marketing:
external clicks into Etsy's engagement loop + 4% Share & Save on conversions.
Success metric is Etsy visits from social, not follower count.
