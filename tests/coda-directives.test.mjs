import assert from "node:assert/strict";
import test from "node:test";

import {
  addCodaDirective,
  clearCodaDirectives,
  createCodaDirective,
  listCodaDirectives,
  parseCodaSlashCommand,
} from "../lib/coda/directives.ts";

const emptyLibrary = () => ({ memories: [], authorNotes: [], lorebooks: [] });

test("/coda defaults to a local scene directive", () => {
  assert.deepEqual(parseCodaSlashCommand("/coda Pip is unusually reserved tonight"), {
    kind: "directive",
    scope: "local",
    instruction: "Pip is unusually reserved tonight",
  });
});

test("/coda g creates persistent character guidance", () => {
  assert.deepEqual(parseCodaSlashCommand("/coda g Pip becomes quiet when embarrassed"), {
    kind: "directive",
    scope: "global",
    instruction: "Pip becomes quiet when embarrassed",
  });
});

test("local and global Coda directives map to existing author-note scopes", () => {
  const local = createCodaDirective({
    scope: "local",
    instruction: "Keep the storm tense.",
    sceneId: "scene-1",
    characterId: "pip",
    now: 100,
  });
  const global = createCodaDirective({
    scope: "global",
    instruction: "Pip hides fear behind sarcasm.",
    sceneId: "scene-1",
    characterId: "pip",
    now: 200,
  });

  let library = addCodaDirective(emptyLibrary(), local);
  library = addCodaDirective(library, global);

  const notes = listCodaDirectives(library, { sceneId: "scene-1", characterId: "pip" });
  assert.equal(notes.length, 2);
  assert.equal(notes[0].scope, "scene");
  assert.equal(notes[0].sceneId, "scene-1");
  assert.equal(notes[1].scope, "character");
  assert.equal(notes[1].characterId, "pip");

  library = clearCodaDirectives(library, "local", { sceneId: "scene-1", characterId: "pip" });
  assert.equal(library.authorNotes.length, 1);
  assert.equal(library.authorNotes[0].scope, "character");
});

test("Coda clear and show commands parse without entering chat history", () => {
  assert.deepEqual(parseCodaSlashCommand("/coda show"), { kind: "show" });
  assert.deepEqual(parseCodaSlashCommand("/coda clear l"), { kind: "clear", scope: "local" });
  assert.deepEqual(parseCodaSlashCommand("/coda clear g"), { kind: "clear", scope: "global" });
});
