import { RELATIONSHIP_DIMENSIONS, type RelationshipDimensions, type RelationshipState } from "./schema.ts";

const RELATIONSHIPS_KEY = "dreambound_relationships";

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

export function loadRelationships(): RelationshipState {
  const raw = readRaw(RELATIONSHIPS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const state: RelationshipState = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const candidate = value;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const record = candidate as Record<string, unknown>;
      const events = Array.isArray(record.events)
        ? record.events.filter(isRelationshipEvent)
        : [];
      const score = typeof record.score === "number" && Number.isFinite(record.score)
        ? Math.round(record.score)
        : 0;
      const baselineScore = typeof record.baselineScore === "number" && Number.isFinite(record.baselineScore)
        ? Math.round(record.baselineScore)
        : undefined;
      state[key] = {
        characterId: typeof record.characterId === "string" ? record.characterId : "",
        personaId: typeof record.personaId === "string" ? record.personaId : "",
        baselineScore,
        score,
        dimensions: parseDimensions(record.dimensions),
        momentum: parsePartialDimensions(record.momentum),
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
        events,
        note: typeof record.note === "string" ? record.note : undefined,
      };
    }
    return state;
  } catch {
    return {};
  }
}

function parsePartialDimensions(value: unknown): Partial<RelationshipDimensions> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  return Object.fromEntries(RELATIONSHIP_DIMENSIONS.flatMap((dimension) =>
    typeof candidate[dimension] === "number" && Number.isFinite(candidate[dimension])
      ? [[dimension, Math.max(-100, Math.min(100, Number(candidate[dimension])))] as const]
      : [],
  ));
}

function parseDimensions(value: unknown): RelationshipDimensions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  return Object.fromEntries(RELATIONSHIP_DIMENSIONS.map((dimension) => [
    dimension,
    typeof candidate[dimension] === "number" && Number.isFinite(candidate[dimension])
      ? Math.max(-100, Math.min(100, Number(candidate[dimension])))
      : 0,
  ])) as RelationshipDimensions;
}

export function saveRelationships(state: RelationshipState) {
  writeRaw(RELATIONSHIPS_KEY, JSON.stringify(state));
}

function isRelationshipEvent(value: unknown): value is import("./schema.ts").RelationshipEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.turnId === "string"
    && typeof event.delta === "number"
    && Number.isFinite(event.delta)
    && typeof event.reason === "string"
    && typeof event.characterId === "string"
    && typeof event.personaId === "string"
    && typeof event.createdAt === "number"
  );
}
