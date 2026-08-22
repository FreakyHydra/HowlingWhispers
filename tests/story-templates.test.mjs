import assert from "node:assert/strict";
import test from "node:test";
import { resolveStoryTemplate } from "../lib/generation/story-templates.ts";

test("resolveStoryTemplate replaces {{char}} with the character name", () => {
  const result = resolveStoryTemplate("*{{char}} sits in the waiting room.*", {
    charName: "Senako Steel",
    userName: "Arrax",
  });
  assert.equal(result, "*Senako Steel sits in the waiting room.*");
});

test("resolveStoryTemplate replaces {{user}} with the active persona name", () => {
  const result = resolveStoryTemplate("{{char}} looks toward {{user}}.", {
    charName: "Senako Steel",
    userName: "Arrax",
  });
  assert.equal(result, "Senako Steel looks toward Arrax.");
});

test("resolveStoryTemplate falls back to normal player name when no persona is active", () => {
  const result = resolveStoryTemplate("{{user}} enters the room.", {
    charName: "Coda",
    userName: "Kael",
  });
  assert.equal(result, "Kael enters the room.");
});

test("resolveStoryTemplate handles multiple occurrences", () => {
  const result = resolveStoryTemplate("{{char}} and {{user}} and {{char}} again.", {
    charName: "Heather",
    userName: "Player",
  });
  assert.equal(result, "Heather and Player and Heather again.");
});

test("resolveStoryTemplate leaves ordinary text unchanged", () => {
  const result = resolveStoryTemplate("The rain falls softly on the roof.", {
    charName: "Coda",
    userName: "Kael",
  });
  assert.equal(result, "The rain falls softly on the roof.");
});

test("resolveStoryTemplate does not mutate the source template", () => {
  const source = "{{char}} waits beside {{user}}.";
  resolveStoryTemplate(source, { charName: "Senako", userName: "Arrax" });
  assert.equal(source, "{{char}} waits beside {{user}}.");
});

test("resolveStoryTemplate leaves unknown placeholders untouched", () => {
  const result = resolveStoryTemplate("{{char}} meets {{unknown}} at {{user}}'s door.", {
    charName: "Coda",
    userName: "Kael",
  });
  assert.equal(result, "Coda meets {{unknown}} at Kael's door.");
});
