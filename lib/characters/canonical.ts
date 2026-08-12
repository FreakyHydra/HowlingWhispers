export const CANONICAL_CHARACTER_FORMAT = "howling-whispers-character";
export const CANONICAL_CHARACTER_VERSION = 1;

export type AgeCategory = "adult" | "minor" | "unknown";
export type CanonPriority = "mandatory" | "high" | "normal" | "low";
export type ContentRating = "general" | "mature";

export type CanonSection = {
  id: string;
  title: string;
  content: string;
  priority: CanonPriority;
  rating: ContentRating;
  triggers: string[];
  sourceRefs: string[];
};

export type CharacterSafety = {
  ageCategory: AgeCategory;
  isMinor: boolean | null;
  allowedRelationshipTypes: string[];
  disallowedContent: string[];
};

export type RawCanonSource = {
  id: string;
  kind: "runtime-authoritative" | "editorial-bible" | "fallback-prompt" | "secondary-voice";
  sha256: string;
  text: string;
};

export type CanonicalCharacterV1 = {
  format: typeof CANONICAL_CHARACTER_FORMAT;
  version: typeof CANONICAL_CHARACTER_VERSION;
  id: string;
  revision: string;
  identity: {
    name: string;
    role: string;
    pronouns: string;
    species: string;
  };
  sections: CanonSection[];
  safety: CharacterSafety;
  rawSources: RawCanonSource[];
};

export type LegacyCanonInput = {
  id: string;
  revision?: string;
  name: string;
  role: string;
  profile: string;
  ageCategory?: AgeCategory;
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
  pronouns?: string;
};

export function legacyCharacterToCanon(input: LegacyCanonInput): CanonicalCharacterV1 {
  const ageCategory = input.ageCategory ?? "unknown";
  return {
    format: CANONICAL_CHARACTER_FORMAT,
    version: CANONICAL_CHARACTER_VERSION,
    id: input.id,
    revision: input.revision ?? "legacy-1",
    identity: {
      name: input.name,
      role: input.role,
      pronouns: input.pronouns ?? "",
      species: "",
    },
    sections: [{
      id: "legacy-profile",
      title: "Character description",
      content: input.profile,
      priority: "mandatory",
      rating: "general",
      triggers: [],
      sourceRefs: [],
    }],
    safety: {
      ageCategory,
      isMinor: input.isMinor ?? (ageCategory === "minor" ? true : ageCategory === "adult" ? false : null),
      allowedRelationshipTypes: input.allowedRelationshipTypes ?? [],
      disallowedContent: input.disallowedContent ?? [],
    },
    rawSources: [],
  };
}

export function parseCanonicalCharacter(value: unknown): CanonicalCharacterV1 | null {
  if (!isRecord(value)) return null;
  if (value.format !== CANONICAL_CHARACTER_FORMAT || value.version !== CANONICAL_CHARACTER_VERSION) return null;

  const id = limitedString(value.id, 120);
  const revision = limitedString(value.revision, 64);
  const identityValue = isRecord(value.identity) ? value.identity : null;
  const name = limitedString(identityValue?.name, 120);
  const role = limitedString(identityValue?.role, 300);
  if (!id || !revision || !name || !role) return null;

  const sections = Array.isArray(value.sections)
    ? value.sections.slice(0, 48).flatMap(parseCanonSection)
    : [];
  if (sections.length === 0 || !sections.some((section) => section.priority === "mandatory")) return null;
  if (sections.reduce((total, section) => total + section.content.length, 0) > 40_000) return null;

  const safetyValue = isRecord(value.safety) ? value.safety : {};
  const ageCategory = parseAgeCategory(safetyValue.ageCategory);
  const explicitMinor = typeof safetyValue.isMinor === "boolean" ? safetyValue.isMinor : null;
  const isMinor = explicitMinor ?? (ageCategory === "minor" ? true : ageCategory === "adult" ? false : null);

  return {
    format: CANONICAL_CHARACTER_FORMAT,
    version: CANONICAL_CHARACTER_VERSION,
    id,
    revision,
    identity: {
      name,
      role,
      pronouns: limitedString(identityValue?.pronouns, 120),
      species: limitedString(identityValue?.species, 120),
    },
    sections,
    safety: {
      ageCategory,
      isMinor,
      allowedRelationshipTypes: stringList(safetyValue.allowedRelationshipTypes, 24, 160),
      disallowedContent: stringList(safetyValue.disallowedContent, 32, 240),
    },
    rawSources: Array.isArray(value.rawSources)
      ? value.rawSources.slice(0, 8).flatMap(parseRawSource)
      : [],
  };
}

export function canUseMatureCanon(character: CanonicalCharacterV1, requested: boolean): boolean {
  return requested
    && character.safety.ageCategory === "adult"
    && character.safety.isMinor === false;
}

function parseCanonSection(value: unknown): CanonSection[] {
  if (!isRecord(value)) return [];
  const id = limitedString(value.id, 120);
  const title = limitedString(value.title, 160);
  const content = limitedString(value.content, 24_000);
  if (!id || !title || !content) return [];
  return [{
    id,
    title,
    content,
    priority: parsePriority(value.priority),
    rating: value.rating === "mature" ? "mature" : "general",
    triggers: stringList(value.triggers, 32, 100),
    sourceRefs: stringList(value.sourceRefs, 32, 160),
  }];
}

function parseRawSource(value: unknown): RawCanonSource[] {
  if (!isRecord(value)) return [];
  const id = limitedString(value.id, 120);
  const sha256 = limitedString(value.sha256, 64).toLowerCase();
  const text = exactString(value.text, 200_000);
  const kinds = new Set<RawCanonSource["kind"]>([
    "runtime-authoritative", "editorial-bible", "fallback-prompt", "secondary-voice",
  ]);
  if (!id || !/^[a-f0-9]{64}$/.test(sha256) || !text || !kinds.has(value.kind as RawCanonSource["kind"])) return [];
  return [{ id, sha256, text, kind: value.kind as RawCanonSource["kind"] }];
}

function parseAgeCategory(value: unknown): AgeCategory {
  return value === "adult" || value === "minor" ? value : "unknown";
}

function parsePriority(value: unknown): CanonPriority {
  return value === "mandatory" || value === "high" || value === "low" ? value : "normal";
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value)
    ? value.map((item) => limitedString(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function limitedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function exactString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
