import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategory, categoryKey, categoryFor, categoriesFor, CATEGORIES, amountToCents, localDay, periodRange, previousRange, daysInRange, inRange, trendBuckets, parseCSV, exportCSV, importCSV } from '../src/core.js';

test('amounts use exact integer cents and reject unsupported values', () => {
  assert.equal(amountToCents('0.29'), 29);
  assert.equal(amountToCents('19.9'), 1990);
  assert.equal(amountToCents('002.01'), 201);
  for (const value of ['0', '-2', 'NaN', '1e4', '12.345', '1,000', '9999999999']) assert.throws(() => amountToCents(value));
});
test('monthly ranges include full month, cross year and handle leap years', () => {
  const r = periodRange('monthly', new Date(2024, 1, 15));
  assert.equal(daysInRange(r), 29);
  assert.equal(localDay(r.start), '2024-02-01');
  assert.equal(localDay(r.end), '2024-03-01');
  assert.equal(localDay(previousRange('monthly', periodRange('monthly', new Date(2026, 0, 5))).start), '2025-12-01');
});
test('weekly and biweekly ranges use stable Monday boundaries', () => {
  const monday = new Date(2026, 9, 19);
  const sunday = new Date(2026, 9, 25);
  assert.equal(localDay(periodRange('weekly', sunday).start), localDay(monday));
  const first = periodRange('biweekly', monday);
  assert.equal(daysInRange(first), 14);
  assert.equal(first.start.getDay(), 1);
  assert.equal(+periodRange('biweekly', new Date(first.end.getTime() - 1)).start, +first.start);
  assert.equal(+periodRange('biweekly', first.end).start, +first.end);
});
test('calendar calculations survive spring and fall daylight saving changes', () => {
  process.env.TZ = 'America/New_York';
  assert.equal(daysInRange(periodRange('weekly', new Date(2026, 2, 8))), 7);
  assert.equal(daysInRange(periodRange('weekly', new Date(2026, 10, 1))), 7);
  const r = periodRange('custom', new Date(), { start: '2026-03-07', end: '2026-03-09' });
  assert.equal(daysInRange(r), 3);
});
test('filtering includes start and excludes next midnight', () => {
  const r = periodRange('daily', new Date(2026, 9, 25));
  const items = [{ date: r.start.toISOString(), amount: 100 }, { date: new Date(r.end - 1).toISOString(), amount: 200 }, { date: r.end.toISOString(), amount: 300 }];
  assert.equal(inRange(items, r).length, 2);
  const buckets = trendBuckets(items, r);
  assert.equal(buckets.length, 24);
  assert.equal(buckets.reduce((sum, b) => sum + b.value, 0), 300);
});
test('grouped chart retains all values across a long custom period', () => {
  const r = periodRange('custom', new Date(), { start: '2026-01-01', end: '2026-12-31' });
  const items = [{ date: new Date(2026, 0, 1).toISOString(), amount: 29 }, { date: new Date(2026, 11, 31, 23).toISOString(), amount: 99 }];
  assert.equal(trendBuckets(items, r).length, 31);
  assert.equal(trendBuckets(items, r).reduce((sum, b) => sum + b.value, 0), 128);
});
test('CSV handles commas, escaped quotes, multiline cells, BOM and CRLF', () => {
  assert.deepEqual(parseCSV('\uFEFFname,amount\r\n"Coffee, ""cake""\nshop",12.29'), [['name', 'amount'], ['Coffee, "cake"\nshop', '12.29']]);
  assert.throws(() => parseCSV('name,amount\n"oops,12'));
  assert.throws(() => parseCSV('name,amount\n"oops"x,12'));
});
test('CSV export round trips text, exact amounts, IDs, categories and dates', () => {
  const records = ['Coffee, "cake"\nand tea', '=HYPERLINK("bad")', '+formula', "'apostrophe", '@formula'].map((name, i) => ({ id: String(i), name, amount: 1029, category: 'food', date: '2026-10-25T17:15:00.000Z' }));
  const text = exportCSV(records);
  assert.ok(text.includes("'=HYPERLINK"));
  assert.deepEqual(importCSV(text), records);
});
test('minimal CSV defaults missing category and date', () => {
  const [item] = importCSV('name,amount\nCoffee,5.75');
  assert.equal(item.amount, 575);
  assert.equal(item.category, 'misc');
  assert.ok(item.id);
  assert.ok(Number.isFinite(new Date(item.date).getTime()));
});
test('CSV rejects bad rows atomically and mixed currencies', () => {
  for (const csv of ['name,amount\nCoffee,0', 'name,amount\n,5', 'name,amount\nCoffee,5,extra', 'name,amount,date\nCoffee,5,not-a-date', 'name,amount,date\nCoffee,5,2026-02-30', 'name,amount,currency\nCoffee,5,EUR', 'name,amount,amount\nCoffee,5,5', 'title,value\nCoffee,5']) assert.throws(() => importCSV(csv));
});
test('date-only CSV values keep their local calendar day', () => {
  const [item] = importCSV('name,amount,date,category\nCoffee,5,2026-10-25,Food & drink');
  assert.equal(localDay(new Date(item.date)), '2026-10-25');
  assert.equal(item.category, 'food');
});

test('custom categories keep defaults and group case/whitespace variants', () => {
  const items = [{ category: 'Pets' }, { category: ' pets ' }, { category: 'Travel' }, { category: 'FOOD' }];
  const categories = categoriesFor(items);
  assert.equal(categories.length, CATEGORIES.length + 2);
  assert.equal(categories.find(c => c.id === 'Pets').name, 'Pets');
  assert.equal(categoryKey(' Pet   care '), categoryKey('pet care'));
  assert.equal(normalizeCategory('Food & DRINK'), 'food');
  assert.equal(categoryFor('Travel').name, 'Travel');
  assert.equal(normalizeCategory(''), 'misc');
  assert.throws(() => normalizeCategory('x'.repeat(41)));
  assert.throws(() => normalizeCategory(null));
});
test('CSV round trips custom category names including formula-like text', () => {
  const categories = ['Pets', 'Travel & trips', 'A, B', '=Custom', '+Custom', "'Custom", '<Pets>'];
  const records = categories.map((category, i) => ({ id: String(i), name: 'Example', amount: 150, category, date: '2026-10-25T12:00:00.000Z' }));
  assert.deepEqual(importCSV(exportCSV(records)), records);
  assert.equal(importCSV('name,amount,category\nVet,25,Pets')[0].category, 'Pets');
});
