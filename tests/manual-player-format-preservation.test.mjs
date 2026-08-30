import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../app/dreambound-app.tsx", import.meta.url), "utf8");

test("manual send path stores typed player text without formatPlayerTurn", () => {
  const start = source.indexOf("async function sendMessage()");
  assert.notEqual(start, -1, "sendMessage() not found");
  const end = source.indexOf("async function impersonateTurn", start + 1);
  assert.notEqual(end, -1, "impersonateTurn() not found after sendMessage()");
  const body = source.slice(start, end);

  assert.match(body, /const text = draft\.trim\(\)/);
  assert.doesNotMatch(body, /formatPlayerTurn\s*\(/);
});

test("manual edit path does not normalize through formatPlayerTurn", () => {
  const start = source.indexOf("function saveEditMessage");
  assert.notEqual(start, -1, "saveEditMessage() not found");
  const end = source.indexOf("\n  function ", start + 1);
  const body = source.slice(start, end === -1 ? start + 8000 : end);

  assert.doesNotMatch(body, /formatPlayerTurn\s*\(/);
});
