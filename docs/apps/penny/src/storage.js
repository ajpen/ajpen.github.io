import { log, errorDetails, transactionDetails } from './diagnostics.js';
let database;
export function openDatabase() {
  log('Database opening', { database: 'penny-local', version: 1 });
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('penny-local', 1);
    request.onupgradeneeded = () => {
      log('Database created');
      const db = request.result;
      db.createObjectStore('transactions', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => { log('Database closing for version change', {}, 'warn'); database.close(); };
      log('Database ready');
      resolve();
    };
    request.onerror = () => { log('Database open failed', errorDetails(request.error), 'error'); reject(request.error); };
    request.onblocked = () => { log('Database open blocked', {}, 'error'); reject(new Error('Close other Penny tabs and try again.')); };
  });
}
function operate(store, mode, action) {
  return new Promise((resolve, reject) => {
    log('Storage operation', { store, mode });
    const transaction = database.transaction(store, mode);
    let result;
    const request = action(transaction.objectStore(store));
    if (request) request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => { log('Storage completed', { store, mode }); resolve(result); };
    transaction.onerror = () => { log('Storage failed', { store, mode, ...errorDetails(transaction.error) }, 'error'); reject(transaction.error); };
    transaction.onabort = () => { log('Storage aborted', { store, mode, ...errorDetails(transaction.error) }, 'error'); reject(transaction.error || new Error('Storage operation was interrupted.')); };
  });
}
export const getTransactions = () => operate('transactions', 'readonly', store => store.getAll());
export async function saveTransaction(item) {
  log('Transaction save started', transactionDetails(item));
  try {
    const result = await operate('transactions', 'readwrite', store => store.put(item));
    log('Transaction save committed', transactionDetails(item));
    return result;
  } catch (error) {
    const failure = errorDetails(error);
    log('Transaction save failed', { ...transactionDetails(item), errorName: failure.name, errorMessage: failure.message }, 'error');
    throw error;
  }
}
export const deleteTransaction = id => operate('transactions', 'readwrite', store => store.delete(id));
export const getSettings = () => operate('settings', 'readonly', store => store.get('preferences'));
export const saveSettings = value => operate('settings', 'readwrite', store => store.put({ ...value, key: 'preferences' }));
export async function insertURLTransaction(entry) {
  // add() never overwrites a record; operate() resolves after the durable commit.
  await operate('transactions', 'readwrite', store => store.add(entry.transaction));
  return { status: 'saved', transaction: entry.transaction };
}
export function mergeTransactions(items) {
  // One read/write transaction serializes deduplication against other open tabs.
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    let added = 0;
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const ids = new Set(request.result);
      for (const item of items) if (!ids.has(item.id)) { store.add(item); ids.add(item.id); added++; }
    };
    transaction.oncomplete = () => resolve(added);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Import was interrupted. No records were imported.'));
  });
}
