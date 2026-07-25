# Tonight's Runbook

Everything here is the operator's (Joe's). Each step ends with something I
can act on. Total hands-on time: ~20–30 minutes.

---

## 1. New repo (2 min)

On GitHub: **New repository** → name it (e.g. `perpetua-orbital`) → Private
is fine → **no** README/gitignore (empty repo) → Create.

Then tell me: **"add fht505/&lt;name&gt;"**. I migrate `station/` over and clean
it out of the fht repo.

## 2. Etsy shop (10 min)

etsy.com → **Sell on Etsy** → Open your shop.

- Shop name: pick something broad enough for candles + apparel + future
  digital downloads (avoid "Candles" or "Tees" in the name — lane #2 is
  digital printables in the same shop).
- Country/currency: US / USD.
- Bank account for Etsy Payments + ID verification (they will ask).
- A one-time setup fee applies (~$15, sometimes up to $29 — Etsy shows it
  before you confirm).
- Skip the "add your first listing" prompt if it lets you — our listings
  come from Printify. If it forces one, make any draft and delete it later.

**Important shop settings to flip while you're in there:**
- Shop policies → processing time 2–5 business days.
- About section → mention designs are original and produced with a print
  partner (the per-listing disclosure is automatic from our side).

## 3. Printify + connect to Etsy (5 min)

printify.com → sign up free → **My stores → Add new store → Etsy** → click
through the Etsy OAuth approval.

Then: **Account → Connections → Generate API token**
- Scopes: enable everything for shops/products/uploads/orders.
- Copy the token immediately (shown once).

**Send me the token.** I'll run `verify` which lists the shop and its ID,
then everything else is automated.

## 4. Optional: image API key

Only needed if you want design generation unattended. Otherwise use your
ChatGPT app with `ops/PROMPTS.md` (already on your phone) and send me PNGs.

## 5. What I run the moment the token lands

```bash
cd station/ops/worker
export PRINTIFY_API_TOKEN='...'          # from step 3
node cli.mjs verify                       # proves the connection, prints shop id
export PRINTIFY_SHOP_ID='...'

node intake.mjs                           # validates your art, makes print masters
node stage.mjs plan                       # resolves real blueprints + providers
node stage.mjs run                        # creates 40 DRAFTS on Printify
node publish.mjs list                     # you review
node publish.mjs approve all              # your gate
node publish.mjs run                      # goes live on Etsy
node ledger.mjs                           # real numbers -> console HUD
```

Nothing publishes without step `approve`. Nothing reaches the console HUD
that didn't come from an API response.

## 6. First-week rhythm after launch

- Daily: `ledger.mjs` (real orders/revenue → HUD), ECHO drafts any buyer
  messages for your one-tap approval.
- Weekly: research run for the next design wave; kill listings with zero
  views after 3 weeks ($0.20 each to test, so we test a lot).
- Day 30: go/no-go on lane #2 (Etsy digital downloads) using real numbers —
  criteria already written in `LANES.md`.

## Known costs

| Item | Cost | When |
|---|---|---|
| Etsy shop setup | ~$15 (up to $29) | tonight, one-time |
| 40 listings × $0.20 | $8 | at publish |
| Printify | $0 | free plan |
| Image generation | $0 with your ChatGPT sub | as you generate |
| Product base cost | ~$10–14 per item | only when a customer pays |

Keep ~$100–200 of headroom on the card connected to Printify: they charge
the base cost at order time, Etsy pays out on their schedule (and may hold
a reserve on a new shop). That float comes back with margin attached.
