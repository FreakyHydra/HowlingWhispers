// Memory Card domain for The Howling Whispers.
//
// Each Persona owns exactly one Memory Card. The card is the Persona's persistent
// state bank — conceptually like a save-file slot. It owns the authoritative
// relationship summaries, persistent flags, milestones, and compact stats.
//
// Narrative memories and relationship event history remain in their respective
// domains; the Memory Card is the compact structured owner, not a prose dump.

export const MEMORY_CARD_VERSION = 1;

export type MemoryCardRelationshipEntry = {
  score: number;
  updatedAt: number;
};

export type MemoryCardRelationships = Record<string, MemoryCardRelationshipEntry>;

export type MemoryCardStats = Record<string, Record<string, number>>;

export type MemoryCardFlags = Record<string, Record<string, boolean | string | number>>;

export type MemoryCardMilestones = Record<string, string[]>;

export type MemoryCardMemoryRef = {
  id: string;
  participants: string[];
  event: string;
  context?: string;
  importance: number;
  origin?: string;
  timestamp: number;
  persistenceMetadata?: Record<string, unknown>;
};

export type MemoryCardMemoryRefs = MemoryCardMemoryRef[];

export type MemoryCard = {
  id: string;
  personaId: string;
  version: number;
  relationships: MemoryCardRelationships;
  stats: MemoryCardStats;
  flags: MemoryCardFlags;
  milestones: MemoryCardMilestones;
  memoryRefs: MemoryCardMemoryRefs;
  createdAt: number;
  updatedAt: number;
};

export function createMemoryCard(personaId: string): MemoryCard {
  const now = Date.now();
  return {
    id: `mc-${personaId}`,
    personaId,
    version: MEMORY_CARD_VERSION,
    relationships: {},
    stats: {},
    flags: {},
    milestones: {},
    memoryRefs: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function isPlausibleMemoryCard(card: unknown): card is MemoryCard {
  if (!card || typeof card !== "object" || Array.isArray(card)) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.personaId === "string" &&
    typeof c.version === "number" &&
    typeof c.createdAt === "number" &&
    typeof c.updatedAt === "number"
  );
}
