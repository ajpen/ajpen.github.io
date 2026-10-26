# Verification

Checked October 25, 2026.

## Automated

`npm test`: 11 tests passed.

- Integer currency precision, invalid amounts.
- Month/year boundaries, leap years, Monday-based weeks, stable biweekly blocks.
- Spring/fall daylight saving transitions.
- Inclusive start/exclusive end filtering; hourly and long-range chart totals.
- CSV quoting, multiline names, BOM/CRLF, spreadsheet formula escaping and exact round trips.
- Minimal CSV defaults, invalid dates/rows, duplicate headers, currency mismatches.

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

## Before release on iOS

Use a stable HTTPS origin and physical iPhone 13 mini and iPhone 16 Pro. Verify Home Screen installation, offline launch after terminating the app, safe areas in portrait/landscape, large system text, VoiceOver, keyboard scrolling and date input, Files/share-sheet export and import, storage persistence status, and app update behavior. Desktop viewport tests do not validate native iOS integration or promise permanent browser storage.
