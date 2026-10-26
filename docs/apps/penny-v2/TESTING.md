# Verification

Checked October 25, 2026.

## Automated

`npm test`: 25 tests passed.

- Integer currency precision, invalid amounts.
- Month/year boundaries, leap years, Monday-based weeks, stable biweekly blocks.
- Spring/fall daylight saving transitions.
- Inclusive start/exclusive end filtering; hourly and long-range chart totals.
- CSV quoting, multiline names, BOM/CRLF, spreadsheet formula escaping and exact round trips.
- Minimal CSV defaults, invalid dates/rows, duplicate headers, currency mismatches.
- Fragment UTF-8 Base64 JSON decoding, field validation, app-generated unique IDs, lifecycle event coalescing, and storage/URL-cleanup failure handling.

`npm run build` and JavaScript syntax checks passed. Production output is approximately 120 KB, with no external runtime dependencies.

## Browser checks

- Every main screen at 375 × 812 and 402 × 874: no horizontal document overflow, Add button present.
- New transaction defaults to current time and Miscellaneous; exact totals update after saving.
- Records survive navigation and reload; editing updates the amount and category.
- Search and no-results view; custom date range totals.
- Quick-entry URL and persisted Start with a new transaction setting.
- CSV download contained the original ID, exact amount, UTC timestamp and category.
- Reimport preview skipped the existing ID; confirm left one record.
- Delete and Undo restored the same transaction.
- **With the development server stopped:** app reloaded successfully; an edit persisted through another reload; local CSV import restored a deleted record.
- Test transaction removed afterward. Optional sample preview leaves actual storage empty.
- No application warnings/errors observed in browser logs.

## JSON URL entry integration checks

Checked the revised `#add=<Base64 JSON>` format in the original Penny app on a separate localhost origin with synthetic data:

- The documented minimal Coffee payload saved automatically and defaulted to current time and Miscellaneous.
- The successful save removed the fragment and updated dashboard totals.
- Opening the same link again added a separate purchase; overlapping navigation events did not add extra records.
- Reloading the cleaned URL retained the records without adding another purchase.
- Existing stored transactions remained present after the service worker update.

Earlier checks verified the same offline app shell could reload and persist transactions with the server stopped. Physical iOS `webapp://` delivery still needs phone testing; see `URL-TRANSACTIONS.md`.

## Before release on iOS

Use a stable HTTPS origin and physical iPhone 13 mini and iPhone 16 Pro. Verify Home Screen installation, offline launch after terminating the app, safe areas in portrait/landscape, large system text, VoiceOver, keyboard scrolling and date input, Files/share-sheet export and import, storage persistence status, and app update behavior. Desktop viewport tests do not validate native iOS integration or promise permanent browser storage.

## Custom categories

- Automated tests cover default name matching, custom names, whitespace/case grouping, validation, URL custom categories, and CSV round trips including formula-like category text.
- Browser: saved a custom category from the form; inserted another via URL with different capitalization; confirmed one combined chart total and filter with both records.
- After navigation/reload, the custom category appeared alongside defaults in the transaction form.
- Visually checked the expanded form at 375 × 812; the custom field and save button fit without horizontal overflow.
- Rebuilt the PWA and bumped the offline shell cache to `penny-shell-v6-custom-categories`.
