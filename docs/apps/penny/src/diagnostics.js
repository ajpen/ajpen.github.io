export const BUILD = '2026-10-27-console-2';
export const LOG_LIMITS = { entries: 100, bytes: 32 * 1024, age: 30 * 60 * 1000 };
const encoder = new TextEncoder();
const short = value => String(value).slice(0, 220);

// No IndexedDB, localStorage, network, or console interception. A new document
// gets an empty buffer; diagnostics must never interfere with transaction saves.
export function createDiagnosticLog(now = Date.now) {
  let entries = [], bytes = 0;
  const listeners = new Set();
  function prune() {
    const cutoff = now() - LOG_LIMITS.age;
    while (entries.length && (entries[0].time <= cutoff || entries.length > LOG_LIMITS.entries || bytes > LOG_LIMITS.bytes)) {
      bytes -= entries.shift().size;
    }
  }
  function notify() { for (const listener of listeners) { try { listener(); } catch { /* Best effort. */ } } }
  return {
    write(event, data = {}, level = 'info') {
      try {
        const details = {};
        for (const [key, value] of Object.entries(data).slice(0, 12)) {
          if (['string', 'number', 'boolean'].includes(typeof value) || value === null) details[short(key)] = typeof value === 'string' ? short(value) : value;
        }
        const entry = { time: now(), level: ['info', 'warn', 'error'].includes(level) ? level : 'info', event: short(event), details };
        const size = encoder.encode(JSON.stringify(entry)).length + 1;
        entries.push({ ...entry, size }); bytes += size;
        prune(); notify();
      } catch { /* Logging must not break the app, even on malformed errors. */ }
    },
    snapshot() { prune(); return { entries: entries.map(({ size, ...entry }) => ({ ...entry, details: { ...entry.details } })), bytes }; },
    clear() { entries = []; bytes = 0; notify(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
export const diagnostics = createDiagnosticLog();
export const log = (event, details, level) => diagnostics.write(event, details, level);
// Stored amounts are integer cents; label them explicitly in the console.
export const transactionDetails = item => ({ id: item.id, name: item.name, amountCents: item.amount, category: item.category, date: item.date });
export function errorDetails(error) {
  try {
    return {
      name: short(error?.name || 'Error'),
      message: short(String(error?.message || 'No error details available')
        .replace(/(?:https?|webapp):\/\/\S+/gi, '[URL omitted]')
        .replace(/#add=\S+/gi, '#add=[omitted]')),
    };
  } catch { return { name: 'Error', message: 'Unreadable error details' }; }
}
export function urlDetails(href) {
  try {
    const url = new URL(href), hash = url.hash;
    return {
      origin: url.origin, path: url.pathname,
      queryPresent: !!url.search, queryLength: url.search.length,
      fragmentLength: hash.length,
      fragment: !hash ? 'none' : hash.startsWith('#add=') ? '#add=' : hash === '#add' ? '#add (no payload)' : hash.startsWith('#add') ? '#add (wrong separator)' : 'unrecognized',
      payloadLength: hash.startsWith('#add=') ? hash.length - 5 : 0,
    };
  } catch { return { invalidURL: true }; }
}
export function startDiagnostics(target = window) {
  log('App started', {
    build: BUILD, secure: target.isSecureContext,
    standalone: !!(target.navigator.standalone || target.matchMedia('(display-mode: standalone)').matches),
    online: target.navigator.onLine, visibility: target.document.visibilityState,
    browser: target.navigator.userAgent,
  });
  log('Initial URL', urlDetails(target.location.href));
  target.addEventListener('error', event => log('Runtime error', { ...errorDetails(event.error || { message: event.message }), line: event.lineno, column: event.colno }, 'error'));
  target.addEventListener('unhandledrejection', event => log('Unhandled promise rejection', errorDetails(event.reason), 'error'));
  for (const type of ['pageshow', 'pagehide', 'online', 'offline']) target.addEventListener(type, event => log(`Lifecycle: ${type}`, { persisted: !!event.persisted, online: target.navigator.onLine, ...urlDetails(target.location.href) }));
  target.document.addEventListener('visibilitychange', () => log('Visibility changed', { state: target.document.visibilityState, ...urlDetails(target.location.href) }));
  // Timers can pause in the background; reads/writes also prune immediately.
  target.setInterval(() => { diagnostics.snapshot(); target.dispatchEvent(new Event('diagnostics-pruned')); }, 60000);
}
export function diagnosticText() {
  return `Penny diagnostics · ${BUILD}\nCurrent page session only; includes transaction details. Stored amounts are in cents.\n` + diagnostics.snapshot().entries.map(entry => `${new Date(entry.time).toISOString()} ${entry.level.toUpperCase()} ${entry.event} ${JSON.stringify(entry.details)}`).join('\n');
}
