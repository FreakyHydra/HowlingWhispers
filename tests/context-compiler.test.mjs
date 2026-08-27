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
import { RILEY } from "../lib/characters/builtins/riley.ts";
import { resolveBuiltinWorldLore } from "../lib/worlds/builtins.ts";
import { CODA_WORLD_LORE } from "../lib/worlds/builtins/coda.ts";
import { HEATHER_WORLD_LORE } from "../lib/worlds/builtins/heather.ts";
import { PEONY_WORLD_LORE } from "../lib/worlds/builtins/peony.ts";
import { RILEY_WORLD_LORE } from "../lib/worlds/builtins/riley.ts";
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
  const lorebooks = [CODA_WORLD_LORE, HEATHER_WORLD_LORE, PEONY_WORLD_LORE, RILEY_WORLD_LORE, SENAKO_WORLD_LORE];
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
  assert.doesNotMatch(result.prompt, /out-of-character road sign/);
  assert.match(result.prompt, /The player is Player/);
});

test("impersonation prompt drives the private direction as mandatory control input", () => {
  const result = compile(adultCharacter(), {
    kind: "impersonation",
    playerName: "Kael",
    playerDirection: "Get angry and say exactly: Trust me and let it happen.",
    messages: [{ sender: "character", text: "The rain will pass." }],
  });
  assert.match(result.prompt, /PRIVATE DIRECTION PRIORITY/);
  assert.match(result.prompt, /private player direction is mandatory control input/);
  assert.match(result.prompt, /Do not soften, omit, replace, moralize, reinterpret, or summarize/);
  assert.match(result.prompt, /temporary emotion, tone, or attitude.*not a permanent personality change/);
  assert.match(result.prompt, /preserve them verbatim except for capitalization, punctuation, and required roleplay formatting/);
  assert.match(result.prompt, /do not pad the turn or invent additional decisions/);
  assert.match(result.prompt, /depth of the selected length mode/);
  assert.match(result.prompt, /Get angry and say exactly: Trust me and let it happen\./);
  assert.doesNotMatch(result.prompt, /out-of-character road sign/);
  assert.doesNotMatch(result.prompt, /same depth, pacing, sensory detail, and length/);
  assert.doesNotMatch(result.prompt, /Never compress the turn to a single line/);
  assert.doesNotMatch(result.prompt, /normal character reply/);
  assert.match(result.prompt, /The player is Kael/);
});

test("impersonation compiles a blank conversation: no prior messages required", () => {
  const result = compile(adultCharacter(), {
    kind: "impersonation",
    playerName: "Kael",
    playerDirection: "",
    messages: [],
  });
  assert.equal(result.manifest.kind, "impersonation");
  assert.equal(result.manifest.omittedMessages, 0);
  assert.match(result.prompt, /No conversation yet/);
  assert.match(result.prompt, /The complete player turn begins now:/);
  assert.match(result.prompt, /The player is Kael/);
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

test("Riley canon preserves her adult source behind the mature-content gate", () => {
  assert.equal(resolveLatestBuiltinCanon("riley"), RILEY);
  assert.equal(RILEY.safety.ageCategory, "adult");
  assert.equal(RILEY.safety.isMinor, false);
  assert.equal(RILEY.sections.some((section) => section.rating === "general"), true);
  assert.equal(RILEY.sections.some((section) => section.rating === "mature"), true);

  const ordinary = compile(RILEY);
  const mature = compile(RILEY, { matureContentRequested: true });
  assert.ok(ordinary.manifest.omittedSections.some(({ id, reason }) =>
    id === "adult-private-source" && reason === "mature-gated",
  ));
  assert.ok(mature.manifest.includedSections.includes("adult-private-source"));
});

test("Riley curated scenes activate only their matching scenario lore", () => {
  const sceneIds = ["player-two", "unbeaten-score", "last-cookie-standing"];
  for (const sceneId of sceneIds) {
    const result = compile(RILEY, {
      worldLore: RILEY_WORLD_LORE,
      scene: sceneId,
      sceneId,
    });
    assert.ok(result.manifest.includedLore.some(({ id, reason }) =>
      id === `scenario-${sceneId}` && reason === "scene",
    ));
    for (const otherSceneId of sceneIds.filter((id) => id !== sceneId)) {
      assert.equal(result.manifest.includedLore.some(({ id }) => id === `scenario-${otherSceneId}`), false);
    }
  }
});

test("Peony private adult canon remains gated in compiled context", () => {
  const gated = compile(PEONY, { matureContentRequested: false });
  assert.doesNotMatch(gated.prompt, /Private adult intimacy/);
  assert.ok(gated.manifest.omittedSections.some(({ id, reason }) => id === "adult-intimacy" && reason === "mature-gated"));

  const enabled = compile(PEONY, { matureContentRequested: true });
  assert.match(enabled.prompt, /Private adult intimacy/);
  assert.equal(enabled.manifest.matureCanonEnabled, true);
});

test("NovelAI roleplay serializes conversation with ChatML markers", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "xialong-v1",
    messages: [
      { sender: "character", text: "The rain is loud tonight." },
      { sender: "player", text: "How are you feeling today?" },
    ],
  });
  assert.match(result.prompt, /^<\|system\|>\n/);
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\n/);
  assert.match(result.prompt, /<\|user\|>\nPlayer: How are you feeling today\?\n\/nothink\n/);
  assert.match(result.prompt, /Peony: The rain is loud tonight\./);
  assert.doesNotMatch(result.prompt, /Conversation history:/);
  assert.doesNotMatch(result.prompt, /Continue directly as/);
  assert.ok(result.prompt.trimEnd().endsWith("Peony:"));
});

test("reroll compilation asks for a fresh alternative and keeps canon, safety, and length", () => {
  const result = compile(adultCharacter(), {
    kind: "roleplay",
    reroll: true,
    lengthInstruction: "Write a substantial response.",
    messages: [
      { sender: "character", text: "The storm drove the lanterns out." },
      { sender: "player", text: "Then we walk in the dark." },
    ],
  });
  assert.match(result.prompt, /This turn is a reroll: generate a fresh alternative response/);
  assert.match(result.prompt, /meaningfully different combination of wording, dialogue, action, emotional emphasis, pacing, or approach/);
  assert.match(result.prompt, /Do not paraphrase or lightly rewrite the previous response\./);
  assert.match(result.prompt, /Preserve established facts, character identity, safety boundaries, relationship state, and scene continuity\./);
  assert.match(result.prompt, /Write a substantial response\./);
  assert.match(result.prompt, /Safety policy: This character is confirmed to be an adult/);
  assert.match(result.prompt, /Peony is observant/);
});

test("reroll prompt does not contain the replaced response when it is excluded from history", () => {
  const result = compile(adultCharacter(), {
    kind: "roleplay",
    reroll: true,
    messages: [
      { sender: "character", text: "The storm arrived." },
      { sender: "player", text: "Then we hold together." },
    ],
  });
  assert.doesNotMatch(result.prompt, /The old storm reply that must never replay/);
  assert.match(result.prompt, /Then we hold together\./);
});

test("NovelAI impersonation targets the player user turn", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "glm-4-6",
    kind: "impersonation",
    playerName: "Kael",
    playerDirection: "Suggest a hopeful line.",
    messages: [{ sender: "character", text: "The rain will pass." }],
  });
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\n/);
  assert.match(result.prompt, /<\|user\|>\nKael:$/);
  assert.doesNotMatch(result.prompt, /Continue directly as/);
});

test("NovelAI narrator turns fold into the assistant role", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "xialong-v1",
    messages: [{ sender: "narrator", text: "The lantern flickers." }],
  });
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\nNarration: The lantern flickers\./);
});

test("NovelAI autopilot with no history still opens the assistant turn", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "xialong-v1",
    kind: "autopilot",
    messages: [],
  });
  assert.doesNotMatch(result.prompt, /No conversation yet\./);
  assert.ok(result.prompt.trimEnd().endsWith("Peony:"));
  assert.match(result.prompt, /AUTOPILOT LAW/);
});

test("a living cast renders a compact ACTIVE CAST and PENDING INTERACTION block", () => {
  const result = compile(adultCharacter(), {
    provider: "local",
    cast: [
      { id: "peony", name: "Peony", origin: "permanent", presence: "active", primary: true, addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: ["the player arrived with Melody"], relationships: [] },
    ],
    messages: [
      { sender: "character", text: "Melody, what do you think of the greenhouse?" },
      { sender: "player", text: "*I wait.*" },
    ],
  });
  assert.match(result.prompt, /<living-cast>\n\[ACTIVE CAST\]/);
  assert.match(result.prompt, /- Peony — Permanent — Active — Primary/);
  assert.match(result.prompt, /- Melody — Temporary — Active — the player arrived with Melody/);
  assert.match(result.prompt, /\[PENDING INTERACTION\]\nPeony asked Melody a question\. Melody has not responded\./);
  assert.match(result.prompt, /Continue directly as Peony:$/);
});

test("a cast speaker writes the turn as that member and labels prior side messages", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "glm-4-6",
    cast: [
      { id: "peony", name: "Peony", origin: "permanent", presence: "active", primary: true, addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: ["short answers"], relationships: [] },
    ],
    speaker: "Melody",
    messages: [
      { sender: "character", text: "*Melody shrugs.* Maybe the rain is enough.", speaker: "Melody" },
      { sender: "character", text: "Melody, what do you think?" },
      { sender: "player", text: "*I wait.*" },
    ],
  });
  assert.match(result.prompt, /This turn you speak as Melody/);
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\nMelody: \*Melody shrugs\.\*/);
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\nPeony: Melody, what do you think\?/);
  assert.match(result.prompt, /<\|assistant\|>\n<think><\/think>\nMelody:$/);
  assert.doesNotMatch(result.prompt, /\[PENDING INTERACTION\].*\nMelody has not responded\./);
});

test("an autonomous cast renders NPC subtext and observable residue near the living cast block", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "glm-4-6",
    cast: [
      { id: "peony", name: "Peony", origin: "permanent", presence: "active", primary: true, addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    ],
    autonomy: [{
      id: "rc:melody",
      name: "Melody",
      drive: {
        goal: "leave the greenhouse before nightfall",
        intent: "find an excuse to step outside",
        wants: ["the ledger"],
        fears: ["being followed"],
        concerns: ["an unspoken warning"],
        needs: { hunger: 0.8, fatigue: 0.1, comfort: 0.2, social: 0.9, curiosity: 0.5 },
      },
      revisions: [{ internal: ["Melody intends to leave"], observable: ["keeps glancing toward the way out"] }],
      updatedAt: 2,
    }],
    messages: [
      { sender: "character", text: "Melody, what do you think of the dying light?" },
      { sender: "player", text: "*I wait.*" },
    ],
  });
  assert.match(result.prompt, /<autonomy>\n\[NPC SUBTEXT: Melody\]/);
  assert.match(result.prompt, /Goal: leave the greenhouse before nightfall/);
  assert.match(result.prompt, /Fears: being followed/);
  assert.match(result.prompt, /Pressed needs: hunger, social/);
  assert.match(result.prompt, /\[OBSERVABLE\] Melody — Melody keeps glancing toward the way out/);
  assert.doesNotMatch(result.prompt, /\[NPC SUBTEXT: Peony\]/);
});

test("Sensory POV injects persona perception and excludes non-speaker NPC subtext", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "glm-4-6",
    povStyle: "sensory",
    preferences: { ...preferences, viewpoint: "roving" },
    cast: [
      { id: "peony", name: "Peony", origin: "permanent", presence: "active", primary: true, addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    ],
    autonomy: [{
      id: "rc:melody",
      name: "Melody",
      drive: {
        goal: "leave without being followed",
        intent: "hide the map",
        wants: [], fears: [], concerns: [],
        needs: { hunger: 0, fatigue: 0, comfort: 0, social: 0, curiosity: 0 },
      },
      revisions: [{ internal: ["Melody plans to hide the map"], observable: ["keeps one hand close to her coat"] }],
      updatedAt: 2,
    }],
  });

  assert.match(result.prompt, /<persona-perception>/);
  assert.match(result.prompt, /Use player-persona-limited narration/);
  assert.match(result.prompt, /Melody keeps one hand close to her coat/);
  assert.doesNotMatch(result.prompt, /Goal: leave without being followed|Intent: hide the map|Melody plans to hide the map/);
  assert.doesNotMatch(result.prompt, /Use roving limited narration/);
  assert.equal(result.manifest.perception?.style, "sensory");
});

test("Standard POV keeps the existing prompt free of sensory context", () => {
  const implicit = compile(adultCharacter());
  const explicit = compile(adultCharacter(), { povStyle: "standard" });
  assert.equal(explicit.prompt, implicit.prompt);
  assert.doesNotMatch(explicit.prompt, /<persona-perception>/);
  assert.equal(explicit.manifest.perception, undefined);
});

test("a side speaker gets the autonomous independence instruction", () => {
  const result = compile(adultCharacter(), {
    provider: "novelai",
    model: "glm-4-6",
    cast: [
      { id: "peony", name: "Peony", origin: "permanent", presence: "active", primary: true, addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
      { id: "melody", name: "Melody", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    ],
    speaker: "Melody",
    autonomy: [{
      id: "rc:melody",
      name: "Melody",
      drive: {
        goal: "slip out of the keep",
        intent: "",
        wants: ["her freedom"],
        fears: ["the warden"],
        concerns: [],
        needs: { hunger: 0.7, fatigue: 0, comfort: 0.4, social: 0.2, curiosity: 0.1 },
      },
      revisions: [{ internal: ["Melody intends to leave"], observable: ["keeps glancing toward the way out"] }],
      updatedAt: 2,
    }],
    messages: [
      { sender: "character", text: "Melody, what do you want from tonight?" },
      { sender: "player", text: "*I wait.*" },
    ],
  });
  assert.match(result.prompt, /you are an independent participant, not a plot device/);
  assert.match(result.prompt, /you may disagree, hesitate, refuse, conceal what you know, or change your mind/);
  assert.match(result.prompt, /Melody intends to leave/);
});

test("roleplay includes authoritative pronoun instruction when pronouns are set", () => {
  const character = legacyCharacterToCanon({
    id: "senako-steel",
    name: "Senako Steel",
    role: "Guarded friend",
    profile: "Senako is a twelve-year-old girl.",
    pronouns: "she/her",
    ageCategory: "minor",
    isMinor: true,
  });
  const result = compile(character, { kind: "roleplay" });
  assert.match(result.prompt, /Senako Steel uses she\/her pronouns\./);
  assert.doesNotMatch(result.prompt, /\bshe\/he\b/);
});

test("autopilot includes authoritative pronoun instruction when pronouns are set", () => {
  const character = legacyCharacterToCanon({
    id: "senako-steel",
    name: "Senako Steel",
    role: "Guarded friend",
    profile: "Senako is a twelve-year-old girl.",
    pronouns: "she/her",
    ageCategory: "minor",
    isMinor: true,
  });
  const result = compile(character, { kind: "autopilot", autopilotPov: "third" });
  assert.match(result.prompt, /Senako Steel uses she\/her pronouns\./);
  assert.doesNotMatch(result.prompt, /\bshe\/he\b/);
});

test("impersonation includes authoritative pronoun instruction when pronouns are set", () => {
  const character = legacyCharacterToCanon({
    id: "senako-steel",
    name: "Senako Steel",
    role: "Guarded friend",
    profile: "Senako is a twelve-year-old girl.",
    pronouns: "she/her",
    ageCategory: "minor",
    isMinor: true,
  });
  const result = compile(character, { kind: "impersonation" });
  assert.match(result.prompt, /Senako Steel uses she\/her pronouns\./);
  assert.doesNotMatch(result.prompt, /\bshe\/he\b/);
});

test("empty pronouns do not add a pronoun instruction line", () => {
  const character = legacyCharacterToCanon({
    id: "unknown-ally",
    name: "Unknown Ally",
    role: "Mysterious companion",
    profile: "A companion of unspecified gender.",
  });
  const result = compile(character, { kind: "roleplay" });
  assert.doesNotMatch(result.prompt, /uses pronouns/);
  assert.doesNotMatch(result.prompt, /she\/he/);
});

test("they/them pronouns are preserved and not replaced", () => {
  const character = legacyCharacterToCanon({
    id: "ally",
    name: "Ally",
    role: "Companion",
    profile: "A companion who uses they/them pronouns.",
    pronouns: "they/them",
  });
  const result = compile(character, { kind: "roleplay" });
  assert.match(result.prompt, /Ally uses they\/them pronouns\./);
  assert.doesNotMatch(result.prompt, /she\/he/);
});

test("relationship context instruction is injected when provided", () => {
  const instruction = "The current Relationship Status describes how this character relates to the player persona. Treat the persona in a manner consistent with that relationship, while interpreting and expressing it through the character's own personality, traits, history, current mood, boundaries, and circumstances. Relationship Status is context, not a command: it must not force affection, agreement, obedience, intimacy, forgiveness, or any specific behavior.";
  const result = compile(adultCharacter(), {
    relationshipContextInstruction: instruction,
  });
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.match(result.prompt, /The current Relationship Status describes how this character relates to the player persona/);
  assert.match(result.prompt, /Relationship Status is context, not a command/);
});

test("relationship context instruction is absent when not provided", () => {
  const result = compile(adultCharacter());
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.doesNotMatch(result.prompt, /The current Relationship Status describes how this character relates to the player persona/);
  assert.doesNotMatch(result.prompt, /Relationship Status is context, not a command/);
});

test("relationship context instruction is injected in sandbox mode", () => {
  const instruction = "The current Relationship Status describes how this character relates to the player persona.";
  const result = compile(adultCharacter(), {
    relationshipContextInstruction: instruction,
    sandbox: true,
  });
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.match(result.prompt, /The current Relationship Status describes how this character relates to the player persona/);
});

test("relationship note is injected when provided", () => {
  const result = compile(adultCharacter(), {
    relationshipContextInstruction: "Relationship context instruction.",
    relationshipNote: "She trusts him deeply but is still angry about what happened yesterday.",
  });
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.match(result.prompt, /Relationship context instruction\./);
  assert.match(result.prompt, /Relationship note: She trusts him deeply but is still angry about what happened yesterday\./);
});

test("relationship note is absent when empty", () => {
  const result = compile(adultCharacter(), {
    relationshipNote: "",
  });
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.doesNotMatch(result.prompt, /Relationship note:/);
});

test("relationship note is absent when not provided", () => {
  const result = compile(adultCharacter());
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.doesNotMatch(result.prompt, /Relationship note:/);
});

test("relationship note is injected in sandbox mode", () => {
  const result = compile(adultCharacter(), {
    relationshipNote: "A custom note.",
    sandbox: true,
  });
  assert.match(result.prompt, /Relationship state: Trusted friend; Bond 62\/100/);
  assert.match(result.prompt, /Relationship note: A custom note\./);
});

test("prose policy appears exactly once in a roleplay prompt", () => {
  const result = compile(adultCharacter());
  const matches = result.prompt.match(/<prose-quality-policy>/g) || [];
  assert.equal(matches.length, 1);
});

test("roleplay receives the full prose-quality policy", () => {
  const result = compile(adultCharacter());
  assert.match(result.prompt, /<prose-quality-policy>/);
  assert.match(result.prompt, /Character voice is authoritative/);
  assert.match(result.prompt, /Do not reduce characters to verbal stereotypes/);
  assert.match(result.prompt, /homogenize character voices/);
  assert.doesNotMatch(result.prompt, /<player-voice-policy>/);
});

test("autopilot receives the full prose-quality policy", () => {
  const result = compile(adultCharacter(), { kind: "autopilot", messages: [] });
  assert.match(result.prompt, /<prose-quality-policy>/);
  assert.match(result.prompt, /Character voice is authoritative/);
  assert.match(result.prompt, /homogenize character voices/);
  assert.doesNotMatch(result.prompt, /<player-voice-policy>/);
});

test("impersonation receives the reduced player-voice policy, not the full policy", () => {
  const result = compile(adultCharacter(), { kind: "impersonation", playerDirection: "" });
  assert.match(result.prompt, /<player-voice-policy>/);
  assert.match(result.prompt, /Preserve the player's established voice/);
  assert.doesNotMatch(result.prompt, /<prose-quality-policy>/);
  assert.doesNotMatch(result.prompt, /homogenize character voices/);
  assert.doesNotMatch(result.prompt, /Do not reduce characters to verbal stereotypes/);
});

test("character canon appears before the prose policy", () => {
  const result = compile(adultCharacter());
  const canonEnd = result.prompt.indexOf("</authoritative-character-canon>");
  const policyStart = result.prompt.indexOf("<prose-quality-policy>");
  assert.ok(canonEnd >= 0);
  assert.ok(policyStart > canonEnd);
});

test("current-state appears before the prose policy", () => {
  const result = compile(adultCharacter());
  const stateEnd = result.prompt.indexOf("</current-state>");
  const policyStart = result.prompt.indexOf("<prose-quality-policy>");
  assert.ok(stateEnd >= 0);
  assert.ok(policyStart > stateEnd);
});

test("the central policy does not carry model-specific anti-slop phrasing", () => {
  const result = compile(adultCharacter());
  assert.doesNotMatch(result.prompt, /GROUNDED PROSE \/ ANTI-SLOP/);
  assert.doesNotMatch(result.prompt, /silence stretched between them/);
  assert.doesNotMatch(result.prompt, /her gaze softened/);
});

test("Xialong-specific anti-slop remains Xialong-only", () => {
  const local = compile(adultCharacter());
  assert.doesNotMatch(local.prompt, /GROUNDED PROSE \/ ANTI-SLOP/);
  assert.doesNotMatch(local.prompt, /silence stretched between them/);

  const xialong = compile(adultCharacter(), { provider: "novelai", model: "xialong-v1" });
  assert.match(xialong.prompt, /GROUNDED PROSE \/ ANTI-SLOP/);
  assert.match(xialong.prompt, /silence stretched between them/);
});

test("the duplicated prose sentence no longer appears", () => {
  const result = compile(adultCharacter());
  assert.doesNotMatch(result.prompt, /Avoid filler, summaries, purple prose, stock AI phrases/);
});

test("character canon and world lore data are not contaminated with prose-policy fields", () => {
  const canonText = PEONY.sections.map((section) => section.content).join("\n");
  const worldText = CODA_WORLD_LORE.entries.map((entry) => entry.content).join("\n");
  assert.doesNotMatch(canonText, /prose-quality-policy|player-voice-policy/);
  assert.doesNotMatch(worldText, /prose-quality-policy|player-voice-policy/);
  assert.doesNotMatch(canonText, /Character voice is authoritative/);
  assert.doesNotMatch(worldText, /homogenize character voices/);
});

test("location context is injected when location is provided", () => {
  const location = {
    id: "loc-test-1",
    name: "Willowbridge Children's Day Centre",
    type: "community centre",
    shortDescription: "A warm, busy place for children.",
    description: "A bright community centre with indoor and outdoor play areas.",
    atmosphere: ["lively", "warm"],
    features: ["climbing frame", "sensory corner", "quiet room"],
    areas: [{ id: "area-1", name: "Garden", description: "A secure outdoor play space." }],
    activities: ["arts", "story time", "outdoor play"],
    occupants: ["children", "staff"],
    staffRoles: ["playworker", "site manager"],
    accessibilityFeatures: ["ramp", "accessible toilet"],
    ageRange: { minimum: 0, maximum: 12 },
    tags: ["community", "children", "day centre"],
    source: "custom",
  };
  const result = compile(adultCharacter(), {
    provider: "local",
    model: "gemma-3-12b",
    location,
  });
  assert.match(result.prompt, /Location: Willowbridge Children's Day Centre/);
  assert.match(result.prompt, /Type: community centre/);
  assert.match(result.prompt, /Overview: A warm, busy place for children\./);
  assert.match(result.prompt, /Atmosphere: lively\. warm/);
  assert.match(result.prompt, /Features: climbing frame, sensory corner, quiet room/);
  assert.match(result.prompt, /Areas: Garden \(A secure outdoor play space\.\)/);
  assert.match(result.prompt, /Activities: arts, story time, outdoor play/);
  assert.match(result.prompt, /Possible occupants: children, staff/);
  assert.match(result.prompt, /Accessibility: ramp, accessible toilet/);
  assert.match(result.prompt, /Age range: 0–12/);
  assert.match(result.prompt, /Tags: community, children, day centre/);
});
