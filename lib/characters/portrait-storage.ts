const DATABASE_NAME = "howling-whispers-character-media";
const STORE_NAME = "portraits";
const REFERENCE_PREFIX = "hw-portrait://";

export const MAX_STORED_PORTRAIT_BYTES = 8 * 1024 * 1024;

export type PortraitBinaryStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
};

export function isStoredPortraitReference(value: string): boolean {
  return value.startsWith(REFERENCE_PREFIX) && value.length > REFERENCE_PREFIX.length;
}

export function portraitReferenceKey(value: string): string | null {
  return isStoredPortraitReference(value) ? value.slice(REFERENCE_PREFIX.length) : null;
}

export async function persistCharacterPortrait(
  characterId: string,
  bytes: Uint8Array,
  store: PortraitBinaryStore = browserPortraitStore,
): Promise<string> {
  if (bytes.length === 0 || bytes.length > MAX_STORED_PORTRAIT_BYTES) {
    throw new Error("The character portrait is too large to store safely.");
  }
  const key = `${safeKey(characterId)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await store.put(key, new Uint8Array(bytes));
  return `${REFERENCE_PREFIX}${key}`;
}

export async function loadCharacterPortrait(
  reference: string,
  store: PortraitBinaryStore = browserPortraitStore,
): Promise<Uint8Array | null> {
  const key = portraitReferenceKey(reference);
  return key ? store.get(key) : null;
}

export async function deleteCharacterPortrait(
  reference: string,
  store: PortraitBinaryStore = browserPortraitStore,
): Promise<void> {
  const key = portraitReferenceKey(reference);
  if (key) await store.delete(key);
}

export const browserPortraitStore: PortraitBinaryStore = {
  async put(key, bytes) {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(bytes, key);
    await transactionPromise(transaction);
  },
  async get(key) {
    const database = await openDatabase();
    const result = await requestPromise(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key));
    if (result instanceof Uint8Array) return new Uint8Array(result);
    if (result instanceof ArrayBuffer) return new Uint8Array(result);
    return null;
  },
  async delete(key) {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    await transactionPromise(transaction);
  },
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Durable browser image storage is unavailable."));
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Character image storage could not be opened."));
  });
  return databasePromise;
}

function requestPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Character image storage failed."));
  });
}

function transactionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Character image storage was aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Character image storage failed."));
  });
}

function safeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 120) || "character";
}
