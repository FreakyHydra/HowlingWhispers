export const CHARACTER_FORMAT = "howling-whispers-character";
export const CHARACTER_LIBRARY_FORMAT = "howling-whispers-character-library";
export const CHARACTER_FORMAT_VERSION = 1;

const MAX_CHARACTER_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = 12000;
const MAX_MEMORIES = 40;
const MAX_MEMORY_LENGTH = 600;
const MAX_LIBRARY_CHARACTERS = 60;

const CURATED_BUILTIN_IDS = new Set(["coda", "heather", "peony", "senako-steel"]);
const AGE_CATEGORIES = new Set(["adult", "minor", "unknown"]);

export type BackupCharacter = {
  id: string;
  name: string;
  role: string;
  status: string;
  image: string;
  sceneImage: string;
  scene: string;
  weather: string;
  bond: number;
  memories: string[];
  reply: string;
  profile: string;
  accent: string;
  credit?: string;
  creditUrl?: string;
  relationship?: string;
  portraitFocalPoint?: string;
  backgroundFocalPoint?: string;
  ageCategory?: "adult" | "minor" | "unknown";
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
  cardV2?: HowlingV2Metadata;
};

function clamp(
  value: unknown,
  fallback: string,
  trim = false,
): string {
  if (typeof value !== "string") return fallback;
  const result = value.slice(0, MAX_TEXT_LENGTH);
  return trim ? result.trim() : result;
}

function clampString(value: unknown, fallback = ""): string {
  return clamp(value, fallback);
}

function sanitizeCharacter(value: unknown): BackupCharacter | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Record<string, unknown>;
  const name = clamp(src.name, "").trim();
  if (!name) return null;

  const rawMemories = Array.isArray(src.memories)
    ? src.memories
        .slice(0, MAX_MEMORIES)
        .map((item) => typeof item === "string" ? item.slice(0, MAX_MEMORY_LENGTH).trim() : "")
        .filter(Boolean)
    : [];

  const rawBond = typeof src.bond === "number" && Number.isFinite(src.bond)
    ? Math.max(0, Math.min(100, Math.round(src.bond)))
    : 12;

  const ageCategory = AGE_CATEGORIES.has(src.ageCategory as string)
    ? (src.ageCategory as "adult" | "minor" | "unknown")
    : undefined;
  const cardV2 = sanitizeV2Metadata(src.cardV2);

  return {
    id: clamp(src.id, "").trim() || `imported-${Date.now().toString(36)}`,
    name,
    role: clamp(src.role, "Imported character").trim() || "Imported character",
    status: clamp(src.status, "Ready to meet").trim() || "Ready to meet",
    image: clamp(src.image, "").trim(),
    sceneImage: clamp(src.sceneImage, "").trim(),
    scene: clamp(src.scene, "An Imported Story").trim() || "An Imported Story",
    weather: clamp(src.weather, "The world waits for your first choice").trim(),
    bond: rawBond,
    memories: rawMemories.length > 0
      ? rawMemories
      : ["Their history is waiting to be discovered"],
    reply: clamp(src.reply, "I was wondering when you would arrive.").trim()
      || "I was wondering when you would arrive.",
    profile: clamp(
      [clampString(src.profile), clampString(src.description)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("\n\n"),
    ) || `${name} is an imported character whose personality should stay consistent with their opening message.`,
    accent: clamp(src.accent, "#d78a5e").trim(),
    credit: clamp(src.credit, "").trim() || undefined,
    creditUrl: clamp(src.creditUrl, "").trim() || undefined,
    relationship: clamp(src.relationship, "").trim() || undefined,
    portraitFocalPoint: clamp(src.portraitFocalPoint, "center").trim(),
    backgroundFocalPoint: clamp(src.backgroundFocalPoint, "center").trim(),
    ageCategory,
    isMinor: typeof src.isMinor === "boolean" ? src.isMinor : src.isMinor === null ? null : undefined,
    allowedRelationshipTypes: sanitizeStringList(src.allowedRelationshipTypes, 24, 160),
    disallowedContent: sanitizeStringList(src.disallowedContent, 32, 240),
    cardV2,
  };
}

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, maxItems)
    .map((item) => typeof item === "string" ? item.slice(0, maxLength).trim() : "")
    .filter(Boolean);
}

function sanitizeV2Metadata(value: unknown): HowlingV2Metadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const src = value as Record<string, unknown>;
  const original = parseCharacterCardV2(src.original);
  if (!original.ok) return undefined;
  const data = original.card.data;
  return {
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    mesExample: data.mes_example,
    alternateGreetings: [...data.alternate_greetings],
    creatorNotes: data.creator_notes,
    characterVersion: data.character_version,
    tags: [...data.tags],
    importedSystemPrompt: data.system_prompt,
    importedPostHistoryInstructions: data.post_history_instructions,
    characterBook: data.character_book,
    original: original.card,
  };
}

export function serializeCharacter(character: BackupCharacter): string {
  return JSON.stringify(
    { format: CHARACTER_FORMAT, version: CHARACTER_FORMAT_VERSION, character },
    null,
    2,
  );
}

export function serializeCharacterLibrary(characters: BackupCharacter[]): string {
  return JSON.stringify(
    { format: CHARACTER_LIBRARY_FORMAT, version: CHARACTER_FORMAT_VERSION, characters },
    null,
    2,
  );
}

export type BackupResult =
  | { ok: true; characters: BackupCharacter[] }
  | { ok: false; error: string };

export function parseCharacterImport(json: string): BackupResult {
  if (json.length > MAX_CHARACTER_BYTES) {
    return { ok: false, error: "This character file is too large to import safely." };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "This file does not contain a character backup." };
  }
  const obj = data as Record<string, unknown>;

  if (obj.format === CHARACTER_FORMAT) {
    if (obj.version !== CHARACTER_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers character backup version is not supported." };
    }
    const character = sanitizeCharacter(obj.character);
    if (!character) return { ok: false, error: "The character in this file has no name." };
    return { ok: true, characters: [character] };
  }

  if (obj.format === CHARACTER_LIBRARY_FORMAT) {
    if (obj.version !== CHARACTER_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers character-library backup version is not supported." };
    }
    if (!Array.isArray(obj.characters)) {
      return { ok: false, error: "The character library file has no characters list." };
    }
    if (obj.characters.length > MAX_LIBRARY_CHARACTERS) {
      return { ok: false, error: "This character library contains too many characters to import." };
    }
    const characters = obj.characters
      .map(sanitizeCharacter)
      .filter((c): c is BackupCharacter => c !== null);
    if (characters.length === 0) {
      return { ok: false, error: "The character library contains no valid characters." };
    }
    return { ok: true, characters };
  }

  return { ok: false, error: "This file is not a Howling Whispers character backup." };
}

export function isCuratedBuiltinId(id: string): boolean {
  return CURATED_BUILTIN_IDS.has(id);
}

export function newCharacterId(seed = Date.now()): string {
  return `imported-${seed.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ensureUniqueCharacterIds(
  characters: BackupCharacter[],
  existing: Array<string | undefined>,
): BackupCharacter[] {
  const taken = new Set(existing.filter(Boolean) as string[]);
  return characters.map((character) => {
    const conflicts = taken.has(character.id) || isCuratedBuiltinId(character.id);
    if (!conflicts) {
      taken.add(character.id);
      return character;
    }
    let fresh = newCharacterId();
    while (taken.has(fresh)) fresh = newCharacterId();
    taken.add(fresh);
    return { ...character, id: fresh };
  });
}
