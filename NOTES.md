# Ideas & Notes

Use this as a scratchpad for anything you notice while using the app —
things to add, remove, fix, or reconsider. Jot it down here whenever you
think of it, even mid-use. Next time we work on the app, just point me at
this file (or paste its contents) and I'll go through it with you.

No need to organize as you go — dump things under "Inbox" and we can sort
them when we sit down to make changes.

## Inbox
_(add notes here as you think of them)_

-

## To add
- Scan receipt — camera/OCR capture that reads a receipt and pre-fills an
  expense entry (amount, maybe merchant/date)
- Telegram/WhatsApp integration for the tracker — needs scoping: a
  "share a report via WhatsApp" button vs. an actual bot that receives
  messages is a very different amount of work
- Split-the-bill — photograph a receipt, say how many people were there,
  app calculates each person's share
- Receive & interpret shared receipts — the flip side of split-the-bill:
  catch/parse a receipt someone else sends you and interpret what you owe
  (depends on how deep the Telegram/WhatsApp piece goes)

Note: receipt scanning, split-the-bill, and interpreting incoming receipts
all share the same underlying OCR/receipt-parsing piece — worth building
that once and scoping all three together rather than separately.

- Simpler ways to add members
- Theme support — dark and light, plus some basic color combos (brown and
  cream, and something pink-based), maybe an Islamic theme or a
  modern/tech/minimalist skin

## To change
- Financial news rows on Home: swap the generic icon for real per-headline
  images from an actual news feed — decision pending on which source
  (see "Open decisions" below).

## To remove
-

## Open decisions
- News headline images: options for the actual image source —
  1) a free, no-signup community mirror of NewsAPI.org (saurav.tech) —
     easiest, but unofficial/best-effort uptime and not truly real-time;
  2) a proper news API (NewsAPI.org, GNews, Marketaux, etc.) — reliable
     but needs an API key/signup, so not "no config" anymore;
  3) parse an RSS feed (e.g. Google News) client-side — no key, but most
     RSS feeds don't reliably include images and may need a CORS proxy.
  Waiting on which direction to take before wiring this up.

## Done
_(move items here once handled, with the date)_

- Replaced the old "pick a business type" first-launch screen with a
  proper Welcome flow: first time opening the app now shows "Welcome —
  create an account or use without an account" (name + local PIN, no
  backend — it's a lock screen, not real auth); every later open shows a
  "Welcome back" screen instead — a PIN prompt if one was set, or
  straight through if not. The old "what will you manage?" business-type
  question moved into the Expenses Manager itself, shown the first time
  someone opens it before any business exists, since that's the tool it
  actually applies to (2026-08-13)

- "Want to learn about trading?" placeholder button added to Home, below
  the financial news list — not linked anywhere yet, waiting on the
  TeredaTrades URL/Telegram channel (2026-08-13)
- Exchange rate widget fixed and switched to Ethiopian birr as the
  reference currency, showing 1 USD/GBP/EUR/CAD/CNY/JPY/AED/KES in birr.
  EUR/GBP/CAD/CNY/JPY are still live (via Frankfurter); ETB, AED, and KES
  aren't covered by any free no-key API, so those three are periodically-
  updated snapshot rates rather than live-ticking (2026-08-13)
- Fixed Add Member: Settings > Business Team had no way to actually add a
  member (just a hint pointing elsewhere) — added a working add-member
  form directly on that screen (2026-08-13)
- Inline calculator on the entry Amount field — type a quick expression
  like "500+120-30" directly in the field, or tap the calculator icon to
  expand a small tap-pad (2026-08-13)
- Loan amortization calculator (2026-08-12)
- Louder/more useful reminders — dedicated alarm-style channel + in-app
  popup on tap or while open, instead of just a bar notification (2026-08-12)
- Home landing page with Expenses Manager / Loan Calculator shortcuts,
  marketplace link, forex rates, financial news links (2026-08-12)
- Fixed floating button covering the Save button when naming/renaming a
  book (2026-08-12)
- Show entry remark directly in the entries list (2026-08-12)
- Per-year payables view in the Loan Calculator (2026-08-12)
