import type { PlayerPersona } from "./schema.ts";
import type { HwCard } from "./hw-card.ts";
import {
  HW_CARD_SPEC,
  HW_CARD_VERSION,
  validateHwCard,
  migrateHwCard,
  serializeHwCard,
} from "./hw-card.ts";
import { newPersonaId } from "./schema.ts";

export const PERSONA_FORMAT = "howling-whispers-persona";
export const PERSONA_LIBRARY_FORMAT = "howling-whispers-persona-library";
export const PERSONA_FORMAT_VERSION = 1;

const MAX_PERSONA_BYTES = 128 * 1024;
const MAX_FIELD_LENGTH = 4000;

function clampString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.slice(0, MAX_FIELD_LENGTH);
}

function hwCardToPlayerPersona(card: HwCard): PlayerPersona {
  const now = Date.now();
  return {
    id: newPersonaId(),
    name: card.name.trim() || "Unnamed persona",
    pronouns: card.identity?.pronouns?.trim() || card.pronouns?.trim() || undefined,
    description: [card.summary, card.description].filter(Boolean).join("\n\n").trim() || "",
    appearance: card.appearance?.trim() || undefined,
    personality: card.personality?.join("\n\n").trim() || undefined,
    background: typeof card.history === "string" ? card.history.trim() : undefined,
    avatar: undefined,
    createdAt: now,
    updatedAt: now,
    hwCard: migrateHwCard(card),
    identity: card.identity,
    personalityTraits: card.personality,
    emotionalProfile: card.emotional_profile,
    socialBehavior: card.social_behavior,
    communicationStyle: card.communication_style,
    likes: card.likes,
    dislikes: card.dislikes,
    interests: card.interests,
    habits: card.habits,
    boundaries: card.boundaries,
    history: card.history,
    roleplayGuidance: card.roleplay_guidance,
    memoryPriorities: card.memory_priorities,
    tags: card.tags,
    creator: card.creator,
    cardVersion: card.card_version,
  };
}

function playerPersonaToHwCard(persona: PlayerPersona): HwCard | null {
  if (!persona.hwCard) return null;
  return persona.hwCard;
}

function sanitizePersona(value: unknown): PlayerPersona | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Record<string, unknown>;
  const name = clampString(src.name).trim();
  if (!name) return null;

  return {
    id: clampString(src.id, newPersonaId()),
    name,
    pronouns: clampString(src.pronouns) || undefined,
    description: clampString(src.description),
    appearance: clampString(src.appearance) || undefined,
    personality: clampString(src.personality) || undefined,
    background: clampString(src.background) || undefined,
    avatar: clampString(src.avatar) || undefined,
    createdAt: typeof src.createdAt === "number" ? src.createdAt : Date.now(),
    updatedAt: typeof src.updatedAt === "number" ? src.updatedAt : Date.now(),
  };
}

export function serializePersona(persona: PlayerPersona): string {
  const hwCard = playerPersonaToHwCard(persona);
  if (hwCard) {
    return serializeHwCard(hwCard);
  }
  return JSON.stringify({
    format: PERSONA_FORMAT,
    version: PERSONA_FORMAT_VERSION,
    persona,
  }, null, 2);
}

export function serializePersonaLibrary(personas: PlayerPersona[]): string {
  const allHw = personas.every((p) => playerPersonaToHwCard(p));
  if (allHw && personas.length > 0) {
    return JSON.stringify({
      spec: HW_CARD_SPEC,
      spec_version: HW_CARD_VERSION,
      type: "library",
      personas: personas.map((p) => playerPersonaToHwCard(p)!),
    }, null, 2);
  }
  return JSON.stringify({
    format: PERSONA_LIBRARY_FORMAT,
    version: PERSONA_FORMAT_VERSION,
    personas,
  }, null, 2);
}

export type BackupResult =
  | { ok: true; personas: PlayerPersona[] }
  | { ok: false; error: string };

function parseJson(json: string): BackupResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "This file does not contain a persona backup." };
  }

  const obj = data as Record<string, unknown>;

  if (obj.spec === HW_CARD_SPEC && obj.type === "persona") {
    const parsed = validateHwCard(json);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const persona = hwCardToPlayerPersona(parsed.card);
    return { ok: true, personas: [persona] };
  }

  if (obj.spec === HW_CARD_SPEC && obj.type === "library") {
    if (!Array.isArray(obj.personas)) {
      return { ok: false, error: "The HW-Card library file has no personas list." };
    }
    const personas: PlayerPersona[] = [];
    for (let i = 0; i < obj.personas.length; i++) {
      const entry = obj.personas[i];
      const wrapped = JSON.stringify(entry);
      const parsed = validateHwCard(wrapped);
      if (!parsed.ok) return { ok: false, error: `Persona ${i + 1}: ${parsed.error}` };
      personas.push(hwCardToPlayerPersona(parsed.card));
    }
    if (personas.length === 0) {
      return { ok: false, error: "The HW-Card library contains no valid personas." };
    }
    return { ok: true, personas };
  }

  if (obj.format === PERSONA_FORMAT) {
    const persona = sanitizePersona(obj.persona);
    if (!persona) return { ok: false, error: "The persona in this file has no name." };
    return { ok: true, personas: [persona] };
  }

  if (obj.format === PERSONA_LIBRARY_FORMAT) {
    if (!Array.isArray(obj.personas)) {
      return { ok: false, error: "The library file has no personas list." };
    }
    const personas = obj.personas
      .map(sanitizePersona)
      .filter((p): p is PlayerPersona => p !== null);
    if (personas.length === 0) {
      return { ok: false, error: "The library file contains no valid personas." };
    }
    return { ok: true, personas };
  }

  return { ok: false, error: "This file is not a Howling Whispers persona backup." };
}

export function parsePersonaImport(json: string): BackupResult {
  if (json.length > MAX_PERSONA_BYTES) {
    return { ok: false, error: "This persona file is too large to import safely." };
  }
  return parseJson(json);
}

export function ensureUniquePersonaIds(
  personas: PlayerPersona[],
  existing: PlayerPersona[],
): PlayerPersona[] {
  const taken = new Set(existing.map((p) => p.id));
  return personas.map((persona) => {
    if (taken.has(persona.id)) {
      return { ...persona, id: newPersonaId() };
    }
    taken.add(persona.id);
    return persona;
  });
}