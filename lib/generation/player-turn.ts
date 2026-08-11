// Player Turn cleanup — normalize an impersonated (model-generated) player
// turn before it is committed to the conversation.
//
// NovelAI/Ollama sometimes echo a chat-style wrapper or control header in front
// of the generated player turn (e.g. "player user message:", "Player:", "<|user|>")
// or a `<label>` prefix. Those are generation residue, not prose: they must be
// stripped before the turn is stored/rendered, without touching the roleplay
// formatting of the turn itself.

export const PLAYER_TURN_HEADER_LABELS = [
  "player user message",
  "player message",
  "user message",
  "message",
  "player",
  "user",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip a leading control/header wrapper that the model generated instead of a
 * real turn, and normalize the remainder to the roleplay conventions used by
 * manually written player messages:
 *
 * - `player user message:`, `player message:`, `user message:`, `Player:`,
 *   `User:`, and the player's own name label are removed when they act as a
 *   generation wrapper (leading header line or leading label prefix), never
 *   when they appear mid-text inside ordinary dialogue or prose.
 * - Standalone `<user>`, `<player>`, `<|user|>`, `<|player|>` wrapper markers
 *   are removed.
 * - `*action*` beats are separated with blank lines; stray all-asterisk lines
 *   and 3+ blank-line runs are collapsed, matching the normal player turn style.
 *
 * Ordinary dialogue and narration (`[...]`) are left untouched.
 */
export function normalizeImpersonatedPlayerTurn(value: string, playerName = ""): string {
  let text = value.trim();
  if (!text) return text;

  const multiWordLabels = PLAYER_TURN_HEADER_LABELS
    .filter((label) => /\s/.test(label))
    .map(escapeRegExp)
    .join("|");
  const nameLabel = escapeRegExp(playerName.trim());
  const singleLabels = ["player", "user", nameLabel].filter(Boolean).join("|");

  // A wrapper header line is one whose whole content is the label (with or
  // without a trailing colon): "player user message:", "Player:", "<|user|>".
  const headerLine = new RegExp(
    `^\\s*(?:<\\s*\\|?(?:user|player|system)\\|?\\s*>\\s*)?(?:${multiWordLabels})\\s*[:：]?\\s*$`,
    "i",
  );
  const singleLine = new RegExp(`^\\s*(?:${singleLabels})\\s*[:：]\\s*$`, "i");

  const lines = text.split(/\r?\n/);
  while (lines.length > 0) {
    const first = lines[0];
    if (!first.trim()) {
      lines.shift();
      continue;
    }
    if (headerLine.test(first) || singleLine.test(first)) {
      lines.shift();
      continue;
    }
    break;
  }
  text = lines.join("\n").trim();

  // A label glued to the first beat on the same line: "player user message: *I look*".
  const gluedLabel = new RegExp(
    `^\\s*(?:<\\s*\\|?(?:user|player|system)\\|?\\s*>\\s*)?(?:${multiWordLabels}|${singleLabels})\\s*[:：]\\s*`,
    "i",
  );
  text = text.replace(gluedLabel, "").trim();

  // Remove any remaining wrapper marker tags.
  text = text
    .replace(/<\s*\|?(?:user|player|system)\|?\s*>/gi, "")
    .trim();

  // Normalize roleplay beat spacing (same conventions as a normal player turn).
  text = text
    .replace(/\s*(?<!\*)(\*[^*]+\*)(?!\*)\s*/g, "\n\n$1\n\n")
    .replace(/^\s*(?:\*\s*)+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
