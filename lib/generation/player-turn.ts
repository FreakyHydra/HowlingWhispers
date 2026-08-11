// Player Turn formatter — deterministically normalize an impersonated
// (model-generated) player turn before it is committed to the conversation.
//
// NovelAI/Ollama sometimes echo a chat-style wrapper or control header in front
// of the generated player turn (e.g. "player user message:", "Player:", "<|user|>")
// or a `<label>` prefix, or return bare first-person prose with no roleplay
// markup at all. This module turns that output into uniform roleplay markup:
//
// - Spoken / conversational dialogue → "…" (double quotes)
// - Player physical/narrative action → *…* (single asterisks)
// - Generation wrappers (chat labels, <|user|>, /nothink, control tags) are stripped
// - Paragraph structure from the input is preserved; type changes stay inline
// - Already-correct markup is preserved verbatim (idempotent)
//
// Classification principle (deliberate, not a phrase list):
//   First-person grammar ("I", "I'm", "I'll", "we", …) is NOT an action signal.
//   A span is action/narration only when it contains strong physical/narrative
//   evidence (a body-movement verb, a gaze, a player-state narration). Everything
//   else — statements, questions, commands, opinions, reported speech — defaults
//   to dialogue, because falsely italicizing speech damages the roleplay more than
//   leaving an occasional action unwrapped.

export const PLAYER_TURN_HEADER_LABELS = [
  "player user message",
  "player message",
  "user message",
  "message",
  "player",
  "user",
] as const;

type SpanType = "action" | "dialogue" | "narration";

interface Span {
  type: SpanType;
  text: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove leading/glued generation wrappers and control markers from the raw
 * model output. Never touches the AI character's name labels (those are left
 * for `isInvalidImpersonationDraft` to reject the whole turn).
 */
function stripControlResidue(value: string, playerName = ""): string {
  const multiWordLabels = PLAYER_TURN_HEADER_LABELS
    .filter((label) => /\s/.test(label))
    .map(escapeRegExp)
    .join("|");
  const nameLabel = escapeRegExp(playerName.trim());
  const singleLabels = ["player", "user", nameLabel].filter(Boolean).join("|");

  const headerLine = new RegExp(
    `^\\s*(?:<\\s*\\|?(?:user|player|system|assistant)\\|?\\s*>\\s*)?(?:${multiWordLabels})\\s*[:：]?\\s*$`,
    "i",
  );
  const singleLine = new RegExp(`^\\s*(?:${singleLabels})\\s*[:：]\\s*$`, "i");

  const lines = value.split(/\r?\n/);
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
  let text = lines.join("\n").trim();

  const gluedLabel = new RegExp(
    `^\\s*(?:<\\s*\\|?(?:user|player|system|assistant)\\|?\\s*>\\s*)?(?:${multiWordLabels}|${singleLabels})\\s*[:：]\\s*`,
    "i",
  );
  text = text.replace(gluedLabel, "").trim();

  text = text
    .replace(/<\s*\|?(?:user|player|system|assistant)\|?\s*>/gi, "")
    .replace(/<\/?(?:character_reply|player_reply|message|assistant|system|scene|response)[^>]*>/gi, "")
    .replace(/<\|(?:user|assistant)\|>/gi, "")
    .replace(/\n\s*\/nothink\s*/gi, "\n")
    .trim();

  return text;
}

/**
 * Strong physical/narrative action verbs (with s/ed/ing forms and the common
 * irregular pasts). Deliberately excludes verbs that are usually conversational
 * or mental (know, think, want, try, came, wonder, believe, guess, hope…).
 */
const PHYSICAL_ACTION_VERBS = [
  "stand", "step", "walk", "run", "reach", "pull", "push", "open", "close", "grab",
  "grip", "take", "hold", "sit", "kneel", "lean", "turn", "rise", "move", "lift",
  "set", "place", "drop", "point", "gesture", "nod", "shake", "smile", "frown",
  "glance", "stare", "peer", "draw", "touch", "press", "slide", "climb", "slip",
  "tuck", "fold", "cross", "raise", "lower", "head", "follow", "shrug", "settle",
  "toss", "scoop", "pick", "brush", "freeze", "pause", "crouch", "bend", "stretch",
  "stop", "wave", "grasp", "clench", "flex", "swallow", "breathe", "inhale",
  "exhale", "sigh", "watch", "gaze", "wander", "stride", "amble", "linger", "drift",
  "stoop", "pivot", "twist", "snatch", "seize", "haul", "carry", "steady", "plant",
  "hop", "tread", "march", "pace", "edge", "creep", "sprint", "jog", "stomp",
  "slump", "straighten", "loosen", "tilt", "angle", "curl", "fidget", "stiffen",
  "wince", "shrug", "shove", "gather", "collect", "grip",
];

const IRREGULAR_ACTION_PASTS: Record<string, string> = {
  stand: "stood",
  sit: "sat",
  run: "ran",
  take: "took",
  hold: "held",
  shake: "shook",
  draw: "drew",
  bend: "bent",
  freeze: "froze",
  rise: "rose",
  slide: "slid",
  kneel: "knelt",
  lean: "leant|leaned",
  catch: "caught",
  swing: "swung",
  creep: "crept",
  sling: "slung",
  flee: "fled",
  spring: "sprang",
};

function buildActionVerbPattern(): string {
  const forms: string[] = [];
  for (const verb of PHYSICAL_ACTION_VERBS) {
    forms.push(verb, `${verb}s`, `${verb}ed`, `${verb}ing`);
    const irregular = IRREGULAR_ACTION_PASTS[verb];
    if (irregular) {
      for (const form of irregular.split("|")) forms.push(form);
    }
  }
  return forms.join("|");
}

/**
 * Conversational idioms that happen to use action verbs but are spoken, not
 * physical behavior. A small overrides set, not a phrase-based classifier.
 */
const CONVERSATIONAL_IDIOM_RE = /\b(?:i|we)\s+(?:stand corrected|take it|take that|point out|hold that|shake on|draw a line|breathe a word)\b/i;

const ACTION_VERB_PATTERN = buildActionVerbPattern();

const PHYSICAL_ACTION_RE = new RegExp(
  `\\b(?:i|we)\\s+(?:\\w+\\s+){0,2}(?:${ACTION_VERB_PATTERN})\\b|` +
    `\\b(?:i|we)\\s+(?:\\w+\\s+){0,2}look(?:s|ed|ing)?\\s+(?:at|over|up|down|around|away|toward|towards)\\b|` +
    `\\bkeep(?:s|ing)?\\s+(?:my|your)\\s+eyes\\b|` +
    `\\bmy\\s+(?:tone|voice|hands|fingers|heart|stomach|chest|shoulders|breath|grip|eyes|jaw|smile|body|head|arms|legs|skin|back|throat|chin|brow|foot|knee)\\s+(?:is|are|was|were|feels?|sounds?|looks?|shakes?|trembles?|tightens?|pounds?|steadies?|wavers?|drops?|rises?|quickens?|softens?|hardens?|falters?)\\b`,
  "i",
);

function isPhysicalAction(sentence: string): boolean {
  if (/\?\s*$/.test(sentence)) return false;
  if (CONVERSATIONAL_IDIOM_RE.test(sentence)) return false;
  return PHYSICAL_ACTION_RE.test(sentence);
}

function classifySentence(sentence: string): SpanType {
  return isPhysicalAction(sentence) ? "action" : "dialogue";
}

const SPEECH_VERBS =
  "said|say|says|ask|asked|asks|reply|replied|replies|whisper|whispered|whispers|" +
  "called|call|calls|told|tell|tells|mutter|muttered|murmur|murmured|shout|shouted|" +
  "admit|admitted|suggest|suggested|offer|offered|answer|answered|demand|demanded|" +
  "insist|insisted|confess|confessed|warn|warned|repeat|repeated|echo|echoed";

/**
 * Match a first-person speech frame such as "… and say, Trust me." so an action
 * clause with an embedded quote is split into its parts instead of being quoted
 * as a whole.
 */
const SPEECH_FRAME_RE = new RegExp(
  `(?:^|[\\s,;:—–])+(?:i|we|you)?\\s*(?:${SPEECH_VERBS})\\s*(?:,|:)\\s*[\“‘"”…]*`,
  "gi",
);

/** Split a sentence at embedded speech frames, marking the spoken parts. */
function decomposeSpeech(sentence: string): Array<{ text: string; dialogue: boolean }> {
  const parts: Array<{ text: string; dialogue: boolean }> = [];
  let last = 0;
  let dialogue = false;
  for (const match of sentence.matchAll(SPEECH_FRAME_RE)) {
    if (match.index === undefined) continue;
    if (match.index > last) {
      parts.push({
        text: sentence
          .slice(last, match.index)
          .replace(/\s+(?:and|then|but|so)\s*$/i, "")
          .replace(/[\s,;:—–]+$/g, ""),
        dialogue,
      });
    }
    dialogue = true;
    last = match.index + match[0].length;
  }
  if (last < sentence.length) {
    parts.push({ text: sentence.slice(last), dialogue });
  }
  return parts.length > 0 ? parts : [{ text: sentence, dialogue: false }];
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+(?=[“"*([…A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeInner(value: string): string {
  return value
    .trim()
    .replace(/^[*“”"']+|[*“”"']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize one paragraph into classified spans, then merge adjacent spans of
 * the same type so consecutive action or dialogue sentences stay in one unit.
 */
function classifyParagraph(paragraph: string): Span[] {
  const unitRe = /\*([^*\n]+)\*|([“"])([^“”"\n]+?)\2|\[([^\]\n]+)\]|[^*“”"\[\]\n]+/g;

  const spans: Span[] = [];
  for (const match of paragraph.matchAll(unitRe)) {
    if (match[1] !== undefined) {
      const text = normalizeInner(match[1]);
      if (text) spans.push({ type: "action", text });
    } else if (match[2] !== undefined) {
      const text = normalizeInner(match[3]);
      if (text) spans.push({ type: "dialogue", text });
    } else if (match[4] !== undefined) {
      const text = normalizeInner(match[4]);
      if (text) spans.push({ type: "narration", text });
    } else {
      const raw = match[0].trim();
      if (!raw) continue;
      for (const sentence of splitSentences(raw)) {
        for (const part of decomposeSpeech(sentence)) {
          const text = normalizeInner(part.text);
          if (!text) continue;
          spans.push({ type: part.dialogue ? "dialogue" : classifySentence(text), text });
        }
      }
    }
  }

  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && last.type === span.type) {
      last.text = `${last.text} ${span.text}`;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function renderSpans(spans: Span[]): string {
  return spans
    .map((span) => {
      if (span.type === "action") return `*${span.text}*`;
      if (span.type === "dialogue") return `"${span.text}"`;
      return `[${span.text}]`;
    })
    .join(" ");
}

/**
 * Deterministic leak boundary: strip leading paragraphs that are clearly
 * model meta-output / instruction echoing before the first genuine RP content.
 *
 * A paragraph is treated as meta if it contains strong meta indicators and
 * contains no roleplay markers (*…*, "…", […] ) and no physical action evidence.
 * Ambiguous first-person prose without meta indicators is preserved as dialogue.
 */
export function stripLeadingMetaParagraphs(text: string): string {
  const META_LEAD_RE = /\b(?:obey the private direction|private direction|response must|formatting rules|plain text(?: without| for dialogue| and no)|quotation marks|blank lines between|single asterisks|double asterisks|output format|return only the next|write exactly one|this turn will be posted|mandatory control input|internal instruction|roleplay markup|segment\b|json\b|do not pad|do not invent|never write the character|never begin the turn|write the line|exactly as instructed|follow the formatting|player turn|first-person|analysis|planning|metadata|prompt text|character-card|memory blocks|chat-history markup|private reasoning|generation metadata)\b|^I need to obey|^I will simply write|^I must avoid|^I will ensure|^The response must|^I should/i;
  const DIALOGUE_INDICATOR_RE = /\?\s*$|\b(?:you|your|you're|you've|you'll)\b|\blet'?s\b|\b(?:trust me|believe me|listen to me|look at me|please)\b|^(?:trust|wait|listen|stop|come|go|stay|watch|please|let|don'?t|yes|no|never|maybe|perhaps|sure|fine|hey)\b|^I\s+(?:said|told)\b|^I\s+came\s+(?:here|in|over|back)?\s+to\s+(?:say|tell|ask|apologize|thank|warn|insist)\b/i;

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return text;

  const kept: string[] = [];
  let foundStart = false;

  for (const paragraph of paragraphs) {
    if (foundStart) {
      kept.push(paragraph);
      continue;
    }

    if (/[*“”"\[\]]/.test(paragraph)) {
      kept.push(paragraph);
      foundStart = true;
      continue;
    }

    if (PHYSICAL_ACTION_RE.test(paragraph)) {
      kept.push(paragraph);
      foundStart = true;
      continue;
    }

    if (DIALOGUE_INDICATOR_RE.test(paragraph)) {
      kept.push(paragraph);
      foundStart = true;
      continue;
    }

    if (META_LEAD_RE.test(paragraph)) {
      continue;
    }

    kept.push(paragraph);
    foundStart = true;
  }

  return kept.length > 0 ? kept.join("\n\n") : text;
}

/**
 * Deterministically normalize a model-generated player turn:
 *
 * - preserve the paragraph structure of the input (each input line / blank-line
 *   group stays its own paragraph)
 * - within a paragraph, wrap dialogue in "…", action/narration in *…*, merging
 *   adjacent spans of the same type, and keep type changes inline
 * - strip generation wrappers; leave already-correct markup untouched
 */
export function formatPlayerTurn(value: string, playerName = ""): string {
  const text = stripControlResidue(value, playerName);
  if (!text) return text;

  const source = stripLeadingMetaParagraphs(text);

  const paragraphs = source.split(/\r?\n+/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length === 0) return text;

  const rendered: string[] = [];
  for (const paragraph of paragraphs) {
    const spans = classifyParagraph(paragraph);
    if (spans.length === 0) continue;
    rendered.push(renderSpans(spans));
  }

  if (rendered.length === 0) return text;
  return rendered.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Backwards-compatible alias; use `formatPlayerTurn` for new code.
 * @deprecated
 */
export function normalizeImpersonatedPlayerTurn(value: string, playerName = ""): string {
  return formatPlayerTurn(value, playerName);
}