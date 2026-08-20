import assert from "node:assert/strict";
import test from "node:test";
import { compileContext } from "../lib/generation/compile-context.ts";

function baseInput(overrides = {}) {
  return {
    kind: "roleplay",
    provider: "novelai",
    model: "xialong-v1",
    outputTokens: 200,
    contextMode: "balanced",
    matureContentRequested: false,
    character: {
      id: "test-character",
      identity: { name: "Test", role: "A character", pronouns: "she/her" },
      safety: { ageCategory: "adult", isMinor: false, allowedRelationshipTypes: [], disallowedContent: [] },
      sections: [],
    },
    relationship: "Stranger",
    scene: "A test scene",
    weather: "Clear",
    memories: [],
    sandbox: false,
    messages: [],
    playerName: "Player",
    preferences: { initiative: "balanced", viewpoint: "user", tense: "present", proseFormat: "roleplay" },
    lengthInstruction: "Write a short reply.",
    ...overrides,
  };
}

test("compileContext accepts optional contextInput", () => {
  const memories = [
    { id: "m1", text: "They met before.", enabled: true, source: "manual", createdAt: 1, updatedAt: 1 },
  ];
  const notes = [
    { id: "n1", text: "Keep it tense.", enabled: true, createdAt: 1, updatedAt: 1 },
  ];
  const lorebooks = [
    {
      id: "lb1",
      name: "World lore",
      enabled: true,
      raw: { lorebookVersion: 3, entries: [{ text: "Magic is rare.", keys: ["magic"], enabled: true, forceActivation: true }] },
      parsed: {
        lorebookVersion: 3,
        entries: [{ text: "Magic is rare.", keys: ["magic"], enabled: true, forceActivation: true, displayName: "Magic" }],
      },
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const contextInput = { memories, authorNotes: notes, lorebooks };
  const result = compileContext({ ...baseInput(), contextInput });
  assert.ok(result.prompt.includes("They met before."));
  assert.ok(result.prompt.includes("Keep it tense."));
  assert.ok(result.prompt.includes("Magic is rare."));
  assert.equal(result.manifest.includedMemories, 1);
  assert.equal(result.manifest.includedAuthorNotes, 1);
  assert.equal(result.manifest.includedHWLore.length, 1);
  assert.equal(result.manifest.includedHWLore[0].title, "Magic");
});

test("compileContext omits disabled context entries", () => {
  const memories = [
    { id: "m1", text: "Enabled fact.", enabled: true, source: "manual", createdAt: 1, updatedAt: 1 },
    { id: "m2", text: "Disabled fact.", enabled: false, source: "manual", createdAt: 1, updatedAt: 1 },
  ];
  const result = compileContext({ ...baseInput(), contextInput: { memories, authorNotes: [], lorebooks: [] } });
  assert.ok(result.prompt.includes("Enabled fact."));
  assert.ok(!result.prompt.includes("Disabled fact."));
  assert.equal(result.manifest.includedMemories, 1);
});

test("compileContext works without contextInput (backward compat)", () => {
  const result = compileContext(baseInput());
  assert.ok(result);
  assert.equal(result.manifest.includedMemories, 0);
  assert.equal(result.manifest.includedAuthorNotes, 0);
  assert.deepEqual(result.manifest.includedHWLore, []);
  assert.deepEqual(result.manifest.omittedHWLore, []);
});

test("compileContext filters author notes by scope", () => {
  const notes = [
    { id: "n-global", text: "Global note.", enabled: true, scope: "global", createdAt: 1, updatedAt: 1 },
    { id: "n-char-match", text: "Char match.", enabled: true, scope: "character", characterId: "coda", createdAt: 1, updatedAt: 1 },
    { id: "n-char-miss", text: "Char miss.", enabled: true, scope: "character", characterId: "heather", createdAt: 1, updatedAt: 1 },
    { id: "n-scene-match", text: "Scene match.", enabled: true, scope: "scene", sceneId: "scene-1", createdAt: 1, updatedAt: 1 },
    { id: "n-scene-miss", text: "Scene miss.", enabled: true, scope: "scene", sceneId: "scene-2", createdAt: 1, updatedAt: 1 },
    { id: "n-disabled", text: "Disabled.", enabled: false, scope: "global", createdAt: 1, updatedAt: 1 },
  ];
  const result = compileContext({
    ...baseInput(),
    character: { ...baseInput().character, id: "coda" },
    sceneId: "scene-1",
    contextInput: { memories: [], authorNotes: notes, lorebooks: [] },
  });
  assert.ok(result.prompt.includes("Global note."));
  assert.ok(result.prompt.includes("Char match."));
  assert.ok(!result.prompt.includes("Char miss."));
  assert.ok(result.prompt.includes("Scene match."));
  assert.ok(!result.prompt.includes("Scene miss."));
  assert.ok(!result.prompt.includes("Disabled."));
  assert.equal(result.manifest.includedAuthorNotes, 3);
});

test("compileContext treats legacy notes without scope as global", () => {
  const notes = [
    { id: "n-legacy", text: "Legacy note.", enabled: true, createdAt: 1, updatedAt: 1 },
  ];
  const result = compileContext({
    ...baseInput(),
    character: { ...baseInput().character, id: "coda" },
    contextInput: { memories: [], authorNotes: notes, lorebooks: [] },
  });
  assert.ok(result.prompt.includes("Legacy note."));
  assert.equal(result.manifest.includedAuthorNotes, 1);
});
