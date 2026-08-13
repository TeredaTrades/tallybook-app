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

## To change
-

## To remove
-

## Open decisions
- Fasika (Orthodox Easter) isn't in the holiday-theme rotation yet — its
  date moves every year and needs a reliable lookup before adding it the
  same way as the other holidays.

## Done
_(move items here once handled, with the date)_

- Business picker now shows on login for returning users with more than one
  business, instead of auto-continuing in whichever one was last active.
  Also split out a standalone "Expenses Manager only" APK (no Home hub, so
  no Loan Calculator/Budget/Trip Organizer/forex/news) built alongside the
  full app on every push (2026-08-13)

- Light/dark quick-toggle button added to Home's header; Appearance screen
  regrouped into Solid / Pattern / Holiday sections; Pink theme lightened;
  "Islamic" theme renamed to "Green & Gold"; added 3 pattern themes (Light
  Dots, Dark Grid, Terracotta Waves) and 7 holiday themes (New Year, Genna,
  Timkat, Eid, Enkutatash, Meskel, Christmas) with a dismissible Home
  banner that suggests the matching one around each actual holiday
  (2026-08-13)

- Theme support: added an Appearance screen (Settings > Appearance) with 6
  presets — Light (default), Dark, Brown & Cream, Pink, Islamic (green &
  gold), and Minimalist — selection persists on-device. Implemented via CSS
  variables + a themed override layer for the app's existing slate/teal/
  amber/sky/rose color classes, rather than hand-editing colors screen by
  screen, so new screens automatically pick up whichever theme is active as
  long as they keep using the same color classes as the rest of the app.
  Known gap: the expense pie chart's per-category colors are fixed hex
  values (not theme-aware) since they're generated to be visually distinct
  from each other rather than to match a palette — left as-is for now
  (2026-08-13)

- Financial news rows on Home now show a real per-headline image: wired
  up the free, no-signup saurav.tech mirror of NewsAPI.org (business
  category) to pull live headlines with images, replacing the old static
  4-link list. Falls back to the original static link list if the fetch
  fails or returns nothing, and falls back to the generic newspaper icon
  per-row if a specific headline has no image or its image fails to load
  (2026-08-13)

- Made the Home screen's Expenses Manager / Loan Calculator buttons bigger
  (larger padding/icon/text, and full-width stacked on narrow phones, side
  by side only on wider screens). Added a Budget button below them (income
  vs. expenses, what remains, and splitting the remainder into named
  folders like Savings/Vacation) and a Trip Organizer button below that
  (per-trip destination/dates/budget, a packing/to-do checklist, and a
  notes field for plans) — each opens its own page (2026-08-13)
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
