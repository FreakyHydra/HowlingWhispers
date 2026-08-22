// Provider-neutral relationship evaluator interface.
//
// The relationship system never depends on NovelAI or any specific model. An
// evaluator is a pure function that inspects committed conversation text and
// returns a scored delta (never an absolute score). For V1 this is implemented
// as a conservative local heuristic; later it can be swapped for a dedicated
// local model through the same interface without touching storage, events, or UI.
//
// The result is kept out of the visible roleplay: the evaluator only reads
// already-cleaned message text, and its delta/reason are stored in a separate
// relationship event store — never embedded in message text or the generation
// prompt (only a non-commanding tier/label is fed to the model).

export type RelationshipScorerInput = {
  characterId: string;
  personaId: string;
  playerName: string;
  characterName: string;
  previousScore: number;
  playerMessage: string;
  characterReply: string;
  conversation: Array<{ sender: "player" | "character" | "narrator"; text: string }>;
};

export type RelationshipDelta = { delta: number; reason: string };

export interface RelationshipScorer {
  evaluate(input: RelationshipScorerInput): RelationshipDelta | null;
}

// Score boundaries for the heuristic. Most ordinary exchanges produce 0 or a
// very small change; only clear relationship beats move the needle.
const POSITIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(trust|trusts|trusted|trusting)\b/i, weight: 6, reason: "The player expresses trust." },
  { pattern: /\b(care|cared|care for|caring|cared for you)\b/i, weight: 6, reason: "Care for the character is expressed." },
  { pattern: /\b(forgive|forgave|forgiveness|apologise|apologize|i'm sorry|i am sorry)\b/i, weight: 8, reason: "A forgiveness or apology bridges something between them." },
  { pattern: /\b(protect|protected|protecting|i've got you|i'm here for you)\b/i, weight: 5, reason: "The player protects or stands by the character." },
  { pattern: /\b(confide|confided|sharing something|i need you to know)\b/i, weight: 7, reason: "The player opens up or confides." },
  { pattern: /\b(grateful|thank|thanks|i appreciate)\b/i, weight: 3, reason: "Gratitude is expressed." },
  { pattern: /\b(love|i love you|i care about you)\b/i, weight: 10, reason: "An explicit declaration of affection." },
];

const NEGATIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(leave|leaving|abandon|abandoned|walk away|walk out)\b/i, weight: -24, reason: "The player abandons or threatens to leave." },
  { pattern: /\b(betray|betrayal|backstab|deceive|deceived|lie|lied|lying to)\b/i, weight: -30, reason: "The player betrays or deceives." },
  { pattern: /\b(cruel|harsh|hurt|damaged|reject|rejected|rejecting|cold|callous|indifferent|ignore|ignored|ignoring you)\b/i, weight: -18, reason: "The player hurts or rejects the character." },
  { pattern: /\b(threat|threaten|threatening|attack|attacked|violent|violence)\b/i, weight: -26, reason: "Threats or violence toward the character." },
  { pattern: /\b(don't (care|trust|want)|do not (care|trust|want)|never (love|trust|care for)|you (don't|do not))\b/i, weight: -14, reason: "The player withdraws or rejects the character." },
  { pattern: /\b(boundary|boundaries|respect|consent|not (comfortable|ready|okay|ok))\b/i, weight: -10, reason: "A boundary or consent concern is crossed or raised negatively." },
];

function textContains(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export const heuristicRelationshipScorer: RelationshipScorer = {
  evaluate(input: RelationshipScorerInput): RelationshipDelta | null {
    const playerText = (input.playerMessage ?? "").trim();
    const replyText = (input.characterReply ?? "").trim();
    if (!playerText && !replyText) return null;

    const combined = `${playerText}\n${replyText}`;
    let delta = 0;
    let reason = "No notable change this turn.";

    for (const cue of POSITIVE_CUES) {
      if (textContains(combined, cue.pattern)) {
        delta += cue.weight;
        reason = cue.reason;
      }
    }
    for (const cue of NEGATIVE_CUES) {
      if (textContains(combined, cue.pattern)) {
        delta += cue.weight;
        reason = cue.reason;
      }
    }

    // Reciprocity: a warm, accepting character reply amplifies a positive turn,
    // while a cold/rejecting reply dampens it. Keeps progression slow and tied
    // to genuine mutual exchange rather than the player's words alone.
    if (delta > 0) {
      if (textContains(replyText, /(happy|glad|glad you|smile|relief|thank you|glad that|glad to)/i)) {
        delta += 2;
        reason = `${reason} The character responds warmly.`;
      }
    } else if (delta < 0) {
      if (textContains(replyText, /(hurt|betray|leave|reject|disappointed|disgust|disgusted|you (don't|do not) (care|trust|want))\b/i)) {
        delta -= 2;
        reason = `${reason} The character's reply deepens the rift.`;
      }
    }

    // Bound ordinary single-turn swings and keep the pace deliberate.
    const bounded = Math.max(-40, Math.min(40, delta));

    if (bounded === 0) return { delta: 0, reason };

    return { delta: bounded, reason };
  },
};
