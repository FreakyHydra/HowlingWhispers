export const WORLD_LORE_FORMAT = "howling-whispers-world-lore";
export const WORLD_LORE_VERSION = 1;

export const WORLD_LORE_LIMITS = {
  entries: 64,
  totalContentLength: 32_000,
  idLength: 120,
  revisionLength: 64,
  titleLength: 160,
  contentLength: 4_000,
  triggers: 32,
  triggerLength: 100,
  locationTags: 16,
  sceneTags: 16,
  tagLength: 100,
  sourceRefs: 32,
  sourceRefLength: 180,
} as const;

export type WorldLorePriority = "mandatory" | "high" | "normal" | "low";
export type WorldLoreRating = "general" | "mature";

export type WorldLoreEntry = {
  id: string;
  title: string;
  content: string;
  triggers: string[];
  priority: WorldLorePriority;
  rating: WorldLoreRating;
  constantActivation: boolean;
  locationTags: string[];
  sceneTags: string[];
  sourceRefs: string[];
};

export type WorldLorebookV1 = {
  format: typeof WORLD_LORE_FORMAT;
  version: typeof WORLD_LORE_VERSION;
  worldId: string;
  revision: string;
  entries: WorldLoreEntry[];
};

export type LegacyWorldLoreInput = {
  worldId: string;
  revision?: string;
  scene: string;
  weather: string;
};

export function legacyCharacterToWorldLore(input: LegacyWorldLoreInput): WorldLorebookV1 {
  const worldId = input.worldId.trim().slice(0, WORLD_LORE_LIMITS.idLength) || "custom-world";
  const scene = input.scene.trim().slice(0, 600);
  const weather = input.weather.trim().slice(0, 600);
  return {
    format: WORLD_LORE_FORMAT,
    version: WORLD_LORE_VERSION,
    worldId,
    revision: (input.revision ?? "legacy-1").trim().slice(0, WORLD_LORE_LIMITS.revisionLength) || "legacy-1",
    entries: [
      {
        id: "legacy-world-boundary",
        title: "Current world boundaries",
        content: "This custom or imported character has no separate authored world lorebook. Treat only facts established by the character canon, selected scene, memories, player role, and conversation as true. Do not invent broad geography, history, factions, technology, magic systems, relationships, or shared events unless the story establishes them.",
        triggers: [],
        priority: "mandatory",
        rating: "general",
        constantActivation: true,
        locationTags: [],
        sceneTags: [],
        sourceRefs: [`legacy-character:${worldId}`],
      },
      ...(scene || weather ? [{
        id: "legacy-current-scene",
        title: scene || "Current scene",
        content: `The selected scene establishes only this immediate setting: ${scene || "No named location"}.${weather ? ` Atmosphere: ${weather}.` : ""} Details beyond this description remain open until introduced in the story.`,
        triggers: [],
        priority: "high" as const,
        rating: "general" as const,
        constantActivation: true,
        locationTags: scene ? [normalizeLegacyTag(scene)] : [],
        sceneTags: [],
        sourceRefs: [`legacy-character:${worldId}:scene`],
      }] : []),
    ],
  };
}

export function parseWorldLorebook(value: unknown): WorldLorebookV1 | null {
  if (!isRecord(value)) return null;
  if (value.format !== WORLD_LORE_FORMAT || value.version !== WORLD_LORE_VERSION) return null;
  if (!isBoundedString(value.worldId, WORLD_LORE_LIMITS.idLength)) return null;
  if (!isBoundedString(value.revision, WORLD_LORE_LIMITS.revisionLength)) return null;
  if (!Array.isArray(value.entries) || value.entries.length === 0 || value.entries.length > WORLD_LORE_LIMITS.entries) return null;

  const entries: WorldLoreEntry[] = [];
  const entryIds = new Set<string>();
  let totalContentLength = 0;
  for (const candidate of value.entries) {
    const entry = parseWorldLoreEntry(candidate);
    if (!entry || entryIds.has(entry.id)) return null;
    entryIds.add(entry.id);
    totalContentLength += entry.content.length;
    if (totalContentLength > WORLD_LORE_LIMITS.totalContentLength) return null;
    entries.push(entry);
  }
  if (!entries.some((entry) => entry.priority === "mandatory" && entry.constantActivation)) return null;

  return {
    format: WORLD_LORE_FORMAT,
    version: WORLD_LORE_VERSION,
    worldId: value.worldId,
    revision: value.revision,
    entries,
  };
}

function parseWorldLoreEntry(value: unknown): WorldLoreEntry | null {
  if (!isRecord(value)) return null;
  if (!isBoundedString(value.id, WORLD_LORE_LIMITS.idLength)) return null;
  if (!isBoundedString(value.title, WORLD_LORE_LIMITS.titleLength)) return null;
  if (!isBoundedString(value.content, WORLD_LORE_LIMITS.contentLength)) return null;
  if (!isPriority(value.priority) || !isRating(value.rating)) return null;
  if (typeof value.constantActivation !== "boolean") return null;

  const triggers = parseStringList(value.triggers, WORLD_LORE_LIMITS.triggers, WORLD_LORE_LIMITS.triggerLength);
  const locationTags = parseStringList(value.locationTags, WORLD_LORE_LIMITS.locationTags, WORLD_LORE_LIMITS.tagLength);
  const sceneTags = parseStringList(value.sceneTags, WORLD_LORE_LIMITS.sceneTags, WORLD_LORE_LIMITS.tagLength);
  const sourceRefs = parseStringList(value.sourceRefs, WORLD_LORE_LIMITS.sourceRefs, WORLD_LORE_LIMITS.sourceRefLength);
  if (!triggers || !locationTags || !sceneTags || !sourceRefs || sourceRefs.length === 0) return null;

  return {
    id: value.id,
    title: value.title,
    content: value.content,
    triggers,
    priority: value.priority,
    rating: value.rating,
    constantActivation: value.constantActivation,
    locationTags,
    sceneTags,
    sourceRefs,
  };
}

function parseStringList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isBoundedString(item, maxLength) || seen.has(item)) return null;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && value === value.trim();
}

function isPriority(value: unknown): value is WorldLorePriority {
  return value === "mandatory" || value === "high" || value === "normal" || value === "low";
}

function isRating(value: unknown): value is WorldLoreRating {
  return value === "general" || value === "mature";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLegacyTag(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, WORLD_LORE_LIMITS.tagLength) || "current-scene";
}
