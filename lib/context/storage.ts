import type { ContextLibrary } from "./types.ts";

const STORAGE_KEY = "dreambound_contextLibrary";

function readRaw(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

export function readContextLibrary(): ContextLibrary {
  const raw = readRaw(STORAGE_KEY);
  if (!raw) return defaultLibrary();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultLibrary();
    const obj = parsed as Record<string, unknown>;
    const memories = Array.isArray(obj.memories) ? obj.memories.filter(isMemoryEntry) : [];
    const authorNotes = Array.isArray(obj.authorNotes) ? obj.authorNotes.filter(isAuthorNoteEntry) : [];
    const lorebooks = Array.isArray(obj.lorebooks) ? obj.lorebooks.filter(isLorebookRecord) : [];
    return { memories, authorNotes, lorebooks };
  } catch {
    return defaultLibrary();
  }
}

export function writeContextLibrary(library: ContextLibrary) {
  writeRaw(STORAGE_KEY, JSON.stringify(library));
}

function defaultLibrary(): ContextLibrary {
  return { memories: [], authorNotes: [], lorebooks: [] };
}

function isMemoryEntry(value: unknown): value is import("./types.ts").MemoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string"
    && typeof entry.text === "string"
    && typeof entry.enabled === "boolean"
    && typeof entry.source === "string"
    && typeof entry.createdAt === "number"
    && typeof entry.updatedAt === "number"
  );
}

function isAuthorNoteEntry(value: unknown): value is import("./types.ts").AuthorNoteEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string"
    && typeof entry.text === "string"
    && typeof entry.enabled === "boolean"
    && typeof entry.createdAt === "number"
    && typeof entry.updatedAt === "number"
  );
}

function isLorebookRecord(value: unknown): value is import("./types.ts").LorebookRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string"
    && typeof record.name === "string"
    && typeof record.enabled === "boolean"
    && typeof record.createdAt === "number"
    && typeof record.updatedAt === "number"
  );
}
