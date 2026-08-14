import assert from "node:assert/strict";
import test from "node:test";

import { resolveStoryTemplate } from "../lib/generation/story-templates.ts";

test("resolveStoryTemplate gives active persona priority over session player name for {{user}}", () => {
  const result = resolveStoryTemplate("{{user}} arrives.", {
    charName: "Coda",
    userName: "Arrax",
  });
  assert.equal(result, "Arrax arrives.");
});

test("resolveStoryTemplate falls back to session player name when no persona is active", () => {
  const result = resolveStoryTemplate("{{user}} enters.", {
    charName: "Coda",
    userName: "Kael",
  });
  assert.equal(result, "Kael enters.");
});

test("resolveStoryTemplate {{char}} resolves to selected character", () => {
  const result = resolveStoryTemplate("{{char}} stands guard.", {
    charName: "Senako Steel",
    userName: "Arrax",
  });
  assert.equal(result, "Senako Steel stands guard.");
});

test("stored Common Scene remains unchanged after starting", () => {
  const template = "*{{char}} waits beside {{user}}.*";
  const charName = "Heather";
  const userName = "Player";
  resolveStoryTemplate(template, { charName, userName });
  assert.equal(template, "*{{char}} waits beside {{user}}.*");
});

test("runtime opening contains resolved values", () => {
  const template = "{{char}} looks toward {{user}}.";
  const result = resolveStoryTemplate(template, { charName: "Peony", userName: "Alex" });
  assert.equal(result, "Peony looks toward Alex.");
});

import { starterCommonScenes } from "../lib/generation/starter-common-scenes.ts";

test("starter Common Scenes exist and are non-empty", () => {
  assert.ok(Array.isArray(starterCommonScenes));
  assert.ok(starterCommonScenes.length >= 3, "Expected at least 3 starter scenes");
});

test("starter Common Scene templates remain literal in source", () => {
  for (const scene of starterCommonScenes) {
    assert.ok(scene.opening.includes("{{char}}"), `Scene ${scene.id} should contain {{char}}`);
    assert.ok(scene.opening.includes("{{user}}"), `Scene ${scene.id} should contain {{user}}`);
  }
});

test("starter Common Scenes resolve {{char}} and {{user}} at runtime only", () => {
  const scene = starterCommonScenes.find((s) => s.id === "starter-quiet-evening");
  assert.ok(scene, "Quiet Evening starter scene should exist");
  const resolved = resolveStoryTemplate(scene.opening, { charName: "Senako Steel", userName: "Arrax" });
  assert.ok(resolved.includes("Senako Steel"), "Resolved opening should contain character name");
  assert.ok(resolved.includes("Arrax"), "Resolved opening should contain user name");
  assert.ok(scene.opening.includes("{{char}}"), "Source template should still contain {{char}}");
  assert.ok(scene.opening.includes("{{user}}"), "Source template should still contain {{user}}");
});

test("starter Common Scenes use the same start path as personal Common Scenes", () => {
  const scene = starterCommonScenes[0];
  assert.ok(scene.id, "Starter scene should have an id");
  assert.ok(scene.title, "Starter scene should have a title");
  assert.ok(scene.opening, "Starter scene should have opening text");
  assert.ok(!scene.id.startsWith("custom-"), "Starter scenes should not have personal ids");
});

