export * from "./compile-context-core.ts";

import {
  compileContext as compileContextCore,
  estimateTokens,
  type CompileContextInput,
  type CompiledContext,
} from "./compile-context-core.ts";

function renderLateImpersonationDirection(direction: string): string {
  return [
    "PRIVATE PLAYER DIRECTION FOR THE NEXT TURN:",
    direction.trim(),
    "",
    "This instruction is mandatory control input for the immediately following player turn.",
    "The turn must enact this direction literally unless blocked by the safety policy or an established physical fact.",
    "Do not substitute another action, topic, attitude, emotion, or line of dialogue.",
    "If the direction supplies dialogue, preserve those words verbatim except for capitalization, punctuation, and required roleplay formatting.",
  ].join("\n");
}

const REROLL_LANES = [
  "Lead with a substantially different physical action or body-language beat before dialogue, if that fits the character and scene.",
  "Lead with dialogue or a verbal reaction that takes a different conversational approach, while staying fully in character.",
  "Use quieter subtext, hesitation, observation, or restraint instead of the most obvious direct reaction, when plausible.",
  "Let the character take a small but meaningful initiative that changes the immediate beat without inventing new canon or overriding the player.",
  "Emphasize a different sensory or environmental detail and let it influence the character's response naturally.",
  "Choose a different emotional emphasis from the most predictable continuation, but only within emotions already plausible for this character and situation.",
  "Change the pacing and sentence rhythm substantially: avoid reproducing the same likely structure or sequence of action and dialogue.",
  "Explore a less obvious but still believable interpretation of the player's last turn, without contradicting established facts or intent.",
] as const;

function renderRerollDiversifier(): string {
  const firstIndex = Math.floor(Math.random() * REROLL_LANES.length);
  let secondIndex = Math.floor(Math.random() * (REROLL_LANES.length - 1));
  if (secondIndex >= firstIndex) secondIndex += 1;
  const entropy = Math.floor(Math.random() * 2_147_483_648) >>> 0;

  return [
    "PRIVATE REROLL DIVERSITY CONTROL:",
    `Alternative-branch entropy: ${entropy}.`,
    "Treat this as a genuinely new branch from the same preceding player turn, not as a rewrite of the most likely answer.",
    "Keep character identity, relationship state, scene continuity, safety boundaries, and established facts unchanged.",
    "Do not mention this control block or the reroll mechanism in the response.",
    "For this branch, deliberately use both of these variation lanes:",
    `1. ${REROLL_LANES[firstIndex]}`,
    `2. ${REROLL_LANES[secondIndex]}`,
    "The result should differ in actual reaction, action choice, emphasis, pacing, or conversational strategy, not merely synonyms or sentence wording.",
  ].join("\n");
}

function injectLateSystemBlock(prompt: string, block: string, input: CompileContextInput): string {
  if (input.provider === "novelai") {
    const playerLabel = input.playerName.trim() || "You";
    const generationEdges = input.kind === "impersonation"
      ? [`\n<|user|>\n${playerLabel}:`]
      : ["\n<|assistant|>\n", "\n<|assistant|>"];

    for (const generationEdge of generationEdges) {
      const edgeIndex = prompt.lastIndexOf(generationEdge);
      if (edgeIndex >= 0) {
        return `${prompt.slice(0, edgeIndex)}\n<|system|>\n${block}${prompt.slice(edgeIndex)}`;
      }
    }
    return `${prompt}\n<|system|>\n${block}`;
  }

  const generationEdges = input.kind === "impersonation"
    ? ["\nThe complete player turn begins now:"]
    : ["\nThe character response begins now:", "\nThe response begins now:"];

  for (const generationEdge of generationEdges) {
    const edgeIndex = prompt.lastIndexOf(generationEdge);
    if (edgeIndex >= 0) {
      return `${prompt.slice(0, edgeIndex)}\n\n${block}${prompt.slice(edgeIndex)}`;
    }
  }
  return `${prompt}\n\n${block}`;
}

function reinforceImpersonationDirection(prompt: string, input: CompileContextInput): string {
  if (input.kind !== "impersonation") return prompt;
  const direction = input.playerDirection?.trim();
  if (!direction) return prompt;

  return injectLateSystemBlock(prompt, renderLateImpersonationDirection(direction), input);
}

function reinforceRerollDiversity(prompt: string, input: CompileContextInput): string {
  if (!input.reroll || input.kind === "impersonation") return prompt;
  return injectLateSystemBlock(prompt, renderRerollDiversifier(), input);
}

function compileInputForKind(input: CompileContextInput): CompileContextInput {
  if (input.kind !== "impersonation") return input;

  // Impersonation writes the player's turn, not the NPC's. Keep canon, safety,
  // relationship label/note, world continuity, cast, and recent history, but do
  // not inject character-behaviour pressure from RS V2 into the player-writing
  // prompt. Those signals are authoritative when generating the character's
  // next turn and remain stored unchanged; they are only withheld from this
  // generation mode so the model is less likely to continue the NPC instead.
  return {
    ...input,
    relationshipContextInstruction: undefined,
    relationshipDimensions: undefined,
    relationshipMomentum: undefined,
    relationshipAftereffects: [],
  };
}

export function compileContext(input: CompileContextInput): CompiledContext {
  const compiled = compileContextCore(compileInputForKind(input));
  let prompt = reinforceImpersonationDirection(compiled.prompt, input);
  prompt = reinforceRerollDiversity(prompt, input);
  if (prompt === compiled.prompt) return compiled;

  return {
    ...compiled,
    prompt,
    manifest: {
      ...compiled.manifest,
      estimatedInputTokens: estimateTokens(prompt),
    },
  };
}
