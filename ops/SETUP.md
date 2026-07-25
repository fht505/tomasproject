# Operator Runbook

Everything here is yours to do; everything after it is one command. If you
ever lose your place, run `node ops.mjs` — it reads the real files and tells
you the single next action.

Hands-on time: ~30 minutes, plus however long the designs take.

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
- Skip the "add your first listing" prompt if it lets you. If it forces one,
  make any draft and delete it later.

**Two settings that decide whether the shop survives its first month:**

**(a) Production partner — do this before anything publishes.**
Shop Manager → Settings → Production partners → **Add a production partner**.
Describe it as a print-on-demand partner ("A print shop" is acceptable if you
would rather not name them). Without this record, Printify cannot attach a
partner to your listings and they publish as **"Made by seller"** — which is
untrue for print-on-demand and is one of the most common reasons new POD
shops get suspended. It is not automatic. Set it up first.

**(b) Processing time — do not guess this number.**
Leave it until after `node ops.mjs plan`, which prints the production time of
the print provider it actually resolved. Add carrier transit to that number,
then set Etsy's processing time to the result. Shipping later than your stated
processing time voids Etsy Purchase Protection on the order and breaks Star
Seller standing, so the number has to be real, not optimistic.

Also worth flipping while you are in there: turn on **Messages auto-reply**.
Etsy has no messages API — nothing on our side can ever read or send buyer
messages — but the auto-reply counts toward your response-rate metric and buys
time to answer properly.

## 3. Printify + connect to Etsy (5 min)

printify.com → sign up free → **My stores → Add new store → Etsy** → click
through the Etsy OAuth approval.

**Order approval setting:** My stores → your Etsy store → Store settings →
Order approval → **automatically approve, 1 hour after import**. The default
is 24 hours, and that whole day comes out of a ship-by window that started the
moment Etsy charged the buyer.

**Card on file:** Printify charges the base cost when an order comes in. If
that charge fails the order silently sits on hold, never enters production,
and ships late with no warning on either side. Keep headroom on the card
before the first order, not before the first publish.

Then: **Account → Connections → Generate API token**
- Grant only what the tooling actually calls: shops read, catalog read,
  uploads write, products read+write, orders **read**. Not orders write.
- Copy the token immediately (it is shown once).

## 4. Designs

Use your ChatGPT app with `ops/PROMPTS.md` — 34 prompts, one per design. Save
each with its exact code (`A1.png`, `B7.png`, …) into `station/ops/art/`.

Check spelling letter by letter before saving. A misspelled print is a wasted
listing and a refund.

## 5. Wiring it up

```bash
cd station/ops/worker
cp .env.example .env          # then open .env and paste the token in
```

Put the token in the file, not in your shell — `export PRINTIFY_API_TOKEN=…`
leaves it sitting in `~/.bash_history` in plain text. `.env` is gitignored.
(If you already exported it, clear that history entry and rotate the token.)

Then edit `ops/config.json` and set `shop_name` to the exact Etsy shop name.
It is printed in every description as the "Designed by" attribution, so it has
to match.

## 6. The whole pipeline

Every command is safe to re-run, and `node ops.mjs` on its own tells you which
one is next.

```bash
node ops.mjs                    # where am I, what is next
node ops.mjs verify             # proves the token, finds the shop id, writes it to .env
node ops.mjs listings           # generates the 40 listings from config.json
node ops.mjs art                # validates your PNGs, builds print masters
node ops.mjs plan               # resolves real blueprints, providers, costs, margins
node ops.mjs stage --dry-run    # builds every payload, sends nothing
node ops.mjs stage              # creates the drafts on Printify
node ops.mjs review --mockups   # loads every mockup so you can actually look
node ops.mjs approve all        # your gate
node ops.mjs publish            # goes live on Etsy
node ops.mjs ledger             # real orders -> revenue state -> console HUD
node ops.mjs test               # proves the margin math still holds
```

**Before `publish`, confirm the fee schedule.** Open `ops/config.json`, check
the `fees` block against Shop Manager → Finances → Payment settings for your
own account and country, then set `fees_confirmed: true`. Publish refuses to
run until you do, because every margin number in this system is computed from
those rates and publishing at unknown fees is how a shop sells at a loss
without noticing.

**Publish one listing first.** Run `node ops.mjs approve B1` then
`node ops.mjs publish`, open the live Etsy listing, and check three things:
the production partner is named, the description reads correctly, and the
mockup is the design you meant. Then approve the rest.

If anything is wrong: `node ops.mjs unstage B1` deletes the draft and frees
the code to be staged again.

## 7. What the guards will actually do

- **Margin floor.** After each draft is created, its real base cost is read
  back from Printify and priced against your fee schedule. Anything netting
  under `min_margin_usd` is deleted on the spot and reported with the price it
  would have needed. Nothing that loses money is left in the shop.
- **No unverified publishing.** A draft whose cost Printify never reported is
  kept but blocked from publishing.
- **Runaway guards.** One run creates at most `max_products_per_run`; across
  all runs the shop cannot exceed `max_products_total`, counted from the live
  Printify product list before anything is written.
- **No placeholder text.** Any `{PLACEHOLDER}` in a title, tag or description
  stops the run.
- **No self-competition.** The generator refuses to build two listings with
  identical tag sets, because Etsy de-clumps a single shop's results.
- **No buyer PII in the repo.** Order pulls are redacted before they are
  written, and the write aborts if the redaction ever misses something.

## 8. First-week rhythm

- Daily: `node ops.mjs orders` first, then `node ops.mjs ledger`.
  - `orders` is the alarm: it flags anything on payment hold, anything past
    its ship-by with no tracking, and anything sitting unmoved past Printify's
    auto-approve delay. A failed Printify charge looks like nothing at all
    from the Etsy side, and this is what catches it. It exits non-zero when
    something needs you, so it works in a cron job.
  - `ledger` is the money: real orders, real revenue, real costs.
- When `orders` raises something, `ops/RUNBOOK-FULFILLMENT.md` has the
  who-pays decision table. Fill in its deadline table once, before you need it.
- Weekly: kill listings with zero views after 3 weeks ($0.20 each, so testing
  is cheap and pruning should be ruthless).
- Day 30: go/no-go on lane #2 (Etsy digital downloads) against the criteria
  already written in `LANES.md`.

## Known costs

| Item | Cost | When |
|---|---|---|
| Etsy shop setup | ~$15 (up to $29) | one-time |
| 40 listings × $0.20 | $8 | at publish |
| Printify | $0 | free plan |
| Image generation | $0 with your ChatGPT sub | as you generate |
| Product base cost | ~$10–14 per item | only when a customer pays |

Keep ~$100–200 of headroom on the card connected to Printify: they charge the
base cost at order time, Etsy pays out on their own schedule and may hold a
reserve on a new shop. That float comes back with margin attached.
