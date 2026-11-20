import { Injectable } from '@angular/core';

/** Object stores kept on the device. Every record has a string `key`. */
export type LocalStoreName = 'collect-queue' | 'collect-cards';
const STORES: readonly LocalStoreName[] = ['collect-queue', 'collect-cards'];

const DB_NAME = 'wassia-agent';
const DB_VERSION = 1;

export interface Keyed {
  key: string;
}

/**
 * Device storage for the field agent's offline work (queued deposits, cached cards).
 * IndexedDB in the browser; in memory where IndexedDB is missing (tests, old browsers), so the
 * app still runs — it just forgets the queue on reload there.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () =>
    typeof indexedDB === 'undefined' ? new MemoryLocalStore() : new IndexedDbLocalStore(),
})
export abstract class LocalStore {
  abstract getAll<T extends Keyed>(store: LocalStoreName): Promise<T[]>;
  abstract put<T extends Keyed>(store: LocalStoreName, value: T): Promise<void>;
  abstract delete(store: LocalStoreName, key: string): Promise<void>;
  /** Replaces the whole content of a store in one go. */
  abstract replaceAll<T extends Keyed>(store: LocalStoreName, values: readonly T[]): Promise<void>;
}

export class MemoryLocalStore extends LocalStore {
  private readonly data = new Map<LocalStoreName, Map<string, unknown>>();

  private bucket(store: LocalStoreName): Map<string, unknown> {
    let bucket = this.data.get(store);
    if (!bucket) {
      bucket = new Map();
      this.data.set(store, bucket);
    }
    return bucket;
  }

  async getAll<T extends Keyed>(store: LocalStoreName): Promise<T[]> {
    return [...this.bucket(store).values()].map((v) => structuredClone(v) as T);
  }

  async put<T extends Keyed>(store: LocalStoreName, value: T): Promise<void> {
    this.bucket(store).set(value.key, structuredClone(value));
  }

  async delete(store: LocalStoreName, key: string): Promise<void> {
    this.bucket(store).delete(key);
  }

  async replaceAll<T extends Keyed>(store: LocalStoreName, values: readonly T[]): Promise<void> {
    const bucket = this.bucket(store);
    bucket.clear();
    for (const v of values) bucket.set(v.key, structuredClone(v));
  }
}

export class IndexedDbLocalStore extends LocalStore {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        for (const name of STORES) {
          if (!request.result.objectStoreNames.contains(name)) {
            request.result.createObjectStore(name, { keyPath: 'key' });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.db = null;
        reject(request.error);
      };
    });
    return this.db;
  }

  private async run<R>(
    store: LocalStoreName,
    mode: IDBTransactionMode,
    work: (s: IDBObjectStore) => IDBRequest<R> | void,
  ): Promise<R | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async getAll<T extends Keyed>(store: LocalStoreName): Promise<T[]> {
    return ((await this.run(store, 'readonly', (s) => s.getAll())) ?? []) as T[];
  }

  async put<T extends Keyed>(store: LocalStoreName, value: T): Promise<void> {
    await this.run(store, 'readwrite', (s) => s.put(value));
  }

  async delete(store: LocalStoreName, key: string): Promise<void> {
    await this.run(store, 'readwrite', (s) => s.delete(key));
  }

  async replaceAll<T extends Keyed>(store: LocalStoreName, values: readonly T[]): Promise<void> {
    await this.run(store, 'readwrite', (s) => {
      s.clear();
      for (const v of values) s.put(v);
    });
  }
}
