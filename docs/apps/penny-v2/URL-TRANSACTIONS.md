# URL transaction entry

Penny accepts a Base64-encoded JSON object in `#add=` and saves it automatically into the existing on-device database.

```text
https://YOUR-HOST/YOUR-APP-PATH/#add=BASE64_JSON
webapp://YOUR-HOST/YOUR-APP-PATH/#add=BASE64_JSON
```

Use the exact host and path where your PWA is installed. The fragment is not sent to the hosting server. Base64 is encoding, not encryption.

## JSON specification

Minimal object:

```json
{"name":"Coffee","amount":5.75}
```

All supported fields:

```json
{
  "name": "Coffee",
  "amount": 5.75,
  "category": "food",
  "date": "2026-10-25T14:30:00-04:00"
}
```

| Field | Required | Value |
| --- | --- | --- |
| `name` | Yes | Text, 1–100 characters after trimming. |
| `amount` | Yes | Positive decimal currency units, as a JSON number or decimal string, e.g. `5.75` or `"5.75"`. Up to two decimal places; no currency symbols or group separators. Uses Penny's configured currency. |
| `category` | No | Defaults to `misc`. IDs: `food`, `shopping`, `transport`, `home`, `fun`, `health`, `misc`. Displayed category names also work, case insensitive. Any other name becomes a custom category (up to 40 characters). |
| `date` | No | Defaults to current date/time. ISO timestamp with optional timezone, or `YYYY-MM-DD` (local noon). |

No other JSON fields are accepted. Penny generates its own transaction ID; do not supply `id`, `action`, `currency`, or a version field. All transactions are expenses, matching manual entry.

## Shortcuts

1. Create the JSON text or a Dictionary converted to JSON text using the specification above.
2. Base64 Encode the UTF-8 JSON with line breaks disabled.
3. Append the encoded text to your app URL followed by `#add=`.
4. Use **Open URLs**.

Standard Base64 (including literal `+`, `/`, and `=`), URL-encoded Base64, and Base64URL are supported. The exported `encodeTransaction(data)` helper in `src/url-entry.js` produces unpadded Base64URL.

Example for `{"name":"Coffee","amount":5.75}`:

```text
webapp://YOUR-HOST/YOUR-APP-PATH/#add=eyJuYW1lIjoiQ29mZmVlIiwiYW1vdW50Ijo1Ljc1fQ==
```

Whether iOS forwards `webapp://` fragments to the installed PWA still needs testing on your phones. The app processes a delivered URL on launch, hash/history navigation, restoration, focus, and resume.

## Saving behavior

- A valid link saves automatically and displays a confirmation. Invalid data displays an error.
- Each separate opening creates a fresh app-generated UUID, even when the payload matches a previous purchase.
- Overlapping lifecycle events for one opening share one save.
- After a successful database commit, Penny removes `#add=…` from the current URL so ordinary reloads/resumes do not repeat the insert.
- On validation/storage failure, the fragment remains available for retry. The app does not claim success before the database commits.
- There is no cross-launch or cross-tab deduplication based on transaction content.
- Old query/action/transaction insertion formats are no longer supported. The existing `?add=1` link still opens the blank manual form.

## Update and test

Run `npm test` and `npm run build`. Publish the contents of `dist/` to your existing HTTPS address. Open Penny online to download the new worker, close all Penny windows, then reopen to activate `penny-shell-v6-custom-categories`. Do not uninstall the PWA or clear its site data.
