import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTransactionURL, encodeTransaction, installURLTransactions } from '../src/url-entry.js';

const base = 'https://example.test/apps/penny/';
const now = '2026-10-25T18:30:00.000Z';
const link = data => base + '#add=' + encodeTransaction(data);
const parse = data => parseTransactionURL(link(data), { now });

test('URL entry uses Penny cents, ISO dates, and Misc defaults', () => {
  const entry = parse({ name: 'Coffee', amount: '0.29' });
  assert.deepEqual(entry.transaction, { name: 'Coffee', amount: 29, category: 'misc', date: now });
  assert.equal(entry.cleanURL, base);
});
test('fragment JSON preserves Unicode and unrelated query parameters', () => {
  const data = { name: 'Café & tea ☕ 日本語', amount: '19.95', category: 'Food & drink' };
  const a = parseTransactionURL(base + '?view=month#add=' + encodeTransaction(data), { now });
  const standard = Buffer.from(JSON.stringify(data)).toString('base64');
  for (const encoded of [standard, encodeURIComponent(standard)]) {
    const b = parseTransactionURL(base + '#add=' + encoded, { now });
    assert.deepEqual(a.transaction, b.transaction);
  }
  assert.equal(a.transaction.category, 'food');
  assert.equal(a.transaction.name, data.name);
  assert.equal(a.cleanURL, base + '?view=month');
});
test('ordinary routes and legacy formats never insert automatically', () => {
  for (const suffix of ['', '?add=1', '#overview', '?name=Coffee&amount=5', '#action=add-transaction&name=Coffee&amount=5', '?transaction=e30', '#transaction=e30']) assert.equal(parseTransactionURL(base + suffix), null);
});
test('JSON is the only source of transaction fields', () => {
  const encoded = encodeTransaction({ name: 'Coffee', amount: 5 });
  for (const suffix of ['&amount=2', '&add=' + encoded]) assert.throws(() => parseTransactionURL(base + '#add=' + encoded + suffix));
  assert.equal(parseTransactionURL(base + '?amount=99#add=' + encoded).transaction.amount, 500);
  for (const extra of [{ id: 'external' }, { currency: 'USD' }, { v: 1 }, { redirect: 'https://example.com' }]) assert.throws(() => parse({ name: 'Coffee', amount: 5, ...extra }));
});
test('invalid or oversized Base64 JSON is rejected', () => {
  for (const value of ['', '?', '_w', 'ew', 'W10', 'bnVsbA']) assert.throws(() => parseTransactionURL(base + '#add=' + value));
  assert.throws(() => encodeTransaction({ name: 'x'.repeat(9000) }));
  assert.throws(() => parse({ name: 'x'.repeat(17000), amount: 1 }));
});
test('names, amounts, and categories are validated', () => {
  for (const patch of [{ name: '' }, { name: ' ' }, { name: 'x'.repeat(101) }, { amount: '-5' }, { amount: '0' }, { amount: '1.001' }, { amount: '1e3' }, { amount: 'NaN' }, { amount: '1,50' }, { category: 'x'.repeat(41) }, { id: 'invalid/id' }, { currency: 'EUR' }]) assert.throws(() => parse({ name: 'Coffee', amount: 5, ...patch }));
});
test('dates respect timezones and reject calendar rollover', () => {
  assert.equal(parse({ name: 'Coffee', amount: 5, date: '2026-10-25T14:30:00-04:00' }).transaction.date, now);
  const local = new Date(parse({ name: 'Coffee', amount: 5, date: '2026-10-25' }).transaction.date);
  assert.equal(local.getDate(), 25); assert.equal(local.getHours(), 12);
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-01-00', '2026-01-01T24:00:00Z', 'yesterday']) assert.throws(() => parse({ name: 'Coffee', amount: 5, date }));
});
function fakeWindow(href) {
  const target = new EventTarget();
  target.document = new EventTarget(); target.document.hidden = false;
  target.location = { href };
  target.history = { state: { retained: true }, replaceState(state, unused, url) { this.state = state; target.location.href = url; } };
  return target;
}
test('controller handles startup and resume, consumes URLs only after success', async () => {
  const target = fakeWindow(link({ name: 'Coffee', amount: 5 }));
  const saved = [], results = [];
  const handler = installURLTransactions({ target, save: async entry => { saved.push(entry); return { status: 'saved', transaction: entry.transaction }; }, onResult: result => results.push(result), onError: assert.fail });
  assert.equal((await handler.ready).status, 'saved');
  assert.equal(target.location.href, base);
  target.location.href = link({ name: 'Groceries', amount: 10 });
  target.dispatchEvent(new Event('hashchange'));
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(saved.length, 2);
  assert.equal(results.length, 2);
  assert.equal(target.location.href, base);
  assert.deepEqual(target.history.state, { retained: true });
  handler.stop();
  target.location.href = link({ name: 'Ignored', amount: 1 });
  target.dispatchEvent(new Event('focus'));
  await Promise.resolve();
  assert.equal(saved.length, 2);
});
test('failure retains the URL for retry and never reports success', async () => {
  const original = link({ name: 'Coffee', amount: 5 });
  const target = fakeWindow(original), errors = [];
  const handler = installURLTransactions({ target, save: async () => { throw new Error('Storage full'); }, onResult: () => assert.fail('must not succeed'), onError: error => errors.push(error.message) });
  assert.equal((await handler.ready).status, 'error');
  assert.equal(target.location.href, original);
  assert.deepEqual(errors, ['Storage full']);
  handler.stop();
});

test('overlapping lifecycle events share one save and one result', async () => {
  const original = link({ name: 'Coffee', amount: 5 });
  const target = fakeWindow(original), results = [], ids = [];
  let saves = 0;
  const handler = installURLTransactions({ target, save: async entry => { saves++; ids.push(entry.transaction.id); return { status: 'saved', transaction: entry.transaction }; }, onResult: result => results.push(result), onError: assert.fail });
  target.dispatchEvent(new Event('pageshow'));
  target.dispatchEvent(new Event('popstate'));
  target.dispatchEvent(new Event('hashchange'));
  target.dispatchEvent(new Event('focus'));
  await handler.ready;
  assert.equal(saves, 1);
  assert.equal(results.length, 1);
  // Opening the same link again is a new purchase with a fresh app-generated ID.
  target.location.href = original;
  await handler.processURL();
  assert.equal(saves, 2);
  assert.match(ids[0], /^[0-9a-f-]{36}$/);
  assert.notEqual(ids[0], ids[1]);
  handler.stop();
});

test('successful save with failed URL cleanup is not repeated on focus', async () => {
  const target = fakeWindow(link({ name: 'Coffee', amount: 5 }));
  target.history.replaceState = () => { throw new Error('History unavailable'); };
  let saves = 0;
  const handler = installURLTransactions({ target, save: async entry => { saves++; return { status: 'saved', transaction: entry.transaction }; }, onResult() {}, onError: assert.fail });
  await handler.ready;
  await handler.processURL();
  assert.equal(saves, 1);
  handler.stop();
});

test('URL entry accepts a custom category name', () => {
  assert.equal(parse({ name: 'Vet', amount: 25, category: '  Pet   care ' }).transaction.category, 'Pet care');
  assert.equal(parse({ name: 'Vet', amount: 25, category: '  ' }).transaction.category, 'misc');
  assert.throws(() => parse({ name: 'Vet', amount: 25, category: {} }));
});
