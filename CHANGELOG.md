# Changelog

A running log of what's been built or changed, so we both have a shared
record without needing to scroll back through chat history.

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
