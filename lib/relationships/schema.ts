// Persistent relationship state for The Howling Whispers.
//
// Relationship state is owned by the pair (characterId, playerPersonaId) and is
// NOT the same as the legacy per-character `bond` field. `bond` is kept around
// only as a migration seed; the live relationship score lives here and is driven
// by scored conversation events rather than by message count.
//
// The score range is deliberately asymmetric: positive relationships have a very
// long progression (-1000..10000, neutral at 0), while negative relationships can
// deteriorate toward severe hostility quickly. The UI may normalize the value
// into a visual meter, but the score is never treated as a percentage internally.

export const RELATIONSHIP_MIN = -1000;
export const RELATIONSHIP_NEUTRAL = 0;
export const RELATIONSHIP_MAX = 10000;

export const DEFAULT_PERSONA_ID = "default";

export const RELATIONSHIP_DIMENSIONS = [
  "trust", "affection", "respect", "fear", "comfort", "suspicion",
  "attachment", "protectiveness", "resentment", "loyalty", "familiarity", "authority",
] as const;

export type RelationshipDimension = typeof RELATIONSHIP_DIMENSIONS[number];
export type RelationshipDimensions = Record<RelationshipDimension, number>;
export type PlayerSignals = {
  fear: number;
  hostility: number;
  vulnerability: number;
  kindness: number;
  affection: number;
  anger: number;
  distress: number;
  boundary: number;
  coercion: number;
};
export type RelationshipInterpretation = {
  playerSignals: PlayerSignals;
  appraisal: string;
  confidence: number;
  behaviorBias: string[];
  antiAppeasement: boolean;
};

export type RelationshipTier = {
  key: string;
  label: string;
  description: string;
};

// Score boundaries (score >= min && score < max). Ordered from most negative to
// most positive. These read as semantic flavour for the model and the UI; they
// are never used as emotional commands or hard behaviour rules.
export const RELATIONSHIP_TIERS: RelationshipTier[] = [
  { key: "seething", label: "Seething", description: "Rage and a desire for vengeance" },
  { key: "hostile", label: "Hostile", description: "Open opposition and distrust" },
  { key: "antagonistic", label: "Antagonistic", description: "Pronounced suspicion and friction" },
  { key: "suspicious", label: "Suspicious", description: "Cautious wariness of intent" },
  { key: "wary", label: "Wary", description: "Guarded and unready to trust" },
  { key: "stranger", label: "Stranger", description: "No established relationship" },
  { key: "acquaintance", label: "Acquaintance", description: "A passing familiarity" },
  { key: "comfortable", label: "Comfortable", description: "Ease in each other's presence" },
  { key: "trusted", label: "Trusted", description: "Relied upon, confidences shared" },
  { key: "close", label: "Close", description: "Mutual care and shared history" },
  { key: "affectionate", label: "Affectionate", description: "Warmth and genuine fondness" },
  { key: "deeply-bonded", label: "Deeply bonded", description: "A bond that shapes both lives" },
  { key: "devoted", label: "Devoted", description: "Place the other above their own wants" },
];

export type RelationshipEvent = {
  id: string;
  characterId: string;
  personaId: string;
  turnId: string;
  delta: number;
  playerDelta?: number;
  characterDelta?: number;
  reason: string;
  interpretation?: RelationshipInterpretation;
  dimensionDeltas?: Partial<RelationshipDimensions>;
  diagnostics?: string[];
  memoryLane?: "relationship";
  causalMemory?: {
    event: string;
    appraisal: string;
    aftereffects: string[];
  };
  createdAt: number;
};

export type RelationshipRecord = {
  characterId: string;
  personaId: string;
  // Stable starting point for this character/persona pair. For migrated
  // characters this is derived from the old 0..100 bond value. Events are
  // always added on top of this value instead of replacing it.
  baselineScore?: number;
  score: number;
  dimensions?: RelationshipDimensions;
  momentum?: Partial<RelationshipDimensions>;
  updatedAt: number;
  events: RelationshipEvent[];
  note?: string;
};

export type RelationshipState = Record<string, RelationshipRecord>;

export function relationshipKey(characterId: string, personaId: string): string {
  return `${characterId}::${personaId}`;
}

export function parseRelationshipKey(key: string): { characterId: string; personaId: string } | null {
  const separator = key.indexOf("::");
  if (separator < 0) return null;
  const characterId = key.slice(0, separator);
  const personaId = key.slice(separator + 2);
  return characterId && personaId ? { characterId, personaId } : null;
}
