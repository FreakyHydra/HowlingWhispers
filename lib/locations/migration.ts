import type { Location } from "./types.ts";
import type { StorySession } from "../../app/dreambound-app.ts";

export function migrateLegacySessions(
  sessions: StorySession[],
  validLocationIds: Set<string>,
  retiredCharacterIds: Set<string>,
): StorySession[] {
  return sessions
    .filter((session) => !session.characterId || !retiredCharacterIds.has(session.characterId))
    .filter((session) => {
      if (session.locationId && !validLocationIds.has(session.locationId)) {
        return false;
      }
      return true;
    })
    .map((session) => {
      if (session.locationId && session.characterId) {
        const migrated = { ...session };
        delete migrated.characterId;
        return migrated;
      }
      return session;
    });
}

export function migrateLegacySelectedId(
  selectedId: string,
  locations: Location[],
): string {
  if (selectedId.startsWith("location-")) {
    const legacyLocationId = selectedId.slice("location-".length);
    if (locations.some((location) => location.id === legacyLocationId)) {
      return `location:${legacyLocationId}`;
    }
    return `location:${legacyLocationId}`;
  }
  if (selectedId.startsWith("location:")) {
    return selectedId;
  }
  return selectedId;
}
