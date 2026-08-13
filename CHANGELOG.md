# Changelog

A running log of what's been built or changed, so we both have a shared
record without needing to scroll back through chat history.

## 2026-08-13 (cont. 7) — Business picker on login, standalone Expenses Manager APK
- Fixed Expenses Manager (Cashbooks) so that a returning user with more than
  one business now lands on the "Select Business" picker each time they log
  back in (after the Welcome back PIN screen), instead of being silently
  dropped straight into whichever business happened to be active last
  session. Picking a business (or dismissing with the X, which keeps the
  previous one) only asks once per session — navigating between tabs
  afterward doesn't re-prompt. Users with 0 or 1 business are unaffected and
  go straight in as before.
- Added a second, standalone build of just the Expenses Manager: Welcome/PIN,
  business picker, and books/entries only — no Home hub, and therefore no
  Loan Calculator, Budget, Trip Organizer, forex ticker, or financial news
  (Home is their only entry point, so removing it drops them too). Built via
  `npm run build:standalone` (new Vite mode, `VITE_APP_VARIANT=standalone-
  expenses`) into its own `dist-standalone` folder, packaged as its own APK
  (`com.teredatrades.tallybook.expenses`, labeled "TallyBook Expenses" on the
  Android launcher so it can be installed side by side with the full app).
  The GitHub Actions workflow now builds both APKs on every push and attaches
  them to a new GitHub Release for that run (in addition to the existing
  Actions-tab artifacts), so both are downloadable without needing a
  workflow re-run per variant.

## 2026-08-13 (cont. 6) — Quick toggle, pattern themes, holiday themes
- Added a light/dark quick-toggle button (sun/moon icon) to the Home screen
  header — one tap flips between light and dark regardless of which theme
  was active, no need to go into Settings > Appearance.
- Appearance screen is now grouped into three sections: Solid (the original
  6 flat-color themes), Pattern, and Holiday.
- Softened the Pink theme to lighter, more pastel shades (was a fairly
  saturated hot-pink palette).
- Renamed the "Islamic" theme to "Green & Gold" — same green/gold palette,
  just a more general name (theme id unchanged, so existing users' saved
  selection carries over automatically).
- Added 3 new Pattern themes: Light Dots, Dark Grid, and Terracotta Waves —
  each pairs a color palette with a subtle background pattern (dot grid,
  line grid, diagonal weave). The pattern only paints the app's background
  layer; every card and form field still sits on a fully solid surface
  color on top of it, so patterns never reduce text or form legibility.
- Added 7 Holiday themes (New Year, Genna, Timkat, Eid, Enkutatash, Meskel,
  Christmas), each with its own palette + pattern, selectable any time from
  Settings > Appearance.
- Home now shows a dismissible banner suggesting the matching holiday theme
  in the days around that holiday ("Try it" applies the theme, the X
  dismisses it for that occurrence — it won't nag again that year). Eid
  al-Fitr and Eid al-Adha are lunar-calendar holidays pinned to their 2026
  Gregorian dates (Mar 20 and May 27) and will need updating for future
  years, same upkeep tradeoff as the ETB/AED/KES snapshot exchange rates.

## 2026-08-13 (cont. 5) — Theme support
- Added an Appearance screen under Settings with 6 theme presets: Light
  (the existing default look), Dark, Brown & Cream, Pink, Islamic (green &
  gold), and Minimalist. Tap one to switch instantly; the choice is saved
  on-device and re-applied on next open.
- Implemented as a CSS variable layer (`src/theme.css`) that re-points the
  app's existing color classes (bg-white, text-slate-800, bg-teal-700,
  bg-amber-700, bg-sky-700, bg-rose-700, form control backgrounds, etc.) to
  theme-specific values, rather than rewriting colors on every screen
  individually. This means any current or future screen that keeps using
  the app's normal slate/teal/amber/sky/rose classes will automatically
  follow whichever theme is selected, with no per-screen changes needed.
- Known gap: the expense breakdown pie chart's per-category slice colors
  are a fixed palette of hex values (chosen for contrast between slices,
  not tied to the color classes above) — they don't shift with the theme.
  Left as a known limitation for now rather than in scope for this pass.

## 2026-08-13 (cont. 4) — Real news headline images
- The Home screen's Financial News section now shows a real image next to
  each headline instead of the old static 4-link list (Reuters/Bloomberg/
  Yahoo Finance/CNBC). Pulled from the free, no-signup saurav.tech mirror
  of NewsAPI.org's business top-headlines feed — each row shows the
  article's thumbnail, title, and source, and taps through to the full
  article.
- Falls back gracefully at two levels: if the feed fetch fails entirely
  (or returns nothing usable), the section falls back to the original
  static link list; if an individual headline has no image or the image
  fails to load, that row falls back to the generic newspaper icon
  instead of breaking the layout.
- This mirror is community-run and best-effort (not truly real-time,
  uptime isn't guaranteed) — noted in NOTES.md as the accepted trade-off
  for a free, no-key source.

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
