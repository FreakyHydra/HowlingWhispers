import type { LivingCastEntry } from "../generation/living-cast.ts";
import { createCast } from "../generation/living-cast.ts";

export type CastInvitation = {
  characterId: string;
  characterName: string;
  invitedAt: number;
};

const MAX_CAST_SIZE = 10;

export function inviteCharacter(
  cast: LivingCastEntry[],
  characterId: string,
  characterName: string,
  now = Date.now(),
): LivingCastEntry[] {
  const existing = cast.find((entry) => entry.id === characterId);
  if (existing) {
    if (existing.origin === "invited") {
      return cast.map((entry) =>
        entry.id === characterId ? { ...entry, updatedAt: now } : entry,
      );
    }
    // Already present with a different origin; do not duplicate
    return cast;
  }

  if (cast.length >= MAX_CAST_SIZE) return cast;

  const entry: LivingCastEntry = {
    id: characterId,
    name: characterName.trim().slice(0, 80),
    origin: "invited",
    presence: "active",
    primary: false,
    addedAt: now,
    updatedAt: now,
    notes: [],
    relationships: [],
  };

  return [...cast, entry];
}

export function removeInvitedCharacter(
  cast: LivingCastEntry[],
  characterId: string,
): LivingCastEntry[] {
  return cast.filter(
    (entry) => entry.id !== characterId || entry.primary || entry.origin === "player",
  );
}

export function resetCast(
  primaryCharacter: { id: string; name: string },
  playerName?: string,
  now = Date.now(),
): LivingCastEntry[] {
  return createCast(primaryCharacter, playerName, now);
}

export function isInvitedCharacter(
  cast: LivingCastEntry[],
  characterId: string,
): boolean {
  return cast.some(
    (entry) => entry.id === characterId && entry.origin !== "player" && !entry.primary,
  );
}
