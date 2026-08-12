# Changelog

A running log of what's been built or changed, so we both have a shared
record without needing to scroll back through chat history.

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
