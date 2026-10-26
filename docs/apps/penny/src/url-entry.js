import { normalizeCategory, amountToCents } from './core.js';

const FIELDS = ['name', 'amount', 'category', 'date'];

// Keep the entire payload in the fragment, outside HTTP requests.
export function parseTransactionURL(href, { now = new Date() } = {}) {
  const url = new URL(href);
  if (url.hash !== '#add' && !url.hash.startsWith('#add=')) return null;
  if (href.length > 16384) throw new Error('Transaction URL exceeds the 16 KB limit.');
  // Unlike query parsing, this preserves literal + characters in Base64.
  let encoded;
  try { encoded = decodeURIComponent(url.hash.slice(5)); }
  catch { throw new Error('Invalid URL encoding in transaction payload.'); }
  const data = decodeTransaction(encoded);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Transaction JSON must be an object.');
  for (const key of Object.keys(data)) if (!FIELDS.includes(key)) throw new Error(`Unknown transaction field: ${key}.`);
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100) throw new Error('Name must contain 1–100 characters.');
  if (typeof data.amount !== 'string' && typeof data.amount !== 'number') throw new Error('Amount is required, for example 5.75.');
  const amount = amountToCents(data.amount);
  const category = normalizeCategory(data.category);
  const date = data.date === undefined || data.date === '' ? null : parseDate(data.date);
  const transaction = { name: data.name.trim(), amount, category, date: date ?? new Date(now).toISOString() };
  url.hash = '';
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
  if (!value || value.length > 12000 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) throw new Error('Invalid Base64 transaction.');
  try {
    const text = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
    if (text.length > 8192) throw new Error();
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(text, char => char.charCodeAt(0))));
  } catch { throw new Error('Could not decode transaction as UTF-8 Base64 JSON.'); }
}

export function installURLTransactions({ save, onResult, onError, target = window }) {
  let queue = Promise.resolve();
  let stopped = false;
  let uncleanedURL = null;
  const pending = new Map();
  function processURL() {
    const href = target.location.href;
    if (href === uncleanedURL) return Promise.resolve(null);
    uncleanedURL = null;
    // A single navigation can emit both popstate and hashchange (or resume).
    // Share its pending save so a success banner isn't replaced by a replay.
    if (pending.has(href)) return pending.get(href);
    queue = queue.then(async () => {
      if (stopped) return null;
      let entry, result;
      try {
        entry = parseTransactionURL(href);
        if (!entry) return null;
        entry.transaction.id = crypto.randomUUID();
        result = await save(entry);
      } catch (error) {
        onError(error);
        return { status: 'error' };
      }
      if (target.location.href === href) {
        try { target.history.replaceState(target.history.state, '', entry.cleanURL); }
        catch { uncleanedURL = href; } // Don't resave on focus if history is unavailable.
      }
      try { await onResult(result, entry); } catch (error) { console.error('Transaction saved; refresh failed.', error); }
      return result;
    });
    const result = queue.finally(() => pending.delete(href));
    pending.set(href, result);
    return result;
  }
  const resume = () => { if (!target.document.hidden) processURL(); };
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
