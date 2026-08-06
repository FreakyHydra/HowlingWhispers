import type { PlayerPersona } from "./schema.ts";
import { createPersona } from "./schema.ts";

const PERSONAS_KEY = "dreambound_personas";
const ACTIVE_KEY = "dreambound_activePersonaId";
const MIGRATED_KEY = "dreambound_personasMigrated";
const LEGACY_PLAYER_KEY = "dreambound_player";

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

export function loadPersonas(): PlayerPersona[] | null {
  const raw = readRaw(PERSONAS_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter(isPlausiblePersona)) : null;
  } catch {
    return null;
  }
}

function isPersona(value: unknown): value is PlayerPersona {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as PlayerPersona).id === "string" &&
    typeof (value as PlayerPersona).name === "string"
  );
}

function isPlausiblePersona(value: unknown): value is PlayerPersona {
  return isPersona(value);
}

export function savePersonas(personas: PlayerPersona[]) {
  writeRaw(PERSONAS_KEY, JSON.stringify(personas));
}

export function loadActivePersonaId(): string | null {
  const raw = readRaw(ACTIVE_KEY);
  return raw ? raw : null;
}

export function saveActivePersonaId(id: string | null) {
  if (id === null) {
    writeRaw(ACTIVE_KEY, "");
    return;
  }
  writeRaw(ACTIVE_KEY, id);
}

export function legacyPlayerProfile(): { name: string; persona: string } {
  const raw = readRaw(LEGACY_PLAYER_KEY);
  if (!raw) return { name: "", persona: "" };
  try {
    const parsed = JSON.parse(raw) as { name?: string; persona?: string };
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      persona: typeof parsed.persona === "string" ? parsed.persona : "",
    };
  } catch {
    return { name: "", persona: "" };
  }
}

export function migrateLegacyPlayerProfile(): PlayerPersona | null {
  if (readRaw(MIGRATED_KEY) !== null) return null;
  writeRaw(MIGRATED_KEY, "1");

  const legacy = legacyPlayerProfile();
  if (!legacy.name.trim() && !legacy.persona.trim()) {
    return null;
  }

  const persona = createPersona({
    name: legacy.name.trim() || "Local player",
    description: legacy.persona.trim(),
  });
  return persona;
}