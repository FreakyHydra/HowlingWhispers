import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "app", "dreambound-app.tsx"), "utf8");

test("a story session persona overrides the global default persona", () => {
  assert.match(
    source,
    /const activePlayerName = activeSession\?\.playerName\?\.trim\(\) \|\| activePersona\?\.name\.trim\(\)/,
  );
  assert.match(
    source,
    /const effectivePlayerName = \(activeSession\?\.playerName\?\.trim\(\) \|\| activePersona\?\.name\.trim\(\)/,
  );
  assert.doesNotMatch(
    source,
    /activePersona\?\.name\.trim\(\) \|\| activeSession\?\.playerName/,
  );
});

test("the generated prompt receives the session persona snapshot as text", () => {
  assert.match(
    source,
    /const compiledPlayerPersona = \(activeSession\?\.playerPersona\?\.trim\(\) \|\| compiledActivePersona \|\| playerProfile\.persona\)\.trim\(\);/,
  );
  assert.match(
    source,
    /const effectivePlayerPersona = identityRetry/,
  );
  assert.doesNotMatch(
    source,
    /const effectivePlayerPersona = activePersona \?\?/,
  );
});

test("relationship memory follows the persona chosen for the session", () => {
  assert.match(
    source,
    /effectivePersonaId\(\s*activeSession\?\.playerPersonaId \?\? null,\s*activePersona\?\.id \?\? null,/,
  );
});
