# Fulfillment Runbook — what to do when an order goes wrong

Everything in this business after "money in" is time-boxed. Printify's
remedies expire, Etsy's clocks run whether or not you are looking, and the
party who eats the cost is decided by which window you are still inside. This
file is the decision table.

`node ops.mjs orders` is the alarm that tells you to open this file.

---

## First: fill in the windows

**These deadlines are not in this document, on purpose.** They change, they
differ by country, and this project's rule is that a number is either verified
or absent. Look each one up once, write it here with the date you checked, and
re-check it every few months.

| What | Where to look | Days | Checked on |
|---|---|---|---|
| Printify reprint/refund request after delivery | Printify Help → order issues | | |
| Printify lost-package claim, domestic | Printify Help → shipping | | |
| Printify lost-package claim, international | Printify Help → shipping | | |
| Etsy "Help with Order" — time to respond | Etsy Seller Handbook → cases | | |
| Etsy case escalation window | Etsy Seller Handbook → cases | | |
| Chargeback evidence submission | Etsy → Finances → payment disputes | | |
| Etsy Purchase Protection eligibility | Etsy Seller Handbook | | |

Two things worth knowing while you fill that in: Purchase Protection generally
requires that the order actually shipped within your stated processing time —
which is exactly what `node ops.mjs orders` measures — and a chargeback is not
a case, it is a bank action with its own shorter clock and no negotiation.

---

## Who pays

| Situation | Who absorbs it | Evidence you need | Channel |
|---|---|---|---|
| Printify printed it wrong (misprint, wrong size, wrong colour, off-centre) | Printify | Photo of the item **and** the packing slip, both legible | Printify merchant support, quoting the Printify order id |
| Arrived damaged | Printify | Photo of the damage **and** the outer packaging | Printify merchant support |
| Never arrived, tracking stalled | Printify, inside the claim window | Tracking number and last-scan date | Printify merchant support |
| Never arrived, tracking says delivered | Usually you, or nobody | Tracking record | Reply to the buyer; Etsy generally sides with tracking |
| Buyer gave a bad address | Buyer | The address as submitted on the order | Buyer pays for a reprint; be kind about it once |
| Buyer ordered the wrong size | Buyer | — | Our policy below |
| Buyer changed their mind | Buyer | — | Our policy below |
| Design was misspelled | **You** | — | Refund immediately, pull the listing, fix the art |
| Chargeback | You, unless you win it | Tracking, the listing description, all buyer messages | Etsy payment disputes, before the clock runs out |

The pattern: **Printify eats production and transit failures. You eat your own
mistakes. The buyer eats their own choices.** When it is genuinely ambiguous
and the amount is small, eat it — a refund costs one base cost, a bad review
on a shop with four reviews costs far more.

## Our stated policy

Print-on-demand items are made to order, so there is no restocking anything.
State this plainly in the shop policies:

- Misprinted, damaged or defective: replaced or refunded, photo required.
- Lost in transit: replaced once tracking confirms it.
- Wrong size ordered or change of mind: not accepted, because nothing is
  stocked — but the size chart is in the listing images and questions before
  ordering are welcome.
- Address errors: reprint at buyer cost.

Say it in the listing and in the shop policies, and honour it consistently.

## The first response

Etsy measures how fast you reply, and a fast partial answer beats a slow
complete one. Turn on Messages auto-reply so something lands immediately —
Etsy has no messages API, so nothing in this repo can do it for you.

Then, within the day:

1. Look up the order with `node ops.mjs orders` — age, status, tracking.
2. Decide from the table above who pays. Do this before replying, so you only
   say it once.
3. If Printify pays, open the claim **first**, then tell the buyer it is
   handled. Never promise a remedy you have not yet secured.
4. If you pay, pay fast and say so in one sentence without excuses.

## New-shop risks, ranked

1. **Publishing without an Etsy production partner** — the listing says "Made
   by seller", which is untrue for print-on-demand and a leading suspension
   trigger. Prevented by doing step 2 of SETUP.md before the first publish and
   checking one live listing before the other 39 follow.
2. **A trademarked phrase on a product** — a strike arrives without warning
   and does not care that it was an accident. Screen every printed phrase
   before the art is drawn, not after.
3. **A misspelled print** — cheap to prevent, expensive to discover from a
   review. Check every design letter by letter before saving it.
4. **Late shipping** — voids Purchase Protection on the order and breaks Star
   Seller. `node ops.mjs orders` exists for this.
5. **A failed Printify charge** — looks like nothing from the Etsy side while
   the ship-by clock runs. Same command catches it; keep headroom on the card.
6. **Payment reserve on a new shop** — Etsy may hold a percentage of each sale
   for a period, so early revenue is not early cash. Printify still charges
   the base cost at order time. Plan the float; it comes back.

## Cash reality

Money leaves before it arrives. Printify charges the base cost when the order
comes in; Etsy pays out on its own schedule and may reserve part of it. For a
40-listing launch, ~$100–200 of headroom on the Printify card covers the gap.
That float is not a cost — it returns with margin attached — but running out
of it mid-order is how a shop starts shipping late.
