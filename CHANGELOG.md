# Changelog

A running log of what's been built or changed, so we both have a shared
record without needing to scroll back through chat history.

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
