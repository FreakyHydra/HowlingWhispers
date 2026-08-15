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
import {
  validateHwCard,
  serializeHwCard,
  migrateHwCard,
} from "../lib/personas/hw-card.ts";

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

test("validateHwCard rejects missing name", () => {
  const result = validateHwCard(JSON.stringify({
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.error.includes("name"));
});

test("validateHwCard rejects wrong spec", () => {
  const result = validateHwCard(JSON.stringify({
    spec: "Not-HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "x",
  }));
  assert.equal(result.ok, false);
});

test("validateHwCard rejects wrong type", () => {
  const result = validateHwCard(JSON.stringify({
    spec: "HW-Card",
    spec_version: "1.0",
    type: "character",
    name: "x",
  }));
  assert.equal(result.ok, false);
});

test("validateHwCard accepts a valid card with identity fields", () => {
  const card = {
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "Arrax",
    identity: {
      gender: "Intersex",
      genderIdentity: "Boy-aligned",
      pronouns: "Context-dependent",
      presentation: "Mostly masculine / boyish",
      sex: "Intersex",
      notes: "Does not want to be boxed into a strict male/female role.",
    },
    personality: ["curious", "protective"],
    likes: ["stars", "old maps"],
  };
  const result = validateHwCard(JSON.stringify(card));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.card.name, "Arrax");
  assert.equal(result.card.identity?.gender, "Intersex");
  assert.equal(result.card.identity?.genderIdentity, "Boy-aligned");
  assert.deepEqual(result.card.likes, ["stars", "old maps"]);
});

test("HW-Card round-trips through import and compile", () => {
  const card = {
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "Arrax",
    identity: {
      gender: "Intersex",
      genderIdentity: "Boy-aligned",
      pronouns: "Context-dependent",
      presentation: "Mostly masculine",
      sex: "Intersex",
      notes: "Does not want to be boxed into a strict male/female role.",
    },
    personality: ["curious", "protective"],
    likes: ["stars"],
  };
  const json = serializeHwCard(card);
  const imported = parsePersonaImport(json);
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  assert.equal(imported.personas.length, 1);
  const persona = imported.personas[0];
  assert.equal(persona.name, "Arrax");
  assert.equal(persona.identity?.gender, "Intersex");
  assert.equal(persona.identity?.genderIdentity, "Boy-aligned");
  assert.equal(persona.identity?.pronouns, "Context-dependent");
  const compiled = compilePlayerPersona(persona);
  assert.ok(compiled.includes("Gender: Intersex"));
  assert.ok(compiled.includes("Gender identity: Boy-aligned"));
  assert.ok(compiled.includes("Pronouns: Context-dependent"));
  assert.ok(compiled.includes("Presentation: Mostly masculine"));
  assert.ok(compiled.includes("Sex: Intersex"));
  assert.ok(compiled.includes("Identity notes: Does not want to be boxed into a strict male/female role."));
});

test("HW-Card library round-trips", () => {
  const cards = [
    { spec: "HW-Card", spec_version: "1.0", type: "persona", name: "A" },
    { spec: "HW-Card", spec_version: "1.0", type: "persona", name: "B" },
  ];
  const json = JSON.stringify({
    spec: "HW-Card",
    spec_version: "1.0",
    type: "library",
    personas: cards,
  });
  const result = parsePersonaImport(json);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.personas.length, 2);
});

test("HW-Card preserves extensions through validation", () => {
  const card = {
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "Arrax",
    extensions: { futureField: "keep-me", nested: { a: 1 } },
  };
  const result = validateHwCard(JSON.stringify(card));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.card.extensions?.futureField, "keep-me");
  assert.deepEqual(result.card.extensions?.nested, { a: 1 });
});

test("oversized HW-Card imports are rejected", () => {
  const big = JSON.stringify({
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "x",
    description: "a".repeat(200 * 1024),
  });
  const result = parsePersonaImport(big);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /too large/i);
});

test("migrateHwCard is identity for v1.0", () => {
  const card = {
    spec: "HW-Card",
    spec_version: "1.0",
    type: "persona",
    name: "x",
    extensions: { keep: true },
  };
  const parsed = validateHwCard(JSON.stringify(card));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const migrated = migrateHwCard(parsed.card);
  assert.equal(migrated.spec_version, "1.0");
  assert.equal(migrated.extensions?.keep, true);
});
