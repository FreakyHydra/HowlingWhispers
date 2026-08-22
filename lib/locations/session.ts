import type { Location } from "./types.ts";

export type { LocationTarget } from "../../app/dreambound-app.ts";

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

export function isLocationKey(key: string): boolean {
  return key.startsWith("location:") || key.startsWith("location-");
}

export function resolveLocationIdFromKey(key: string): string | null {
  if (key.startsWith("location:")) return key.slice("location:".length);
  if (key.startsWith("location-")) return key.slice("location-".length);
  return null;
}

export function resolveSelectedTarget(selectedId: string, characterIds: string[], locationTargets: Record<string, LocationTarget>): {
  id: string;
  name: string;
  isLocation: boolean;
} {
  if (characterIds.includes(selectedId)) {
    return { id: selectedId, name: selectedId, isLocation: false };
  }
  const locationTarget = locationTargets[selectedId];
  if (locationTarget) {
    return { id: locationTarget.id, name: locationTarget.name, isLocation: true };
  }
  if (isLocationKey(selectedId)) {
    const locationId = resolveLocationIdFromKey(selectedId);
    if (locationId) {
      return { id: locationSelectionKey(locationId), name: "Unavailable Location", isLocation: true };
    }
  }
  return { id: characterIds[0] ?? selectedId, name: characterIds[0] ?? selectedId, isLocation: false };
}
