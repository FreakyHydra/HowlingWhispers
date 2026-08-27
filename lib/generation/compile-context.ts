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

function reinforceImpersonationDirection(prompt: string, input: CompileContextInput): string {
  if (input.kind !== "impersonation") return prompt;
  const direction = input.playerDirection?.trim();
  if (!direction) return prompt;

  const block = renderLateImpersonationDirection(direction);
  if (input.provider === "novelai") {
    const playerLabel = input.playerName.trim() || "You";
    const generationEdge = `\n<|user|>\n${playerLabel}:`;
    const edgeIndex = prompt.lastIndexOf(generationEdge);
    if (edgeIndex >= 0) {
      return `${prompt.slice(0, edgeIndex)}\n<|system|>\n${block}${prompt.slice(edgeIndex)}`;
    }
    return `${prompt}\n<|system|>\n${block}`;
  }

  const generationEdge = "\nThe complete player turn begins now:";
  const edgeIndex = prompt.lastIndexOf(generationEdge);
  if (edgeIndex >= 0) {
    return `${prompt.slice(0, edgeIndex)}\n\n${block}${prompt.slice(edgeIndex)}`;
  }
  return `${prompt}\n\n${block}`;
}

export function compileContext(input: CompileContextInput): CompiledContext {
  const compiled = compileContextCore(input);
  const prompt = reinforceImpersonationDirection(compiled.prompt, input);
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
