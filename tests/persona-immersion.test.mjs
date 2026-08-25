import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPlayerIdentityAnchor,
  detectPersonaIdentityDrift,
} from "../lib/personas/identity.ts";

test("persona anchor makes the current story identity authoritative", () => {
  const anchor = buildPlayerIdentityAnchor("Skyler", true);
  assert.match(anchor, /player in this story is Skyler/i);
  assert.match(anchor, /authoritative/i);
  assert.match(anchor, /private history.*learned in-world/i);
  assert.match(anchor, /must never replace the current player identity/i);
});

test("drift guard catches direct use of the wrong persona", () => {
  assert.equal(
    detectPersonaIdentityDrift("You're Arrax, aren't you?", "Skyler", ["Arrax"]),
    "Arrax",
  );
  assert.equal(
    detectPersonaIdentityDrift('"Arrax, come over here."', "Skyler", ["Arrax"]),
    "Arrax",
  );
});

test("drift guard allows another persona to be mentioned as another person", () => {
  assert.equal(
    detectPersonaIdentityDrift("I saw Arrax near the old bridge yesterday.", "Skyler", ["Arrax"]),
    null,
  );
});

test("persona page exposes identity status and compiled prompt preview", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.join(here, "..", "components", "personas", "persona-library.tsx"),
    "utf8",
  );
  assert.match(source, /persona-command-deck/);
  assert.match(source, /Identity anchor active/);
  assert.match(source, /What the story engine receives/);
  assert.match(source, /compilePlayerPersona\(activePersona\)/);
});
