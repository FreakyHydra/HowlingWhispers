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

type CuratedVersionPreferences = Record<string, string>;

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
