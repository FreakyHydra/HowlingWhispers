import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSensoryContext,
  resolvePerception,
} from "../lib/generation/perception.ts";

const sensory = { style: "sensory" };

test("a character behind the persona is audible but their expression is not visible", () => {
  const result = resolvePerception([
    { id: "face", channel: "sight", text: "Heather's eyes narrow.", relation: "behind" },
    { id: "voice", channel: "hearing", text: "Heather speaks behind the persona.", relation: "behind" },
  ], sensory);

  assert.deepEqual(result.observations.map((fact) => fact.id), ["voice"]);
  assert.deepEqual(result.filtered, [{ id: "face", reason: "no-line-of-sight" }]);
  assert.match(result.block, /Audible:\n- Heather speaks behind the persona\./);
  assert.doesNotMatch(result.block, /eyes narrow/);
});

test("a closed barrier blocks quiet speech but not an explicitly loud sound", () => {
  const result = resolvePerception([
    { id: "quiet", channel: "hearing", text: "A quiet whisper crosses the door.", relation: "separated-by-barrier", intensity: "quiet" },
    { id: "loud", channel: "hearing", text: "A shout carries through the door.", relation: "separated-by-barrier", intensity: "loud" },
  ], sensory);

  assert.deepEqual(result.observations.map((fact) => fact.id), ["loud"]);
  assert.deepEqual(result.filtered, [{ id: "quiet", reason: "barrier-muted" }]);
});

test("touch and taste require direct contact", () => {
  const result = resolvePerception([
    { id: "far-heat", channel: "touch", text: "The persona feels the lantern's heat.", relation: "far", requiresContact: true },
    { id: "held-mug", channel: "touch", text: "The mug is warm against the persona's palms.", relation: "touching", requiresContact: true },
    { id: "distant-taste", channel: "taste", text: "The soup tastes salty.", relation: "near", requiresContact: true },
  ], sensory);

  assert.deepEqual(result.observations.map((fact) => fact.id), ["held-mug"]);
  assert.equal(result.filtered.length, 2);
});

test("body language remains observable evidence without asserting emotion", () => {
  const result = resolvePerception([
    { id: "fist", channel: "bodyLanguage", text: "Heather's fingers curl until her knuckles pale.", relation: "near" },
  ], sensory);

  assert.match(result.block, /Observable body language:/);
  assert.match(result.block, /knuckles pale/);
  assert.doesNotMatch(result.block, /Heather is angry/);
  assert.match(result.block, /cautious inference only/);
});

test("private and off-screen autonomous actions stay outside persona perception", () => {
  const result = resolvePerception([
    { id: "private-thought", channel: "spatialAwareness", text: "Melody intends to take the knife.", private: true },
    { id: "hidden-action", channel: "sight", text: "Melody picks up the knife in another room.", relation: "out-of-sight" },
  ], sensory);

  assert.equal(result.observations.length, 0);
  assert.deepEqual(result.filtered.map((entry) => entry.reason), ["private-world-truth", "no-line-of-sight"]);
  assert.doesNotMatch(result.block, /knife/);
});

test("Standard POV produces no perception context", () => {
  const result = resolvePerception([
    { id: "visible", channel: "sight", text: "Heather stands by the door." },
  ], { style: "standard" });

  assert.equal(result.enabled, false);
  assert.equal(result.block, "");
  assert.deepEqual(result.worldFacts, []);
  assert.deepEqual(result.observations, []);
});

test("the HW adapter exposes active cast residue but never autonomous internal state", () => {
  const result = buildSensoryContext({
    config: sensory,
    cast: [
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "gone", name: "Gone", origin: "temporary", presence: "absent", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    ],
    autonomy: [{
      id: "rc:melody",
      name: "Melody",
      drive: { goal: "steal the key", intent: "", wants: [], fears: [], concerns: [], needs: { hunger: 0, fatigue: 0, comfort: 0, social: 0, curiosity: 0 } },
      revisions: [{ internal: ["Melody intends to steal the key"], observable: ["keeps glancing toward the key hook"] }],
      updatedAt: 2,
    }],
  });

  assert.match(result.block, /Melody is present in the same general place/);
  assert.match(result.block, /Melody keeps glancing toward the key hook/);
  assert.doesNotMatch(result.block, /intends to steal|Goal: steal/);
  assert.doesNotMatch(result.block, /Gone is present/);
  assert.ok(result.worldFacts.some((fact) => fact.text === "Melody intends to steal the key"));
  assert.ok(result.filtered.some((fact) => fact.reason === "private-world-truth"));
});
