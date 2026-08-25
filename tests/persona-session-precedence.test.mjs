import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "app", "dreambound-app.tsx"), "utf8");

test("a selected persona overrides the session and global default", () => {
  assert.match(
    source,
    /const activePlayerName = activePersona\?\.name\.trim\(\) \|\| activeSession\?\.playerName\?\.trim\(\) \|\| playerProfile\.name\.trim\(\)/,
  );
  assert.match(
    source,
    /const effectivePlayerName = \(activePersona\?\.name\.trim\(\) \|\| activeSession\?\.playerName\?\.trim\(\) \|\| playerProfile\.name\)\.trim\(\)/,
  );
  assert.doesNotMatch(
    source,
    /const activePlayerName = activeSession\?\.playerName\?\.trim\(\) \|\| activePersona\?\.name\.trim\(\)/,
  );
});

test("the generated prompt receives the active persona snapshot as text", () => {
  assert.match(
    source,
    /const compiledPlayerPersona = \(activeSession\?\.playerPersona\?\.trim\(\) \|\| compiledActivePersona \|\| playerProfile\.persona\)\.trim\(\);/,
  );
  assert.match(
    source,
    /const effectivePlayerPersona = activePersona \?\? \(identityRetry/,
  );
});

test("relationship memory follows the persona chosen for the session", () => {
  assert.match(
    source,
    /effectivePersonaId\(\s*activePersona\?\.id \?\? null,\s*activeSession\?\.playerPersonaId \?\? null,/,
  );
});
