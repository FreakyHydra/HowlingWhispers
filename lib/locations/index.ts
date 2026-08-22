export {
  LOCATION_FORMAT,
  LOCATION_FORMAT_VERSION,
  type LocationSource,
  type LocationArea,
  type AgeRange,
  type Location,
  type PortableLocation,
  type CanonicalLocationV1,
  type RawCanonSource,
  newLocationId,
  sanitizeLocation,
  sanitizeStringList,
  isRecord,
  sanitizeRawSource,
} from "./types.ts";

export {
  parseCanonicalLocation,
  locationToCanon,
  canonToLocation,
} from "./canonical.ts";

export {
  serializeLocation,
  serializeLocationLibrary,
  parseLocationImport,
  ensureUniqueLocationIds,
  MAX_LOCATION_BYTES,
} from "./import-export.ts";
