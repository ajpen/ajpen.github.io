let database;
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('penny-local', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('transactions', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Penny tabs and try again.'));
  });
}
function operate(store, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, mode);
    let result;
    const request = action(transaction.objectStore(store));
    if (request) request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Storage operation was interrupted.'));
  });
}
export const getTransactions = () => operate('transactions', 'readonly', store => store.getAll());
export const saveTransaction = item => operate('transactions', 'readwrite', store => store.put(item));
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
