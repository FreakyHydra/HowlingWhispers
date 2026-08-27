import assert from "node:assert/strict";
import test from "node:test";

import { stripEchoedPlayerTurn } from "../lib/generation/character-turn-boundary.ts";

const pipPlayerTurn = `"Good to know your mother is no longer mad at me"

*smile*

"Pip"`;

test("strips the complete echoed Pip player turn from the start of a character reply", () => {
  const raw = `"Good to know your mother is no longer mad at me"

*smile*

"Pip"

*Pip grins, her fangs showing.*

"She's not mad at all! She said you showed unusual wisdom for someone your age."`;

  assert.equal(
    stripEchoedPlayerTurn(raw, pipPlayerTurn),
    `*Pip grins, her fangs showing.*\n\n"She's not mad at all! She said you showed unusual wisdom for someone your age."`,
  );
});

test("matches smart quotes, markup, and whitespace variants", () => {
  const raw = `  “Good   to know your mother is no longer mad at me”\n*smile*\n“Pip”\n\nPip folds her arms.`;
  assert.equal(stripEchoedPlayerTurn(raw, pipPlayerTurn), "Pip folds her arms.");
});

test("leaves an ordinary character reply unchanged", () => {
  const raw = `*Pip grins.* "She's not mad at all."`;
  assert.equal(stripEchoedPlayerTurn(raw, pipPlayerTurn), raw);
});

test("preserves a character quoting only a short fragment of the player's words", () => {
  const raw = `"Good to know," Pip repeats with a crooked grin. "But don't get smug."`;
  assert.equal(stripEchoedPlayerTurn(raw, pipPlayerTurn), raw);
});

test("does not strip very short player turns", () => {
  const raw = `"Pip"\n\n*Pip looks over.* "Yeah?"`;
  assert.equal(stripEchoedPlayerTurn(raw, `"Pip"`), raw);
});

test("does not erase a reply when the echo is the entire generated output", () => {
  assert.equal(stripEchoedPlayerTurn(pipPlayerTurn, pipPlayerTurn), pipPlayerTurn);
});
