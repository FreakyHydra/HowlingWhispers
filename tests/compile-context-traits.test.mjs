import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compileContext } from "../lib/generation/compile-context.ts";

const BASE_CHARACTER = {
  format: "howling-whispers-character",
  version: 1,
  id: "test-char",
  revision: "test-1",
  identity: { name: "Test Character", role: "Tester", pronouns: "they/them", species: "Human" },
  sections: [{ id: "profile", title: "Profile", content: "A test character.", priority: "mandatory", rating: "general", triggers: [], sourceRefs: [] }],
  safety: { ageCategory: "adult", isMinor: false, allowedRelationshipTypes: [], disallowedContent: [] },
  rawSources: [],
};

const BASE_INPUT = {
  kind: "roleplay",
  provider: "local",
  model: "local-model",
  outputTokens: 512,
  contextMode: "balanced",
  matureContentRequested: false,
  character: BASE_CHARACTER,
  relationship: "",
  scene: "A place",
  weather: "Clear",
  memories: [],
  sandbox: false,
  messages: [],
  playerName: "Player",
  preferences: { initiative: "balanced", viewpoint: "user", tense: "present", proseFormat: "roleplay" },
  lengthInstruction: "",
};

describe("compile-context traits", () => {
  test("omits trait block when no traits assigned", () => {
    const result = compileContext(BASE_INPUT);
    assert.ok(!result.prompt.includes("CHARACTER PERSONALITY TRAITS"));
  });

  test("injects trait block after static parts and before canon", () => {
    const character = {
      ...BASE_CHARACTER,
      traits: {
        primary: ["brave", "loyal"],
        secondary: ["curious"],
        situational: [],
        custom: [{ id: "c1", name: "Night Owl", description: "Active after dark." }],
      },
    };
    const result = compileContext({ ...BASE_INPUT, character });
    const prompt = result.prompt;
    const traitIndex = prompt.indexOf("CHARACTER PERSONALITY TRAITS");
    const canonIndex = prompt.indexOf("<authoritative-character-canon>");
    assert.ok(traitIndex > -1);
    assert.ok(canonIndex > -1);
    assert.ok(traitIndex < canonIndex);
    assert.ok(prompt.includes("Core traits:"));
    assert.ok(prompt.includes("Brave — Faces danger, fear, or uncertainty with resolve."));
    assert.ok(prompt.includes("Loyal — Sticks by people and promises once trust is earned."));
    assert.ok(prompt.includes("Secondary traits:"));
    assert.ok(prompt.includes("Curious — Seeks new information, places, and experiences."));
    assert.ok(prompt.includes("Custom traits:"));
    assert.ok(prompt.includes("Night Owl — Active after dark."));
  });

  test("falls back to id string when trait definition is missing", () => {
    const character = {
      ...BASE_CHARACTER,
      traits: { primary: ["nonexistent-trait"], secondary: [], situational: [], custom: [] },
    };
    const result = compileContext({ ...BASE_INPUT, character });
    assert.ok(result.prompt.includes("nonexistent-trait"));
  });
});
