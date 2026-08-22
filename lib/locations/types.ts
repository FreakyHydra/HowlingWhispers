export const LOCATION_FORMAT = "howling-whispers-location";
export const LOCATION_FORMAT_VERSION = 1;

export type LocationSource = "curated" | "custom";

export type LocationArea = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  tags?: string[];
};

export type AgeRange = {
  minimum?: number;
  maximum?: number;
};

export type Location = {
  id: string;
  name: string;

  type?: string;
  shortDescription?: string;
  description?: string;
  image?: string;

  areas?: LocationArea[];

  features?: string[];
  activities?: string[];
  atmosphere?: string[];

  occupants?: string[];
  staffRoles?: string[];

  accessibilityFeatures?: string[];

  ageRange?: AgeRange;

  tags?: string[];

  source: LocationSource;

  linkedWorldId?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type PortableLocation = {
  format: typeof LOCATION_FORMAT;
  version: typeof LOCATION_FORMAT_VERSION;
  location: Location;
};

export type CanonicalLocationV1 = {
  format: typeof LOCATION_FORMAT;
  version: typeof LOCATION_FORMAT_VERSION;
  id: string;
  revision: string;
  identity: {
    name: string;
    type?: string;
    shortDescription?: string;
    description?: string;
  };
  details?: {
    areas?: LocationArea[];
    features?: string[];
    activities?: string[];
    atmosphere?: string[];
    occupants?: string[];
    staffRoles?: string[];
    accessibilityFeatures?: string[];
    ageRange?: AgeRange;
  };
  tags?: string[];
  linkedWorldId?: string;
  rawSources?: RawCanonSource[];
};

export type RawCanonSource = {
  id: string;
  kind: "runtime-authoritative" | "editorial-bible" | "fallback-prompt" | "secondary-voice";
  sha256: string;
  text: string;
};

const MAX_NAME = 120;
const MAX_TEXT = 24_000;
const MAX_LIST_ITEMS = 48;
const MAX_ITEM_LENGTH = 240;
const MAX_RAW_SOURCE_TEXT = 200_000;

export function newLocationId(seed = Date.now()): string {
  return `location-${seed.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sanitizeLocation(input: unknown): Location | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;

  const id = limitedString(src.id, MAX_NAME).trim();
  const name = limitedString(src.name, MAX_NAME).trim();
  const source = src.source === "curated" || src.source === "custom" ? src.source : "custom";

  if (!id || !name) return null;

  const areas = Array.isArray(src.areas)
    ? src.areas.slice(0, MAX_LIST_ITEMS).flatMap((area) => {
        if (!isRecord(area)) return [];
        const areaId = limitedString(area.id, MAX_NAME).trim();
        const areaName = limitedString(area.name, MAX_NAME).trim();
        if (!areaId || !areaName) return [];
        return [{
          id: areaId,
          name: areaName,
          description: limitedString(area.description, MAX_TEXT).trim() || undefined,
          image: limitedString(area.image, MAX_NAME).trim() || undefined,
          tags: stringList(area.tags, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
        }];
      })
    : undefined;

  const ageRange = isRecord(src.ageRange)
    ? {
        minimum: typeof src.ageRange.minimum === "number" && Number.isFinite(src.ageRange.minimum)
          ? Math.max(0, Math.floor(src.ageRange.minimum))
          : undefined,
        maximum: typeof src.ageRange.maximum === "number" && Number.isFinite(src.ageRange.maximum)
          ? Math.max(0, Math.floor(src.ageRange.maximum))
          : undefined,
      }
    : undefined;

  if (ageRange && ageRange.minimum !== undefined && ageRange.maximum !== undefined && ageRange.minimum > ageRange.maximum) {
    const swap = ageRange.minimum;
    ageRange.minimum = ageRange.maximum;
    ageRange.maximum = swap;
  }

  return {
    id,
    name,
    type: limitedString(src.type, MAX_NAME).trim() || undefined,
    shortDescription: limitedString(src.shortDescription, MAX_ITEM_LENGTH * 4).trim() || undefined,
    description: limitedString(src.description, MAX_TEXT).trim() || undefined,
    image: limitedString(src.image, MAX_NAME).trim() || undefined,
    areas,
    features: stringList(src.features, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    activities: stringList(src.activities, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    atmosphere: stringList(src.atmosphere, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    occupants: stringList(src.occupants, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    staffRoles: stringList(src.staffRoles, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    accessibilityFeatures: stringList(src.accessibilityFeatures, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    ageRange,
    tags: stringList(src.tags, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    source,
    linkedWorldId: limitedString(src.linkedWorldId, MAX_NAME).trim() || undefined,
    createdAt: limitedString(src.createdAt, 64).trim() || undefined,
    updatedAt: limitedString(src.updatedAt, 64).trim() || undefined,
  };
}

export function sanitizeStringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, maxItems)
    .map((item) => limitedString(item, maxLength).trim())
    .filter(Boolean);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeRawSource(value: unknown): RawCanonSource | undefined {
  if (!isRecord(value)) return undefined;
  const id = limitedString(value.id, MAX_NAME).trim();
  const sha256 = limitedString(value.sha256, 64).toLowerCase();
  const text = exactString(value.text, MAX_RAW_SOURCE_TEXT);
  const kinds = new Set<RawCanonSource["kind"]>([
    "runtime-authoritative",
    "editorial-bible",
    "fallback-prompt",
    "secondary-voice",
  ]);
  if (!id || !/^[a-f0-9]{64}$/.test(sha256) || !text || !kinds.has(value.kind as RawCanonSource["kind"])) {
    return undefined;
  }
  return { id, sha256, text, kind: value.kind as RawCanonSource["kind"] };
}

function limitedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function exactString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, maxItems)
    .map((item) => limitedString(item, maxLength).trim())
    .filter(Boolean);
}
