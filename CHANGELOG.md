# Changelog

A running log of what's been built or changed, so we both have a shared
record without needing to scroll back through chat history.

## 2026-08-13 (cont. 3) — Budget & Trip Organizer, bigger Home buttons
- Expenses Manager and Loan Calculator buttons on Home are now bigger (more
  padding, larger icon/text) and stack full-width on narrow phones, only
  sitting side by side once the screen is wide enough.
- Added a Budget button on Home, below those two. Opens its own page: add
  any number of expected income sources and expected expenses, see the
  total income, total expenses, and what will remain (or the shortfall),
  then split that remainder across named folders — quick-add chips for
  Savings and Vacation Plan, or add a custom one — with a running
  allocated/unallocated total. Includes a short 50/30/20-rule note as a
  general budgeting reference.
- Added a Trip Organizer button on Home, below Budget. Opens its own page:
  create any number of trips, each with a destination, start/end dates,
  and a trip budget, plus a per-trip packing/to-do checklist (add, check
  off, remove items) and a free-form plans/notes field for itinerary
  ideas and bookings to confirm.
- Both are stored on-device only (same local storage approach as the rest
  of the app), independent of the multi-business books data.

## 2026-08-13 (cont. 2) — Exchange rates, home navigation, Add Member, loan calculator fee
- Fixed the Home exchange rate widget, which had stopped working: the API it called,
  api.frankfurter.app, has moved to api.frankfurter.dev with different query parameter
  names and a different response shape. Pointed the fetch at the current domain/params
  and updated the parsing to match the new response format.
- Fixed "no way back to Home from other screens" — the bottom nav bar (Home / Cashbooks /
  Help / Settings) was only shown while exactly one screen deep, so it disappeared the
  moment you opened a book, a settings sub-page, the loan calculator, etc., leaving only
  a back arrow that steps back one screen at a time. The bottom nav is now always visible,
  so any tab (including Home) is always one tap away regardless of how deep you are.
- Fixed Add Member not working from either place it's offered (a book's Manage Members
  page, and Settings > Business Team): both screens were missing the bottom padding used
  elsewhere in the app to keep the floating "to buy/pay" button from sitting on top of
  page content, so the floating button could intercept taps meant for the Add Member
  button. Added the same padding fix used on other screens, and the button is now
  visibly disabled until a name is entered instead of silently doing nothing.
- Loan Calculator: renamed "Total Paid" to "Total Payable" (summary card and the by-year
  schedule column). Added an optional "Other mandatory monthly payment" field for fees
  some lenders charge every month regardless of the loan (e.g. account/insurance fees) —
  it's added on top of each month's payment rather than folded into the amortization
  math, and shows up as its own line in the summary and as an extra column in both the
  monthly and yearly schedule views when set.

## 2026-08-13 (cont.) — Welcome / Welcome back screens
- Replaced the old first-launch "pick a business type" screen. First time
  opening the app now shows a Welcome screen: "Create an account" (name +
  a local 4–6 digit PIN, stored on-device only — this is a lock screen,
  not real authentication, there's still no backend) or "Use without an
  account". Every subsequent open shows a Welcome back screen instead —
  a PIN prompt if one was set (with a "Forgot PIN? Reset local account"
  fallback), or straight through to the app if not
- The "what will you manage?" business-type question (Business / Personal
  / Just exploring) moved out of first launch and into the Expenses
  Manager — it now shows the first time someone opens Expenses Manager
  before any business has been created, since that's the tool it's
  actually about

## 2026-08-13 — Trading button, birr exchange rates, member fix, inline calculator
- Added a "Want to learn about trading?" button to Home, below the
  financial news list — placeholder only, not linked to anything yet
  (waiting on the TeredaTrades URL/Telegram channel)
- Reworked the Home exchange rate widget to be birr-first: it now shows
  1 USD/GBP/EUR/CAD/CNY/JPY/AED/KES in Ethiopian birr instead of the old
  USD-based EUR/GBP/JPY/ETB/INR/CNY list. EUR/GBP/CAD/CNY/JPY still come
  live from Frankfurter (USD base, pivoted into birr); ETB, AED, and KES
  aren't published by any free no-key exchange rate API, so those three
  use a manually-looked-up snapshot rate (documented in the code) instead
  of updating live — worth refreshing periodically
- Fixed a real dead end: Settings > Business Team showed the business's
  members but had no way to actually add one (just text saying "add
  members from a book's settings"). Added a working inline add-member
  form directly on that screen
- Added an inline calculator to the entry Amount field — you can type a
  quick expression like "500+120-30" straight into the field and it
  evaluates live, or tap the calculator icon to expand a small tap-pad
  for entering it by hand
- Logged two items in NOTES.md that still need a decision before being
  built: which source to pull real per-headline images from for the news
  list, and what "create an account" should actually mean for a fully
  offline app with no backend

## 2026-08-12 (cont. 3) — Per-year loan payables view
- The Loan Calculator's amortization schedule now has a By Month / By Year
  toggle. By Year rolls the monthly payments up into one row per year —
  total principal paid, total interest paid, total paid, and remaining
  balance at year-end — so you can see the shape of a long loan (e.g. a
  30-year mortgage) without scrolling through hundreds of monthly rows.

## 2026-08-12 (cont. 2) — Show remark in the entries list
- The entries list now shows an entry's remark right in the row (below the
  date/time/payment-mode line), so it's visible at a glance without opening
  the entry — previously it was only visible on the Entry Detail screen.

## 2026-08-12 (latest) — Home landing page, louder reminders, layout fix
- Added a Home landing screen — now the first thing you land on when opening
  the app (new first tab in the bottom nav). It has Expenses Manager and
  Loan Calculator as two buttons side by side, a "Buy & Sell Marketplace"
  link (currently pointed at Jiji, easy to swap for another site), live
  foreign-exchange rates for major currencies (EUR, GBP, JPY, ETB, INR, CNY
  vs. USD, via the free Frankfurter API — no signup/key needed), and a
  quick-links list to financial news sites (Reuters, Bloomberg, Yahoo
  Finance, CNBC). Removed the Loan Calculator entry from Settings since
  it's now reachable from Home instead.
- Reminders are now louder and do more than a bar notification: added a
  dedicated high-importance Android notification channel with a custom
  alarm-style tone and strong vibration, so reminders show as a heads-up
  banner with sound even when the app is fully closed. Tapping the
  notification (or the reminder firing while the app is already open) now
  pops up an in-app alarm card with the item's description, amount, and
  category, plus Snooze (10 min) / Mark done / Dismiss actions — instead of
  just a silent line in the notification shade.
- Fixed a real bug found along the way: `@capacitor/local-notifications`
  was never actually registered in the native Android project (missing
  from `capacitor.settings.gradle` / `capacitor.build.gradle`), so
  reminders likely weren't firing as native notifications at all before
  this. Running `npx cap sync android` picked this up and fixed it.
- Fixed the floating "to buy/pay" button covering Save/Add buttons (most
  noticeable when naming or renaming a book) — the button now hides itself
  whenever a text field is focused, so it can't sit on top of a
  keyboard-pushed button; also added extra bottom padding as a second
  safety net on the Books and Book Settings screens.
- Investigated the "plain sheet icon when unzipped" report: confirmed the
  actual installed app icon renders correctly (the wallet/shield logo) —
  the generic icon some people see is how certain file managers/PCs
  display an uninstalled `.apk` file before it's opened, which isn't
  something the app package can control.

## 2026-08-12 (later still) — Loan amortization calculator
- Added a Loan Calculator under Settings > General Settings — enter a loan
  amount, annual interest rate, and term (years or months) to get the
  monthly payment, total interest, and total amount paid
- Includes a collapsible full amortization schedule (per-payment principal,
  interest, and remaining balance), scrollable so it stays usable even for
  long terms like a 30-year mortgage
- Standalone tool, not tied to any book — uses the app's configured
  currency symbol

## 2026-08-12 (later still) — New app logo, "to buy / to pay for" sidebar, reminders
- Replaced the app icon/logo with the new wallet-and-shield artwork —
  regenerated the full Android adaptive icon set (legacy square, round, and
  adaptive foreground) at every density (mdpi–xxxhdpi), and updated the
  adaptive icon background color and web theme-color to match the new navy
- Added a global "To buy / to pay for" list — a running wishlist separate
  from any single book. It's reachable from a floating button on every
  screen (not tucked away in Settings, and it doesn't block the app behind
  it — it's a slide-over sidebar, not a full-screen modal). Supports
  add/edit/delete, marking items as bought/paid, and shows a running
  pending total
- Added Reminders under Settings — pick a date/time for any pending item
  on the to-buy/to-pay list and TallyBook schedules a native notification
  (via the new @capacitor/local-notifications dependency; falls back to a
  no-op in the browser preview). Added the Android permissions needed for
  scheduled notifications

## 2026-08-12 (later) — Entry detail, move/copy, app rename
- Renamed the app display name (Android app_name / title_activity_main) to
  "በጅሮንድ"
- Added an Entry Detail screen — tap an entry to see amount, receipt image,
  contact/category/remark, date/time, who created it and when, who last
  edited it and when, and (if applicable) where it was last transferred from
- Added move/copy entries between books — long-press (or right-click) an
  entry to move or copy it into another book in the same business; the
  entry is stamped with where/when it was transferred, and both books'
  activity logs get an entry
- Entries now track created-by/created-at separately from last-edited-by/
  edited-at (previously an edit just overwrote who added it)
- Added an entry-type toggle on the Edit Entry screen

## 2026-08-12 — Charts, search, multi-currency
- Added per-book balance show/hide toggle on the "Your Books" list (eye icon)
- Added a running balance caption under each entry ("Bal $X") showing the
  balance right after that transaction
- Added an expense breakdown pie chart per book, switchable "By Category"
  / "By Month" (new chart icon in the book header)
- Added search + Cash In/Out filter on the entries list (search icon in
  the book header)
- Added per-book currency — each book can use a different currency,
  independent of the others, set from Book Settings

## 2026-08-11 — Initial Android app
- Converted the TallyBook web artifact into a real installable Android app
  using Capacitor
- Swapped storage from the browser-only artifact API to on-device storage
  (`@capacitor/preferences`) — fully offline, data stays on the phone
- Set up a GitHub Actions workflow that compiles a debug APK automatically
  on every push (no local Android Studio/SDK needed)

## Earlier — TallyBook web artifact
- Built the original app as an interactive artifact in Claude: multi-business
  switching, books, cash in/out entries, member roles (Book Admin / Data
  Operator / Viewer) with a "view as" simulator, filtered reports (CSV +
  print-to-PDF), book activity log, move-book-between-businesses requests,
  app settings (categories, payment modes, currency)

## 2026-08-12 (cont.) — New app icon, darker in/out colors
- Replaced the placeholder Capacitor default icon with a custom logo — a
  white tally-mark glyph (four strokes + the crossing fifth) on the app's
  teal brand color, regenerated at every Android density for the adaptive
  icon (foreground + background), legacy square icon, and round icon
- Darkened the green (Cash In) and red (Cash Out) accent colors one shade
  throughout the app — icons, amounts, totals, and buttons — for better
  contrast; light background tints (the pale green/red chips) were left
  as-is

## 2026-08-12 (cont.) — Multi-select move/copy, working CSV/PDF export
- Added multi-select for move/copy: tap the checkmark icon in a book's
  header (or long-press an entry, same as before) to enter selection mode;
  tap entries to select/deselect, "Select All" toggles every currently
  visible (filtered/searched) entry, then "Move / Copy (N)" opens the same
  bottom-sheet, now handling any number of entries at once with a combined
  net-amount summary
- Fixed Download CSV and Print/Save as PDF, which weren't working in the
  installed Android app — Android's WebView doesn't support blob-URL
  download links or `window.print()`, which the code relied on. Exports
  now write the file to the app's cache via @capacitor/filesystem and hand
  it to the native Share sheet (@capacitor/share) so it can be saved to
  Downloads/Drive or shared directly; the PDF is now a real generated PDF
  (via jsPDF) instead of relying on print-to-PDF. Browser/dev preview still
  uses a plain blob download as a fallback, so `npm run dev` is unaffected.
  Registered both new plugins with `npx cap sync android` and added the
  Android 11+ `<queries>` manifest entry the Share chooser needs to list
  apps.
