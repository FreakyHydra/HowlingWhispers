import type { Location } from "./types.ts";
import {
  sanitizeLocation,
  LOCATION_FORMAT,
  LOCATION_FORMAT_VERSION,
  newLocationId,
} from "./types.ts";

export const MAX_LOCATION_BYTES = 256 * 1024;
const MAX_LIBRARY_LOCATIONS = 60;

export function serializeLocation(location: Location): string {
  return JSON.stringify(
    { format: LOCATION_FORMAT, version: LOCATION_FORMAT_VERSION, location },
    null,
    2,
  );
}

export function serializeLocationLibrary(locations: Location[]): string {
  return JSON.stringify(
    { format: `${LOCATION_FORMAT}-library`, version: LOCATION_FORMAT_VERSION, locations },
    null,
    2,
  );
}

export type ImportResult =
  | { ok: true; locations: Location[] }
  | { ok: false; error: string };

export function parseLocationImport(json: string): ImportResult {
  if (json.length > MAX_LOCATION_BYTES) {
    return { ok: false, error: "This location file is too large to import safely." };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "This file does not contain a valid Location." };
  }
  const obj = data as Record<string, unknown>;

  if (obj.format === LOCATION_FORMAT) {
    if (obj.version !== LOCATION_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers Location file version is not supported." };
    }
    if (!isRecord(obj.location)) {
      return { ok: false, error: "The location in this file is malformed." };
    }
    const location = sanitizeLocation(obj.location);
    if (!location) return { ok: false, error: "The location in this file is missing a name." };
    return { ok: true, locations: [location] };
  }

  if (obj.format === `${LOCATION_FORMAT}-library`) {
    if (obj.version !== LOCATION_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers Location file version is not supported." };
    }
    if (!Array.isArray(obj.locations)) {
      return { ok: false, error: "The location library file has no locations list." };
    }
    if (obj.locations.length > MAX_LIBRARY_LOCATIONS) {
      return { ok: false, error: "This location library contains too many locations to import." };
    }
    const locations = obj.locations
      .map((item) => (isRecord(item) ? sanitizeLocation(item) : null))
      .filter((loc): loc is Location => loc !== null);
    if (locations.length === 0) {
      return { ok: false, error: "The location library contains no valid locations." };
    }
    return { ok: true, locations };
  }

  if (typeof obj.format === "string") {
    return { ok: false, error: "This file is not a recognized Howling Whispers Location file." };
  }

  const location = sanitizeLocation(obj);
  if (!location) {
    return { ok: false, error: "This file does not contain a valid Location." };
  }
  return { ok: true, locations: [location] };
}

export function ensureUniqueLocationIds(
  locations: Location[],
  existing: Array<string | undefined>,
): Location[] {
  const taken = new Set(existing.filter(Boolean) as string[]);
  return locations.map((location) => {
    if (!taken.has(location.id)) {
      taken.add(location.id);
      return location;
    }
    let fresh = newLocationId();
    while (taken.has(fresh)) fresh = newLocationId();
    taken.add(fresh);
    return { ...location, id: fresh };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
