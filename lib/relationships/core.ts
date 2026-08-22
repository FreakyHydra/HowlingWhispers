import {
  type RelationshipEvent,
  type RelationshipRecord,
  type RelationshipState,
  type RelationshipTier,
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RELATIONSHIP_NEUTRAL,
  RELATIONSHIP_TIERS,
  relationshipKey,
} from "./schema.ts";

// Score range bounds, re-exported for callers and tests.
export const RELATIONSHIP_SCORE_MIN = RELATIONSHIP_MIN;
export const RELATIONSHIP_SCORE_MAX = RELATIONSHIP_MAX;
export const RELATIONSHIP_SCORE_NEUTRAL = RELATIONSHIP_NEUTRAL;

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return RELATIONSHIP_NEUTRAL;
  return Math.max(RELATIONSHIP_MIN, Math.min(RELATIONSHIP_MAX, Math.round(score)));
}

// Linear normalization to a 0..100 meter position. -1000 -> 0, 0 -> ~9, 10000 -> 100.
export function relationshipMeterPercent(score: number): number {
  const clamped = clampScore(score);
  const percent = ((clamped - RELATIONSHIP_MIN) / (RELATIONSHIP_MAX - RELATIONSHIP_MIN)) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

const TIER_BOUNDARIES: ReadonlyArray<{ min: number; tier: RelationshipTier }> = [
  { min: -1000, tier: RELATIONSHIP_TIERS[0] }, // seething
  { min: -750, tier: RELATIONSHIP_TIERS[1] }, // hostile
  { min: -300, tier: RELATIONSHIP_TIERS[2] }, // antagonistic
  { min: -100, tier: RELATIONSHIP_TIERS[3] }, // suspicious
  { min: -10, tier: RELATIONSHIP_TIERS[4] }, // wary
  { min: 0, tier: RELATIONSHIP_TIERS[5] }, // stranger (neutral)
  { min: 50, tier: RELATIONSHIP_TIERS[6] }, // acquaintance
  { min: 200, tier: RELATIONSHIP_TIERS[7] }, // comfortable
  { min: 800, tier: RELATIONSHIP_TIERS[8] }, // trusted
  { min: 2000, tier: RELATIONSHIP_TIERS[9] }, // close
  { min: 4500, tier: RELATIONSHIP_TIERS[10] }, // affectionate
  { min: 7500, tier: RELATIONSHIP_TIERS[11] }, // deeply bonded
  { min: 9500, tier: RELATIONSHIP_TIERS[12] }, // devoted
];

export function deriveRelationshipTier(score: number): RelationshipTier {
  const clamped = clampScore(score);
  let current = RELATIONSHIP_TIERS[0];
  for (const boundary of TIER_BOUNDARIES) {
    if (clamped >= boundary.min) current = boundary.tier;
  }
  return current;
}

export function deriveRelationshipLabel(score: number): string {
  return deriveRelationshipTier(score).label;
}

export function relationshipTierPhrase(score: number): string {
  const tier = deriveRelationshipTier(score);
  return tier.description ? `${tier.label} — ${tier.description}` : tier.label;
}

// Sum of surviving event deltas, clamped. This is the single source of truth for
// the effective score, so it always stays mathematically consistent with history.
export function scoreFromEvents(events: RelationshipEvent[]): number {
  const sum = events.reduce((total, event) => total + event.delta, 0);
  return clampScore(sum);
}

// Migrate a legacy 0..100 `bond` into the 0..10000 score space. bond 0 -> 0
// (neutral), bond 100 -> 10000 (devoted). A brand-new character (bond 0) seeds
// neutral rather than maximally negative.
export function migrateBondToScore(bond: number | undefined | null): number {
  if (typeof bond !== "number" || !Number.isFinite(bond)) return RELATIONSHIP_NEUTRAL;
  const normalized = Math.max(0, Math.min(100, bond));
  return clampScore((normalized / 100) * RELATIONSHIP_MAX);
}

export function getRecord(
  state: RelationshipState,
  characterId: string,
  personaId: string,
): RelationshipRecord | null {
  return state[relationshipKey(characterId, personaId)] ?? null;
}

// Ensure a record exists, seeding from a legacy bond value on first use so that
// existing saves keep their prior progress without the bond field going forward.
export function getOrCreateRecord(
  state: RelationshipState,
  characterId: string,
  personaId: string,
  seedBond?: number,
): RelationshipRecord {
  const key = relationshipKey(characterId, personaId);
  const existing = state[key];
  if (existing) return existing;
  const record: RelationshipRecord = {
    characterId,
    personaId,
    score: migrateBondToScore(seedBond),
    updatedAt: Date.now(),
    events: [],
  };
  state[key] = record;
  return record;
}

export function effectiveScore(
  state: RelationshipState,
  characterId: string,
  personaId: string,
  seedBond?: number,
): number {
  const record = getRecord(state, characterId, personaId);
  if (record) return record.score;
  return migrateBondToScore(seedBond);
}

export function effectivePersonaId(
  activePersonaId: string | null | undefined,
  sessionPersonaId: string | null | undefined,
  fallback = "default",
): string {
  if (activePersonaId && activePersonaId.trim() !== "") return activePersonaId;
  if (sessionPersonaId && sessionPersonaId.trim() !== "") return sessionPersonaId;
  return fallback;
}

function nextEventId(): string {
  return `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Commit (or replace) the single scored event for a given turnId. A character
// reply is always tied to one turnId (its message id), so rerolling or
// regenerating a turn replaces its event instead of stacking another one.
export function commitEvent(
  state: RelationshipState,
  event: Omit<RelationshipEvent, "id" | "createdAt"> & { createdAt?: number },
): RelationshipState {
  const key = relationshipKey(event.characterId, event.personaId);
  const record = state[key] ?? {
    characterId: event.characterId,
    personaId: event.personaId,
    score: RELATIONSHIP_NEUTRAL,
    updatedAt: Date.now(),
    events: [],
  };
  const withoutOld = record.events.filter((existing) => existing.turnId !== event.turnId);
  if (event.delta === 0) {
    state[key] = {
      ...record,
      score: scoreFromEvents(withoutOld),
      events: withoutOld,
      updatedAt: Date.now(),
    };
    return state;
  }
  const committed: RelationshipEvent = {
    ...event,
    id: nextEventId(),
    createdAt: event.createdAt ?? Date.now(),
  };
  const withNew = [...withoutOld, committed];
  withNew.sort((a, b) => a.createdAt - b.createdAt);
  state[key] = {
    ...record,
    score: scoreFromEvents(withNew),
    events: withNew,
    updatedAt: Date.now(),
  };
  return state;
}

// Remove every event tied to deleted character turns and recompute the score.
// `turnIds` are the character message turn ids that no longer exist.
export function removeEventsForTurns(
  state: RelationshipState,
  characterId: string,
  personaId: string,
  turnIds: string[],
): RelationshipState {
  if (turnIds.length === 0) return state;
  const key = relationshipKey(characterId, personaId);
  const record = state[key];
  if (!record) return state;
  const removed = new Set(turnIds);
  const surviving = record.events.filter((event) => !removed.has(event.turnId));
  state[key] = {
    ...record,
    score: scoreFromEvents(surviving),
    events: surviving,
    updatedAt: Date.now(),
  };
  return state;
}

// Reconcile a relationship record against the surviving character message ids.
// Any event whose turnId is no longer in the conversation is dropped and the
// score recomputed from the remainder. Used after rewinds/edits that remove
// whole slices of the conversation.
export function reconcileRecord(
  state: RelationshipState,
  characterId: string,
  personaId: string,
  survivingTurnIds: Set<string>,
): RelationshipState {
  const key = relationshipKey(characterId, personaId);
  const record = state[key];
  if (!record) return state;
  const surviving = record.events.filter((event) => survivingTurnIds.has(event.turnId));
  if (surviving.length === record.events.length) return state;
  state[key] = {
    ...record,
    score: scoreFromEvents(surviving),
    events: surviving,
    updatedAt: Date.now(),
  };
  return state;
}
