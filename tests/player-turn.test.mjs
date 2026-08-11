import assert from "node:assert/strict";
import test from "node:test";

import { formatPlayerTurn, normalizeImpersonatedPlayerTurn } from "../lib/generation/player-turn.ts";

test("strips a leaked 'player user message:' header line from the impersonated turn", () => {
  const result = formatPlayerTurn(
    "player user message:\n*I look around at the plants and flowers.*\n\nIt's beautiful.",
  );
  assert.doesNotMatch(result, /player user message/i);
  assert.match(result, /^\*I look around at the plants and flowers\.\*$/m);
  assert.match(result, /It's beautiful/);
});

test("strips a glued 'player user message:' prefix on the same line", () => {
  const result = formatPlayerTurn(
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
    const result = formatPlayerTurn(sample);
    assert.doesNotMatch(result, /player message|user message|^Player:|^User:/i, `failed for: ${sample}`);
    assert.match(result, /^\*I lean in\.\*$/m);
  }
});

test("strips the player's own name label used as a generation wrapper", () => {
  const result = formatPlayerTurn(
    "Kael:\n*I set my pack down by the door.*",
    "Kael",
  );
  assert.doesNotMatch(result, /^Kael:\s*$/m);
  assert.match(result, /^\*I set my pack down by the door\.\*$/m);
});

test("keeps a name occurrence that is part of ordinary prose", () => {
  const result = formatPlayerTurn(
    "*I look at Kael's coat and hand it over.* I remember you asked me about it.",
    "Kael",
  );
  assert.match(result, /Kael's coat/);
  assert.match(result, /you asked me about it/);
});

test("keeps marked action and narration and quotes spoken dialogue", () => {
  const result = formatPlayerTurn(
    "*I plant my feet.*\n\nI didn't steal those cubs, and you know it.\n\n[The rain keeps falling.]",
  );
  assert.match(result, /^\*I plant my feet\.\*$/m);
  assert.match(result, /^"I didn't steal those cubs, and you know it\."$/m);
  assert.match(result, /^\[The rain keeps falling\.\]$/m);
});

test("normalizes action beats to blank-line separated roleplay style", () => {
  const result = formatPlayerTurn(
    "player user message:\n*I walk over.* She stays quiet. *I reach for the door.*",
  );
  assert.doesNotMatch(result, /player user message/i);
  const actionBlocks = result.match(/^\*[^*]+\*$/gm) ?? [];
  assert.equal(actionBlocks.length, 3);
  assert.ok(result.includes("*I walk over.*\n\n*She stays quiet.*\n\n*I reach for the door.*"), "action beats separated by blank lines");
});

test("removes standalone wrapper marker tags", () => {
  const result = formatPlayerTurn(
    "<|user|>\n*I glance around the greenhouse.*",
  );
  assert.doesNotMatch(result, /<\|user\|>|<user>|<\/user>/);
  assert.match(result, /^\*I glance around the greenhouse\.\*$/m);
});

test("wraps bare first-person prose into the deterministic roleplay form", () => {
  const result = formatPlayerTurn(
    "I look over at her. I don't know, maybe we should leave. I reach for the door.",
  );
  assert.equal(
    result,
    "*I look over at her.*\n\n\"I don't know, maybe we should leave.\"\n\n*I reach for the door.*",
  );
});

test("quotes imperative dialogue that the model leaves unquoted", () => {
  const result = formatPlayerTurn(
    "Trust me.\n\n*I grab her arm tightly.*\n\nLet it happen.",
  );
  assert.equal(result, "\"Trust me.\"\n\n*I grab her arm tightly.*\n\n\"Let it happen.\"");
});

test("splits an action clause with an embedded speech frame into its parts", () => {
  const result = formatPlayerTurn(
    "I set my pack down by the door and say, Trust me and let it happen. I keep my eyes on Peony the whole time.",
  );
  assert.match(result, /^\*I set my pack down by the door\*$/m);
  assert.match(result, /^"Trust me and let it happen\."$/m);
  assert.match(result, /^\*I keep my eyes on Peony the whole time\.\*$/m);
});

test("quotes reported speech and purpose-clause dialogue instead of calling them actions", () => {
  assert.equal(formatPlayerTurn("I said I'd stay."), "\"I said I'd stay.\"");
  assert.equal(formatPlayerTurn("I came here to say I was sorry."), "\"I came here to say I was sorry.\"");
  assert.equal(formatPlayerTurn("I told her it would be fine."), "\"I told her it would be fine.\"");
});

test("is idempotent — already-correct markup is preserved, not double-wrapped", () => {
  const correct = "\"Did you hear that?\"\n\n*I glance toward the window.*";
  assert.equal(formatPlayerTurn(correct), correct);
  assert.equal(formatPlayerTurn(formatPlayerTurn(correct)), correct);
});

test("never character-response formatting: strips character_reply wrappers", () => {
  const result = formatPlayerTurn(
    "<character_reply><message>*I wave a hand toward the greenhouse door.*</message></character_reply>",
  );
  assert.doesNotMatch(result, /character_reply|<\/?message>/i);
  assert.match(result, /^\*I wave a hand toward the greenhouse door\.\*$/m);
});

test("collapses excess blank lines and trims", () => {
  const result = formatPlayerTurn(
    "player message:\n\n\n*I step closer.*\n\n\n\nI'm listening.",
  );
  assert.doesNotMatch(result, /\n{3,}/);
  assert.doesNotMatch(result, /^[\s]*player message/i);
  assert.match(result, /^\*I step closer\.\*$/m);
});

test("returns empty input unchanged", () => {
  assert.equal(formatPlayerTurn("   "), "");
  assert.equal(formatPlayerTurn(""), "");
});

test("deprecated alias still formats player turns", () => {
  assert.equal(
    normalizeImpersonatedPlayerTurn("I reach for the door."),
    "*I reach for the door.*",
  );
});