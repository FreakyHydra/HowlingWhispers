// Extraction of ad-hoc story metadata blocks from AI roleplay replies.
//
// Some local models occasionally append a short structured footer to a reply
// describing the scene state, for example:
//
//   [
//   Tags
//   home, night;
//
//   Mood
//   guarded
//   ]
//
// or the compact colon form:
//
//   [Tags: home, night; Mood: guarded]
//
// That footer is model-generated drift, not part of the roleplay text. This
// module recognises only clearly structured metadata (a known field name used
// as a heading) and strips it so the stored/displayed text stays pure
// narrative, while preserving the parsed fields for future scene/mood/chapter
// logic.
//
// The parse is deliberately conservative: ordinary bracketed narration such
// as `[she hesitates]`, `[inner voice]`, or `[door closes]` is never treated
// as metadata. A stray opening bracket is only stripped when what follows is
// recognisably the start of a metadata footer.

export type StoryMetadataKey =
  | "tags"
  | "mood"
  | "emotion"
  | "scene"
  | "location"
  | "setting"
  | "weather"
  | "time"
  | "chapter"
  | "status";

export type StoryMetadata = {
  tags?: string[];
} & {
  [K in Exclude<StoryMetadataKey, "tags">]?: string;
} & {
  [key: string]: string | string[] | undefined;
};

export type StoryMetadataResult = {
  text: string;
  metadata: StoryMetadata | null;
};

// A field heading must be a standalone keyword (never glued onto a word) that
// is followed by either a colon, a semicolon, a line break, or the end of the
// block. This keeps prose like `Mood was dark` or `Time is short` untouched
// while recognising heading-style fields.
const FIELD_HEADING =
  /(?<![A-Za-z0-9])(?:tags?|mood|emotion|scene|location|setting|weather|time|chapter|status)(?=\s*[:;]|\s*$|\s*\n)/gi;

const NORMALIZED_KEYS: Record<string, StoryMetadataKey> = {
  tag: "tags",
  tags: "tags",
  mood: "mood",
  emotion: "emotion",
  scene: "scene",
  location: "location",
  setting: "setting",
  weather: "weather",
  time: "time",
  chapter: "chapter",
  status: "status",
};

/** Split a raw tags value ("home, night; forest") into clean tags. */
function splitTags(value: string): string[] {
  return value
    .replace(/[;]+$/g, "")
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Interpret the inside of one bracket block as story metadata.
 *
 * Returns null when the block is ordinary narration, or the parsed metadata
 * when the block is clearly a structured footer. `unclosed` marks blocks that
 * were truncated by the end of the reply (no closing bracket); those are
 * accepted even when only a hanging keyword remains.
 *
 * A single heading followed by a short prose sentence in brackets (for example
 * `[location: the map is here]`) is treated as ordinary narration and kept,
 * because the block otherwise reads like a sentence. Structured footers need
 * either several headings, separators such as `;`/`,`, or a terse value.
 */
function interpretBlock(inner: string, unclosed: boolean): StoryMetadata | null {
  const headings = [...inner.matchAll(FIELD_HEADING)];
  if (headings.length === 0) return null;

  // Split the block into key/value pairs at heading boundaries. The value of a
  // heading runs until the next heading (or the end of the block).
  const pairs: { key: StoryMetadataKey; value: string }[] = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading.index === undefined) continue;
    const key = NORMALIZED_KEYS[heading[0].toLowerCase()];
    if (!key) continue;

    const valueStart = heading.index + heading[0].length;
    const next = headings[index + 1];
    const valueEnd = next && next.index !== undefined ? next.index : inner.length;
    const segment = inner.slice(valueStart, valueEnd);

    // Remove a leading separator and any line breaks that separate the heading
    // from its value, then trailing separators.
    const value = segment
      .replace(/^[\s:;,]+/, "")
      .replace(/[\s,;]+$/, "")
      .trim();

    if (value) pairs.push({ key, value });
  }

  if (pairs.length === 0) {
    // Nothing beyond a heading? Only accept that when the block literally is a
    // footer keyword with no closing fence (truncated by the reply end).
    return unclosed ? {} : null;
  }

  // Conservative acceptance: require more than one field, a separator within a
  // value (`,` or `;`), or a terse single value (< 4 words). A single heading
  // with a long prose value is narration, e.g. `[location: the map is here]`.
  const distinct = new Set(pairs.map((pair) => pair.key));
  const hasSeparator = pairs.some((pair) => /[,;]/.test(pair.value));
  const terseSingle = distinct.size === 1 && pairs.length === 1 && countWords(pairs[0].value) <= 3;
  if (distinct.size < 2 && !hasSeparator && !terseSingle) return null;

  const result: StoryMetadata = {};
  for (const { key, value } of pairs) {
    if (key === "tags") {
      const parsed = splitTags(value);
      result.tags = [...(result.tags ?? []), ...parsed];
    } else {
      result[key] = value;
    }
  }
  return result;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Remove recognised story-metadata footer blocks from a reply.
 *
 * Returns the remaining roleplay text plus the merged structured metadata.
 * Multiple metadata blocks in one reply are all stripped and merged into a
 * single StoryMetadata object (repeated fields append; `tags` de-duplicates).
 *
 * Non-metadata bracketed narration (`[she hesitates]`) is preserved exactly.
 */
export function parseStoryMetadata(text: string): StoryMetadataResult {
  if (!text || !text.includes("[")) return { text, metadata: null };

  let output = text;
  let scanIndex = 0;
  const merged: StoryMetadata = {};

  while (scanIndex < output.length) {
    const open = output.indexOf("[", scanIndex);
    if (open < 0) break;

    const close = output.indexOf("]", open + 1);
    const unclosed = close < 0;
    const inner = unclosed
      ? output.slice(open + 1)
      : output.slice(open + 1, close);

    const parsed = interpretBlock(inner, unclosed);
    if (parsed) {
      for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined) continue;
        if (key === "tags") {
          const base = merged.tags ?? [];
          for (const tag of value as string[]) {
            if (tag && !base.includes(tag)) base.push(tag);
          }
          merged.tags = base;
        } else {
          merged[key] = value as string;
        }
      }
      const removeEnd = unclosed ? output.length : close + 1;
      output = output.slice(0, open) + output.slice(removeEnd);
      scanIndex = open;
      continue;
    }

    scanIndex = unclosed ? output.length : close + 1;
  }

  const textOnly = output.replace(/\n{3,}/g, "\n\n").trim();
  const hasMetadata =
    (merged.tags?.length ?? 0) > 0 ||
    Object.entries(merged).some(([key, value]) => key !== "tags" && Boolean(value));
  return { text: textOnly, metadata: hasMetadata ? merged : null };
}