import { castKey, type LivingCastEntry } from "../generation/living-cast.ts";
import type { ActivationDiagnostic, CharacterActivationSource } from "./schema.ts";

export type ResolvableCharacter = {
  id: string;
  name: string;
  relationships?: Array<{
    characterId: string;
    type: string;
    description: string;
    trust?: string;
    affection?: string;
    familiarity?: string;
    notes?: string;
  }>;
};

export type ResolvedCast = {
  cast: LivingCastEntry[];
  diagnostics: ActivationDiagnostic[];
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.toLocaleLowerCase("en-US") ?? "";
}

function resolveCharacter(entry: LivingCastEntry, characters: ResolvableCharacter[]): { character: ResolvableCharacter; matchedBy: "id" | "full-name" | "unique-first-name" } | null {
  const byId = characters.find((character) => character.id === entry.id);
  if (byId) return { character: byId, matchedBy: "id" };
  const byName = characters.find((character) => castKey(character.name) === castKey(entry.name));
  if (byName) return { character: byName, matchedBy: "full-name" };
  const token = firstName(entry.name);
  if (token.length < 3) return null;
  const matches = characters.filter((character) => firstName(character.name) === token);
  return matches.length === 1 ? { character: matches[0], matchedBy: "unique-first-name" } : null;
}

function relationshipNotes(character: ResolvableCharacter, characters: ResolvableCharacter[]): LivingCastEntry["relationships"] {
  return (character.relationships ?? []).map((relationship) => {
    const target = characters.find((candidate) => candidate.id === relationship.characterId);
    return {
      target: target?.name ?? relationship.characterId,
      descriptor: [relationship.type, relationship.description, relationship.notes].filter(Boolean).join(": ").slice(0, 160),
    };
  });
}

function activationSource(entry: LivingCastEntry, relationshipLinked: boolean): CharacterActivationSource {
  if (entry.primary) return "primary-character";
  if (entry.origin === "invited") return "explicit-invitation";
  if (relationshipLinked) return "relationship-linked-known-character";
  return "known-character-entry";
}

export function resolveLivingCastCharacters(
  cast: LivingCastEntry[],
  characters: ResolvableCharacter[],
  now = Date.now(),
): ResolvedCast {
  const diagnostics: ActivationDiagnostic[] = [];
  const knownCastIds = new Set(cast.flatMap((entry) => {
    const match = entry.origin === "player" ? null : resolveCharacter(entry, characters);
    return match ? [match.character.id] : [];
  }));
  const resolvedCast = cast.map((entry) => {
    if (entry.origin === "player") return { ...entry, resolutionStatus: "ambient" as const };
    const match = resolveCharacter(entry, characters);
    if (!match) {
      const unresolved = {
        ...entry,
        resolutionStatus: "unresolved" as const,
        activationReason: entry.presence === "active" ? "participation detected but no real character card resolved" : undefined,
        activationSource: "unresolved-character" as const,
      };
      if (entry.presence === "active") diagnostics.push({ name: entry.name, reason: unresolved.activationReason!, source: "unresolved-character", resolved: false });
      return unresolved;
    }

    const linked = match.character.relationships?.some((relationship) => knownCastIds.has(relationship.characterId))
      || characters.some((candidate) =>
        candidate.id !== match.character.id
        && knownCastIds.has(candidate.id)
        && candidate.relationships?.some((relationship) => relationship.characterId === match.character.id),
      );
    const source = activationSource(entry, linked);
    const reason = entry.primary
      ? "selected primary character"
      : entry.origin === "invited"
        ? "explicitly invited into the scene"
        : linked
          ? "entered scene through interaction with a related known character"
          : "known character entered and participated in the scene";
    const next: LivingCastEntry = {
      ...entry,
      id: match.character.id,
      name: match.character.name,
      relationships: relationshipNotes(match.character, characters),
      resolutionStatus: "resolved",
      resolvedCharacterId: match.character.id,
      resolutionMatchedBy: match.matchedBy,
      activationReason: entry.presence === "active" ? reason : undefined,
      activationSource: entry.presence === "active" ? source : undefined,
      updatedAt: now,
    };
    if (entry.presence === "active") diagnostics.push({ characterId: match.character.id, name: match.character.name, reason, source, resolved: true });
    return next;
  });
  return { cast: resolvedCast, diagnostics };
}

export function canParticipate(entry: LivingCastEntry): boolean {
  if (entry.origin === "player" || entry.presence !== "active") return false;
  if (entry.resolutionStatus === "unresolved") return false;
  if (entry.origin === "temporary") return entry.resolutionStatus === "resolved";
  return true;
}

export function renderActivationDiagnostics(diagnostic: ActivationDiagnostic): string {
  return [
    "ACTIVATION",
    diagnostic.characterId ?? diagnostic.name,
    `reason: ${diagnostic.reason}`,
    `source: ${diagnostic.source}`,
    `resolved: ${diagnostic.resolved}`,
  ].join("\n");
}
