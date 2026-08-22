import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildBackupPayload, serializeBackupPayload, parsePortableBackup } from "../lib/backup/format.ts";

describe("backup traits round-trip", () => {
  test("preserves traits through backup build and restore", () => {
    const payload = buildBackupPayload(
      {
        characters: [
          {
            id: "custom-1",
            name: "Traited",
            role: "Tester",
            status: "Ready",
            image: "",
            sceneImage: "",
            scene: "Place",
            weather: "Weather",
            bond: 10,
            memories: [],
            reply: "Hello",
            profile: "Profile",
            accent: "#ff0000",
            traits: {
              primary: ["brave", "loyal"],
              secondary: ["curious"],
              situational: [],
              custom: [{ id: "c1", name: "Night Owl", description: "Active after dark." }],
            },
          },
        ],
        messages: [],
        sessions: [],
        currentSessionId: null,
        storyScenes: [],
        personas: [],
        activePersonaId: null,
        playerName: "Player",
        preferences: {},
        relationships: {},
      },
      { appVersion: "0.8.1", device: "test", source: "test" },
    );

    const reparsed = parsePortableBackup(serializeBackupPayload(payload));
    assert.ok(reparsed.ok);
    if (!reparsed.ok) return;
    const restored = reparsed.payload;
    assert.strictEqual(restored.data.characters.length, 1);
    assert.ok(restored.data.characters[0].traits);
    assert.deepStrictEqual(restored.data.characters[0].traits.primary, ["brave", "loyal"]);
    assert.deepStrictEqual(restored.data.characters[0].traits.secondary, ["curious"]);
    assert.strictEqual(restored.data.characters[0].traits.custom?.[0].name, "Night Owl");
  });

  test("defaults missing traits to empty", () => {
    const payload = buildBackupPayload(
      {
        characters: [
          {
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
            profile: "Profile",
            accent: "#ff0000",
          },
        ],
        messages: [],
        sessions: [],
        currentSessionId: null,
        storyScenes: [],
        personas: [],
        activePersonaId: null,
        playerName: "Player",
        preferences: {},
        relationships: {},
      },
      { appVersion: "0.8.1", device: "test", source: "test" },
    );

    const reparsed = parsePortableBackup(serializeBackupPayload(payload));
    assert.ok(reparsed.ok);
    if (!reparsed.ok) return;
    const restored = reparsed.payload;
    assert.ok(restored.data.characters[0].traits);
    assert.deepStrictEqual(restored.data.characters[0].traits.primary, []);
  });
});
