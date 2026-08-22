import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { serializeCharacter, parseCharacterImport } from "../lib/characters/import-export.ts";

describe("character import-export traits round-trip", () => {
  test("serializes and parses traits", () => {
    const character = {
      id: "custom-1",
      name: "Traited",
      role: "Test",
      status: "Ready",
      image: "",
      sceneImage: "",
      scene: "Place",
      weather: "Weather",
      bond: 10,
      memories: [],
      reply: "Hello",
      profile: "Profile text",
      accent: "#ff0000",
      traits: {
        primary: ["brave", "loyal"],
        secondary: ["curious"],
        situational: ["cautious"],
        custom: [{ id: "c1", name: "Night Owl", description: "Active after dark." }],
      },
    };
    const json = serializeCharacter(character);
    const parsed = parseCharacterImport(json);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.characters.length, 1);
    assert.ok(parsed.characters[0].traits);
    assert.deepStrictEqual(parsed.characters[0].traits.primary, ["brave", "loyal"]);
    assert.deepStrictEqual(parsed.characters[0].traits.secondary, ["curious"]);
    assert.deepStrictEqual(parsed.characters[0].traits.situational, ["cautious"]);
    assert.deepStrictEqual(parsed.characters[0].traits.custom, [{ id: "c1", name: "Night Owl", description: "Active after dark." }]);
  });

  test("defaults to empty traits when missing", () => {
    const character = {
      id: "custom-2",
      name: "Plain",
      role: "Test",
      status: "Ready",
      image: "",
      sceneImage: "",
      scene: "Place",
      weather: "Weather",
      bond: 10,
      memories: [],
      reply: "Hello",
      profile: "Profile text",
      accent: "#ff0000",
    };
    const json = serializeCharacter(character);
    const parsed = parseCharacterImport(json);
    assert.strictEqual(parsed.ok, true);
    assert.ok(parsed.characters[0].traits);
    assert.deepStrictEqual(parsed.characters[0].traits.primary, []);
  });
});
