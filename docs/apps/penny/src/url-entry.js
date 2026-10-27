import { normalizeCategory, amountToCents } from './core.js';
import { log, urlDetails, errorDetails, transactionDetails } from './diagnostics.js';

const FIELDS = ['name', 'amount', 'category', 'date'];

// The payload travels in the fragment (#add=…) to stay out of HTTP requests;
// iOS strips the fragment when deep-linking into an installed PWA, so the
// same payload is also accepted as ?add=… in that case.
export function parseTransactionURL(href, { now = new Date() } = {}) {
  const url = new URL(href);
  if (href.length > 16384) throw new Error('Transaction URL exceeds the 16 KB limit.');
  let encoded = null;
  if (url.hash.startsWith('#add=')) {
    // Unlike query parsing, this preserves literal + characters in Base64.
    try { encoded = decodeURIComponent(url.hash.slice(5)); }
    catch { throw new Error('Invalid URL encoding in transaction payload.'); }
  } else if (url.hash === '' || url.hash === '#add') {
    // searchParams decodes %XX for us, so Base64url (no +, /, or = padding) is
    // the safe alphabet in a query string. ?add=1 stays the quick-entry form link.
    const query = url.searchParams.get('add');
    if (query && query !== '1') encoded = query;
  }
  if (encoded === null) return null;
  const data = decodeTransaction(encoded);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Transaction JSON must be an object.');
  log('URL transaction decoded', Object.fromEntries(FIELDS.filter(key => Object.hasOwn(data, key)).map(key => [key, typeof data[key] === 'object' && data[key] !== null ? JSON.stringify(data[key]) : data[key]])));
  log('URL JSON fields', Object.fromEntries([...FIELDS.map(key => [key, data[key] === undefined ? 'missing' : data[key] === null ? 'null' : typeof data[key]]), ['unknownFields', Object.keys(data).filter(key => !FIELDS.includes(key)).length]]));
  for (const key of Object.keys(data)) if (!FIELDS.includes(key)) throw new Error(`Unknown transaction field: ${key}.`);
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100) throw new Error('Name must contain 1–100 characters.');
  if (typeof data.amount !== 'string' && typeof data.amount !== 'number') throw new Error('Amount is required, for example 5.75.');
  const amount = amountToCents(data.amount);
  const category = normalizeCategory(data.category);
  const date = data.date === undefined || data.date === '' ? null : parseDate(data.date);
  const transaction = { name: data.name.trim(), amount, category, date: date ?? new Date(now).toISOString() };
  url.hash = '';
  url.searchParams.delete('add');
  return { transaction, cleanURL: url.href };
}

function parseDate(value) {
  if (typeof value !== 'string') throw new Error('Date must be an ISO date or timestamp.');
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (!match) throw new Error('Use an ISO date, such as 2026-10-25T14:30:00-04:00.');
  const [, year, month, day, hour, minute, second] = match;
  const calendar = new Date(Date.UTC(+year, +month - 1, +day));
  if (+year < 1900 || calendar.getUTCFullYear() !== +year || calendar.getUTCMonth() !== +month - 1 || calendar.getUTCDate() !== +day || +(hour || 0) > 23 || +(minute || 0) > 59 || +(second || 0) > 59) throw new Error('Invalid transaction date.');
  const date = new Date(hour === undefined ? `${value}T12:00:00` : value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid transaction date.');
  return date.toISOString();
}

export function encodeTransaction(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  if (bytes.length > 8192) throw new Error('Transaction JSON exceeds the 8 KB limit.');
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeTransaction(value) {
  log('Base64 decode started', { length: value?.length || 0, whitespace: /\s/.test(value || ''), percentEscapes: /%/.test(value || '') });
  if (!value || value.length > 12000 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) throw new Error('Invalid Base64 transaction.');
  try {
    const text = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
    log('Base64 decoded', { bytes: text.length });
    if (text.length > 8192) throw new Error();
    const json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(text, char => char.charCodeAt(0)));
    log('UTF-8 decoded', { characters: json.length });
    const data = JSON.parse(json);
    log('JSON decoded', { type: data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data });
    return data;
  } catch { throw new Error('Could not decode transaction as UTF-8 Base64 JSON.'); }
}

export function installURLTransactions({ save, onResult, onError, target = window }) {
  let queue = Promise.resolve();
  let stopped = false;
  let uncleanedURL = null;
  const pending = new Map();
  let attempt = 0;
  function processURL(event) {
    const href = target.location.href;
    log('URL received', { trigger: event?.type || 'startup/manual', ...urlDetails(href) });
    if (href === uncleanedURL) { log('URL skipped: already saved, cleanup failed'); return Promise.resolve(null); }
    uncleanedURL = null;
    // A single navigation can emit both popstate and hashchange (or resume).
    // Share its pending save so a success banner isn't replaced by a replay.
    if (pending.has(href)) { log('URL event coalesced with pending check'); return pending.get(href); }
    queue = queue.then(async () => {
      if (stopped) return null;
      let entry, result, stage = 'parse';
      const request = ++attempt;
      try {
        entry = parseTransactionURL(href);
        if (!entry) { log('No add payload: URL ignored', { request, ...urlDetails(href) }); return null; }
        log('Transaction validated', { request });
        stage = 'generate ID';
        entry.transaction.id = crypto.randomUUID();
        stage = 'save';
        log('URL save started', { request, ...transactionDetails(entry.transaction) });
        result = await save(entry);
        log('URL save committed', { request, ...transactionDetails(entry.transaction) });
      } catch (error) {
        log('URL entry failed', { request, stage, ...errorDetails(error) }, 'error');
        onError(error);
        return { status: 'error' };
      }
      if (target.location.href === href) {
        try { target.history.replaceState(target.history.state, '', entry.cleanURL); log('URL fragment cleared', { request }); }
        catch (error) { uncleanedURL = href; log('URL cleanup failed', { request, ...errorDetails(error) }, 'warn'); } // Don't resave on focus if history is unavailable.
      }
      try { await onResult(result, entry); log('URL result displayed', { request }); }
      catch (error) { log('Transaction saved; refresh failed', { request, ...errorDetails(error) }, 'error'); console.error('Transaction saved; refresh failed.', error); }
      return result;
    });
    const result = queue.finally(() => pending.delete(href));
    pending.set(href, result);
    return result;
  }
  const resume = event => { if (!target.document.hidden) processURL(event); };
  const listeners = [['hashchange', processURL], ['popstate', processURL], ['pageshow', processURL], ['focus', resume]];
  for (const [event, handler] of listeners) target.addEventListener(event, handler);
  target.document.addEventListener('visibilitychange', resume);
  return {
    ready: processURL(), processURL,
    stop() {
      stopped = true;
      for (const [event, handler] of listeners) target.removeEventListener(event, handler);
      target.document.removeEventListener('visibilitychange', resume);
    },
  };
}
