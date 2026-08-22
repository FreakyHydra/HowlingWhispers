import assert from "node:assert/strict";
import test from "node:test";

import { isHowlingAddon, validateAddonContent } from "../lib/generation/howling-addons.ts";

const validManifest = {
  format: "howling-addon",
  formatVersion: 1,
  id: "rainy-nights",
  name: "Rainy Nights Pack",
  version: "1.0.0",
  description: "Moody urban scenes.",
  author: "Test",
  content: {
    commonScenes: [
      {
        id: "waiting-room",
        title: "Rainy Waiting Room",
        subtitle: "A train station after dark.",
        weather: "Rainy",
        opening: "*{{char}} waits beneath the clock as {{user}} approaches.*",
      },
    ],
  },
};

test("valid add-on parses successfully", () => {
  assert.ok(isHowlingAddon(validManifest));
  const scenes = validateAddonContent(validManifest.content);
  assert.ok(Array.isArray(scenes));
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].id, "waiting-room");
  assert.ok(scenes[0].opening.includes("{{char}}"));
  assert.ok(scenes[0].opening.includes("{{user}}"));
});

test("malformed add-on is rejected", () => {
  assert.ok(!isHowlingAddon(null));
  assert.ok(!isHowlingAddon({}));
  assert.ok(!isHowlingAddon({ format: "howling-addon", formatVersion: 1 }));
  assert.ok(!isHowlingAddon({ format: "howling-addon", formatVersion: 1, id: "", name: "", version: "" }));
});

test("unsupported format version is rejected", () => {
  assert.ok(!isHowlingAddon({ ...validManifest, formatVersion: 2 }));
});

test("unknown future content sections do not crash importer", () => {
  const manifest = {
    ...validManifest,
    content: {
      ...validManifest.content,
      futureSection: [{ anything: true }],
    },
  };
  const scenes = validateAddonContent(manifest.content);
  assert.ok(Array.isArray(scenes));
  assert.equal(scenes.length, 1);
});

test("invalid common scene entries are filtered out", () => {
  const scenes = validateAddonContent({
    commonScenes: [
      { id: "", title: "", opening: "" },
      { id: "valid", title: "Valid", opening: "*{{char}} stands here.*" },
    ],
  });
  assert.ok(Array.isArray(scenes));
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].id, "valid");
});
