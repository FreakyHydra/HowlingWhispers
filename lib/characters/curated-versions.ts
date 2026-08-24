export type CuratedCharacterVersion = {
  id: string;
  label: string;
};

export type CuratedCharacterFamily = {
  familyId: string;
  defaultVersionId: string;
  versions: readonly CuratedCharacterVersion[];
};

export const CURATED_CHARACTER_FAMILIES: Readonly<Record<string, CuratedCharacterFamily>> = {
  peony: {
    familyId: "peony",
    defaultVersionId: "peony",
    versions: [
      { id: "peony", label: "V1 — Original" },
      { id: "peony-v2", label: "V2 — Peony V2" },
    ],
  },
};

const STORAGE_KEY = "howling_curated_character_versions";
const CHARACTER_LIBRARY_KEY = "dreambound_characters";
const PEONY_V2_ART = "/assets/peony-void-garden-v2.png";

type CuratedVersionPreferences = Record<string, string>;
type StoredCharacter = {
  id?: unknown;
  image?: unknown;
  sceneImage?: unknown;
  portraitFocalPoint?: unknown;
  backgroundFocalPoint?: unknown;
  [key: string]: unknown;
};

function migrateStoredCuratedCharacters(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CHARACTER_LIBRARY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const characters = parsed.filter((item): item is StoredCharacter =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
    const v1Index = characters.findIndex((character) => character.id === "peony");
    const v2Index = characters.findIndex((character) => character.id === "peony-v2");
    if (v2Index < 0) return;

    const v2 = {
      ...characters[v2Index],
      image: PEONY_V2_ART,
      sceneImage: PEONY_V2_ART,
      portraitFocalPoint: "68% 34%",
      backgroundFocalPoint: "70% 38%",
    };

    const next = [...characters];
    next.splice(v2Index, 1);
    const currentV1Index = next.findIndex((character) => character.id === "peony");
    const insertAt = currentV1Index >= 0 ? currentV1Index + 1 : Math.min(v1Index + 1, next.length);
    next.splice(insertAt, 0, v2);

    window.localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // Leave a malformed/unsupported library untouched; the main app owns recovery.
  }
}

migrateStoredCuratedCharacters();

function readPreferences(): CuratedVersionPreferences {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as CuratedVersionPreferences
      : {};
  } catch {
    return {};
  }
}

export function preferredCuratedVersion(familyId: string): string {
  const family = CURATED_CHARACTER_FAMILIES[familyId];
  if (!family) return familyId;
  const saved = readPreferences()[familyId];
  return family.versions.some((version) => version.id === saved)
    ? saved
    : family.defaultVersionId;
}

export function savePreferredCuratedVersion(familyId: string, versionId: string): void {
  if (typeof window === "undefined") return;
  const family = CURATED_CHARACTER_FAMILIES[familyId];
  if (!family || !family.versions.some((version) => version.id === versionId)) return;
  const preferences = readPreferences();
  preferences[familyId] = versionId;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function curatedFamilyForCharacterId(characterId: string): CuratedCharacterFamily | null {
  return Object.values(CURATED_CHARACTER_FAMILIES).find((family) =>
    family.versions.some((version) => version.id === characterId),
  ) ?? null;
}
