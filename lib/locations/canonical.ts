import {
  isRecord,
  LOCATION_FORMAT,
  LOCATION_FORMAT_VERSION,
} from "./types.ts";
import type { CanonicalLocationV1, LocationArea } from "./types.ts";

export function parseCanonicalLocation(value: unknown): CanonicalLocationV1 | null {
  if (!isRecord(value)) return null;
  if (value.format !== LOCATION_FORMAT || value.version !== LOCATION_FORMAT_VERSION) return null;

  const id = limitedString(value.id, 120);
  const revision = limitedString(value.revision, 64);
  const identityValue = isRecord(value.identity) ? value.identity : null;
  const name = limitedString(identityValue?.name, 120);
  if (!id || !revision || !name) return null;

  const rawSources = Array.isArray(value.rawSources)
    ? value.rawSources.slice(0, 8).flatMap((raw) => sanitizeRawSource(raw) ?? [])
    : [];

  return {
    format: LOCATION_FORMAT,
    version: LOCATION_FORMAT_VERSION,
    id,
    revision,
    identity: {
      name,
      type: limitedString(identityValue?.type, 120).trim() || undefined,
      shortDescription: limitedString(identityValue?.shortDescription, 960).trim() || undefined,
      description: limitedString(identityValue?.description, 24_000).trim() || undefined,
    },
    details: isRecord(value.details) ? {
      areas: parseAreas(value.details.areas),
      features: stringList(value.details.features, 48, 240),
      activities: stringList(value.details.activities, 48, 240),
      atmosphere: stringList(value.details.atmosphere, 48, 240),
      occupants: stringList(value.details.occupants, 48, 240),
      staffRoles: stringList(value.details.staffRoles, 48, 240),
      accessibilityFeatures: stringList(value.details.accessibilityFeatures, 48, 240),
      ageRange: parseAgeRange(value.details.ageRange),
    } : undefined,
    tags: stringList(value.tags, 48, 120),
    linkedWorldId: limitedString(value.linkedWorldId, 120).trim() || undefined,
    rawSources,
  };
}

export function locationToCanon(location: Location): CanonicalLocationV1 {
  const now = new Date().toISOString();
  const revision = location.updatedAt || location.createdAt || now;

  const details = {
    areas: location.areas,
    features: location.features,
    activities: location.activities,
    atmosphere: location.atmosphere,
    occupants: location.occupants,
    staffRoles: location.staffRoles,
    accessibilityFeatures: location.accessibilityFeatures,
    ageRange: location.ageRange,
  };

  const hasDetails = Object.values(details).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.values(value).some((v) => v !== undefined);
    return value !== undefined && value !== null && value !== "";
  });

  return {
    format: LOCATION_FORMAT,
    version: LOCATION_FORMAT_VERSION,
    id: location.id,
    revision,
    identity: {
      name: location.name,
      type: location.type,
      shortDescription: location.shortDescription,
      description: location.description,
    },
    ...(hasDetails ? { details } : {}),
    tags: location.tags,
    linkedWorldId: location.linkedWorldId,
  };
}

export function canonToLocation(canon: CanonicalLocationV1): Location {
  return {
    id: canon.id,
    name: canon.identity.name,
    type: canon.identity.type,
    shortDescription: canon.identity.shortDescription,
    description: canon.identity.description,
    areas: canon.details?.areas,
    features: canon.details?.features,
    activities: canon.details?.activities,
    atmosphere: canon.details?.atmosphere,
    occupants: canon.details?.occupants,
    staffRoles: canon.details?.staffRoles,
    accessibilityFeatures: canon.details?.accessibilityFeatures,
    ageRange: canon.details?.ageRange,
    tags: canon.tags,
    source: "curated",
    linkedWorldId: canon.linkedWorldId,
  };
}

function parseAreas(value: unknown): LocationArea[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: LocationArea[] = [];
  for (const area of value) {
    if (!isRecord(area)) continue;
    const id = limitedString(area.id, 120).trim();
    const name = limitedString(area.name, 120).trim();
    if (!id || !name) continue;
    result.push({
      id,
      name,
      description: limitedString(area.description, 24_000).trim() || undefined,
      image: limitedString(area.image, 120).trim() || undefined,
      tags: stringList(area.tags, 24, 120),
    });
    if (result.length >= 48) break;
  }
  return result.length > 0 ? result : undefined;
}

function parseAgeRange(value: unknown): { minimum?: number; maximum?: number } | undefined {
  if (!isRecord(value)) return undefined;
  const minimum = typeof value.minimum === "number" && Number.isFinite(value.minimum)
    ? Math.max(0, Math.floor(value.minimum))
    : undefined;
  const maximum = typeof value.maximum === "number" && Number.isFinite(value.maximum)
    ? Math.max(0, Math.floor(value.maximum))
    : undefined;
  if (minimum === undefined && maximum === undefined) return undefined;
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return { minimum: maximum, maximum: minimum };
  }
  return { minimum, maximum };
}

function limitedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, maxItems)
    .map((item) => limitedString(item, maxLength).trim())
    .filter(Boolean);
}
