import assert from "node:assert/strict";
import test from "node:test";

import { legacyCharacterToCanon } from "../lib/characters/canonical.ts";
import { compileContext } from "../lib/generation/compile-context.ts";

const preferences = {
  initiative: "balanced",
  viewpoint: "character",
  tense: "present",
  proseFormat: "roleplay",
};

function character() {
  return legacyCharacterToCanon({
    id: "direction-priority-test",
    revision: "test-1",
    name: "Ragna",
    role: "Boundary Warden",
    profile: "Ragna is terse, practical, and observant.",
    ageCategory: "adult",
    isMinor: false,
  });
}

function compile(provider, direction) {
  return compileContext({
    kind: "impersonation",
    provider,
    model: provider === "novelai" ? "xialong-v1" : "mistral-nemo:12b",
    outputTokens: 850,
    contextMode: "balanced",
    matureContentRequested: false,
    character: character(),
    relationship: "Trusted acquaintance",
    scene: "Brackenjaw Ranger Station",
    weather: "Cold wind",
    memories: [],
    sandbox: true,
    messages: [
      { sender: "player", text: "I step into the station." },
      { sender: "character", text: "\"Pip is out back.\"" },
    ],
    playerName: "Arrax",
    preferences,
    lengthInstruction: "Write one concise player turn.",
    playerDirection: direction,
  });
}

test("NovelAI impersonation repeats the private direction at the generation edge", () => {
  const direction = "Walk over to Ragna and tell her I need to speak to Pip alone.";
  const { prompt } = compile("novelai", direction);

  const historyIndex = prompt.lastIndexOf("Ragna: \"Pip is out back.\"");
  const directionIndex = prompt.lastIndexOf(direction);
  const lateSystemIndex = prompt.lastIndexOf("<|system|>");
  const playerEdgeIndex = prompt.lastIndexOf("<|user|>\nArrax:");

  assert.ok(historyIndex >= 0);
  assert.ok(directionIndex > historyIndex, "direction must be repeated after conversation history");
  assert.ok(lateSystemIndex > historyIndex, "late system block must follow conversation history");
  assert.ok(directionIndex > lateSystemIndex, "direction must live inside the late system block");
  assert.ok(playerEdgeIndex > directionIndex, "direction must immediately precede the generated player turn");
  assert.match(prompt.slice(lateSystemIndex, playerEdgeIndex), /mandatory control input/);
  assert.match(prompt.slice(lateSystemIndex, playerEdgeIndex), /Do not substitute another action, topic, attitude, emotion, or line of dialogue/);
});

test("local impersonation repeats the private direction after history and before generation", () => {
  const direction = "Fold my arms and say exactly: I am not leaving without an answer.";
  const { prompt } = compile("local", direction);

  const historyIndex = prompt.lastIndexOf("Ragna: \"Pip is out back.\"");
  const directionIndex = prompt.lastIndexOf(direction);
  const generationIndex = prompt.lastIndexOf("The complete player turn begins now:");

  assert.ok(historyIndex >= 0);
  assert.ok(directionIndex > historyIndex, "direction must be repeated after conversation history");
  assert.ok(generationIndex > directionIndex, "late direction must sit directly before local generation");
  assert.match(prompt.slice(directionIndex, generationIndex), /preserve those words verbatim/);
});

test("blank impersonation direction does not add a late control block", () => {
  const { prompt } = compile("novelai", "");
  assert.doesNotMatch(prompt, /PRIVATE PLAYER DIRECTION FOR THE NEXT TURN/);
  assert.ok(prompt.endsWith("<|user|>\nArrax:"));
});
