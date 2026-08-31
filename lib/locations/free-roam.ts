import type { Location } from "./types.ts";

export const FREE_ROAM_LOCATION_ID = "open-world";

export function createFreeRoamLocation(now = Date.now()): Location {
  const timestamp = new Date(now).toISOString();
  return {
    id: FREE_ROAM_LOCATION_ID,
    name: "Free Roam",
    type: "Open world",
    shortDescription: "No predefined cast. Begin with only your persona and let the world develop around you.",
    description: "An open-ended roleplay starting point. The player enters without a predefined companion, primary Contact, or mandatory story. Characters may be encountered, mentioned, invited, or emerge naturally as the world develops.",
    atmosphere: ["open-ended", "player-led", "persistent social world"],
    occupants: [],
    tags: ["open-world", "free-roam", "player-start"],
    source: "custom",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function hasExplicitCast<T>(livingCast: T[] | undefined): livingCast is T[] {
  return Array.isArray(livingCast);
}
