import type {
  PlayerSignals,
  RelationshipDimensions,
  RelationshipInterpretation,
} from "./schema.ts";

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
  interpretation: RelationshipInterpretation;
  dimensionDeltas: Partial<RelationshipDimensions>;
  diagnostics: string[];
  causalMemory: {
    event: string;
    appraisal: string;
    aftereffects: string[];
  };
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

function signal(pattern: RegExp, text: string, strength: number): number {
  return pattern.test(text) ? strength : 0;
}

function interpretPlayer(text: string): PlayerSignals {
  return {
    fear: signal(/\b(?:afraid|scared|terrified|fearful|recoil(?:ed|s|ing)?|flinch(?:ed|es|ing)?|shrink back|trembl(?:e|ed|es|ing)|please don['’]t hurt me)\b/i, text, 0.81),
    hostility: signal(/\b(?:attack|kill|hurt you|harm you|hate you|threaten)\b/i, text, 0.9),
    vulnerability: signal(/\b(?:please|help me|i need you|vulnerable|cry(?:ing)?|sob(?:bing)?|panic(?:king)?|don['’]t leave me)\b/i, text, 0.73),
    kindness: signal(/\b(?:thank you|thanks|appreciate|kindly|help you|care (?:about|for) you|here for you)\b/i, text, 0.76),
    affection: signal(/\b(?:i love you|i care about you|hug(?:ged|s|ging)?|kiss(?:ed|es|ing)?)\b/i, text, 0.82),
    anger: signal(/\b(?:angry|furious|snaps?|shouts?|yells?|damn you)\b/i, text, 0.77),
    distress: signal(/\b(?:distress(?:ed)?|cry(?:ing)?|sob(?:bing)?|panic(?:king)?|overwhelm(?:ed)?)\b/i, text, 0.78),
    boundary: signal(/\b(?:not comfortable|not ready|stop|don['’]t touch me|leave me alone|my boundary)\b/i, text, 0.84),
    coercion: signal(/\b(?:no choice|without your consent|boundaries (?:do not|don['’]t) matter|force you|make you)\b/i, text, 0.94),
  };
}

function describeAppraisal(signals: PlayerSignals): { appraisal: string; confidence: number; behaviorBias: string[] } {
  if (signals.coercion > 0) return { appraisal: "The player is trying to override my boundaries.", confidence: 0.94, behaviorBias: ["protect boundaries", "resist coercion", "do not appease"] };
  if (signals.fear > signals.hostility) return { appraisal: "The player appears afraid, not hostile.", confidence: 0.88, behaviorBias: ["stop approaching", "lower intensity", "give space"] };
  if (signals.hostility > 0) return { appraisal: "The player is acting with hostility.", confidence: 0.9, behaviorBias: ["protect self", "assess threat", "retain boundaries"] };
  if (signals.boundary > 0) return { appraisal: "The player is setting a personal boundary.", confidence: 0.86, behaviorBias: ["recognize boundary", "choose an in-character response"] };
  if (signals.kindness > 0) return { appraisal: "The player is offering kindness.", confidence: 0.82, behaviorBias: ["notice the kindness", "respond according to trust and personality"] };
  if (signals.distress > 0 || signals.vulnerability > 0) return { appraisal: "The player is emotionally vulnerable.", confidence: 0.78, behaviorBias: ["notice vulnerability", "retain motives and boundaries", "do not become an assistant"] };
  return { appraisal: "No strong relational signal is clear.", confidence: 0.55, behaviorBias: ["continue from identity, history, and scene"] };
}

function applyInertia(delta: number, previousScore: number, major: boolean): number {
  if (major || delta === 0) return delta;
  const established = Math.min(0.75, Math.abs(previousScore) / 10000 * 0.75);
  return Math.round(delta * (1 - established));
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

    const signals = interpretPlayer(playerText);
    const appraisal = describeAppraisal(signals);
    playerDelta = applyInertia(
      Math.max(-40, Math.min(40, playerDelta)),
      input.previousScore,
      signals.coercion >= 0.9 || signals.hostility >= 0.9,
    );
    characterDelta = Math.max(-10, Math.min(10, characterDelta));
    const delta = Math.max(-40, Math.min(40, playerDelta + characterDelta));
    const reason = reasons.length > 0
      ? [...new Set(reasons)].join(" ")
      : "No notable change this turn.";

    const dimensionDeltas: Partial<RelationshipDimensions> = {};
    if (signals.fear > 0) {
      dimensionDeltas.fear = 4;
      dimensionDeltas.protectiveness = 6;
      dimensionDeltas.trust = signals.hostility > 0 ? -2 : -1;
    }
    if (signals.kindness > 0) {
      dimensionDeltas.comfort = 2;
      dimensionDeltas.trust = (dimensionDeltas.trust ?? 0) + 1;
    }
    if (signals.affection > 0) dimensionDeltas.affection = 3;
    if (signals.coercion > 0) {
      dimensionDeltas.trust = -8;
      dimensionDeltas.resentment = 7;
      dimensionDeltas.suspicion = 5;
    }
    if (signals.boundary > 0 && signals.coercion === 0) dimensionDeltas.respect = 0;

    const interpretation: RelationshipInterpretation = {
      playerSignals: signals,
      appraisal: appraisal.appraisal,
      confidence: appraisal.confidence,
      behaviorBias: appraisal.behaviorBias,
      antiAppeasement: signals.distress > 0 || signals.vulnerability > 0 || signals.boundary > 0,
    };
    const diagnostics = [
      `appraisal: ${interpretation.appraisal}`,
      `confidence: ${interpretation.confidence.toFixed(2)}`,
      ...Object.entries(dimensionDeltas).map(([dimension, value]) => `${dimension}: ${Number(value) >= 0 ? "+" : ""}${value}`),
    ];
    return {
      delta, playerDelta, characterDelta, reason, interpretation, dimensionDeltas, diagnostics,
      causalMemory: { event: playerText.slice(0, 500), appraisal: interpretation.appraisal, aftereffects: [...interpretation.behaviorBias] },
    };
  },
};
