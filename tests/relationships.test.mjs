import assert from "node:assert/strict";
import test from "node:test";

import {
  RELATIONSHIP_MAX,
  RELATIONSHIP_MIN,
  RELATIONSHIP_SCORE_MIN,
  clampScore,
  commitEvent,
  deriveRelationshipLabel,
  deriveRelationshipTier,
  effectivePersonaId,
  effectiveScore,
  getOrCreateRecord,
  loadRelationships,
  migrateBondToScore,
  reconcileRecord,
  removeEventsForTurns,
  relationshipMeterPercent,
  relationshipTierPhrase,
  saveRelationships,
  heuristicRelationshipScorer,
} from "../lib/relationships/index.ts";

function freshState() {
  return {};
}

function commit(state, overrides) {
  const payload = {
    characterId: "coda",
    personaId: "default",
    turnId: "turn-1",
    delta: 0,
    reason: "test",
    createdAt: undefined,
    ...overrides,
  };
  delete payload.createdAt;
  const event = {
    characterId: payload.characterId,
    personaId: payload.personaId,
    turnId: payload.turnId,
    delta: payload.delta,
    reason: payload.reason,
  };
  if (payload.createdAt !== undefined) {
    event.createdAt = payload.createdAt;
  }
  commitEvent(state, event);
}

test("neutral/default relationship starts at zero and has no events", () => {
  const state = freshState();
  const score = effectiveScore(state, "coda", "default", 0);
  assert.equal(score, 0);
  assert.equal(deriveRelationshipLabel(score), "Stranger");
  assert.equal(effectivePersonaId(null, undefined), "default");
});

test("positive delta increases the score and records an event", () => {
  const state = freshState();
  commit(state, { turnId: "t1", delta: 14, reason: "shared a secret" });
  const score = effectiveScore(state, "coda", "default");
  assert.equal(score, 14);
  assert.equal(deriveRelationshipTier(score).label, "Stranger");
});

test("negative delta decreases the score and records an event", () => {
  const state = freshState();
  commit(state, { turnId: "t1", delta: -26, reason: "threatened" });
  const score = effectiveScore(state, "coda", "default");
  assert.equal(score, -26);
  assert.equal(deriveRelationshipTier(score).label, "Suspicious");
});

test("zero delta leaves the score unchanged and stores no event", () => {
  const state = freshState();
  commit(state, { turnId: "t1", delta: 0, reason: "ordinary" });
  assert.equal(state["coda::default"].events.length, 0);
  assert.equal(effectiveScore(state, "coda", "default"), 0);
});

test("lower bound clamps at -1000", () => {
  const state = freshState();
  commit(state, { turnId: "t1", delta: -500, reason: "betrayal" });
  commit(state, { turnId: "t2", delta: -800, reason: "abandonment" });
  assert.equal(effectiveScore(state, "coda", "default"), RELATIONSHIP_SCORE_MIN);
  assert.equal(deriveRelationshipLabel(effectiveScore(state, "coda", "default")), "Seething");
});

test("upper bound clamps at 10000", () => {
  const state = freshState();
  commit(state, { turnId: "t1", delta: 600, reason: "bond" });
  commit(state, { turnId: "t2", delta: 9500, reason: "devotion" });
  assert.equal(effectiveScore(state, "coda", "default"), RELATIONSHIP_MAX);
  assert.equal(deriveRelationshipLabel(effectiveScore(state, "coda", "default")), "Devoted");
});

test("different personas keep independent scores for the same character", () => {
  const state = freshState();
  commit(state, { personaId: "rinn", turnId: "t1", delta: 40, reason: "trust" });
  commit(state, { personaId: "kira", turnId: "t1", delta: -20, reason: "conflict" });
  assert.equal(effectiveScore(state, "coda", "rinn"), 40);
  assert.equal(effectiveScore(state, "coda", "kira"), -20);
  assert.equal(effectiveScore(state, "coda", "default"), 0);
});

test("reroll replaces the previous event instead of stacking", () => {
  const state = freshState();
  commit(state, { turnId: "char-5", delta: 12, reason: "warm exchange" });
  assert.equal(state["coda::default"].events.length, 1);
  commit(state, { turnId: "char-5", delta: -8, reason: "rerolled, colder" });
  assert.equal(state["coda::default"].events.length, 1);
  assert.equal(state["coda::default"].score, -8);
  assert.equal(effectiveScore(state, "coda", "default"), -8);
});

test("reroll to a zero delta removes the prior event", () => {
  const state = freshState();
  commit(state, { turnId: "char-5", delta: 18, reason: "positive" });
  commit(state, { turnId: "char-5", delta: 0, reason: "rerolled, neutral" });
  assert.equal(state["coda::default"].events.length, 0);
  assert.equal(effectiveScore(state, "coda", "default"), 0);
});

test("deleting one scored turn reverses its effect", () => {
  const state = freshState();
  commit(state, { turnId: "char-2", delta: 14, reason: "shared" });
  commit(state, { turnId: "char-3", delta: 9, reason: "kindness" });
  removeEventsForTurns(state, "coda", "default", ["char-2"]);
  const record = state["coda::default"];
  assert.equal(record.events.length, 1);
  assert.equal(record.events[0].turnId, "char-3");
  assert.equal(record.score, 9);
});

test("rewind removes events for every rolled-back character turn", () => {
  const state = freshState();
  commit(state, { turnId: "char-2", delta: 14, reason: "shared" });
  commit(state, { turnId: "char-5", delta: 9, reason: "kindness" });
  commit(state, { turnId: "char-8", delta: 22, reason: "confided" });
  removeEventsForTurns(state, "coda", "default", ["char-5", "char-8"]);
  assert.equal(state["coda::default"].events.length, 1);
  assert.equal(state["coda::default"].score, 14);
});

test("recompute/replace on edit-rerun: a regenerated turn replaces its event", () => {
  const state = freshState();
  commit(state, { turnId: "char-5", delta: 14, reason: "first draft" });
  commit(state, { turnId: "char-5", delta: 6, reason: "re-run from new direction" });
  const record = state["coda::default"];
  assert.equal(record.events.length, 1);
  assert.equal(record.events[0].delta, 6);
  assert.equal(record.score, 6);
});

test("reconcile drops events for turns no longer in the conversation", () => {
  const state = freshState();
  commit(state, { turnId: "char-2", delta: 14, reason: "a" });
  commit(state, { turnId: "char-5", delta: 9, reason: "b" });
  commit(state, { turnId: "char-8", delta: 22, reason: "c" });
  reconcileRecord(state, "coda", "default", new Set(["char-2", "char-8"]));
  const record = state["coda::default"];
  assert.equal(record.events.length, 2);
  assert.equal(record.score, 36);
});

test("migration seeds score from legacy bond without destroying it", () => {
  const state = freshState();
  assert.equal(migrateBondToScore(78), 7800);
  assert.equal(migrateBondToScore(0), 0);
  assert.equal(migrateBondToScore(100), RELATIONSHIP_MAX);
  assert.equal(migrateBondToScore(undefined), 0);
  assert.equal(migrateBondToScore(-5), 0);
  assert.equal(migrateBondToScore(120), RELATIONSHIP_MAX);
  assert.equal(effectiveScore(state, "coda", "default", 50), 5000);
  const record = getOrCreateRecord(state, "senako-steel", "default", 34);
  assert.equal(record.score, 3400);
  assert.equal(record.baselineScore, 3400);
  assert.equal(record.events.length, 0);
});

test("starting bond remains the baseline after scored turns", () => {
  const state = freshState();
  getOrCreateRecord(state, "peony", "default", 14);
  commit(state, { characterId: "peony", turnId: "char-2", delta: 6, reason: "trust" });
  assert.equal(state["peony::default"].baselineScore, 1400);
  assert.equal(state["peony::default"].score, 1406);
  assert.equal(effectiveScore(state, "peony", "default", 14), 1406);
});

test("legacy event-only records recover the bond baseline when it is observed", () => {
  const state = {
    "peony::default": {
      characterId: "peony",
      personaId: "default",
      score: 6,
      updatedAt: 1,
      events: [{
        id: "old",
        characterId: "peony",
        personaId: "default",
        turnId: "char-2",
        delta: 6,
        reason: "trust",
        createdAt: 1,
      }],
    },
  };
  assert.equal(effectiveScore(state, "peony", "default", 14), 1406);
  commit(state, { characterId: "peony", turnId: "char-3", delta: 3, reason: "thanks" });
  assert.equal(state["peony::default"].baselineScore, 1400);
  assert.equal(state["peony::default"].score, 1409);
});

test("meter percent normalizes the -1000..10000 range without hiding small movement", () => {
  assert.equal(relationshipMeterPercent(RELATIONSHIP_MIN), 0);
  assert.equal(relationshipMeterPercent(0), 9.09);
  assert.equal(relationshipMeterPercent(10), 9.18);
  assert.equal(relationshipMeterPercent(RELATIONSHIP_MAX), 100);
});

test("clampScore clamps to the supported range", () => {
  assert.equal(clampScore(-9999), RELATIONSHIP_MIN);
  assert.equal(clampScore(99999), RELATIONSHIP_MAX);
  assert.equal(clampScore(NaN), 0);
});

test("heuristic scorer is provider-neutral and pure", () => {
  const scorer = heuristicRelationshipScorer;
  const base = {
    characterId: "coda",
    personaId: "default",
    playerName: "You",
    characterName: "Coda",
    previousScore: 0,
    conversation: [],
  };
  const positive = scorer.evaluate({ ...base, playerMessage: "I trust you, and I'm here for you.", characterReply: "Coda smiles, glad you came back." });
  assert.ok(positive, "a positive turn yields a delta");
  assert.ok(positive.delta > 0, "positive delta is > 0");
  const again = scorer.evaluate({ ...base, playerMessage: "I trust you, and I'm here for you.", characterReply: "Coda smiles, glad you came back." });
  assert.deepEqual(again, positive);

  const zero = scorer.evaluate({ ...base, playerMessage: "The library is quiet tonight.", characterReply: "The fire crackles." });
  assert.equal(zero.delta, 0);

  const negative = scorer.evaluate({ ...base, playerMessage: "I'm going to leave. You'll never see me again.", characterReply: "*looks away*" });
  assert.ok(negative.delta < 0, "negative delta is < 0");
});

test("relationship state survives a save/load round trip", () => {
  const store = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  try {
    const state = freshState();
    getOrCreateRecord(state, "coda", "default", 12);
    commit(state, { turnId: "char-2", delta: 12, reason: "trust" });
    saveRelationships(state);
    const reloaded = loadRelationships();
    const record = reloaded["coda::default"];
    assert.ok(record, "record persisted across save/load");
    assert.equal(record.baselineScore, 1200);
    assert.equal(record.score, 1212);
    assert.equal(record.events.length, 1);
    assert.equal(record.events[0].turnId, "char-2");
    assert.equal(record.events[0].delta, 12);
    assert.equal(record.events[0].reason, "trust");
    assert.equal(loadRelationships()["coda::rinn"], undefined);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test("relationship scoring never leaks deltas into visible roleplay", () => {
  const result = heuristicRelationshipScorer.evaluate({
    characterId: "coda",
    personaId: "default",
    playerName: "You",
    characterName: "Coda",
    previousScore: 0,
    playerMessage: "I trust you completely.",
    characterReply: "Coda nuzzles closer, glad you said that.",
    conversation: [],
  });
  assert.ok(result);
  assert.deepEqual(Object.keys(result).sort(), ["delta", "reason"]);

  const conversation = [
    { sender: "player", text: "I trust you completely." },
    { sender: "character", text: "Coda nuzzles closer, glad you said that." },
  ];
  const state = freshState();
  commit(state, { turnId: "c:9", delta: result.delta, reason: result.reason });
  assert.equal(conversation[1].delta, undefined);
  assert.equal(conversation[1].reason, undefined);
  assert.equal(conversation[1].score, undefined);
  assert.equal(state["coda::default"].events.length, 1);
  assert.equal(state["coda::default"].score, result.delta);

  assert.equal(deriveRelationshipLabel(14), "Stranger");
  const phrase = relationshipTierPhrase(14);
  assert.equal(typeof phrase, "string");
  assert.match(phrase, /Stranger/);
  assert.doesNotMatch(phrase, /\b-?\d+\b/);
});
