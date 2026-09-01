export {
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RELATIONSHIP_NEUTRAL,
  DEFAULT_PERSONA_ID,
  RELATIONSHIP_DIMENSIONS,
  type RelationshipTier,
  type RelationshipDimension,
  type RelationshipDimensions,
  type PlayerSignals,
  type RelationshipInterpretation,
  type RelationshipEvent,
  type RelationshipRecord,
  type RelationshipState,
  relationshipKey,
  parseRelationshipKey,
} from "./schema.ts";

export {
  RELATIONSHIP_SCORE_MAX,
  RELATIONSHIP_SCORE_MIN,
  RELATIONSHIP_SCORE_NEUTRAL,
  clampScore,
  relationshipMeterPercent,
  deriveRelationshipTier,
  deriveRelationshipLabel,
  relationshipTierPhrase,
  scoreFromEvents,
  migrateBondToScore,
  getRecord,
  getOrCreateRecord,
  effectiveScore,
  effectivePersonaId,
  commitEvent,
  removeEventsForTurns,
  reconcileRecord,
  dimensionsFromEvents,
  relationshipMomentumFromEvents,
  defaultRelationshipDimensions,
  renderRelationshipDiagnostics,
} from "./core.ts";

export {
  loadRelationships,
  saveRelationships,
} from "./storage.ts";

export {
  type RelationshipScorer,
  type RelationshipScorerInput,
  type RelationshipDelta,
  heuristicRelationshipScorer,
} from "./evaluator.ts";
