import assert from "node:assert/strict";
import test from "node:test";

import { parseStoryMetadata } from "../lib/generation/story-metadata.ts";

test("strips a bracketed Tags/Mood footer from the end of a reply", () => {
  const { text, metadata } = parseStoryMetadata(
    "*She walks in*\n\nThe room is quiet.\n\n[\nTags\nhome, night;\n\nMood\nguarded\n]",
  );
  assert.equal(text, "*She walks in*\n\nThe room is quiet.");
  assert.deepEqual(metadata, { tags: ["home", "night"], mood: "guarded" });
});

test("strips the compact colon form", () => {
  const { text, metadata } = parseStoryMetadata("[Tags: home, night; Mood: guarded]");
  assert.equal(text, "");
  assert.deepEqual(metadata, { tags: ["home", "night"], mood: "guarded" });
});

test("keeps ordinary bracketed narration untouched", () => {
  for (const narration of [
    "[she hesitates]",
    "[inner voice]",
    "[door closes]",
    "[She looked around the corner]",
  ]) {
    const { text, metadata } = parseStoryMetadata(narration);
    assert.equal(text, narration);
    assert.equal(metadata, null);
  }
});

test("keeps bracket prose that only happens to contain a keyword", () => {
  for (const narration of [
    "She was quiet. [Mood: now she felt lighter]",
    "He leaned on the counter. [location: the workshop felt cold again]",
    "[Thawing helps me think about time]",
  ]) {
    const { text, metadata } = parseStoryMetadata(narration);
    assert.equal(text, narration.trim());
    assert.equal(metadata, null);
  }
});

test("keeps metadata phrase when it is embedded mid-sentence with a colon but reads like prose", () => {
  // A colon heading with a long ordinary clause is not a footer.
  const { text, metadata } = parseStoryMetadata("[location: the map is here]");
  assert.equal(text, "[location: the map is here]");
  assert.equal(metadata, null);
});

test("strips a stray opening bracket that precedes a footer body", () => {
  const { text, metadata } = parseStoryMetadata(
    "She looked over her shoulder.\n\n[\nTags\nhome, night;\n\nMood\ncalm,",
  );
  assert.equal(text, "She looked over her shoulder.");
  assert.deepEqual(metadata, { tags: ["home", "night"], mood: "calm" });
});

test("strips a fully truncated footer that ends mid-heading", () => {
  const { text, metadata } = parseStoryMetadata("All quiet.\n\n[Tags");
  assert.equal(text, "All quiet.");
  assert.equal(metadata, null);
});

test("merges multiple metadata blocks and de-duplicates tags", () => {
  const { text, metadata } = parseStoryMetadata(
    "First beat.\n\n[Tags: rain; Mood: tense]\n\nSecond beat.\n\n[Tags: storm]",
  );
  assert.equal(text, "First beat.\n\nSecond beat.");
  assert.deepEqual(metadata, { tags: ["rain", "storm"], mood: "tense" });
});

test("handles a footer with several fields and preserves single-word terse values", () => {
  const { text, metadata } = parseStoryMetadata(
    "Leave.\n\n[Scene\nkitchen;\nWeather\ncold;\nTime\nnight]",
  );
  assert.equal(text, "Leave.");
  assert.equal(metadata?.scene, "kitchen");
  assert.equal(metadata?.weather, "cold");
  assert.equal(metadata?.time, "night");
});

test("returns text unchanged when there are no brackets at all", () => {
  const plain = "Nothing special here, just roleplay.";
  const { text, metadata } = parseStoryMetadata(plain);
  assert.equal(text, plain);
  assert.equal(metadata, null);
});

test("returns an empty string when the reply was only metadata", () => {
  const { text, metadata } = parseStoryMetadata("[Tags: home]");
  assert.equal(text, "");
  assert.deepEqual(metadata, { tags: ["home"] });
});