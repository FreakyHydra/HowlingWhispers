import type { Location } from "./types.ts";

export function locationSelectionKey(locationId: string): string {
  return `location:${locationId}`;
}

export function resolveLocationScenes<T>(
  location: Location,
  savedScenes: T[] | undefined,
  createScene: (location: Location) => T,
): T[] {
  return savedScenes ?? [createScene(location)];
}

export function locationSessionFields(locationId: string): { locationId: string } {
  return { locationId };
}
