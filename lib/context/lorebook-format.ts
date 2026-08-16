import type { LorebookParsedEntry, LorebookRecord } from "./types.ts";

export function isLorebookFile(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.lorebookVersion !== "number") return false;
  if (!Array.isArray(obj.entries)) return false;
  return obj.entries.length >= 0;
}

export function decodeLorebookFile(text: string): LorebookRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isLorebookFile(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const lorebookVersion = typeof obj.lorebookVersion === "number" ? obj.lorebookVersion : 0;
  const entries = Array.isArray(obj.entries) ? obj.entries : [];
  const parsedEntries: LorebookParsedEntry[] = entries.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return {
        text: "",
        keys: [],
        enabled: true,
      };
    }
    const record = entry as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text : "";
    const keys = Array.isArray(record.keys)
      ? record.keys.filter((k): k is string => typeof k === "string")
      : [];
    const id = typeof record.id === "string" || typeof record.id === "number" ? record.id : undefined;
    const displayName = typeof record.displayName === "string" && record.displayName.trim()
      ? record.displayName.trim()
      : `Entry ${index + 1}`;
    const enabled = typeof record.enabled === "boolean" ? record.enabled : true;
    const forceActivation = typeof record.forceActivation === "boolean" ? record.forceActivation : undefined;
    const searchRange = typeof record.searchRange === "number" ? record.searchRange : undefined;
    const contextConfig = isRecord(record.contextConfig) ? (record.contextConfig as Record<string, unknown>) : undefined;
    const loreBiasGroups = Array.isArray(record.loreBiasGroups) ? record.loreBiasGroups : undefined;
    let category: string | null | undefined;
    if (typeof record.category === "string") {
      category = record.category === "" ? null : record.category;
    } else {
      category = null;
    }
    const comment = typeof record.comment === "string" ? record.comment : null;
    const extensions = isRecord(record.extensions) ? (record.extensions as Record<string, unknown>) : undefined;
    return {
      id,
      displayName,
      text,
      keys,
      enabled,
      forceActivation,
      searchRange,
      contextConfig,
      loreBiasGroups,
      category,
      comment,
      extensions,
    };
  });
  const categories = Array.isArray(obj.categories)
    ? obj.categories.filter((c): c is { id: string; name: string; enabled: boolean } => (
        c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string" && typeof (c as Record<string, unknown>).name === "string" && typeof (c as Record<string, unknown>).enabled === "boolean"
      ))
    : undefined;

  const record: LorebookRecord = {
    id: `lorebook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "Imported lorebook",
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
    raw: parsed,
    parsed: {
      lorebookVersion,
      entries: parsedEntries,
      categories,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return record;
}

export function serializeLorebook(record: LorebookRecord): string {
  if (record.raw !== undefined && record.raw !== null) {
    const existing = JSON.stringify(record.raw);
    try {
      JSON.parse(existing);
      return existing;
    } catch {
      /* fall through to serialization from parsed */
    }
  }
  if (!record.parsed) return JSON.stringify({ lorebookVersion: 3, entries: [] }, null, 4);
  const output = {
    lorebookVersion: 3,
    entries: record.parsed.entries.map((entry) => {
      const out: Record<string, unknown> = {
        text: entry.text,
        keys: entry.keys,
        enabled: entry.enabled,
      };
      if (entry.id !== undefined) out.id = entry.id;
      if (entry.displayName !== undefined) out.displayName = entry.displayName;
      if (entry.forceActivation !== undefined) out.forceActivation = entry.forceActivation;
      if (entry.searchRange !== undefined) out.searchRange = entry.searchRange;
      if (entry.contextConfig !== undefined) out.contextConfig = entry.contextConfig;
      if (entry.loreBiasGroups !== undefined) out.loreBiasGroups = entry.loreBiasGroups;
      if (entry.category !== undefined) out.category = entry.category === null ? "" : entry.category;
      if (entry.comment !== undefined) out.comment = entry.comment;
      if (entry.extensions !== undefined) out.extensions = entry.extensions;
      return out;
    }),
  };
  if (record.parsed.categories) {
    output.categories = record.parsed.categories;
  }
  return JSON.stringify(output, null, 4);
}

export function encodeLorebookFile(record: LorebookRecord): string {
  return serializeLorebook(record);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
