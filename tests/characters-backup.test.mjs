import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureUniqueCharacterIds,
  isCuratedBuiltinId,
  parseCharacterImport,
  serializeCharacter,
  serializeCharacterLibrary,
} from "../lib/characters/import-export.ts";

const sample = {
  id: "my-character",
  name: "Mira",
  role: "Courier",
  status: "On the move",
  image: "",
  sceneImage: "",
  scene: "Night City",
  weather: "Wet asphalt",
  bond: 18,
  memories: ["First night on the rooftops"],
  reply: "You have the package?",
  profile: "A fast courier who trusts nobody.",
  accent: "#d78a5e",
  relationship: "Rival",
  ageCategory: "adult",
  assets: {
    portraitUrl: "https://example.com/mira-portrait.webp",
    sceneUrl: "https://example.com/mira-default-scene.webp",
    galleryUrls: ["https://example.com/mira-extra.webp"],
  },
  scenes: [
    {
      id: "rooftop-run",
      title: "Rooftop Run",
      description: "A courier handoff above the city.",
      scene: "Old rooftops",
      weather: "Cold rain",
      opening: "Mira lands on the next roof and glances back.",
      backgroundImageUrl: "https://example.com/rooftop.webp",
      characterImageUrl: "https://example.com/mira-rooftop.webp",
      backgroundFocalPoint: "center 40%",
      characterFocalPoint: "center",
      tags: ["chase", "night"],
    },
  ],
};

test("character export format is versioned and readable", () => {
  const json = serializeCharacter(sample);
  const parsed = JSON.parse(json);
  assert.equal(parsed.format, "howling-whispers-character");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.character.name, "Mira");
});

test("character round-trips through import", () => {
  const result = parseCharacterImport(serializeCharacter(sample));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0].name, "Mira");
  assert.equal(result.characters[0].ageCategory, "adult");
  assert.equal(result.characters[0].memories[0], "First night on the rooftops");
});

test("photo asset URLs and curated scenes round-trip", () => {
  const result = parseCharacterImport(serializeCharacter(sample));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const character = result.characters[0];
  assert.equal(character.assets?.portraitUrl, "https://example.com/mira-portrait.webp");
  assert.equal(character.assets?.sceneUrl, "https://example.com/mira-default-scene.webp");
  assert.deepEqual(character.assets?.galleryUrls, ["https://example.com/mira-extra.webp"]);
  assert.equal(character.scenes?.length, 1);
  assert.equal(character.scenes?.[0].id, "rooftop-run");
  assert.equal(character.scenes?.[0].backgroundImageUrl, "https://example.com/rooftop.webp");
  assert.equal(character.scenes?.[0].characterImageUrl, "https://example.com/mira-rooftop.webp");
  assert.deepEqual(character.scenes?.[0].tags, ["chase", "night"]);
});

test("invalid scene entries are discarded without rejecting the card", () => {
  const json = JSON.parse(serializeCharacter(sample));
  json.character.scenes = [
    { id: "valid", title: "Valid scene", backgroundImageUrl: "/valid.webp" },
    { id: "missing-title", backgroundImageUrl: "/bad.webp" },
    "not-a-scene",
  ];
  const result = parseCharacterImport(JSON.stringify(json));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.characters[0].scenes?.length, 1);
  assert.equal(result.characters[0].scenes?.[0].id, "valid");
});

test("character library round-trips", () => {
  const json = serializeCharacterLibrary([sample, { ...sample, id: "other", name: "Vex" }]);
  const result = parseCharacterImport(json);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.characters.length, 2);
});

test("unsupported native character backup versions are rejected", () => {
  const single = JSON.parse(serializeCharacter(sample));
  single.version = 2;
  assert.equal(parseCharacterImport(JSON.stringify(single)).ok, false);
  const library = JSON.parse(serializeCharacterLibrary([sample]));
  library.version = 2;
  assert.equal(parseCharacterImport(JSON.stringify(library)).ok, false);
});

test("malformed and foreign character files are rejected", () => {
  assert.equal(parseCharacterImport("garbage").ok, false);
  assert.equal(parseCharacterImport("{}").ok, false);
  assert.equal(parseCharacterImport(JSON.stringify({ format: "some-other-app", version: 1, character: sample })).ok, false);
  assert.equal(parseCharacterImport(JSON.stringify({ format: "howling-whispers-character", version: 1, character: { role: "No name" } })).ok, false);
});

test("oversized character files are rejected", () => {
  const big = JSON.stringify({
    format: "howling-whispers-character",
    version: 1,
    character: { name: "x", profile: "a".repeat(400 * 1024) },
  });
  const result = parseCharacterImport(big);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /too large/i);
});

test("curated built-in ids are never imported", () => {
  assert.equal(isCuratedBuiltinId("coda"), true);
  assert.equal(isCuratedBuiltinId("heather"), true);
  assert.equal(isCuratedBuiltinId("riley"), true);
  const result = ensureUniqueCharacterIds(
    [{ ...sample, id: "coda" }],
    [],
  );
  assert.notEqual(result[0].id, "coda");
});

test("id conflicts are regenerated", () => {
  const result = ensureUniqueCharacterIds([{ ...sample, id: "mine" }], ["mine"]);
  assert.notEqual(result[0].id, "mine");
});

test("imported text is length-limited", () => {
  const result = parseCharacterImport(JSON.stringify({
    format: "howling-whispers-character",
    version: 1,
    character: { name: "x", profile: "p".repeat(50000), memories: ["m".repeat(5000)] },
  }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.characters[0].profile.length <= 12000);
  assert.ok(result.characters[0].memories[0].length <= 600);
});