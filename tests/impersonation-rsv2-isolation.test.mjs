import assert from "node:assert/strict";
import test from "node:test";

import { legacyCharacterToCanon } from "../lib/characters/canonical.ts";
import { compileContext } from "../lib/generation/compile-context.ts";

const character = legacyCharacterToCanon({
  id: "ragna",
  revision: "test-rs-v2-impersonation",
  name: "Ragna",
  role: "Protective mother",
  profile: "Ragna is protective, stubborn, and deeply invested in Pip's safety.",
  ageCategory: "adult",
  isMinor: false,
});

const base = {
  provider: "local",
  model: "mistral-nemo:12b",
  outputTokens: 800,
  contextMode: "balanced",
  matureContentRequested: false,
  character,
  relationship: "Trusted family ally",
  relationshipContextInstruction: "RELATIONSHIP-BEHAVIOR-INSTRUCTION-MARKER",
  relationshipNote: "Ragna trusts the player but remains protective of Pip.",
  relationshipDimensions: {
    trust: 42,
    protectiveness: 81,
    suspicion: -12,
  },
  relationshipMomentum: {
    trust: 3.5,
    protectiveness: 8,
  },
  relationshipAftereffects: [
    "AFTEREFFECT-MARKER: remain guarded before softening",
  ],
  scene: "Ranger station",
  weather: "Quiet evening",
  memories: ["The player recently apologized to Ragna."],
  sandbox: false,
  messages: [
    { sender: "character", text: "Just don't break her heart, kid." },
  ],
  playerName: "Skyler",
  preferences: {
    initiative: "balanced",
    viewpoint: "character",
    tense: "present",
    proseFormat: "roleplay",
  },
  lengthInstruction: "Write one complete player turn.",
};

test("roleplay keeps full RS V2 character-behavior state", () => {
  const result = compileContext({ ...base, kind: "roleplay" });

  assert.match(result.prompt, /RELATIONSHIP-BEHAVIOR-INSTRUCTION-MARKER/);
  assert.match(result.prompt, /<relationship-state-v2>/);
  assert.match(result.prompt, /trust=42/);
  assert.match(result.prompt, /protectiveness=81/);
  assert.match(result.prompt, /AFTEREFFECT-MARKER/);
});

test("impersonation keeps continuity facts but withholds RS V2 character-behavior pressure", () => {
  const result = compileContext({
    ...base,
    kind: "impersonation",
    playerDirection: "Tell Ragna I understand why she is protective.",
  });

  assert.match(result.prompt, /Relationship state: Trusted family ally/);
  assert.match(result.prompt, /Relationship note: Ragna trusts the player but remains protective of Pip/);
  assert.match(result.prompt, /Ranger station/);
  assert.match(result.prompt, /The player recently apologized to Ragna/);
  assert.match(result.prompt, /Tell Ragna I understand why she is protective/);
  assert.match(result.prompt, /Write only the player's words, actions, and narration from the player's side/);

  assert.doesNotMatch(result.prompt, /RELATIONSHIP-BEHAVIOR-INSTRUCTION-MARKER/);
  assert.doesNotMatch(result.prompt, /<relationship-state-v2>/);
  assert.doesNotMatch(result.prompt, /trust=42/);
  assert.doesNotMatch(result.prompt, /protectiveness=81/);
  assert.doesNotMatch(result.prompt, /AFTEREFFECT-MARKER/);
});
