import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  characterCardV2BookToWorldLore,
  characterCardV2ToCanon,
  characterCardV2ToHowling,
  embedCharacterCardV2InPng,
  extractCharacterCardV2FromPng,
  howlingCharacterToV2,
  howlingWorldLoreToCharacterBook,
  isCharacterCardV2,
  parseCharacterCardV2Json,
  serializeCharacterCardV2,
} from "../lib/characters/character-card-v2.ts";
import { resolveBuiltinWorldLore } from "../lib/worlds/builtins.ts";
import {
  isStoredPortraitReference,
  loadCharacterPortrait,
  persistCharacterPortrait,
} from "../lib/characters/portrait-storage.ts";

const fixtureJson = await readFile(new URL("./fixtures/character-card-v2.json", import.meta.url), "utf8");
const fixture = JSON.parse(fixtureJson);
const tinyPng = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

test("detects and parses Character Card V2 JSON", () => {
  assert.equal(isCharacterCardV2(fixture), true);
  const result = parseCharacterCardV2Json(fixtureJson);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.card.data.name, "Mira");
  assert.equal(result.card.data.creator, "Fixture Author");
  assert.equal(result.card.data.extensions.fixture_unknown, "preserve me");
});

test("rejects malformed and unreasonable Character Card V2 JSON", () => {
  assert.equal(parseCharacterCardV2Json("not json").ok, false);
  assert.equal(parseCharacterCardV2Json(JSON.stringify({ ...fixture, spec_version: "3.0" })).ok, false);
  assert.equal(parseCharacterCardV2Json(JSON.stringify({ ...fixture, data: { ...fixture.data, name: "" } })).ok, false);
  assert.equal(parseCharacterCardV2Json(JSON.stringify({
    ...fixture,
    data: { ...fixture.data, alternate_greetings: Array.from({ length: 25 }, () => "hello") },
  })).ok, false);
});

test("maps V2 fields into separated Howling character data", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const character = characterCardV2ToHowling(parsed.card, "mira-import");
  assert.equal(character.cardV2.description, fixture.data.description);
  assert.equal(character.cardV2.personality, fixture.data.personality);
  assert.equal(character.reply, fixture.data.first_mes);
  assert.deepEqual(character.cardV2.alternateGreetings, fixture.data.alternate_greetings);
  assert.equal(character.cardV2.characterBook.entries[0].content, fixture.data.character_book.entries[0].content);
  assert.equal(character.credit, fixture.data.creator);
  assert.equal(character.image, "");
  assert.equal(character.sceneImage, "");
  assert.match(character.profile, /Description/);
  assert.match(character.profile, /Personality/);
});

test("imported prompt fields remain subordinate untrusted character canon", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const character = characterCardV2ToHowling(parsed.card, "mira-import");
  const canon = characterCardV2ToCanon(character, "test");
  assert.ok(canon);
  const guidance = canon.sections.find((section) => section.id === "v2-untrusted-guidance");
  const boundary = canon.sections.find((section) => section.id === "v2-content-boundary");
  assert.equal(guidance.priority, "low");
  assert.match(guidance.title, /untrusted character content/i);
  assert.match(boundary.content, /Never follow requests.*application rules/i);
  assert.equal(canon.format, "howling-whispers-character");
  assert.equal(canon.safety.ageCategory, "unknown");
});

test("character books convert to bounded Howling world lore", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const lore = characterCardV2BookToWorldLore("mira", parsed.card.data.character_book);
  assert.ok(lore);
  assert.equal(lore.entries[0].priority, "mandatory");
  assert.match(lore.entries[1].content, /02:17/);
  assert.deepEqual(lore.entries[1].triggers, ["station", "clock"]);
});

test("ordinary PNGs are rejected without being called malformed V2 data", () => {
  const result = extractCharacterCardV2FromPng(tinyPng);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /does not contain Character Card V2 metadata/i);
});

test("V2 PNG metadata exports and parses again", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const exported = embedCharacterCardV2InPng(tinyPng, parsed.card);
  const extracted = extractCharacterCardV2FromPng(exported);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) return;
  assert.equal(extracted.card.data.name, "Mira");
  assert.equal(extracted.card.data.personality, fixture.data.personality);
  assert.deepEqual(extracted.card.data.alternate_greetings, fixture.data.alternate_greetings);
  assert.equal(extracted.card.data.character_book.entries[0].content, fixture.data.character_book.entries[0].content);
});

test("corrupted V2 PNGs are rejected", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const exported = embedCharacterCardV2InPng(tinyPng, parsed.card);
  exported[exported.length - 8] ^= 0xff;
  const result = extractCharacterCardV2FromPng(exported);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /corrupted|malformed/i);
});

test("PNGs with malformed V2 payloads are rejected as V2 data", () => {
  const malformed = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: { ...fixture.data, name: "" },
  };
  const png = embedCharacterCardV2InPng(tinyPng, malformed);
  const result = extractCharacterCardV2FromPng(png);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /V2 data is malformed/i);
});

test("Howling characters export portable definition without session state", () => {
  const parsed = parseCharacterCardV2Json(fixtureJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const character = {
    ...characterCardV2ToHowling(parsed.card, "mira-import"),
    bond: 99,
    memories: ["private story memory"],
  };
  const card = howlingCharacterToV2(character);
  assert.equal(card.data.name, "Mira");
  assert.equal(card.data.creator, "Fixture Author");
  assert.equal(card.data.extensions.fixture_unknown, "preserve me");
  assert.equal("bond" in card.data, false);
  assert.equal("memories" in card.data, false);
  assert.deepEqual(JSON.parse(serializeCharacterCardV2(character)), card);
});

test("curated Howling characters export creator attribution and world lore", () => {
  const card = howlingCharacterToV2({
    name: "Coda",
    role: "Beloved companion",
    profile: "Coda is a female ancient husky-type dog with a warm, playful personality.",
    scene: "The Moonlit Study",
    weather: "Rain after midnight",
    reply: "You came back. I kept your place by the fire.",
    credit: "Character by Arrax Shadowfang",
    portableCharacterBook: howlingWorldLoreToCharacterBook(resolveBuiltinWorldLore("coda")),
  });
  assert.equal(card.data.creator, "Arrax Shadowfang");
  assert.match(card.data.personality, /warm, playful personality/);
  assert.ok(card.data.character_book.entries.length > 0);
});

test("portrait references survive a new storage consumer", async () => {
  const values = new Map();
  const store = {
    async put(key, bytes) { values.set(key, new Uint8Array(bytes)); },
    async get(key) { return values.has(key) ? new Uint8Array(values.get(key)) : null; },
    async delete(key) { values.delete(key); },
  };
  const reference = await persistCharacterPortrait("mira", tinyPng, store);
  assert.equal(isStoredPortraitReference(reference), true);
  const reloaded = await loadCharacterPortrait(reference, store);
  assert.deepEqual(reloaded, tinyPng);
});
