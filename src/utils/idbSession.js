// Tiny IndexedDB wrapper for auto-saving the Messtool session (currently
// loaded file + selection state) across an accidental reload/tab close.
//
// Used instead of localStorage because localStorage is capped around
// 5-10MB per origin in most browsers — nowhere near enough for a
// multi-tens-of-MB measurement file. IndexedDB's quota is typically a
// generous fraction of free disk space instead, and it accepts plain JS
// objects directly (structured clone), so there's no JSON.stringify
// overhead either.
//
// Kept deliberately tiny: one object store, one fixed key ("current"),
// no schema/versioning beyond what's needed to open the store.

const DB_NAME = "signallab-messtool";
const STORE_NAME = "session";
const DB_VERSION = 1;
const KEY = "current";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB nicht verfügbar in diesem Browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(data) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    db.close();
  });
}

export async function loadSession() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearSession() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => { resolve(); db.close(); };
    tx.onerror = () => reject(tx.error);
  });
}
