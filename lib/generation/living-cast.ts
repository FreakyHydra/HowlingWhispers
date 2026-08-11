// Living Cast — per-conversation presence tracking and cheap detection.
//
// This is the "Basic heuristic fallback" tier of Story Intelligence: it never
// spends an AI request. It watches the conversation for new names, presence
// verbs (entered / arrived / left …), and unresolved direct questions, and
// produces the compact [ACTIVE CAST] / [PENDING INTERACTION] block that the
// roleplay model consumes. The same pure logic runs client-side (to persist
// state per session) and server-side (to render the authoritative prompt block).

export type CastOrigin = "player" | "permanent" | "temporary";
export type CastPresence = "active" | "mentioned" | "absent";

export type LivingCastEntry = {
  id: string;
  name: string;
  origin: CastOrigin;
  presence: CastPresence;
  primary?: boolean;
  addedAt: number;
  updatedAt: number;
  notes: string[];
  relationships: Array<{ target: string; descriptor: string }>;
};

export type CastMessage = {
  sender: "character" | "player" | "narrator";
  text: string;
  speaker?: string;
};

export type PendingInteraction = {
  kind: "player" | "cast";
  asker: string;
  targetId: string | null;
  targetName: string | null;
};

export type CastDetectionResult = {
  cast: LivingCastEntry[];
  newNames: string[];
  events: string[];
  pending: PendingInteraction | null;
  autoSpeakerId: string | null;
  autoSpeakerName: string | null;
};

/** One automatic side-character reply per player turn blocks NPC runaways. */
export const AUTO_SIDE_REPLY_MAX_CONSECUTIVE = 1;

const MAX_CAST_MEMBERS = 24;
const MAX_NOTES_PER_MEMBER = 6;
const MAX_NOTE_LENGTH = 200;
const MAX_RELATIONSHIPS_PER_MEMBER = 20;

const STOPWORDS = new Set([
  "i", "the", "a", "an", "you", "your", "youre", "he", "she", "they", "we", "it",
  "my", "me", "this", "that", "these", "those", "there", "here", "now", "so",
  "then", "and", "but", "or", "if", "him", "his", "her", "its", "our", "their",
  "us", "them", "with", "from", "into", "onto", "upon", "over", "under", "through",
  "to", "of", "in", "on", "at", "by", "for", "not", "no", "yes", "well", "oh",
  "hey", "wait", "look", "come", "listen", "really", "just", "like", "one", "two",
  "right", "sure", "okay", "fine", "good", "great", "miss", "mrs", "mr", "sir",
  "boy", "girl", "man", "woman", "kid", "son", "daughter", "she", "herself",
  "himself", "myself", "yourself",
  "did", "do", "does", "was", "were", "been", "having", "going", "went", "go",
  "has", "have", "had", "would", "should", "could", "will", "shall", "can",
  "as", "at", "before", "after", "between", "while", "during", "because",
  "why", "what", "when", "where", "who", "whom", "whose", "which", "how",
  "tell", "told", "both", "jail", "got", "get", "gets", "getting", "said",
  "says", "ask", "asked", "asks", "asked", "thought", "think", "wanted",
  "first", "last", "next", "again", "only", "too", "also", "still", "even",
  "every", "any", "some", "all", "each", "few",
]);

const ARRIVAL_VERB =
  /\b(?:enter(?:s|ed|ing)?|arrive(?:s|d)?|joining|joined|joins|follow(?:s|ed)?|has come|came in|comes? in|walk(?:s|ed)? in|step(?:s|ed)? in|strode in|return(?:s|ed)?|got back|came back|showed? up|shows? up|brings?|brought|accompan(?:ies|ied|ying)|head(?:s|ed)? in|came over|walks? over|stepped? over|appear(?:s|ed)?)\b/i;

const DEPARTURE_VERB =
/\b(?:leaves?|left|leaving|depart(?:s|ed)?|exits?|exited|exit|step(?:s|ed)? out|walk(?:s|ed)? out|walk(?:s|ed)? away|headed? out|go(?:es)? out|went out|ran? away|runs? off|took off|withdrew|withdraw(?:s|ing)?|slips? away|slipped out|as good as gone)\b/i;

const QUESTION_MARKER =
  /[?？]|\b(?:ask(?:s|ed|ing)?|question|answer|anyone|someone|wonder(?:s|ed|ing)?|request(?:s|ed)?|do you|did you|can you|could you|would you|will you|know why|know what|know who|heard|find out)\b/i;

const INTERROGATIVE_WORDS = new Set([
  "?", "ask", "asked", "asks", "asking", "question", "answer", "anyone", "someone",
  "who", "what", "when", "where", "why", "how", "could", "can", "would", "will",
  "should", "know", "wonder", "wonders", "wondered", "wondering", "request", "requested",
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable id for a display name. */
export function castKey(name: string): string {
  return name.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

/** True when two display names refer to the same cast member. */
export function matchesName(left: string, right: string): boolean {
  return castKey(left) === castKey(right);
}

const NAME_TOKEN_RE = /\b([A-Z][a-z]{1,})\b/g;

function countOccurrences(text: string, token: string): number {
  if (!token) return 0;
  return (text.match(new RegExp(`\\b${escapeRegex(token)}\\b`, "g")) ?? []).length;
}

/** Is this capitalized token capitalized mid-sentence (not just at a sentence start)? */
function isMidSentenceCapitalization(text: string, token: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(token)}\\b`, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    let cursor = match.index - 1;
    while (cursor >= 0 && /\s/.test(text[cursor])) cursor -= 1;
    const before = cursor >= 0 ? text[cursor] : "";
    if (before && /[^\s]/.test(before) && !/[.!?;:…\n]/.test(before)) {
      return true;
    }
  }
  return false;
}

const INTRODUCTION_PATTERN =
  /\b(?:this is|these are|meet|introduc(?:e|es|ed|ing)|say[ing]? hi to|say[ing]? hello to|named|called)\s+/i;

const ARRIVAL_CONTEXT_PATTERN =
  /\b(?:enter(?:s|ed|ing)?|arrive(?:s|d)?|joins?|joining|follow(?:s|ed)?|accompan(?:ies|ied|ying)|stepped? (?:in|into)|walk(?:s|ed)? (?:in|into)|came (?:in|into|through)|makes? (?:their|his|her) way in|shows? up)\b|\bwith\s+/i;

const SPEECH_ATTRIBUTION_PATTERN =
  /\b(?:said|says|asked|asks|replied|replies|answered|answers|whispered|whispers|shouted|shouts|called|call|murmured|murmurs|began|started|continued|added|laugh(?:ed)?|sighed)\b/i;

/** Would a name "$token" be rejected merely for being a common word? */
export function isCommonNameShapedToken(token: string): boolean {
  const lower = token.toLocaleLowerCase("en-US");
  return STOPWORDS.has(lower);
}

/** Would a cast identity fail the ownership gate for autonomous state? */
export function isRejectedAutonomyIdentity(entry: { id?: string; name?: string }): boolean {
  const name = (entry.name ?? "").trim();
  if (!name) return true;
  const singleToken = !/\s/.test(name);
  return singleToken && isCommonNameShapedToken(name);
}

function discoverNames(text: string, seekText?: { haystack: string }): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const match of text.matchAll(NAME_TOKEN_RE)) {
    const token = match[1];
    const lowerToken = token.toLocaleLowerCase("en-US");
    if (STOPWORDS.has(lowerToken)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    candidates.push(token);
  }

  // A capitalized token is a name only when at least one of these holds:
  //   1. It is also capitalized mid-sentence somewhere (proper-noun use).
  //   2. It sits in an introduction/arrival/accompaniment frame ("this is Melody",
  //      "…with Melody", "Melody entered", "…named Melody").
  //   3. It has explicit speech attribution ("Melody said", "said Melody").
  //   4. It is referenced repeatedly across the conversation (contextual evidence).
  // Sentence-start capitalization alone is never sufficient — "Did", "Tell",
  // "Both", "Because", "Jail", "What", "Why", "Got" are ordinary words.
  const haystack = seekText?.haystack ?? text;
  const accepted: string[] = [];
  for (const token of candidates) {
    const nameLike = token.replace(/[^A-Za-z]/g, "");
    if (nameLike.length < 2) continue;
    if (isCommonNameShapedToken(token)) continue;

    const midSentence = isMidSentenceCapitalization(haystack, nameLike);
    const intro = INTRODUCTION_PATTERN.test(text)
      && new RegExp(`\\b(?:this is|these are|meet|named|called|introduc\\w*|saying? hi to|saying? hello to)\\s+${escapeRegex(nameLike)}\\b`, "i").test(text);
    const arrival = ARRIVAL_CONTEXT_PATTERN.test(text)
      && new RegExp(
        `(?:\\bwith\\s+${escapeRegex(nameLike)}\\b|\\b(?:${escapeRegex(nameLike)})\\s+(?:enter(?:s|ed|ing)?|arrive(?:s|d)?|joins?|joining|follow(?:s|ed)?|accompan(?:ies|ied|ying)|came (?:in|into|through)|walk(?:s|ed)? (?:in|into)|step(?:s|ed)? (?:in|into)|makes? (?:their|his|her) way in|showed? up|return(?:s|ed)?)\\b|\\b(?:enter(?:s|ed|ing)?|arrive(?:s|d)?|joins?|joining|follow(?:s|ed)?|accompan(?:ies|ied|ying))\\s+${escapeRegex(nameLike)}\\b)`,
        "i",
      ).test(text);
    const attribution = SPEECH_ATTRIBUTION_PATTERN.test(text)
      && new RegExp(
        `(?:${escapeRegex(nameLike)}\\s+(?:said|says|asked|asks|replied|replies|answered|answers|whispered|whispers|shouted|shouts|called|call|murmured|murmurs|began|started|continued|added|sighed|laugh(?:ed|s)?)\\b|\\b(?:said|asked|replied|whispered|called)\\s+${escapeRegex(nameLike)}\\b)`,
        "i",
      ).test(text);

    const repeatedContext = countOccurrences(haystack, nameLike) >= 3
      && (midSentence || intro || arrival || attribution);

    if (!midSentence && !intro && !arrival && !attribution && !repeatedContext) continue;
    accepted.push(token);
  }
  return accepted;
}

function presenceVerbKind(value: string): "arrival" | "departure" | null {
  const text = value.toLocaleLowerCase("en-US");
  if (ARRIVAL_VERB.test(text)) return "arrival";
  if (DEPARTURE_VERB.test(text)) return "departure";
  return null;
}

function mentionsMember(text: string, member: { name: string }): boolean {
  const hay = text.toLocaleLowerCase("en-US");
  const full = member.name.trim().toLocaleLowerCase("en-US");
  if (!full) return false;
  if (hay.includes(full)) return true;
  const firstToken = full.split(/\s+/)[0];
  if (firstToken.length >= 3 && new RegExp(`\\b${escapeRegex(firstToken)}\\b`).test(hay)) return true;
  return false;
}

function sentenceFor(text: string, token: string): string {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const sentence of sentences) {
    if (new RegExp(`\\b${escapeRegex(token)}\\b`).test(sentence)) return sentence.trim();
  }
  return text.trim();
}

function cleanNote(sentence: string, max = MAX_NOTE_LENGTH): string {
  let cleaned = sentence
    .replace(/\*{1,2}/g, "")
    .replace(/\[|\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  cleaned = cleaned.replace(/^I\s+/, "the player ");
  cleaned = cleaned
    .replace(/^the player (?:enter|enters)\b/, "the player entered")
    .replace(/^the player walks?\b/, "the player walked")
    .replace(/^the player steps?\b/, "the player stepped")
    .replace(/^the player comes?\b/, "the player came")
    .replace(/^the player arrives?\b/, "the player arrived");
  return cleaned.slice(0, max).replace(/\s+[.!?,;:]+$/, "");
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function isQuestionIndicator(word: string): boolean {
  return INTERROGATIVE_WORDS.has(word.toLocaleLowerCase("en-US"));
}

function distanceToQuestion(text: string, member: { name: string }): number | null {
  const words = tokenize(text);
  const firstToken = member.name.split(/\s+/)[0].toLocaleLowerCase("en-US");
  if (firstToken.length < 3) return null;
  let best = Infinity;
  for (let index = 0; index < words.length; index += 1) {
    const clean = words[index].replace(/[^a-zA-Z'’]/g, "").toLocaleLowerCase("en-US");
    if (clean !== firstToken) continue;
    for (let other = 0; other < words.length; other += 1) {
      const cleanOther = words[other].replace(/[^a-zA-Z'’?]/, "").toLocaleLowerCase("en-US");
      if (!isQuestionIndicator(cleanOther)) continue;
      const distance = Math.abs(index - other);
      if (distance < best) best = distance;
    }
  }
  return Number.isFinite(best) ? best : null;
}

function hasQuestionMarker(text: string): boolean {
  const trimmed = text.trim();
  return QUESTION_MARKER.test(trimmed)
    || /^(?:why|what|when|where|who|how|do|does|did|is|are|can|could|would|should|will)\b/i.test(trimmed);
}

/** Seeded cast for a brand-new conversation. */
export function createCast(
  primary: { id?: string; name: string },
  playerName?: string,
  now = Date.now(),
): LivingCastEntry[] {
  const entries: LivingCastEntry[] = [];
  if (playerName?.trim()) {
    entries.push({
      id: castKey(playerName),
      name: playerName.trim().slice(0, 80),
      origin: "player",
      presence: "active",
      addedAt: now,
      updatedAt: now,
      notes: [],
      relationships: [],
    });
  }
  entries.push({
    id: primary.id || castKey(primary.name),
    name: primary.name.trim().slice(0, 80),
    origin: "permanent",
    presence: "active",
    primary: true,
    addedAt: now,
    updatedAt: now,
    notes: [],
    relationships: [],
  });
  return entries;
}

/** Bounded, defensive parse of cast entries. */
export function sanitizeCast(value: unknown): LivingCastEntry[] {
  if (!Array.isArray(value)) return [];
  const out: LivingCastEntry[] = [];
  let primarySeen = false;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim().slice(0, 80) : "";
    if (!name) continue;
    const singleToken = !/\s/.test(name);
    if (singleToken && STOPWORDS.has(name.toLocaleLowerCase("en-US"))) continue;
    const origin: CastOrigin =
      entry.origin === "player" || entry.origin === "permanent" || entry.origin === "temporary"
        ? entry.origin
        : "temporary";
    const presence: CastPresence =
      entry.presence === "active" || entry.presence === "mentioned" || entry.presence === "absent"
        ? entry.presence
        : "mentioned";
    const isPrimaryOrigin = entry.primary === true && origin !== "player";
    const primary = isPrimaryOrigin && !primarySeen;
    if (primary) primarySeen = true;
    const notes = Array.isArray(entry.notes)
      ? entry.notes.filter((note): note is string => typeof note === "string")
        .map((note) => note.trim().slice(0, MAX_NOTE_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_NOTES_PER_MEMBER)
      : [];
    const relationships = Array.isArray(entry.relationships)
      ? entry.relationships
        .filter((rel): rel is Record<string, unknown> => !!rel && typeof rel === "object")
        .map((rel) => ({
          target: typeof rel.target === "string" ? rel.target.slice(0, 80) : "",
          descriptor: typeof rel.descriptor === "string" ? rel.descriptor.slice(0, 160) : "",
        }))
        .filter((rel) => rel.target)
        .slice(0, MAX_RELATIONSHIPS_PER_MEMBER)
      : [];
    const addedAt = typeof entry.addedAt === "number" ? entry.addedAt : Date.now();
    out.push({
      id: typeof entry.id === "string" ? entry.id.slice(0, 120) : castKey(name),
      name,
      origin,
      presence: primary ? "active" : presence,
      primary,
      addedAt,
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : addedAt,
      notes,
      relationships,
    });
    if (out.length >= MAX_CAST_MEMBERS) break;
  }
  return out;
}

function orderCast(cast: LivingCastEntry[]): LivingCastEntry[] {
  return [...cast].sort((left, right) => {
    const leftPrimary = left.primary ? 0 : 1;
    const rightPrimary = right.primary ? 0 : 1;
    if (leftPrimary !== rightPrimary) return leftPrimary - rightPrimary;
    const leftPlayer = left.origin === "player" ? 0 : 1;
    const rightPlayer = right.origin === "player" ? 0 : 1;
    if (leftPlayer !== rightPlayer) return leftPlayer - rightPlayer;
    return left.addedAt - right.addedAt;
  });
}

function intersectCastEntries(
  resolved: LivingCastEntry[],
  known: LivingCastEntry[],
  playerName: string,
  primary: { id?: string; name: string },
) {
  for (const knownEntry of known) {
    if (!resolved.some((entry) => entry.id === knownEntry.id)) {
      resolved.push(knownEntry);
    }
  }
  const primaryEntry = resolved.find((entry) => entry.primary);
  if (!primaryEntry) {
    resolved.push({
      id: primary.id || castKey(primary.name),
      name: primary.name,
      origin: "permanent",
      presence: "active",
      primary: true,
      addedAt: Date.now(),
      updatedAt: Date.now(),
      notes: [],
      relationships: [],
    });
  }
  if (playerName?.trim() && !resolved.some((entry) => matchesName(entry.name, playerName))) {
    resolved.push({
      id: castKey(playerName),
      name: playerName.trim().slice(0, 80),
      origin: "player",
      presence: "active",
      addedAt: Date.now(),
      updatedAt: Date.now(),
      notes: [],
      relationships: [],
    });
  }
}

/**
 * Cheap, deterministic detection pass. Reads the full conversation, updates a
 * working copy of the cast, and reports what changed plus the resolved pending
 * interaction and (when safe) a suggested automatic side-character speaker.
 */
export function detectLivingCast(input: {
  messages: CastMessage[];
  cast: LivingCastEntry[];
  primary: { id?: string; name: string };
  playerName?: string;
  now?: number;
}): CastDetectionResult {
  const now = input.now ?? Date.now();
  const primaryName = input.primary.name.trim();
  const known = sanitizeCast(input.cast);
  const resolved: LivingCastEntry[] = [];
  const events: string[] = [];
  const newNames: string[] = [];
  intersectCastEntries(resolved, known, input.playerName ?? "", input.primary);

  const updateEntry = (id: string, patch: Partial<LivingCastEntry>) => {
    const entry = resolved.find((candidate) => candidate.id === id);
    if (!entry) return;
    Object.assign(entry, patch, { updatedAt: now });
  };

  const conversationText = input.messages.map((message) => message.text ?? "").join("\n");

  for (const message of input.messages) {
    const text = message.text ?? "";
    const candidates = discoverNames(text, { haystack: conversationText });

    for (const token of candidates) {
      if (matchesName(token, primaryName)) continue;
      if (input.playerName?.trim() && matchesName(token, input.playerName)) continue;
      if (resolved.some((entry) => entry.origin !== "player" && mentionsMember(token, { name: entry.name }))) {
        continue;
      }
      const sentence = sentenceFor(text, token);
      const verb = presenceVerbKind(sentence);
      const withArrival = new RegExp(`\\bwith\\s+${escapeRegex(token)}\\b`).test(text);
      const presence: CastPresence =
        verb === "departure" ? "absent" : verb === "arrival" || withArrival ? "active" : "mentioned";
      const id = castKey(token);
      if (!resolved.some((entry) => entry.id === id)) {
        resolved.push({
          id,
          name: token,
          origin: "temporary",
          presence,
          addedAt: now,
          updatedAt: now,
          notes: [cleanNote(sentence)].filter(Boolean),
          relationships: [],
        });
        newNames.push(token);
        events.push(`New temporary character: ${token} (${presence})`);
      }
    }

    for (const entry of resolved) {
      if (entry.origin === "player" || entry.primary) continue;
      if (!mentionsMember(text, entry)) continue;
      const verb = presenceVerbKind(text);
      if (verb === "arrival" && entry.presence !== "active") {
        updateEntry(entry.id, { presence: "active" });
        events.push(`${entry.name} is present`);
      } else if (verb === "departure" && entry.presence !== "absent") {
        updateEntry(entry.id, { presence: "absent" });
        events.push(`${entry.name} left the scene`);
      }
    }
  }

  const pending = detectPendingInteraction(
    input.messages,
    orderCast(resolved),
    primaryName,
    input.playerName ?? "",
  );

  let autoSpeakerId: string | null = null;
  let autoSpeakerName: string | null = null;
  if (pending?.kind === "cast" && pending.targetId) {
    const askerIsPrimary = matchesName(pending.asker, primaryName);
    let trailingSideReplies = 0;
    for (let index = input.messages.length - 1; index >= 0; index -= 1) {
      const message = input.messages[index];
      if (message.sender === "player" || message.sender === "narrator") continue;
      if (message.sender !== "character") break;
      if (message.speaker && !matchesName(message.speaker, primaryName)) {
        trailingSideReplies += 1;
      } else {
        break;
      }
    }
    if (askerIsPrimary && trailingSideReplies < AUTO_SIDE_REPLY_MAX_CONSECUTIVE) {
      const targetEntry = resolved.find((entry) => entry.id === pending.targetId);
      if (targetEntry && targetEntry.presence === "active") {
        autoSpeakerId = targetEntry.id;
        autoSpeakerName = targetEntry.name;
      }
    }
  }

  return {
    cast: orderCast(resolved),
    newNames,
    events,
    pending,
    autoSpeakerId,
    autoSpeakerName,
  };
}

/**
 * Resolve who, if anyone, was directly asked an unresolved question by the last
 * character message. A `player` kind means the question was addressed to you and
 * no cast member needs to answer automatically.
 */
export function detectPendingInteraction(
  messages: CastMessage[],
  cast: LivingCastEntry[],
  primaryName: string,
  playerName: string,
): PendingInteraction | null {
  let last: CastMessage | null = null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.sender === "player" || message.sender === "narrator") continue;
    if (message.sender === "character") {
      last = message;
      break;
    }
    break;
  }
  if (!last) return null;
  const asker = last.speaker && !matchesName(last.speaker, primaryName)
    ? last.speaker
    : primaryName;
  const text = last.text ?? "";
  if (!hasQuestionMarker(text)) return null;

  const targets = orderCast(cast).filter((entry) => entry.origin !== "player" && !entry.primary);
  let bestEntry: LivingCastEntry | null = null;
  let bestDistance = Infinity;
  for (const entry of targets) {
    if (entry.presence === "absent") continue;
    if (!mentionsMember(text, entry)) continue;
    const distance = distanceToQuestion(text, entry);
    if (distance !== null && distance <= 8 && distance < bestDistance) {
      bestEntry = entry;
      bestDistance = distance;
    }
  }
  if (bestEntry) {
    return {
      kind: "cast",
      asker,
      targetId: bestEntry.id,
      targetName: bestEntry.name,
    };
  }

  const addressableNames = [playerName.trim(), "you", "your"].filter(Boolean);
  const playerAddress = addressableNames.some((name) => {
    if (!name) return false;
    return new RegExp(`\\b${escapeRegex(name.toLocaleLowerCase("en-US"))}\\b`).test(text.toLocaleLowerCase("en-US"));
  });
  if (playerAddress && distanceToQuestion(text, { name: playerName || "you" }) !== null) {
    return { kind: "player", asker, targetId: null, targetName: null };
  }
  if (playerAddress && /\b(?:you|your)\b/i.test(text)) {
    return { kind: "player", asker, targetId: null, targetName: null };
  }

  if (targets.some((entry) => entry.presence === "active" && mentionsMember(text, entry))) {
    return {
      kind: "cast",
      asker,
      targetId: targets.find((entry) => entry.presence === "active" && mentionsMember(text, entry))!.id,
      targetName: targets.find((entry) => entry.presence === "active" && mentionsMember(text, entry))!.name,
    };
  }

  return null;
}

const PRESENCE_LABEL: Record<CastPresence, string> = {
  active: "Active",
  mentioned: "Mentioned",
  absent: "Absent",
};

const ORIGIN_LABEL: Record<CastOrigin, string> = {
  player: "Player",
  permanent: "Permanent",
  temporary: "Temporary",
};

/** Compact cast roster for the roleplay prompt. */
export function renderLivingCastBlock(
  cast: LivingCastEntry[],
  options: { pending?: PendingInteraction | null; speakerName?: string } = {},
): string {
  const entries = orderCast(cast);
  if (entries.length === 0) return "";

  const lines: string[] = ["<living-cast>", "[ACTIVE CAST]"];
  for (const entry of entries) {
    const parts = [
      entry.name,
      ORIGIN_LABEL[entry.origin],
      PRESENCE_LABEL[entry.presence],
    ];
    if (entry.primary) parts.push("Primary");
    const shortNotes = entry.notes.slice(0, 2).map((note) => note.slice(0, 110)).filter(Boolean);
    if (shortNotes.length > 0) parts.push(shortNotes.join("; "));
    lines.push(`- ${parts.join(" — ")}`);
  }
  if (options.pending && options.pending.kind === "cast" && options.pending.targetName) {
    if (!options.speakerName || !matchesName(options.speakerName, options.pending.targetName)) {
      lines.push("[PENDING INTERACTION]", `${options.pending.asker} asked ${options.pending.targetName} a question. ${options.pending.targetName} has not responded.`);
    }
  }
  lines.push("</living-cast>");
  return lines.join("\n");
}

/** Speaker instruction appended when the model writes a side cast member. */
export function renderSpeakerInstruction(
  speaker: LivingCastEntry,
  primaryName: string,
): string {
  const lines = [
    `This turn you speak as ${speaker.name}, a ${ORIGIN_LABEL[speaker.origin].toLocaleLowerCase("en-US")} character currently present in this scene. Write only ${speaker.name}'s reply: ${speaker.name}'s own words, actions, reactions, and perspective, consistent with the cast notes below and the established scene.`,
    `The primary character (${primaryName}) does not speak this turn; ${primaryName} stays present but only appears through ${speaker.name}'s observation. Never write the player's words, actions, thoughts, or decisions.`,
    "Side characters whose adult status is unconfirmed are not sexualized. Keep the turn within the safety policy.",
  ];
  const shortNotes = speaker.notes.slice(0, 3).map((note) => `- ${note.slice(0, 140)}`).filter(Boolean);
  if (shortNotes.length > 0) {
    lines.push("", ...[`What is known about ${speaker.name}:`, ...shortNotes]);
  }
  lines.push(`Begin directly as ${speaker.name} in the scene, using ${speaker.name}'s own voice. Return only the in-world passage with no labels, headings, or metadata.`);
  return lines.join("\n");
}

/** Find a cast entry by display name. */
export function findCastEntryByName(cast: LivingCastEntry[], name: string): LivingCastEntry | null {
  const target = cast.find((entry) => matchesName(entry.name, name));
  return target ?? null;
}