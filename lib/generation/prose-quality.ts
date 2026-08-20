// Central prose-quality policy for generation.
//
// OWNED BY THE GENERATION DOMAIN. This is the single source of truth for the
// language-level craftsmanship ceiling, character-voice preservation, and the
// unwanted-style suppression that Derkomor shaped. It is injected once into the
// compiled prompt by `compile-context.ts`, AFTER character canon and the
// current scene/state context, so it never overrides a character's established
// voice.
//
// Do NOT copy these rules into Character, Location, Scenario, Persona, or
// Lorebook data: those describe who/what the world is; the generation system
// controls how it is written.
//
// Architecture (per the agreed priority order — server rules, then character
// voice, then scene/context, then prose policy, then unwanted-style filter):
//   SERVER RP RULES / FACTUAL CONSTRAINTS   → compile-context staticParts
//   CHARACTER IDENTITY + ESTABLISHED VOICE  → authoritative-character-canon
//   CURRENT SCENE / CONTEXT                 → relevant-world-lore + current-state
//   GENERAL PROSE-QUALITY POLICY            → this module (rendered once)
//   UNWANTED-STYLE SUPPRESSION              → folded into the same block
//
// Future configurability: a `ProseQualityProfile` toggles which negative
// tendencies are active. A settings preset can later expose a dropdown
// ("Literary / Balanced / Direct") by swapping the active profile. Until then
// only the single default profile is wired in.
export type ProseTendency =
  | "avoid-internet-narration"
  | "avoid-journalistic-prose"
  | "avoid-corporate-phrasing"
  | "avoid-generic-ai-prose"
  | "avoid-canned-emotion"
  | "avoid-redundant-sentence-structures"
  | "avoid-excessive-summarization"
  | "avoid-overexplaining"
  | "avoid-stock-sensory-reactions"
  | "avoid-thematic-closings";

export type ProseQualityProfile = {
  readonly id: string;
  readonly name: string;
  readonly tendencies: readonly ProseTendency[];
};

/** Map each toggleable tendency to the human-readable fragment it suppresses. */
const NEGATIVE_TENDENCY_TEXT: Record<ProseTendency, string> = {
  "avoid-internet-narration": "social-media or journalistic narration",
  "avoid-journalistic-prose": "corporate phrasing",
  "avoid-corporate-phrasing": "filler",
  "avoid-generic-ai-prose": "canned emotional shorthand",
  "avoid-canned-emotion": "repetitive sentence structures",
  "avoid-redundant-sentence-structures": "excessive summarization",
  "avoid-excessive-summarization": "obvious emotional over-explanation",
  "avoid-overexplaining": "forced slang",
  "avoid-stock-sensory-reactions": "meta commentary",
  "avoid-thematic-closings": "moral summaries",
};

export const LITERARY_PROFILE: ProseQualityProfile = {
  id: "literary",
  name: "Polished long-form fiction",
  tendencies: [
    "avoid-internet-narration",
    "avoid-journalistic-prose",
    "avoid-corporate-phrasing",
    "avoid-generic-ai-prose",
    "avoid-canned-emotion",
    "avoid-redundant-sentence-structures",
    "avoid-excessive-summarization",
    "avoid-overexplaining",
    "avoid-stock-sensory-reactions",
    "avoid-thematic-closings",
  ],
};

export const PROSE_QUALITY_PROFILES: Record<string, ProseQualityProfile> = {
  literary: LITERARY_PROFILE,
};

export const DEFAULT_PROSE_PROFILE = LITERARY_PROFILE;

const POSITIVE_GUIDANCE = [
  "Write polished long-form fiction with precise vocabulary, varied sentence structure, controlled description, natural scene rhythm, subtext, and character-specific dialogue.",
  "Character voice is authoritative. Preserve each character's vocabulary, education, dialect, slang, rhythm, temperament, and established speech habits even when these are plain, rough, informal, or unconventional. Narrative craftsmanship must not homogenize character voices.",
  "Do not reduce characters to verbal stereotypes based on role, species, occupation, traits, or archetype. Traits influence behavior; they are not recurring catchphrases or gimmicks.",
];

const POSITIVE_PREFERRED =
  "Prefer concrete detail, natural progression, individual voices, controlled description, meaningful dialogue, and implication over explanation.";

/** Render the full prose-quality block (roleplay / autopilot modes). */
export function renderProseQualityPolicy(profile = DEFAULT_PROSE_PROFILE): string {
  const negatives = profile.tendencies
    .map((tendency) => NEGATIVE_TENDENCY_TEXT[tendency])
    .filter(Boolean)
    .join(", ");
  return [
    "<prose-quality-policy>",
    ...POSITIVE_GUIDANCE,
    `Avoid ${negatives}, stock AI phrasing, and thematic closing summaries.`,
    POSITIVE_PREFERRED,
    "</prose-quality-policy>",
  ].join("\n");
}

/**
 * Reduced player-voice policy for impersonation turns.
 *
 * Impersonation writes the *player's* turn, so the player's own vocabulary,
 * simplicity, slang, sentence length, and style are authoritative. The layer
 * only improves coherence without lifting the player into a literary voice.
 */
export function renderPlayerVoicePolicy(): string {
  return [
    "<player-voice-policy>",
    "Preserve the player's established voice, vocabulary, rhythm, formality, slang, and level of detail. Improve coherence without making the player more literary, eloquent, verbose, or formal than their established writing suggests.",
    "Do not overwrite intentional informality or simple speech.",
    "Avoid generic AI filler, canned emotional language, archetype shorthand, and unnecessary summary.",
    "</player-voice-policy>",
  ].join("\n");
}
