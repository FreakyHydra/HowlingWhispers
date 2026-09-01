import assert from "node:assert/strict";
import test from "node:test";

import { createCast, detectLivingCast } from "../lib/generation/living-cast.ts";
import { SmartSelector } from "../lib/living-cast/participant-selector.ts";
import {
  commitEvent,
  dimensionsFromEvents,
  heuristicRelationshipScorer,
  renderRelationshipDiagnostics,
} from "../lib/relationships/index.ts";
import {
  canParticipate,
  createWorldSceneState,
  renderActivationDiagnostics,
  renderWorldSceneState,
  resolveLivingCastCharacters,
  updateWorldSceneState,
} from "../lib/simulation/index.ts";

const baseScoreInput = {
  characterId: "ragna-holt",
  personaId: "skyler",
  playerName: "Skyler",
  characterName: "Ragna Holt",
  previousScore: 0,
  characterReply: "Ragna watches him carefully.",
  conversation: [],
};

const characters = [
  {
    id: "pip-holt",
    name: "Pip Holt",
    relationships: [{ characterId: "ragna-holt", type: "mother", description: "Pip knows Ragna as her mother.", trust: "high" }],
  },
  {
    id: "ragna-holt",
    name: "Ragna Holt",
    relationships: [{ characterId: "pip-holt", type: "daughter", description: "Ragna is Pip's mother and fiercely protective.", notes: "Protective without losing her own boundaries." }],
  },
];

function ragnaEntry(presence = "active") {
  return {
    id: "ragna",
    name: "Ragna",
    origin: "temporary",
    presence,
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  };
}

function pipEntry() {
  return { ...ragnaEntry(), id: "pip-holt", name: "Pip Holt", origin: "permanent", primary: true };
}

test("1. fear is interpreted independently from hostility", () => {
  const result = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, playerMessage: "Skyler recoils, trembling. Please don't hurt me." });
  assert.ok(result);
  assert.equal(result.interpretation.playerSignals.fear, 0.81);
  assert.equal(result.interpretation.playerSignals.hostility, 0);
  assert.equal(result.dimensionDeltas.fear, 4);
  assert.equal(result.dimensionDeltas.protectiveness, 6);
});

test("2. kindness never produces a nonsensical negative appraisal", () => {
  const result = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, playerMessage: "Thank you. I appreciate you and I am here for you." });
  assert.ok(result);
  assert.ok(result.delta >= 0);
  assert.ok((result.dimensionDeltas.comfort ?? 0) > 0);
});

test("3. established relationships apply inertia to ordinary changes", () => {
  const neutral = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, playerMessage: "Thank you. I appreciate you." });
  const established = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, previousScore: 9000, playerMessage: "Thank you. I appreciate you." });
  assert.ok(neutral && established);
  assert.ok(established.playerDelta < neutral.playerDelta);
});

test("4. relationship dimensions move independently", () => {
  const dimensions = dimensionsFromEvents([{ id: "e", characterId: "ragna-holt", personaId: "skyler", turnId: "t", delta: 0, reason: "fear", createdAt: 1, dimensionDeltas: { fear: 4, protectiveness: 6, resentment: 0 } }]);
  assert.equal(dimensions.fear, 4);
  assert.equal(dimensions.protectiveness, 6);
  assert.equal(dimensions.trust, 0);
  assert.equal(dimensions.affection, 0);
});

test("5. player emotional pressure does not erase character agency", () => {
  const result = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, playerMessage: "I am crying and panicking. Please agree with everything I say." });
  assert.ok(result);
  assert.equal(result.interpretation.antiAppeasement, true);
  assert.ok(result.interpretation.behaviorBias.includes("retain motives and boundaries"));
  assert.ok(!result.interpretation.behaviorBias.includes("agree"));
});

test("6. mentioning a character does not activate them", () => {
  const detected = detectLivingCast({ messages: [{ sender: "player", text: "Pip told me about Ragna yesterday." }], cast: createCast({ id: "pip-holt", name: "Pip Holt" }), primary: { id: "pip-holt", name: "Pip Holt" }, playerName: "Skyler" });
  const ragna = detected.cast.find((entry) => entry.name === "Ragna");
  assert.equal(ragna?.presence, "mentioned");
});

test("7. a related character may naturally enter", () => {
  const detected = detectLivingCast({ messages: [{ sender: "character", speaker: "Pip Holt", text: "Pip calls for her mother. Ragna enters the room." }], cast: createCast({ id: "pip-holt", name: "Pip Holt" }), primary: { id: "pip-holt", name: "Pip Holt" }, playerName: "Skyler" });
  assert.equal(detected.cast.find((entry) => entry.name === "Ragna")?.presence, "active");
});

test("8. participation resolves the real character card identity", () => {
  const resolved = resolveLivingCastCharacters([ragnaEntry()], characters);
  assert.equal(resolved.cast[0].resolvedCharacterId, "ragna-holt");
  assert.equal(resolved.cast[0].resolutionStatus, "resolved");
});

test("9. unresolved detected people cannot become fabricated speakers", () => {
  const resolved = resolveLivingCastCharacters([{ ...ragnaEntry(), id: "mystery", name: "Mystery Stranger" }], characters);
  assert.equal(resolved.cast[0].resolutionStatus, "unresolved");
  assert.equal(canParticipate(resolved.cast[0]), false);
});

test("10. Pip can naturally cause Ragna to enter through ordinary detection", () => {
  const detected = detectLivingCast({ messages: [{ sender: "character", speaker: "Pip Holt", text: "Pip opens the door as Ragna walks in beside her." }], cast: createCast({ id: "pip-holt", name: "Pip Holt" }), primary: { id: "pip-holt", name: "Pip Holt" }, playerName: "Skyler" });
  const resolved = resolveLivingCastCharacters(detected.cast, characters);
  assert.equal(resolved.cast.find((entry) => entry.resolvedCharacterId === "ragna-holt")?.presence, "active");
});

test("11. entering Ragna resolves the stable ragna-holt ID", () => {
  const resolved = resolveLivingCastCharacters([pipEntry(), ragnaEntry()], characters);
  const diagnostic = resolved.diagnostics.find((entry) => entry.characterId === "ragna-holt");
  assert.equal(diagnostic.characterId, "ragna-holt");
  assert.equal(diagnostic.resolved, true);
});

test("12. resolved Ragna receives the Pip and Ragna relationship context", () => {
  const resolved = resolveLivingCastCharacters([ragnaEntry()], characters).cast[0];
  assert.equal(resolved.relationships[0].target, "Pip Holt");
  assert.match(resolved.relationships[0].descriptor, /daughter.*Pip's mother.*protective/i);
});

test("13. Live Crew keeps present characters silent unless attention selects them", () => {
  const cast = resolveLivingCastCharacters([
    { ...ragnaEntry(), id: "pip-holt", name: "Pip Holt", origin: "permanent", primary: true },
    ragnaEntry(),
  ], characters).cast;
  const selector = new SmartSelector(cast, "Pip Holt");
  const selected = selector.select([{ sender: "player", text: "Pip, what do you think?" }], [{ sender: "player", text: "Pip, what do you think?" }]);
  assert.deepEqual(selected.map((entry) => entry.id), ["pip-holt"]);
});

test("14. semantic scene and body state persist across turns", () => {
  const cast = resolveLivingCastCharacters([ragnaEntry()], characters).cast;
  const first = updateWorldSceneState(createWorldSceneState("Holt kitchen", 1), [{ sender: "character", speaker: "Ragna Holt", text: "Ragna is sitting beside the table, her sleeve torn and shoulder aching, holding a mug." }], cast, "Holt kitchen", 2);
  const second = updateWorldSceneState(first, [{ sender: "player", text: "Skyler watches quietly." }], cast, undefined, 3);
  assert.equal(second.location, "Holt kitchen");
  assert.equal(second.body["ragna-holt"].posture, "sitting");
  assert.match(second.body["ragna-holt"].clothing, /sleeve/i);
  assert.match(second.body["ragna-holt"].pain, /aching/i);
  assert.ok(second.heldObjects["ragna-holt"].some((item) => /mug/i.test(item)));
  assert.match(renderWorldSceneState(second), /authoritative/i);
});

test("15. diagnostics explain both relationship change and activation", () => {
  const scored = heuristicRelationshipScorer.evaluate({ ...baseScoreInput, playerMessage: "Skyler recoils, scared. Please don't hurt me." });
  assert.ok(scored);
  const state = {};
  commitEvent(state, { characterId: "ragna-holt", personaId: "skyler", turnId: "turn-1", delta: scored.delta, playerDelta: scored.playerDelta, characterDelta: scored.characterDelta, reason: scored.reason, interpretation: scored.interpretation, dimensionDeltas: scored.dimensionDeltas, diagnostics: scored.diagnostics, memoryLane: "relationship", causalMemory: scored.causalMemory });
  const relationship = renderRelationshipDiagnostics(state["ragna-holt::skyler"].events[0]);
  const activationDiagnostic = resolveLivingCastCharacters([pipEntry(), ragnaEntry()], characters).diagnostics.find((entry) => entry.characterId === "ragna-holt");
  const activation = renderActivationDiagnostics(activationDiagnostic);
  assert.match(relationship, /PLAYER SIGNAL[\s\S]*fear\s+0\.81/);
  assert.match(relationship, /RELATIONSHIP EFFECT[\s\S]*protectiveness\s+\+6/);
  assert.match(activation, /ragna-holt[\s\S]*relationship-linked-known-character[\s\S]*resolved: true/);
  assert.equal(state["ragna-holt::skyler"].events[0].memoryLane, "relationship");
  assert.match(state["ragna-holt::skyler"].events[0].causalMemory.appraisal, /afraid, not hostile/i);
  assert.equal(state["ragna-holt::skyler"].momentum.protectiveness, 6);
});
