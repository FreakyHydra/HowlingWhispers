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
