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
