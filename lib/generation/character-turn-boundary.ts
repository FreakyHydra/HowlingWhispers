// Character-output turn-boundary guard.
//
// Models occasionally begin a character reply by reproducing the player's
// completed previous turn before continuing as the character. This helper
// removes only a full echoed prefix. It deliberately ignores short turns and
// partial quotations so legitimate callbacks remain untouched.

type WordSpan = {
  word: string;
  end: number;
};

const MIN_PLAYER_ECHO_WORDS = 5;
const MIN_PLAYER_ECHO_CHARS = 24;

function wordSpans(value: string): WordSpan[] {
  return [...value.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map((match) => ({
    word: match[0]
      .replace(/’/g, "'")
      .toLocaleLowerCase("en-US"),
    end: match.index! + match[0].length,
  }));
}

function normalizedWords(value: string): string {
  return wordSpans(value).map(({ word }) => word).join(" ");
}

/**
 * Strip the player's complete previous turn when a character generation begins
 * by echoing it. Matching is tolerant of roleplay markup, smart quotes,
 * punctuation, line breaks, and repeated whitespace because comparison happens
 * on normalized word spans.
 *
 * Safety boundary: short player turns are never stripped, and the match must
 * cover the complete normalized player turn from the very beginning of the
 * character output. A later or partial quotation is preserved.
 */
export function stripEchoedPlayerTurn(rawCharacterReply: string, latestPlayerTurn: string): string {
  if (!rawCharacterReply.trim() || !latestPlayerTurn.trim()) return rawCharacterReply;

  const playerWords = wordSpans(latestPlayerTurn);
  const normalizedPlayer = playerWords.map(({ word }) => word).join(" ");
  if (playerWords.length < MIN_PLAYER_ECHO_WORDS || normalizedPlayer.length < MIN_PLAYER_ECHO_CHARS) {
    return rawCharacterReply;
  }

  const replyWords = wordSpans(rawCharacterReply);
  if (replyWords.length < playerWords.length) return rawCharacterReply;

  for (let index = 0; index < playerWords.length; index += 1) {
    if (replyWords[index].word !== playerWords[index].word) return rawCharacterReply;
  }

  let end = replyWords[playerWords.length - 1].end;
  const trailingMarkup = rawCharacterReply.slice(end).match(/^[\s"'“”‘’*_[\]().,!?;:—–-]*/u)?.[0] ?? "";
  end += trailingMarkup.length;

  const remainder = rawCharacterReply.slice(end).trimStart();
  return remainder || rawCharacterReply;
}

export const __characterTurnBoundaryTestUtils = {
  normalizedWords,
  MIN_PLAYER_ECHO_WORDS,
  MIN_PLAYER_ECHO_CHARS,
};
