# Penny

A private, offline-first spending tracker designed for iPhone 13 mini (375 × 812 CSS points), iPhone 16 Pro (402 × 874), and larger screens. Requires iOS 17 or later for the full storage API; install and test using current Safari.

## Run locally

```sh
npm run dev
```

Open http://localhost:5173. There are **no package dependencies, accounts, analytics, remote fonts, or backend services**. Node 20+ is sufficient. The development server binds to all interfaces; use it on a trusted local network only. It serves application files and never receives transaction data.

```sh
npm test       # Currency, dates, daylight saving, CSV integrity
npm run build # Static production files in dist/
```

## Install on iPhone

Host `dist/` on a stable **HTTPS** origin. HTTP localhost works for desktop development, but a phone visiting a computer's LAN HTTP address will not have a secure context and cannot install a working offline service worker. The app works under a subdirectory as well as at an origin root.

Open in Safari → Share → Add to Home Screen → open from the Home Screen icon. Let the first online load finish before going offline. The app shell is cached by a service worker; transactions and preferences are in IndexedDB. Avoid changing the hosting origin because browser data belongs to that origin. A host serves only the static code; financial data does not leave the device.

Physical device checks are still required before release: Home Screen installation, actual software keyboard behavior, safe-area insets, files/share-sheet CSV export, persistent storage decisions, app lifecycle, and offline relaunch on both phones. Desktop viewport tests are not a substitute for real iOS testing.

## Features

- Name and amount are required. Date/time defaults to the moment of saving; category defaults to Miscellaneous.
- Edit from any transaction row. Delete includes a 12-second Undo action.
- Monthly, weekly (Monday–Sunday), biweekly (fixed 14-day blocks anchored to Monday January 1, 2024), daily, and custom inclusive date ranges. Arrows navigate periods. Presets include Today, Last 7 Days, Last 30 Days, and This Month.
- Bar charts, category breakdown, daily average, previous-period comparison, search, and category filtering. The daily average uses elapsed calendar days for the current period; comparisons use the full previous calendar period.
- Currency is selected before the first transaction and then locked to avoid relabeling historical amounts. Supported currencies have two decimal places. Amounts use integer minor units.
- Optional sample preview is held only in memory and is separate from actual records.
- Quick entry: `/?add=1` (or `<app-path>/?add=1`) opens the form. Use an Apple Shortcut with an Open URLs action. iOS may open this URL in Safari, whose storage can differ from the Home Screen app. The reliable installed-app alternative is Settings → Start with a new transaction. Manifest shortcuts are included for supporting platforms but should not be assumed available on iOS.

## Data durability and privacy

All transactions are stored only in IndexedDB in the current device/browser profile. No transaction synchronization or remote backup exists. User-triggered exports are the only way data leaves the app. Imports are parsed locally, validated in full, previewed, and committed in one atomic database transaction.

Penny requests `navigator.storage.persist()` where available. The browser decides whether to grant it. **No PWA can promise permanent storage**: clearing site data, removing the app, changing browsers/origins, or some device storage policies can remove access to records. Safari and installed web apps can have separate storage. Regular CSV backups are essential. See [WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) and [Home Screen storage policy](https://webkit.org/tracking-prevention/).

Backup reminders appear inside the app after 7, 14 (default), or 30 days since setup/last export. Dismissing snoozes for one day. They are not background push notifications. An export records when the share/download was prepared; the browser cannot prove the user kept the file. Save the CSV to Files or another user-chosen destination.

Data is protected by the device/browser's normal security, not a separate application encryption layer. There is no authentication or remote recovery.

## CSV format

Only `name` and `amount` headers are required. Use decimal currency units (`5.75`), positive amounts, and UTF-8. Optional date is an ISO calendar date or timestamp; date-only rows are interpreted at local noon. Optional category accepts the category ID or displayed name; missing/unknown categories become `misc`.

```csv
name,amount,date,category
Morning coffee,5.75,2026-10-25,food
Groceries,42.29,2026-10-25T16:30:00-04:00,food
```

Exports include `id,name,amount,date,category,currency,penny_format`. Stable IDs allow repeated imports of a Penny export to skip existing records, including duplicates within the file. Existing records are never overwritten by import. Files without IDs get fresh IDs on every import and can create duplicates. Currency mismatches are rejected; there is no conversion. Quoted commas, quotes, and multiline names are supported; potentially executable spreadsheet formula prefixes are reversibly escaped. File size limit: 5 MB.

## Code map

- `src/app.js`: UI, forms, interaction, charts, backup reminders.
- `src/core.js`: Money/date logic, grouping, CSV validation and encoding.
- `src/storage.js`: IndexedDB persistence, atomic imports.
- `src/styles.css`: Responsive layouts, safe areas, accessible focus and reduced motion.
- `sw.js`: Versioned offline app shell; no financial data is cached here.
- `manifest.webmanifest`, `public/icons/`: Installation metadata and icons.

When deploying a changed shell, increment `CACHE` in `sw.js`. The new worker waits until existing app windows close before activation, avoiding code-version mixing. Reload/reopen after all existing windows close. Do not rename the database or clear IndexedDB during an update.
