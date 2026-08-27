import assert from "node:assert/strict";
import test from "node:test";

import { renderProseQualityPolicy } from "../lib/generation/prose-quality.ts";

test("roleplay prose policy keeps spoken dialogue out of narration markup", () => {
  const policy = renderProseQualityPolicy();

  assert.match(policy, /Roleplay markup is mandatory/);
  assert.match(policy, /spoken words belong in double quotes/);
  assert.match(policy, /Classify by meaning, not grammar/);
  assert.match(policy, /Never put spoken dialogue inside single asterisks/);
  assert.match(policy, /Do not leave spoken dialogue as bare unmarked prose/);
  assert.match(policy, /Twelve is old enough to learn proper care of tools/);
  assert.match(policy, /From the back room, metal scrapes against a whetstone/);
});

test("roleplay prose policy forbids character replies from hijacking the player turn", () => {
  const policy = renderProseQualityPolicy();

  assert.match(policy, /turn boundary is strict/i);
  assert.match(policy, /latest player message is already complete historical input/i);
  assert.match(policy, /Never repeat, quote, restate, paraphrase, continue, reenact, or rewrite any part of the player's latest turn/);
  assert.match(policy, /Never generate a player line, player action, player thought, player reaction, or player speaker label inside a character reply/);
  assert.match(policy, /Good to know your mother is no longer mad at me/);
  assert.match(policy, /the next reply must begin with Pip's response/i);
});
