import type { MemoryEntry, AuthorNoteEntry, LorebookRecord } from "./types.ts";
import { decodeLorebookFile, isLorebookFile, serializeLorebook } from "./lorebook-format.ts";
export { decodeLorebookFile };

export function detectImportFormat(text: string): "memory" | "author-note" | "lorebook" | "unknown" {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "unknown";
  }
  if (isLorebookFile(parsed)) return "lorebook";
  return "unknown";
}

export function importMemory(text: string): MemoryEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((value) => memoryEntryFromString(value));
    }
    if (isRecord(parsed) && Array.isArray(parsed.memories)) {
      return parsed.memories
        .filter((item): item is string => typeof item === "string")
        .map((value) => memoryEntryFromString(value));
    }
    if (typeof parsed === "string") {
      return [memoryEntryFromString(parsed)];
    }
  } catch {
    /* fall through to plain text */
  }
  return [memoryEntryFromString(trimmed)];
}

export function importAuthorNote(text: string): AuthorNoteEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((value) => authorNoteEntryFromString(value));
    }
    if (isRecord(parsed) && Array.isArray(parsed.notes)) {
      return parsed.notes
        .filter((item): item is string => typeof item === "string")
        .map((value) => authorNoteEntryFromString(value));
    }
    if (typeof parsed === "string") {
      return [authorNoteEntryFromString(parsed)];
    }
  } catch {
    /* fall through to plain text */
  }
  return [authorNoteEntryFromString(trimmed)];
}

export function exportMemory(entries: MemoryEntry[]): string {
  const enabled = entries.filter((entry) => entry.enabled);
  return JSON.stringify(enabled.map((entry) => entry.text));
}

export function exportAuthorNotes(entries: AuthorNoteEntry[]): string {
  const enabled = entries.filter((entry) => entry.enabled);
  return JSON.stringify(enabled.map((entry) => entry.text));
}

export function exportLorebook(record: LorebookRecord): string {
  return serializeLorebook(record);
}

function memoryEntryFromString(text: string): MemoryEntry {
  const trimmed = text.trim();
  const now = Date.now();
  return {
    id: `memory-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    enabled: true,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

function authorNoteEntryFromString(text: string): AuthorNoteEntry {
  const trimmed = text.trim();
  const now = Date.now();
  return {
    id: `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseContextInput(raw: unknown): import("./types.ts").ContextInput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    memories: Array.isArray(obj.memories) ? obj.memories.filter((m): m is import("./types.ts").MemoryEntry => (
      m && typeof m === "object" && typeof (m as Record<string, unknown>).id === "string" && typeof (m as Record<string, unknown>).text === "string" && typeof (m as Record<string, unknown>).enabled === "boolean"
    )) : [],
    authorNotes: Array.isArray(obj.authorNotes) ? obj.authorNotes.filter((n): n is import("./types.ts").AuthorNoteEntry => (
      n && typeof n === "object" && typeof (n as Record<string, unknown>).id === "string" && typeof (n as Record<string, unknown>).text === "string" && typeof (n as Record<string, unknown>).enabled === "boolean"
    )) : [],
    lorebooks: Array.isArray(obj.lorebooks) ? obj.lorebooks.filter((l): l is import("./types.ts").LorebookRecord => (
      l && typeof l === "object" && typeof (l as Record<string, unknown>).id === "string" && typeof (l as Record<string, unknown>).name === "string" && typeof (l as Record<string, unknown>).enabled === "boolean"
    )) : [],
  };
}
