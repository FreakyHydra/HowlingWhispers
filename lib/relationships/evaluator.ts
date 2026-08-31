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

export type RelationshipDelta = {
  delta: number;
  playerDelta: number;
  characterDelta: number;
  reason: string;
};

export interface RelationshipScorer {
  evaluate(input: RelationshipScorerInput): RelationshipDelta | null;
}

// Score boundaries for the heuristic. Most ordinary exchanges produce 0 or a
// very small change; only clear relationship beats move the needle.
const PLAYER_POSITIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(?:i trust you|you can trust me|put my trust in you)\b/i, weight: 6, reason: "The player expresses trust." },
  { pattern: /\b(?:i care (?:about|for) you|i cared for you)\b/i, weight: 6, reason: "Care for the character is expressed." },
  { pattern: /\b(?:i(?:'m| am) sorry|i apolog(?:ise|ize)|please forgive me|i forgive you)\b/i, weight: 8, reason: "A forgiveness or apology bridges something between them." },
  { pattern: /\b(?:protect(?:ed|ing)? you|i've got you|i'm here for you)\b/i, weight: 5, reason: "The player protects or stands by the character." },
  { pattern: /\b(?:i confide in you|i confided in you|sharing something with you|i need you to know)\b/i, weight: 7, reason: "The player opens up or confides." },
  { pattern: /\b(?:thank you|thanks|i appreciate you|grateful to you)\b/i, weight: 3, reason: "Gratitude is expressed." },
  { pattern: /\b(?:i love you|i care about you)\b/i, weight: 10, reason: "An explicit declaration of affection." },
];

const PLAYER_NEGATIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(?:i(?:'m| am| will|'ll) (?:going to )?(?:leave|abandon) you|walk out on you|leave you behind)\b/i, weight: -24, reason: "The player abandons or threatens to leave the character." },
  { pattern: /\b(?:betray(?:ed|ing)? you|backstab(?:bed|bing)? you|deceiv(?:e|ed|ing) you|lied to you|lying to you)\b/i, weight: -30, reason: "The player betrays or deceives the character." },
  { pattern: /\b(?:hurt|harm|reject|ignore|ignored|ignoring) you\b/i, weight: -18, reason: "The player hurts or rejects the character." },
  { pattern: /\b(?:threaten(?:ed|ing)?|attack(?:ed|ing)?|kill(?:ed|ing)?) you\b/i, weight: -26, reason: "The player threatens or attacks the character." },
  { pattern: /\b(?:i (?:don't|do not) (?:care about|trust|want) you|i never (?:loved|trusted|cared for) you)\b/i, weight: -14, reason: "The player withdraws or rejects the character." },
  { pattern: /\b(?:your boundaries (?:do not|don't) matter|i (?:do not|don't) care about your boundaries|you have no choice|without your consent)\b/i, weight: -28, reason: "The player deliberately violates the character's boundaries." },
];

const CHARACTER_POSITIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(?:i trust you|trusts you|believes you)\b/i, weight: 4, reason: "The character reciprocates trust." },
  { pattern: /\b(?:thank you|thanks|i appreciate|grateful)\b/i, weight: 2, reason: "The character responds with gratitude." },
  { pattern: /\b(?:you're safe|you are safe|i've got you|i am here|i'm here|stays close|softens|smiles|relaxes|relief)\b/i, weight: 2, reason: "The character responds with warmth or reassurance." },
  { pattern: /\b(?:i forgive you|forgives you|apology accepted)\b/i, weight: 4, reason: "The character accepts repair or forgiveness." },
];

const CHARACTER_NEGATIVE_CUES: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  { pattern: /\b(?:i (?:do not|don't) trust you|never trust you again|you betrayed me|you lied to me)\b/i, weight: -6, reason: "The character's response shows damaged trust." },
  { pattern: /\b(?:get away from me|leave me alone|i (?:do not|don't) want you here|stay away from me)\b/i, weight: -5, reason: "The character directly rejects the player." },
];

function textContains(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export const heuristicRelationshipScorer: RelationshipScorer = {
  evaluate(input: RelationshipScorerInput): RelationshipDelta | null {
    const playerText = (input.playerMessage ?? "").trim();
    const replyText = (input.characterReply ?? "").trim();
    if (!playerText && !replyText) return null;

    let playerDelta = 0;
    let characterDelta = 0;
    const reasons: string[] = [];

    for (const cue of PLAYER_POSITIVE_CUES) {
      if (textContains(playerText, cue.pattern)) {
        playerDelta += cue.weight;
        reasons.push(cue.reason);
      }
    }
    for (const cue of PLAYER_NEGATIVE_CUES) {
      if (textContains(playerText, cue.pattern)) {
        playerDelta += cue.weight;
        reasons.push(cue.reason);
      }
    }

    for (const cue of CHARACTER_POSITIVE_CUES) {
      if (textContains(replyText, cue.pattern)) {
        characterDelta += cue.weight;
        reasons.push(cue.reason);
      }
    }
    for (const cue of CHARACTER_NEGATIVE_CUES) {
      if (textContains(replyText, cue.pattern)) {
        characterDelta += cue.weight;
        reasons.push(cue.reason);
      }
    }

    playerDelta = Math.max(-40, Math.min(40, playerDelta));
    characterDelta = Math.max(-10, Math.min(10, characterDelta));
    const delta = Math.max(-40, Math.min(40, playerDelta + characterDelta));
    const reason = reasons.length > 0
      ? [...new Set(reasons)].join(" ")
      : "No notable change this turn.";

    return { delta, playerDelta, characterDelta, reason };
  },
};
