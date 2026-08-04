import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  CANONICAL_CHARACTER_FORMAT,
  CANONICAL_CHARACTER_VERSION,
  legacyCharacterToCanon,
  parseCanonicalCharacter,
} from "../lib/characters/canonical.ts";
import { compileContext } from "../lib/generation/compile-context.ts";
import { resolveLatestBuiltinCanon } from "../lib/characters/builtins.ts";
import {
  PEONY,
  PEONY_DB_PERSONA_SHA256,
  PEONY_EDITORIAL_BIBLE_SHA256,
} from "../lib/characters/builtins/peony.ts";
import { resolveBuiltinWorldLore } from "../lib/worlds/builtins.ts";
import { CODA_WORLD_LORE } from "../lib/worlds/builtins/coda.ts";
import { HEATHER_WORLD_LORE } from "../lib/worlds/builtins/heather.ts";
import { PEONY_WORLD_LORE } from "../lib/worlds/builtins/peony.ts";
import { SENAKO_WORLD_LORE } from "../lib/worlds/builtins/senako.ts";
import { legacyCharacterToWorldLore, parseWorldLorebook, WORLD_LORE_VERSION } from "../lib/worlds/schema.ts";

const preferences = {
  initiative: "balanced",
  viewpoint: "character",
  tense: "present",
  proseFormat: "roleplay",
};

function adultCharacter() {
  const character = legacyCharacterToCanon({
    id: "peony",
    revision: "test-1",
    name: "Peony",
    role: "Wholesome succubus seeking purpose",
    profile: "Peony is observant, autonomous, and careful with trust.",
    ageCategory: "adult",
    isMinor: false,
    allowedRelationshipTypes: ["friendship", "consenting adult romance"],
  });
  character.sections.push({
    id: "private-adult-canon",
    title: "Private adult canon",
    content: "GATED-CANON-MARKER",
    priority: "high",
    rating: "mature",
    triggers: [],
    sourceRefs: ["legacy-persona:42"],
  });
  return character;
}

function compile(character, overrides = {}) {
  return compileContext({
    kind: "roleplay",
    provider: "local",
    model: "mistral-nemo:12b",
    outputTokens: 1300,
    contextMode: "balanced",
    matureContentRequested: false,
    character,
    relationship: "Trusted friend; Bond 62/100",
    scene: "A quiet greenhouse",
    weather: "Rain against the glass",
    memories: ["The player helped repair a book."],
    sandbox: false,
    messages: [{ sender: "player", text: "How are you feeling today?" }],
    playerName: "Player",
    preferences,
    lengthInstruction: "Write a substantial response.",
    ...overrides,
  });
}

test("canonical v1 parser accepts valid documents and rejects future versions", () => {
  const value = adultCharacter();
  assert.equal(value.format, CANONICAL_CHARACTER_FORMAT);
  assert.equal(value.version, CANONICAL_CHARACTER_VERSION);
  assert.equal(parseCanonicalCharacter(value)?.revision, "test-1");
  assert.equal(parseCanonicalCharacter({ ...value, version: 2 }), null);
});

test("world lore parser accepts Coda canon and rejects future versions", () => {
  assert.equal(parseWorldLorebook(CODA_WORLD_LORE)?.entries.length, 20);
  assert.equal(parseWorldLorebook({ ...CODA_WORLD_LORE, version: WORLD_LORE_VERSION + 1 }), null);
  assert.equal(resolveBuiltinWorldLore("coda"), CODA_WORLD_LORE);
  assert.equal(resolveBuiltinWorldLore("unknown"), null);
});

test("every curated character resolves an authoritative world lorebook", () => {
  const lorebooks = [CODA_WORLD_LORE, HEATHER_WORLD_LORE, PEONY_WORLD_LORE, SENAKO_WORLD_LORE];
  for (const lorebook of lorebooks) {
    assert.equal(resolveBuiltinWorldLore(lorebook.worldId), lorebook);
    assert.equal(parseWorldLorebook(lorebook)?.revision, "0.1.0");
    const character = legacyCharacterToCanon({
      id: lorebook.worldId,
      name: lorebook.worldId,
      role: "Curated character",
      profile: "Preserve the curated character canon.",
    });
    const result = compile(character, { worldLore: lorebook });
    assert.ok(result.manifest.includedLore.some(({ reason }) => reason === "constant"));
  }
});

test("custom characters receive a conservative world-context fallback", () => {
  const lorebook = legacyCharacterToWorldLore({
    worldId: "custom-alchemist",
    revision: "runtime-0.2.0",
    scene: "The rented attic laboratory",
    weather: "Rain rattles the roof tiles",
  });
  assert.equal(parseWorldLorebook(lorebook)?.worldId, "custom-alchemist");
  const result = compile(adultCharacter(), { worldLore: lorebook, scene: "The rented attic laboratory" });
  assert.ok(result.manifest.includedLore.some(({ id }) => id === "legacy-world-boundary"));
  assert.ok(result.manifest.includedLore.some(({ id }) => id === "legacy-current-scene"));
  assert.match(result.prompt, /Do not invent broad geography/);
});

test("mature canon requires both an explicit request and confirmed adult status", () => {
  const adult = adultCharacter();
  const gated = compile(adult);
  assert.doesNotMatch(gated.prompt, /GATED-CANON-MARKER/);
  assert.deepEqual(gated.manifest.omittedSections, [{ id: "private-adult-canon", reason: "mature-gated" }]);

  const enabled = compile(adult, { matureContentRequested: true });
  assert.match(enabled.prompt, /GATED-CANON-MARKER/);
  assert.equal(enabled.manifest.matureCanonEnabled, true);

  const minor = adultCharacter();
  minor.safety = { ...minor.safety, ageCategory: "minor", isMinor: true };
  const blocked = compile(minor, { matureContentRequested: true });
  assert.doesNotMatch(blocked.prompt, /GATED-CANON-MARKER/);
  assert.match(blocked.prompt, /This character is a minor/);
});

test("compiler is deterministic and makes relationship state prompt-active", () => {
  const first = compile(adultCharacter());
  const second = compile(adultCharacter());
  assert.deepEqual(first, second);
  assert.match(first.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.deepEqual(first.manifest.includedSections, ["legacy-profile"]);
});

test("player-role presets establish external context without taking player agency", () => {
  const result = compile(adultCharacter(), {
    playerRole: "The player is a runesmith's apprentice who recognizes incomplete symbols.",
  });
  assert.match(result.prompt, /Player role: The player is a runesmith's apprentice/);
  assert.match(result.prompt, /Never infer the player's personality, thoughts, feelings, attraction, consent, dialogue, or decisions/);
});

test("player turns use the configured name or a neutral You label", () => {
  const named = compile(adultCharacter(), { playerName: "Kael" });
  assert.match(named.prompt, /Kael: How are you feeling today\?/);

  const anonymous = compile(adultCharacter(), { playerName: "" });
  assert.match(anonymous.prompt, /You: How are you feeling today\?/);
  assert.doesNotMatch(anonymous.prompt, /Dreamer/);
  assert.match(anonymous.prompt, /Never assign or assume the player a name/);
});

test("a configured player persona is rendered as authoritative player context", () => {
  const result = compile(adultCharacter(), {
    playerName: "Kael",
    playerPersona: "Kael is a quiet wanderer with a silver pendant.",
  });
  assert.match(result.prompt, /<player-persona>/);
  assert.match(result.prompt, /Kael is a quiet wanderer with a silver pendant/);

  const empty = compile(adultCharacter(), { playerPersona: "" });
  assert.doesNotMatch(empty.prompt, /<player-persona>/);
});

test("impersonation receives authoritative character safety", () => {
  const minor = legacyCharacterToCanon({
    id: "senako-steel",
    name: "Senako Steel",
    role: "Guarded friend",
    profile: "Senako is twelve years old.",
    ageCategory: "minor",
    isMinor: true,
    disallowedContent: ["romance", "sexual content"],
  });
  const result = compile(minor, { kind: "impersonation", playerDirection: "Suggest a kind response." });
  assert.match(result.prompt, /This character is a minor/);
  assert.match(result.prompt, /Disallowed content: romance; sexual content/);
  assert.match(result.prompt, /Suggest a kind response/);
  assert.match(result.prompt, /<player-direction>/);
  assert.match(result.prompt, /exactly one plausible next player turn/);
  assert.match(result.prompt, /Never write the character's turn/);
  assert.match(result.prompt, /PLAYER VOICE RULE/);
  assert.match(result.prompt, /first-person point of view/);
  assert.match(result.prompt, /out-of-character road sign/);
  assert.match(result.prompt, /The player is Player/);
});

test("autopilot compiles the autonomy law without handover cues", () => {
  const result = compile(adultCharacter(), { kind: "autopilot", messages: [] });
  assert.equal(result.manifest.compilerVersion, 3);
  assert.equal(result.manifest.kind, "autopilot");
  assert.match(result.prompt, /AUTOPILOT LAW/);
  assert.match(result.prompt, /living on their own/);
  assert.match(result.prompt, /never wait for the player/);
  assert.doesNotMatch(result.prompt, /End naturally where the player's response matters/);
  assert.match(result.prompt, /No conversation yet\./);
  assert.match(result.prompt, /Continue living as Peony/);
});

test("local budget preserves mandatory canon and newest history", () => {
  const character = adultCharacter();
  character.sections = character.sections.filter((section) => section.rating === "general");
  const messages = Array.from({ length: 30 }, (_, index) => ({
    sender: index % 2 ? "character" : "player",
    text: `turn-${index} ${"context ".repeat(450)}`,
  }));
  const result = compile(character, { messages, contextMode: "character" });
  assert.match(result.prompt, /Peony is observant/);
  assert.match(result.prompt, /turn-29/);
  assert.ok(result.manifest.omittedMessages > 0);
  assert.ok(result.manifest.estimatedInputTokens <= result.manifest.inputBudget);
});

test("Coda world lore activates deterministically within its own budget", () => {
  const character = legacyCharacterToCanon({
    id: "coda",
    name: "Coda",
    role: "Beloved companion",
    profile: "Coda is a fully canine female ancient husky-type dog.",
  });
  const result = compile(character, {
    worldLore: CODA_WORLD_LORE,
    scene: "The Bell Beneath the Boiler",
    sceneId: "bell-beneath-boiler",
    weather: "Heavy rain at the First Pumping House",
  });
  assert.equal(result.manifest.compilerVersion, 3);
  assert.equal(result.manifest.worldRevision, CODA_WORLD_LORE.revision);
  assert.ok(result.manifest.includedLore.some(({ id }) => id === "setting-foundation"));
  assert.ok(result.manifest.includedLore.some(({ id }) => id === "scenario-bell-beneath-boiler"));
  assert.ok(result.manifest.omittedLore.some(({ id, reason }) => id === "location-riverside-gardens" && reason === "inactive"));
  assert.match(result.prompt, /<relevant-world-lore>/);
  assert.ok(result.manifest.estimatedInputTokens <= result.manifest.inputBudget);
});

test("sandbox excludes world lore even when a lorebook is supplied", () => {
  const result = compile(adultCharacter(), {
    worldLore: CODA_WORLD_LORE,
    sandbox: true,
    scene: "",
    sceneId: "",
  });
  assert.equal(result.manifest.worldRevision, null);
  assert.deepEqual(result.manifest.includedLore, []);
  assert.doesNotMatch(result.prompt, /<relevant-world-lore>/);
});

test("latest Peony canon preserves its authoritative source and provenance", () => {
  assert.equal(resolveLatestBuiltinCanon("peony"), PEONY);
  assert.equal(PEONY.revision, "1.0.0");
  assert.equal(PEONY_EDITORIAL_BIBLE_SHA256, "712f3ee19ee81d42ff5706f54bae5b280c0052cc127330dadc602030ca199d98");
  assert.equal(PEONY.rawSources.length, 1);
  assert.equal(
    createHash("sha256").update(PEONY.rawSources[0].text).digest("hex"),
    PEONY_DB_PERSONA_SHA256,
  );
  assert.ok(PEONY.sections.every((section) => section.sourceRefs.length > 0));
});

test("Peony private adult canon remains gated in compiled context", () => {
  const gated = compile(PEONY, { matureContentRequested: false });
  assert.doesNotMatch(gated.prompt, /Private adult intimacy/);
  assert.ok(gated.manifest.omittedSections.some(({ id, reason }) => id === "adult-intimacy" && reason === "mature-gated"));

  const enabled = compile(PEONY, { matureContentRequested: true });
  assert.match(enabled.prompt, /Private adult intimacy/);
  assert.equal(enabled.manifest.matureCanonEnabled, true);
});
