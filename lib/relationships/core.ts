import {
  type RelationshipEvent,
  type RelationshipDimensions,
  type RelationshipRecord,
  type RelationshipState,
  type RelationshipTier,
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RELATIONSHIP_NEUTRAL,
  RELATIONSHIP_TIERS,
  RELATIONSHIP_DIMENSIONS,
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

// Linear normalization to a 0..100 meter position. Keep two decimals so small
// relationship changes are not visually rounded away by the UI.
export function relationshipMeterPercent(score: number): number {
  const clamped = clampScore(score);
  const percent = ((clamped - RELATIONSHIP_MIN) / (RELATIONSHIP_MAX - RELATIONSHIP_MIN)) * 100;
  return Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
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

export function defaultRelationshipDimensions(): RelationshipDimensions {
  return Object.fromEntries(RELATIONSHIP_DIMENSIONS.map((dimension) => [dimension, 0])) as RelationshipDimensions;
}

export function dimensionsFromEvents(events: RelationshipEvent[]): RelationshipDimensions {
  const dimensions = defaultRelationshipDimensions();
  for (const event of events) {
    for (const [dimension, delta] of Object.entries(event.dimensionDeltas ?? {})) {
      if (!(dimension in dimensions) || typeof delta !== "number" || !Number.isFinite(delta)) continue;
      const key = dimension as keyof RelationshipDimensions;
      dimensions[key] = Math.max(-100, Math.min(100, dimensions[key] + delta));
    }
  }
  return dimensions;
}

export function relationshipMomentumFromEvents(events: RelationshipEvent[]): Partial<RelationshipDimensions> {
  const momentum: Partial<RelationshipDimensions> = {};
  for (const event of events) {
    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      const prior = momentum[dimension] ?? 0;
      const impulse = event.dimensionDeltas?.[dimension] ?? 0;
      const next = Math.round((prior * 0.65 + impulse) * 100) / 100;
      if (Math.abs(next) >= 0.01) momentum[dimension] = next;
      else delete momentum[dimension];
    }
  }
  return momentum;
}

export function renderRelationshipDiagnostics(event: Pick<RelationshipEvent, "reason" | "interpretation" | "dimensionDeltas">): string {
  const lines = ["RELATIONSHIP EVENT", event.reason];
  if (event.interpretation) {
    lines.push("", "PLAYER SIGNAL");
    for (const [name, value] of Object.entries(event.interpretation.playerSignals)) {
      if (value > 0) lines.push(`${name.padEnd(14)} ${value.toFixed(2)}`);
    }
    lines.push("", "CHARACTER APPRAISAL", event.interpretation.appraisal, "", "CONFIDENCE", event.interpretation.confidence.toFixed(2));
  }
  const deltas = Object.entries(event.dimensionDeltas ?? {});
  if (deltas.length > 0) {
    lines.push("", "RELATIONSHIP EFFECT");
    for (const [dimension, delta] of deltas) lines.push(`${dimension.padEnd(14)} ${Number(delta) >= 0 ? "+" : ""}${delta}`);
  }
  if (event.interpretation?.behaviorBias.length) lines.push("", "BEHAVIOR BIAS", ...event.interpretation.behaviorBias);
  return lines.join("\n");
}

function eventDeltaTotal(events: RelationshipEvent[]): number {
  return events.reduce((total, event) => total + event.delta, 0);
}

// The latest legacy bond seed seen for a character/persona pair. The UI and
// scorer already call effectiveScore with that seed before committing turns, so
// this lets old event-only records migrate without changing the chat workflow.
const baselineHints = new Map<string, number>();

function recordBaseline(key: string, record: RelationshipRecord): number {
  if (typeof record.baselineScore === "number" && Number.isFinite(record.baselineScore)) {
    return clampScore(record.baselineScore);
  }
  const hinted = baselineHints.get(key);
  if (typeof hinted === "number" && Number.isFinite(hinted)) return clampScore(hinted);

  // Old records stored score = sum(events). If a record predates the baseline
  // field and no bond hint has been observed yet, preserve its current score by
  // deriving whatever baseline it already implied instead of resetting it.
  return clampScore(record.score - eventDeltaTotal(record.events));
}

// Sum surviving event deltas on top of the stable starting relationship.
export function scoreFromEvents(events: RelationshipEvent[], baselineScore = RELATIONSHIP_NEUTRAL): number {
  return clampScore(baselineScore + eventDeltaTotal(events));
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
// existing saves keep their prior progress. Legacy event-only records are also
// upgraded here when a bond seed is available.
export function getOrCreateRecord(
  state: RelationshipState,
  characterId: string,
  personaId: string,
  seedBond?: number,
): RelationshipRecord {
  const key = relationshipKey(characterId, personaId);
  const seedScore = migrateBondToScore(seedBond);
  baselineHints.set(key, seedScore);
  const existing = state[key];
  if (existing) {
    if (typeof existing.baselineScore === "number" && Number.isFinite(existing.baselineScore)) {
      return existing;
    }
    const upgraded: RelationshipRecord = {
      ...existing,
      baselineScore: seedScore,
      score: scoreFromEvents(existing.events, seedScore),
      dimensions: dimensionsFromEvents(existing.events),
      momentum: relationshipMomentumFromEvents(existing.events),
      updatedAt: Date.now(),
    };
    state[key] = upgraded;
    return upgraded;
  }
  const record: RelationshipRecord = {
    characterId,
    personaId,
    baselineScore: seedScore,
    score: seedScore,
    updatedAt: Date.now(),
    events: [],
    dimensions: defaultRelationshipDimensions(),
    momentum: {},
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
  const key = relationshipKey(characterId, personaId);
  const hasSeed = typeof seedBond === "number" && Number.isFinite(seedBond);
  if (hasSeed) baselineHints.set(key, migrateBondToScore(seedBond));
  const record = state[key];
  if (!record) return migrateBondToScore(seedBond);
  return scoreFromEvents(record.events, recordBaseline(key, record));
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
  const existing = state[key];
  const baselineScore = existing
    ? recordBaseline(key, existing)
    : baselineHints.get(key) ?? RELATIONSHIP_NEUTRAL;
  const record: RelationshipRecord = existing ?? {
    characterId: event.characterId,
    personaId: event.personaId,
    baselineScore,
    score: baselineScore,
    updatedAt: Date.now(),
    events: [],
    dimensions: defaultRelationshipDimensions(),
    momentum: {},
  };
  const withoutOld = record.events.filter((current) => current.turnId !== event.turnId);
  if (event.delta === 0 && !event.interpretation && Object.keys(event.dimensionDeltas ?? {}).length === 0) {
    state[key] = {
      ...record,
      baselineScore,
      score: scoreFromEvents(withoutOld, baselineScore),
      events: withoutOld,
      dimensions: dimensionsFromEvents(withoutOld),
      momentum: relationshipMomentumFromEvents(withoutOld),
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
    baselineScore,
    score: scoreFromEvents(withNew, baselineScore),
    events: withNew,
    dimensions: dimensionsFromEvents(withNew),
    momentum: relationshipMomentumFromEvents(withNew),
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
  const baselineScore = recordBaseline(key, record);
  state[key] = {
    ...record,
    baselineScore,
    score: scoreFromEvents(surviving, baselineScore),
    events: surviving,
    dimensions: dimensionsFromEvents(surviving),
    momentum: relationshipMomentumFromEvents(surviving),
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
  const baselineScore = recordBaseline(key, record);
  state[key] = {
    ...record,
    baselineScore,
    score: scoreFromEvents(surviving, baselineScore),
    events: surviving,
    dimensions: dimensionsFromEvents(surviving),
    momentum: relationshipMomentumFromEvents(surviving),
    updatedAt: Date.now(),
  };
  return state;
}
