import type { Location } from "./types.ts";
import type { StorySession } from "../../app/dreambound-app.ts";

const OPEN_SANDBOX_SCENE_ID = "open-sandbox";

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
      let migrated = session.sceneId === OPEN_SANDBOX_SCENE_ID && session.sandbox !== true
        ? { ...session, sandbox: true }
        : session;
      if (session.locationId && session.characterId) {
        migrated = { ...migrated };
        delete migrated.characterId;
      }
      return migrated;
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
