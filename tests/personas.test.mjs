import assert from "node:assert/strict";
import test from "node:test";

import { createPersona } from "../lib/personas/schema.ts";
import { compilePlayerPersona } from "../lib/personas/compile.ts";
import {
  ensureUniquePersonaIds,
  parsePersonaImport,
  serializePersona,
  serializePersonaLibrary,
} from "../lib/personas/import-export.ts";

test("compilePlayerPersona skips empty sections", () => {
  const persona = createPersona({
    name: "Rook",
    description: "A quiet wanderer.",
  });
  const compiled = compilePlayerPersona(persona);
  assert.ok(compiled.includes("Name: Rook"));
  assert.ok(compiled.includes("Description: A quiet wanderer."));
  assert.ok(!compiled.includes("Pronouns"));
  assert.ok(!compiled.includes("Appearance"));
  assert.ok(!compiled.includes("Personality"));
  assert.ok(!compiled.includes("Background"));
});

test("compilePlayerPersona includes filled sections only", () => {
  const persona = createPersona({
    name: "Rook",
    pronouns: "they/them",
    personality: "Dry, loyal",
  });
  const compiled = compilePlayerPersona(persona);
  assert.ok(compiled.includes("Pronouns: they/them"));
  assert.ok(compiled.includes("Personality: Dry, loyal"));
  assert.ok(!compiled.includes("Appearance"));
  assert.ok(!compiled.includes("Background"));
});

test("serialize and re-import a single persona round-trips", () => {
  const persona = createPersona({
    name: "Mira",
    pronouns: "she/her",
    description: "Night city courier",
    background: "Grew up in the lower wards.",
  });
  const json = serializePersona(persona);
  const parsed = JSON.parse(json);
  assert.equal(parsed.format, "howling-whispers-persona");
  assert.equal(parsed.version, 1);

  const result = parsePersonaImport(json);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.personas.length, 1);
  assert.equal(result.personas[0].name, "Mira");
  assert.equal(result.personas[0].pronouns, "she/her");
  assert.equal(result.personas[0].background, "Grew up in the lower wards.");
});

test("library serialization round-trips", () => {
  const personas = [createPersona({ name: "A" }), createPersona({ name: "B" })];
  const json = serializePersonaLibrary(personas);
  const result = parsePersonaImport(json);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.personas.length, 2);
});

test("malformed imports are rejected with useful errors", () => {
  assert.equal(parsePersonaImport("not json").ok, false);
  assert.equal(parsePersonaImport("[]").ok, false);
  assert.equal(parsePersonaImport("{}").ok, false);
  assert.equal(parsePersonaImport(JSON.stringify({ format: "howling-whispers-persona", version: 1, persona: {} })).ok, false);
  assert.equal(parsePersonaImport(JSON.stringify({ format: "howling-whispers-persona-library", version: 1, personas: "nope" })).ok, false);
});

test("oversized imports are rejected", () => {
  const big = JSON.stringify({ format: "howling-whispers-persona", version: 1, persona: { name: "x", description: "a".repeat(200 * 1024) } });
  const result = parsePersonaImport(big);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /too large/i);
});

test("conflicting ids are regenerated on import", () => {
  const existing = createPersona({ name: "Original" });
  const imported = { ...existing };
  const unique = ensureUniquePersonaIds([imported], [existing]);
  assert.equal(unique.length, 1);
  assert.notEqual(unique[0].id, existing.id);
});

test("imported text is length-limited", () => {
  const result = parsePersonaImport(JSON.stringify({
    format: "howling-whispers-persona",
    version: 1,
    persona: { name: "x", description: "a".repeat(50000) },
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.personas[0].description.length <= 4000);
});
