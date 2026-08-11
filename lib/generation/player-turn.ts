// Player Turn formatter — deterministically normalize an impersonated
// (model-generated) player turn before it is committed to the conversation.
//
// NovelAI/Ollama sometimes echo a chat-style wrapper or control header in front
// of the generated player turn (e.g. "player user message:", "Player:", "<|user|>")
// or a `<label>` prefix, or return bare first-person prose with no roleplay
// markup at all. This module turns any of that output into a uniform roleplay
// player turn WITHOUT relying on prompt compliance:
//
// - Spoken dialogue is wrapped in double quotes: "I don't know, maybe we should leave."
// - Physical actions / narration are wrapped in single asterisks: *I reach for the door.*
// - Mixed turns become separate, blank-line separated paragraphs.
// - Generation wrappers (chat labels, <|user|>, /nothink, control tags) are stripped.
// - Already-correct markup is preserved (idempotent): existing *action*, "dialogue"
//   and [inner voice] units are kept verbatim, never double-wrapped.
//
// This is applied to every impersonation path (blank-start, normal, rerun, and
// server-side continuation) so the stored player turn is normalized regardless
// of how the model phrases it.

export const PLAYER_TURN_HEADER_LABELS = [
  "player user message",
  "player message",
  "user message",
  "message",
  "player",
  "user",
] as const;

type PlayerPartKind = "action" | "dialogue" | "narration" | "raw";

interface PlayerUnit {
  type: PlayerPartKind;
  inner: string;
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

/** First-person physical action / narration verbs. */
const ACTION_CUE_RE = /^(?:i|my)\s+(?:look|watch|study|gaze|glance|stare|turn|lean|step|walk|reach|grabb?|grip|take|hold|pull|push|open|close|plant|fold|cross|raise|lower|shake|nod|move|stand|sit|sat|rise|kneel|settle|shift|breathe|sigh|exhale|inhale|blink|swallow|point|pick|set|drop|draw|touch|brush|head|follow|pause|caught|catch|slip|inch|edge|climb|peer|scan|press|nudge|lift|trace|tuck|clench|flex|flinch|hesitate|guide|steady|stoop|pivot|twist|bend|crouch|scoop|creep|amble|stride|saunter|wade|sink|block|shield|gather|collect|tug|haul|carry|cradle|angle|wait|stop|freeze|stiffen|grab|hug|unclasp|linger|hover|drift)\b/i;

/** Spoken-dialogue cues: second-person address, imperatives, reported questions. */
const DIALOGUE_CUE_RE = new RegExp(
  "\\b(?:maybe we should|we should|we could|we have to|let'?s|let us|how about|what if|" +
    "why don'?t|do you|don'?t you|can you|will you|would you|could you|are you|did you|" +
    "you know|you hear|you see|you said|you asked|you promised|trust me|believe me|" +
    "listen to me|look at me|please|i want you|i need you|i'm|i'll|you're|you are|" +
    "you've|you'll|you'd|i think|i thought|i believe|i hope|i wish|i know|" +
    "i don'?t know|i don'?t think|right\\?)\\b|" +
    "^(?:trust|wait|listen|stop|come|go|stay|watch|please|let|don'?t|yes|no|never|" +
    "maybe|perhaps|sure|fine|hey|look at me)\\b|" +
    "\\?\\s*$",
  "i",
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

function classifySentence(sentence: string): "action" | "dialogue" {
  if (ACTION_CUE_RE.test(sentence)) return "action";
  if (DIALOGUE_CUE_RE.test(sentence)) return "dialogue";
  return "action";
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

function renderUnit(unit: PlayerUnit, parts: string[]): void {
  switch (unit.type) {
    case "action": {
      const inner = normalizeInner(unit.inner);
      if (inner) parts.push(`*${inner}*`);
      return;
    }
    case "dialogue": {
      const inner = normalizeInner(unit.inner);
      if (inner) parts.push(`"${inner}"`);
      return;
    }
    case "narration": {
      const inner = normalizeInner(unit.inner);
      if (inner) parts.push(`[${inner}]`);
      return;
    }
    case "raw":
      break;
  }

  for (const sentence of splitSentences(unit.inner)) {
    for (const part of decomposeSpeech(sentence)) {
      const inner = normalizeInner(part.text);
      if (!inner) continue;
      const kind = part.dialogue ? "dialogue" : classifySentence(inner);
      parts.push(kind === "dialogue" ? `"${inner}"` : `*${inner}*`);
    }
  }
}

/**
 * Deterministically normalize a model-generated player turn to roleplay markup:
 *
 * - spoken dialogue → "…" (double quotes)
 * - player action / narration → *…* (single asterisks)
 * - each beat on its own paragraph (blank-line separated)
 * - generation wrappers stripped, already-correct markup preserved verbatim
 */
export function formatPlayerTurn(value: string, playerName = ""): string {
  const text = stripControlResidue(value, playerName);
  if (!text) return text;

  const unitRe = /\*([^*\n]+)\*|([“"])([^“”"\n]+?)\2|\[([^\]\n]+)\]|[^*“”"\[\]\n]+/g;

  const parts: string[] = [];
  for (const match of text.matchAll(unitRe)) {
    if (match[0].length === 0) continue;
    if (match[1] !== undefined) {
      renderUnit({ type: "action", inner: match[1] }, parts);
    } else if (match[2] !== undefined) {
      renderUnit({ type: "dialogue", inner: match[3] }, parts);
    } else if (match[4] !== undefined) {
      renderUnit({ type: "narration", inner: match[4] }, parts);
    } else {
      const raw = match[0].trim();
      if (raw) renderUnit({ type: "raw", inner: raw }, parts);
    }
  }

  if (parts.length === 0) return text;
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Backwards-compatible alias; use `formatPlayerTurn` for new code.
 * @deprecated
 */
export function normalizeImpersonatedPlayerTurn(value: string, playerName = ""): string {
  return formatPlayerTurn(value, playerName);
}