import assert from "node:assert/strict";
import test from "node:test";
import { decodeLorebookFile, serializeLorebook, isLorebookFile } from "../lib/context/lorebook-format.ts";

test("detects valid NovelAI lorebook shape", () => {
  assert.equal(isLorebookFile({ lorebookVersion: 3, entries: [] }), true);
  assert.equal(isLorebookFile({ lorebookVersion: 4, entries: [] }), true);
  assert.equal(isLorebookFile({ lorebookVersion: 6, entries: [] }), true);
  assert.equal(isLorebookFile({ entries: [] }), false);
  assert.equal(isLorebookFile({ lorebookVersion: 3 }), false);
  assert.equal(isLorebookFile("not json"), false);
});

test("round-trips a minimal lorebook", () => {
  const input = JSON.stringify({
    lorebookVersion: 3,
    entries: [
      {
        text: "Coda is a dog.",
        keys: ["Coda", "dog"],
        enabled: true,
        forceActivation: false,
        displayName: "Coda fact",
      },
    ],
  });
  const record = decodeLorebookFile(input);
  assert.ok(record);
  assert.equal(record.name, "Imported lorebook");
  assert.equal(record.parsed?.entries.length, 1);
  assert.equal(record.parsed?.entries[0].text, "Coda is a dog.");
  assert.deepEqual(record.parsed?.entries[0].keys, ["Coda", "dog"]);
  assert.equal(record.parsed?.entries[0].displayName, "Coda fact");

  const output = serializeLorebook(record);
  const parsed = JSON.parse(output);
  assert.equal(parsed.lorebookVersion, 3);
  assert.equal(parsed.entries[0].text, "Coda is a dog.");
  assert.deepEqual(parsed.entries[0].keys, ["Coda", "dog"]);
  assert.equal(parsed.entries[0].enabled, true);
  assert.equal(parsed.entries[0].displayName, "Coda fact");
});

test("preserves raw JSON on round-trip when raw is present", () => {
  const input = JSON.stringify({
    lorebookVersion: 3,
    entries: [
      {
        text: "Raw test.",
        keys: ["raw"],
        enabled: true,
        comment: "a comment",
        contextConfig: { prefix: "[", suffix: "]" },
      },
    ],
  });
  const record = decodeLorebookFile(input);
  assert.ok(record);
  const output = serializeLorebook(record);
  const parsed = JSON.parse(output);
  assert.equal(parsed.entries[0].comment, "a comment");
  assert.deepEqual(parsed.entries[0].contextConfig, { prefix: "[", suffix: "]" });
});

test("returns null for invalid input", () => {
  assert.equal(decodeLorebookFile("not json"), null);
  assert.equal(decodeLorebookFile(JSON.stringify({ lorebookVersion: 3 })), null);
  assert.equal(decodeLorebookFile(JSON.stringify({ entries: [] })), null);
});
