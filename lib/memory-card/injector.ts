// Memory Injector — selects relevant persistent information and injects it into
// generation context. For 0.7.1 this is intentionally conservative: it does not
// introduce embeddings, vector databases, or autonomous memory models. It simply
// provides a structured seam so future versions can add richer selection logic
// without rewriting the compiler.
//
// Conceptual flow:
//   Persona
//        \
//         Memory Card ----> Memory Injector ----> Context Compiler
//        /
//   Memories

import type { MemoryCard } from "./schema.ts";
import type { PlayerPersona } from "../personas/schema.ts";

export type MemoryInjectorInput = {
  persona: PlayerPersona | null;
  memoryCard: MemoryCard | undefined;
  characterId: string;
  characterName: string;
};

export type MemoryInjectorOutput = {
  relationshipContext: string;
};

export function injectMemory(input: MemoryInjectorInput): MemoryInjectorOutput {
  const card = input.memoryCard;
  if (!card) {
    return { relationshipContext: "" };
  }

  const rel = card.relationships[input.characterId];
  let relationshipContext = "";
  if (rel) {
    const score = Math.round(rel.score);
    relationshipContext = `Relationship with ${input.characterName}: ${score}`;
  }

  return { relationshipContext };
}
