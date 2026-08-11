import assert from "node:assert/strict";
import test from "node:test";

import { normalizeImpersonatedPlayerTurn } from "../lib/generation/player-turn.ts";

test("strips a leaked 'player user message:' header line from the impersonated turn", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "player user message:\n*I look around at the plants and flowers.*\n\nIt's beautiful.",
  );
  assert.doesNotMatch(result, /player user message/i);
  assert.match(result, /^\\?\*I look around at the plants and flowers\.\*\s*$/m);
  assert.match(result, /It's beautiful/);
});

test("strips a glued 'player user message:' prefix on the same line", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "player user message: *I push the greenhouse door open and step inside.*",
  );
  assert.doesNotMatch(result, /player user message/i);
  assert.match(result, /^\*I push the greenhouse door open and step inside\.\*$/m);
});

test("strips 'player message:', 'user message:', 'Player:' and 'User:' wrappers", () => {
  const samples = [
    "player message:\n*I lean in.*",
    "user message:\n*I lean in.*",
    "Player:\n*I lean in.*",
    "User:\n*I lean in.*",
  ];
  for (const sample of samples) {
    const result = normalizeImpersonatedPlayerTurn(sample);
    assert.doesNotMatch(result, /player message|user message|^Player:|^User:/i, `failed for: ${sample}`);
    assert.match(result, /^\*I lean in\.\*$/m);
  }
});

test("strips the player's own name label used as a generation wrapper", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "Kael:\n*I set my pack down by the door.*",
    "Kael",
  );
  assert.doesNotMatch(result, /^Kael:\s*$/m);
  assert.match(result, /^\*I set my pack down by the door\.\*$/m);
});

test("keeps a name occurrence that is part of ordinary prose", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "*I look at Kael's coat and hand it over.* I remember you asked me about it.",
    "Kael",
  );
  assert.match(result, /Kael's coat/);
  assert.match(result, /you asked me about it/);
});

test("keeps ordinary dialogue and narration untouched", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "*I plant my feet.*\n\nI didn't steal those cubs, and you know it.\n\n[The rain keeps falling.]",
  );
  assert.match(result, /^\*I plant my feet\.\*$/m);
  assert.match(result, /I didn't steal those cubs, and you know it\./);
  assert.match(result, /\[The rain keeps falling\.\]/);
});

test("normalizes action beats to blank-line separated roleplay style", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "player user message:\n*I walk over.* She stays quiet. *I reach for the door.*",
  );
  assert.doesNotMatch(result, /player user message/i);
  const actionBlocks = result.match(/^\*[^*]+\*$/gm) ?? [];
  assert.equal(actionBlocks.length, 2);
  assert.ok(result.includes("*I walk over.*\n\nShe stays quiet.\n\n*I reach for the door.*"), "action beats separated by blank lines");
  assert.match(result, /She stays quiet\./);
});

test("removes standalone wrapper marker tags", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "<|user|>\n*I glance around the greenhouse.*",
  );
  assert.doesNotMatch(result, /<\|user\|>|<user>|<\/user>/);
  assert.match(result, /^\*I glance around the greenhouse\.\*$/m);
});

test("collapses excess blank lines and trims", () => {
  const result = normalizeImpersonatedPlayerTurn(
    "player message:\n\n\n*I step closer.*\n\n\n\nI'm listening.",
  );
  assert.doesNotMatch(result, /\n{3,}/);
  assert.doesNotMatch(result, /^[\s]*player message/i);
  assert.match(result, /^\*I step closer\.\*$/m);
});

test("returns empty input unchanged", () => {
  assert.equal(normalizeImpersonatedPlayerTurn("   "), "");
  assert.equal(normalizeImpersonatedPlayerTurn(""), "");
});
