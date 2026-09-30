import type { Sealed } from "./crypto";

const DB_NAME = "aetheris";
const DB_VERSION = 1;

export const STORES = {
  records: "records",
  server: "server",
  conflicts: "conflicts",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export type SealedRow = { id: string } & Sealed;

export function putRow(store: StoreName, row: unknown) {
  return tx<void>(store, "readwrite", (s) => s.put(row as never));
}

export function getAllRows<T>(store: StoreName) {
  return tx<T[]>(store, "readonly", (s) => s.getAll());
}

export function deleteRow(store: StoreName, id: string) {
  return tx<void>(store, "readwrite", (s) => s.delete(id));
}

export function clearStore(store: StoreName) {
  return tx<void>(store, "readwrite", (s) => s.clear());
}
