export const CATEGORIES = [
  { id: 'food', name: 'Food & drink', color: '#8c7ae6', bg: '#efebfc', icon: 'coffee' },
  { id: 'shopping', name: 'Shopping', color: '#b5a0df', bg: '#f2edf9', icon: 'bag' },
  { id: 'transport', name: 'Transport', color: '#edba83', bg: '#fcf1e5', icon: 'car' },
  { id: 'home', name: 'Home & bills', color: '#91bba9', bg: '#eaf4ee', icon: 'home' },
  { id: 'fun', name: 'Entertainment', color: '#e1a3b6', bg: '#fbeef2', icon: 'play' },
  { id: 'health', name: 'Health', color: '#8bbad0', bg: '#eaf4f9', icon: 'heart' },
  { id: 'misc', name: 'Miscellaneous', color: '#acb4c3', bg: '#eef0f4', icon: 'grid' },
];
export function normalizeCategory(value = '') {
  if (typeof value !== 'string') throw new Error('Category must be text.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) return 'misc';
  if (name.length > 40) throw new Error('Category must be 40 characters or fewer.');
  return CATEGORIES.find(c => c.id === name.toLowerCase() || c.name.toLowerCase() === name.toLowerCase())?.id || name;
}
export const categoryKey = value => normalizeCategory(value).toLowerCase();
export function categoryFor(value) {
  const id = normalizeCategory(value);
  return CATEGORIES.find(c => c.id === id) || { id, name: id, color: '#8c7ae6', bg: '#efebfc', icon: 'grid' };
}
export function categoriesFor(transactions) {
  const categories = new Map(CATEGORIES.map(c => [c.id, c]));
  for (const item of transactions) {
    const key = categoryKey(item.category);
    if (!categories.has(key)) categories.set(key, categoryFor(item.category));
  }
  return [...categories.values()];
}
export const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function localInput(date = new Date()) { return `${localDay(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
export const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export function amountToCents(value) {
  const input = String(value).trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(input)) throw new Error('Enter a positive amount with up to two decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0 || !Number.isSafeInteger(cents)) throw new Error('Amount must be greater than zero.');
  return cents;
}
export function periodRange(period, anchor = new Date(), custom = null) {
  let start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  let end;
  if (period === 'custom' && custom) {
    start = new Date(`${custom.start}T00:00:00`);
    end = addDays(new Date(`${custom.end}T00:00:00`), 1);
  } else if (period === 'monthly') {
    start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  } else if (period === 'weekly' || period === 'biweekly') {
    start = addDays(start, -((start.getDay() + 6) % 7));
    if (period === 'biweekly') {
      const calendarDays = Math.round((Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) - Date.UTC(2024, 0, 1)) / 86400000);
      if (((calendarDays / 7) % 2 + 2) % 2 === 1) start = addDays(start, -7);
    }
    end = addDays(start, period === 'weekly' ? 7 : 14);
  } else end = addDays(start, 1);
  return { start, end };
}
export const daysInRange = ({ start, end }) => Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
export function previousRange(period, range) {
  if (period === 'monthly') return { start: new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1), end: range.start };
  return { start: addDays(range.start, -daysInRange(range)), end: range.start };
}
export const inRange = (transactions, range) => transactions.filter(t => new Date(t.date) >= range.start && new Date(t.date) < range.end);
export const totalCents = transactions => transactions.reduce((sum, t) => sum + t.amount, 0);
export function trendBuckets(transactions, range) {
  const days = daysInRange(range);
  const count = days === 1 ? 24 : Math.min(days, 31);
  const buckets = Array.from({ length: count }, (_, i) => ({
    start: days === 1 ? new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate(), i) : addDays(range.start, Math.floor(i * days / count)),
    value: 0,
  }));
  for (const t of inRange(transactions, range)) {
    const date = new Date(t.date);
    const index = days === 1 ? date.getHours() : buckets.findLastIndex(b => date >= b.start);
    if (index >= 0) buckets[index].value += t.amount;
  }
  return buckets;
}
export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false, endedQuote = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; endedQuote = true; }
      else field += char;
    } else if (char === '"') {
      if (field || endedQuote) throw new Error('Invalid CSV quoting.');
      quoted = true;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; endedQuote = false;
      if (char !== ',') {
        if (row.some(value => value.trim())) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else {
      if (endedQuote) throw new Error('Unexpected characters after a quoted field.');
      field += char;
    }
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}
function safeCell(value) {
  let text = String(value);
  // Avoid spreadsheet formulas, retaining a reversible escape for Penny imports.
  if (/^[\s]*[=+\-@\t\r]/.test(text) || text.startsWith("'")) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function exportCSV(transactions, currency = 'USD') {
  return '\uFEFF' + ['id,name,amount,date,category,currency,penny_format', ...transactions.map(t => [t.id, t.name, (t.amount / 100).toFixed(2), t.date, t.category, currency, '1'].map(safeCell).join(','))].join('\r\n');
}
export function importCSV(text, currency = 'USD') {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('This file has no transactions. Add a header and at least one row.');
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('CSV column headers must be unique.');
  if (!headers.includes('name') || !headers.includes('amount')) throw new Error('CSV needs name and amount columns. Date and category are optional.');
  return rows.map((row, i) => {
    if (row.length !== headers.length) throw new Error(`Row ${i + 2}: column count does not match the header.`);
    const data = Object.fromEntries(headers.map((h, index) => [h, row[index]]));
    let name = data.name.trim();
    if (data.penny_format === '1' && name.startsWith("'")) name = name.slice(1);
    if (!name || name.length > 100) throw new Error(`Row ${i + 2}: name must be 1–100 characters.`);
    let amount;
    try { amount = amountToCents(data.amount); } catch (error) { throw new Error(`Row ${i + 2}: ${error.message}`); }
    const rawDate = data.date?.trim();
    if (rawDate && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(rawDate)) throw new Error(`Row ${i + 2}: use an ISO date, such as 2026-10-25.`);
    const date = rawDate ? new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate) : new Date();
    const calendar = rawDate ? new Date(`${rawDate.slice(0, 10)}T12:00:00`) : date;
    if (Number.isNaN(date.getTime()) || (rawDate && localDay(calendar) !== rawDate.slice(0, 10))) throw new Error(`Row ${i + 2}: invalid date.`);
    if (data.currency && data.currency !== currency) throw new Error(`Row ${i + 2}: currency is ${data.currency}; your app uses ${currency}. Currency conversion is not supported.`);
    let rawCategory = data.category || '';
    if (data.penny_format === '1' && rawCategory.startsWith("'")) rawCategory = rawCategory.slice(1);
    let category;
    try { category = normalizeCategory(rawCategory); }
    catch (error) { throw new Error(`Row ${i + 2}: ${error.message}`); }
    return { id: data.id?.trim() || crypto.randomUUID(), name, amount, date: date.toISOString(), category };
  });
}
