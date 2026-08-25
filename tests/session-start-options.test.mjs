import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(
  new URL("../app/dreambound-app.tsx", import.meta.url),
  "utf8",
);

test("character session options use the overrides argument", () => {
  const characterCalls = app.match(
    /buildSessionInitialState\(character, scene, null, \{/g,
  ) ?? [];

  assert.equal(characterCalls.length, 4);
  assert.match(
    app,
    /buildSessionInitialState\(target, scene, null, \{[\s\S]*?sandbox: true,[\s\S]*?persona: resolvedPersona/,
  );
  assert.doesNotMatch(
    app,
    /buildSessionInitialState\((?:character|target), scene, \{/,
  );
});

test("open sandbox stores both its canonical scene and sandbox flag", () => {
  assert.match(
    app,
    /const scene = sandboxSceneFor\(character\);[\s\S]*?buildSessionInitialState\(character, scene, null, \{[\s\S]*?sandbox: true,[\s\S]*?persona,/,
  );
});
