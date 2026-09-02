import type { AuthorNoteEntry, ContextLibrary } from "../context/types.ts";

export type CodaDirectiveScope = "local" | "global";

export type CodaDirective = {
  id: string;
  scope: CodaDirectiveScope;
  instruction: string;
  characterId?: string;
  sceneId?: string;
  createdAt: number;
};

const CODA_PRESET = "coda-directive";

export function createCodaDirective(input: {
  scope: CodaDirectiveScope;
  instruction: string;
  characterId?: string;
  sceneId?: string;
  now?: number;
}): CodaDirective {
  const now = input.now ?? Date.now();
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Coda directive cannot be empty.");
  if (input.scope === "local" && !input.sceneId) {
    throw new Error("A local Coda directive requires a scene.");
  }
  if (input.scope === "global" && !input.characterId) {
    throw new Error("A global Coda directive requires a character.");
  }
  return {
    id: `coda-${input.scope}-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    scope: input.scope,
    instruction,
    characterId: input.characterId,
    sceneId: input.sceneId,
    createdAt: now,
  };
}

export function directiveToAuthorNote(directive: CodaDirective): AuthorNoteEntry {
  return {
    id: directive.id,
    text: `[Coda ${directive.scope === "local" ? "scene" : "character"} directive] ${directive.instruction}`,
    enabled: true,
    preset: CODA_PRESET,
    scope: directive.scope === "local" ? "scene" : "character",
    characterId: directive.scope === "global" ? directive.characterId : undefined,
    sceneId: directive.scope === "local" ? directive.sceneId : undefined,
    createdAt: directive.createdAt,
    updatedAt: directive.createdAt,
  };
}

export function addCodaDirective(library: ContextLibrary, directive: CodaDirective): ContextLibrary {
  return {
    ...library,
    authorNotes: [...library.authorNotes, directiveToAuthorNote(directive)],
  };
}

export function listCodaDirectives(library: ContextLibrary, filter?: {
  sceneId?: string;
  characterId?: string;
}): AuthorNoteEntry[] {
  return library.authorNotes.filter((note) => {
    if (note.preset !== CODA_PRESET) return false;
    if (filter?.sceneId && note.scope === "scene" && note.sceneId !== filter.sceneId) return false;
    if (filter?.characterId && note.scope === "character" && note.characterId !== filter.characterId) return false;
    return true;
  });
}

export function clearCodaDirectives(library: ContextLibrary, scope: CodaDirectiveScope, filter: {
  sceneId?: string;
  characterId?: string;
}): ContextLibrary {
  return {
    ...library,
    authorNotes: library.authorNotes.filter((note) => {
      if (note.preset !== CODA_PRESET) return true;
      if (scope === "local") return !(note.scope === "scene" && note.sceneId === filter.sceneId);
      return !(note.scope === "character" && note.characterId === filter.characterId);
    }),
  };
}

export function parseCodaSlashCommand(raw: string):
  | { kind: "directive"; scope: CodaDirectiveScope; instruction: string }
  | { kind: "show" }
  | { kind: "clear"; scope: CodaDirectiveScope }
  | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^\/coda(?:\s+([lg]))?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  const shortScope = match[1]?.toLowerCase();
  const rest = (match[2] ?? "").trim();
  if (/^show$/i.test(rest)) return { kind: "show" };
  const clear = rest.match(/^clear(?:\s+([lg]))?$/i);
  if (clear) return { kind: "clear", scope: clear[1]?.toLowerCase() === "g" ? "global" : "local" };
  if (!rest) return null;
  return {
    kind: "directive",
    scope: shortScope === "g" ? "global" : "local",
    instruction: rest,
  };
}
