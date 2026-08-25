import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCATION_FORMAT,
  LOCATION_FORMAT_VERSION,
  sanitizeLocation,
  parseCanonicalLocation,
  locationToCanon,
  canonToLocation,
  parseLocationImport,
  serializeLocation,
  ensureUniqueLocationIds,
  MAX_LOCATION_BYTES,
} from "../lib/locations/index.ts";
import { locationSelectionKey, locationSessionFields, resolveLocationScenes, isLocationKey, resolveLocationIdFromKey, resolveSelectedTarget } from "../lib/locations/session.ts";
import { migrateLegacySessions, migrateLegacySelectedId } from "../lib/locations/migration.ts";

function baseLocation(overrides = {}) {
  return {
    id: "loc-test-1",
    name: "Sunrise Daycare",
    source: "custom",
    ...overrides,
  };
}

test("valid Location canonical parse", () => {
  const canon = {
    format: LOCATION_FORMAT,
    version: LOCATION_FORMAT_VERSION,
    id: "loc-1",
    revision: "rev-1",
    identity: {
      name: "Old Pine Forest",
      type: "forest",
      shortDescription: "A quiet woodland.",
      description: "Tall pines and a winding trail.",
    },
    details: {
      areas: [
        { id: "area-1", name: "Riverbank", description: "Cold water and smooth stones." },
      ],
      features: ["trail", "clearing"],
      activities: ["hiking"],
      atmosphere: ["peaceful", "misty"],
      occupants: ["foxes", "owls"],
      staffRoles: [],
      accessibilityFeatures: ["path"],
      ageRange: { minimum: 0, maximum: 99 },
    },
    tags: ["nature", "wilderness"],
    linkedWorldId: "world-1",
  };

  const parsed = parseCanonicalLocation(canon);
  assert.ok(parsed, "parsed canon should not be null");
  assert.equal(parsed.id, "loc-1");
  assert.equal(parsed.identity.name, "Old Pine Forest");
  assert.equal(parsed.details?.areas?.[0]?.name, "Riverbank");
  assert.deepEqual(parsed.details?.ageRange, { minimum: 0, maximum: 99 });
});

test("invalid/foreign format rejection", () => {
  assert.equal(parseCanonicalLocation(null), null);
  assert.equal(parseCanonicalLocation("string"), null);
  assert.equal(parseCanonicalLocation({}), null);
  assert.equal(parseCanonicalLocation({ format: "unknown", version: 1 }), null);
  assert.equal(parseCanonicalLocation({ format: LOCATION_FORMAT, version: 99 }), null);
});

test("unsupported version rejection", () => {
  assert.equal(
    parseCanonicalLocation({ format: LOCATION_FORMAT, version: 2, id: "x", revision: "r", identity: { name: "X" } }),
    null,
  );
});

test("Location -> canonical -> Location round trip", () => {
  const original = baseLocation({
    type: "daycare",
    description: "A bright place for children.",
    features: ["sensory room"],
    ageRange: { minimum: 0, maximum: 5 },
    tags: ["childcare"],
  });

  const canon = locationToCanon(original);
  assert.equal(canon.identity.name, original.name);
  assert.equal(canon.details?.ageRange?.minimum, 0);
  assert.equal(canon.details?.ageRange?.maximum, 5);

  const roundTripped = canonToLocation(canon);
  assert.equal(roundTripped.id, original.id);
  assert.equal(roundTripped.name, original.name);
  assert.equal(roundTripped.type, original.type);
  assert.deepEqual(roundTripped.ageRange, original.ageRange);
});

test("Location -> portable JSON -> Location round trip", () => {
  const original = baseLocation({
    name: "Abandoned Observatory",
    type: "ruin",
    description: "A broken telescope points at the stars.",
    areas: [{ id: "a1", name: "Dome", description: "Cracked glass." }],
    features: ["telescope", "dust"],
    atmosphere: ["eerie"],
    tags: ["ruins", "night"],
  });

  const json = serializeLocation(original);
  const parsed = parseLocationImport(json);
  assert.ok(parsed.ok, "import should succeed");
  assert.equal(parsed.locations.length, 1);
  const imported = parsed.locations[0];
  assert.equal(imported.name, original.name);
  assert.equal(imported.areas?.[0]?.name, "Dome");
  assert.deepEqual(imported.features, ["telescope", "dust"]);
});

test("optional fields remain optional", () => {
  const minimal = baseLocation({ name: "X" });
  const canon = locationToCanon(minimal);
  assert.equal(canon.identity.name, "X");
  assert.equal(canon.identity.type, undefined);
  assert.equal(canon.identity.description, undefined);
  assert.equal(canon.details, undefined);
  assert.equal(canon.tags, undefined);
});

test("areas survive round trip", () => {
  const location = baseLocation({
    areas: [
      { id: "a1", name: "Lobby", description: "Welcoming.", tags: ["entry"] },
      { id: "a2", name: "Garden" },
    ],
  });

  const canon = locationToCanon(location);
  assert.equal(canon.details?.areas?.length, 2);
  assert.equal(canon.details?.areas?.[0]?.name, "Lobby");
  assert.equal(canon.details?.areas?.[1]?.description, undefined);

  const back = canonToLocation(canon);
  assert.equal(back.areas?.[0]?.name, "Lobby");
  assert.equal(back.areas?.[1]?.tags, undefined);
});

test("ageRange survives when present", () => {
  const location = baseLocation({ ageRange: { minimum: 3, maximum: 12 } });
  const canon = locationToCanon(location);
  assert.deepEqual(canon.details?.ageRange, { minimum: 3, maximum: 12 });

  const back = canonToLocation(canon);
  assert.deepEqual(back.ageRange, { minimum: 3, maximum: 12 });
});

test("absence of ageRange remains valid", () => {
  const location = baseLocation({ name: "Forest" });
  const canon = locationToCanon(location);
  assert.equal(canon.details?.ageRange, undefined);

  const back = canonToLocation(canon);
  assert.equal(back.ageRange, undefined);
});

test("malformed arrays sanitized/rejected appropriately", () => {
  const bad = {
    format: LOCATION_FORMAT,
    version: LOCATION_FORMAT_VERSION,
    id: "x",
    revision: "r",
    identity: { name: "X" },
    details: {
      features: "not-an-array",
      areas: [null, "string", { id: "a1", name: "Valid" }],
      ageRange: { minimum: "five", maximum: true },
    },
  };

  const parsed = parseCanonicalLocation(bad);
  assert.ok(parsed, "valid fields should still parse");
  assert.equal(parsed.details?.features, undefined);
  assert.equal(parsed.details?.areas?.length, 1);
  assert.equal(parsed.details?.areas?.[0]?.name, "Valid");
  assert.equal(parsed.details?.ageRange, undefined);
});

test("excessive text/list sizes bounded", () => {
  const hugeName = "X".repeat(200);
  const hugeList = Array.from({ length: 100 }, (_, i) => `item-${i}`);
  const canon = {
    format: LOCATION_FORMAT,
    version: LOCATION_FORMAT_VERSION,
    id: "x",
    revision: "r",
    identity: { name: hugeName },
    details: { features: hugeList, areas: [{ id: "a1", name: hugeName }] },
  };

  const parsed = parseCanonicalLocation(canon);
  assert.ok(parsed);
  assert.ok(parsed.identity.name.length <= 120);
  assert.ok((parsed.details?.features?.length ?? 0) <= 48);
  assert.ok((parsed.details?.areas?.length ?? 0) <= 48);
});

test("source ownership retained appropriately", () => {
  const curated = sanitizeLocation({ id: "c1", name: "Curated Loc", source: "curated" });
  assert.ok(curated);
  assert.equal(curated.source, "curated");

  const custom = sanitizeLocation({ id: "c2", name: "Custom Loc", source: "custom" });
  assert.ok(custom);
  assert.equal(custom.source, "custom");

  const fallback = sanitizeLocation({ id: "c3", name: "No Source Loc" });
  assert.ok(fallback);
  assert.equal(fallback.source, "custom");
});

test("custom Location scenes never fall back to Coda scenes", () => {
  const location = baseLocation({ id: "custom-location", name: "The Glasshouse" });
  const codaScene = { id: "moonlit-study", title: "The Moonlit Study" };
  const locationScene = { id: `location-scene-${location.id}`, title: location.name };

  assert.equal(locationSelectionKey(location.id), "location:custom-location");
  assert.deepEqual(locationSessionFields(location.id), { locationId: location.id });
  assert.deepEqual(
    resolveLocationScenes(location, undefined, () => locationScene),
    [locationScene],
  );
  assert.notDeepEqual(
    resolveLocationScenes(location, undefined, () => locationScene),
    [codaScene],
  );
});

test("generic non-daycare Location works correctly", () => {
  const spaceship = baseLocation({
    id: "ship-1",
    name: "ISS Vagabond",
    type: "spaceship",
    description: "A salvage vessel drifting between systems.",
    areas: [
      { id: "bridge", name: "Bridge" },
      { id: "cargo", name: "Cargo Hold" },
      { id: "quarters", name: "Crew Quarters" },
    ],
    features: ["fTL drive", "cargo crane"],
    atmosphere: ["sterile", "humming"],
    occupants: ["Captain Rook", "Unit-7"],
    staffRoles: ["pilot", "engineer"],
    linkedWorldId: "world-space",
    tags: ["sci-fi", "ship"],
  });

  const canon = locationToCanon(spaceship);
  const back = canonToLocation(canon);
  assert.equal(back.name, "ISS Vagabond");
  assert.equal(back.areas?.length, 3);
  assert.equal(back.areas?.[1]?.name, "Cargo Hold");
  assert.deepEqual(back.features, ["fTL drive", "cargo crane"]);
  assert.equal(back.linkedWorldId, "world-space");
  assert.equal(back.ageRange, undefined);
});

test("portable import rejects non-location JSON", () => {
  const result = parseLocationImport('{"format":"howling-whispers-character","version":1}');
  assert.ok(!result.ok);
  assert.ok(result.error.includes("not a recognized Howling Whispers Location file"));
});

test("portable import rejects unsupported wrapped version", () => {
  const result = parseLocationImport(JSON.stringify({
    format: LOCATION_FORMAT,
    version: 99,
    location: { id: "x", name: "X", source: "custom" },
  }));
  assert.ok(!result.ok);
  assert.ok(result.error.includes("version is not supported"));
});

test("portable import rejects malformed JSON", () => {
  const result = parseLocationImport("not json");
  assert.ok(!result.ok);
  assert.ok(result.error.includes("not readable JSON"));
});

test("portable import accepts plain valid Location object", () => {
  const result = parseLocationImport(JSON.stringify({
    id: "plain-1",
    name: "Plain Location",
    source: "custom",
    type: "ruin",
    description: "A manually created location.",
  }));
  assert.ok(result.ok, "plain Location import should succeed");
  assert.equal(result.locations.length, 1);
  assert.equal(result.locations[0].id, "plain-1");
  assert.equal(result.locations[0].name, "Plain Location");
  assert.equal(result.locations[0].type, "ruin");
  assert.equal(result.locations[0].description, "A manually created location.");
  assert.equal(result.locations[0].source, "custom");
});

test("portable import rejects malformed plain object", () => {
  const result = parseLocationImport(JSON.stringify({ type: "ruin", description: "No id or name" }));
  assert.ok(!result.ok);
  assert.ok(result.error.includes("not contain a valid Location"));
});

test("portable import rejects oversized file", () => {
  const big = JSON.stringify({ format: LOCATION_FORMAT, version: LOCATION_FORMAT_VERSION, location: { id: "x", name: "X", source: "custom" } });
  const padded = big.padEnd(MAX_LOCATION_BYTES + 1, " ");
  const result = parseLocationImport(padded);
  assert.ok(!result.ok);
  assert.ok(result.error.includes("too large"));
});

test("portable library import works", () => {
  const lib = {
    format: `${LOCATION_FORMAT}-library`,
    version: LOCATION_FORMAT_VERSION,
    locations: [
      { id: "l1", name: "A", source: "curated" },
      { id: "l2", name: "B", source: "custom" },
    ],
  };
  const result = parseLocationImport(JSON.stringify(lib));
  assert.ok(result.ok);
  assert.equal(result.locations.length, 2);
  assert.equal(result.locations[0].source, "curated");
  assert.equal(result.locations[1].source, "custom");
});

test("sanitizeLocation forces custom source when missing", () => {
  const location = sanitizeLocation({ id: "x", name: "X" });
  assert.ok(location);
  assert.equal(location.source, "custom");
});

test("sanitizeLocation preserves curated source", () => {
  const location = sanitizeLocation({ id: "x", name: "X", source: "curated" });
  assert.ok(location);
  assert.equal(location.source, "curated");
});

test("ensureUniqueLocationIds generates new ID for conflict", () => {
  const locations = [{ id: "existing", name: "Existing" }];
  const imported = [{ id: "existing", name: "Duplicate" }];
  const unique = ensureUniqueLocationIds(imported, locations.map((l) => l.id));
  assert.equal(unique.length, 1);
  assert.notEqual(unique[0].id, "existing");
});

test("ensureUniqueLocationIds keeps non-conflicting IDs", () => {
  const locations = [{ id: "existing", name: "Existing" }];
  const imported = [{ id: "new-id", name: "New" }];
  const unique = ensureUniqueLocationIds(imported, locations.map((l) => l.id));
  assert.equal(unique[0].id, "new-id");
});

test("sanitizeLocation preserves createdAt and updatedAt", () => {
  const now = new Date().toISOString();
  const location = sanitizeLocation({ id: "x", name: "X", createdAt: now, updatedAt: now });
  assert.ok(location);
  assert.equal(location.createdAt, now);
  assert.equal(location.updatedAt, now);
});

test("location round-trip preserves source ownership", () => {
  const curated = baseLocation({ id: "c1", name: "Curated", source: "curated" });
  const custom = baseLocation({ id: "c2", name: "Custom", source: "custom" });
  const canon1 = locationToCanon(curated);
  const canon2 = locationToCanon(custom);
  const back1 = canonToLocation(canon1);
  const back2 = canonToLocation(canon2);
  assert.equal(back1.source, "curated");
  assert.equal(back2.source, "curated");
});

test("sanitizeLocation handles full factory payload", () => {
  const payload = {
    id: "loc-1",
    name: "Moonflower Meadow",
    type: "Settlement",
    shortDescription: "A broad meadow beneath Bitterroot Peak.",
    description: "Tall grasses sway between wildflower patches. A stone bridge crosses the river.",
    image: "https://example.com/moonflower.png",
    areas: [
      { id: "area-1", name: "Riverbank", description: "Cold water and smooth stones.", tags: ["water"] },
      { id: "area-2", name: "Upper Fields", description: "Wheat and wildflowers.", tags: ["farm"] },
    ],
    features: ["Stone bridge", "Old watermill"],
    activities: ["Fishing", "Trading"],
    atmosphere: ["Peaceful", "Rainy"],
    occupants: ["Farmers", "Traders"],
    staffRoles: ["Ranger", "Medic"],
    accessibilityFeatures: ["Step-free entrance"],
    ageRange: { minimum: 0, maximum: 99 },
    tags: ["Wilderness", "Settlement"],
    linkedWorldId: "world-1",
    source: "custom",
  };

  const location = sanitizeLocation(payload);
  assert.ok(location);
  assert.equal(location.name, "Moonflower Meadow");
  assert.equal(location.type, "Settlement");
  assert.equal(location.areas?.length, 2);
  assert.equal(location.areas?.[0]?.name, "Riverbank");
  assert.deepEqual(location.features, ["Stone bridge", "Old watermill"]);
  assert.deepEqual(location.activities, ["Fishing", "Trading"]);
  assert.deepEqual(location.atmosphere, ["Peaceful", "Rainy"]);
  assert.deepEqual(location.occupants, ["Farmers", "Traders"]);
  assert.deepEqual(location.staffRoles, ["Ranger", "Medic"]);
  assert.deepEqual(location.accessibilityFeatures, ["Step-free entrance"]);
  assert.deepEqual(location.ageRange, { minimum: 0, maximum: 99 });
  assert.deepEqual(location.tags, ["Wilderness", "Settlement"]);
  assert.equal(location.linkedWorldId, "world-1");
});

test("sanitizeLocation keeps optional fields absent", () => {
  const payload = {
    id: "loc-2",
    name: "Old Pine Forest",
    source: "custom",
  };

  const location = sanitizeLocation(payload);
  assert.ok(location);
  assert.equal(location.type, undefined);
  assert.equal(location.description, undefined);
  assert.equal(location.areas, undefined);
  assert.equal(location.features, undefined);
  assert.equal(location.ageRange, undefined);
});

test("legacy Location session with stale characterId is migrated to clean Location session", () => {
  const retired = new Set(["ash", "seraphina"]);
  const validLocationIds = new Set(["custom-loc-1"]);
  const legacySession = {
    id: "session-legacy-1",
    characterId: "coda",
    locationId: "custom-loc-1",
    sceneId: "scene-1",
    title: "Legacy Location Session",
    messageKey: "session-legacy-1",
    createdAt: 1,
    updatedAt: 1,
  };

  const migrated = migrateLegacySessions([legacySession], validLocationIds, retired);
  assert.equal(migrated.length, 1, "session should be retained");
  assert.equal(migrated[0].characterId, undefined, "stale characterId must be removed");
  assert.equal(migrated[0].locationId, "custom-loc-1", "locationId must be preserved");
});

test("legacy Location session with obsolete locationId is removed", () => {
  const retired = new Set(["ash", "seraphina"]);
  const validLocationIds = new Set(["existing-loc"]);
  const obsoleteSession = {
    id: "session-obsolete-1",
    characterId: "coda",
    locationId: "deleted-loc",
    sceneId: "scene-1",
    title: "Obsolete Session",
    messageKey: "session-obsolete-1",
    createdAt: 1,
    updatedAt: 1,
  };

  const migrated = migrateLegacySessions([obsoleteSession], validLocationIds, retired);
  assert.equal(migrated.length, 0, "obsolete location session must be removed");
});

test("legacy open-sandbox sessions recover their missing sandbox flag", () => {
  const legacySession = {
    id: "session-sandbox-1",
    characterId: "riley",
    sceneId: "open-sandbox",
    title: "Open Sandbox",
    messageKey: "session-sandbox-1",
    createdAt: 1,
    updatedAt: 1,
  };

  const migrated = migrateLegacySessions(
    [legacySession],
    new Set(),
    new Set(["ash", "seraphina"]),
  );

  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].sandbox, true);
});

test("retired character sessions are still filtered out", () => {
  const retired = new Set(["ash", "seraphina"]);
  const validLocationIds = new Set(["custom-loc-1"]);
  const sessions = [
    {
      id: "session-ash",
      characterId: "ash",
      locationId: undefined,
      sceneId: "scene-1",
      title: "Ash Session",
      messageKey: "session-ash",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "session-loc",
      characterId: "coda",
      locationId: "custom-loc-1",
      sceneId: "scene-1",
      title: "Location Session",
      messageKey: "session-loc",
      createdAt: 2,
      updatedAt: 2,
    },
  ];

  const migrated = migrateLegacySessions(sessions, validLocationIds, retired);
  assert.equal(migrated.length, 1, "retired character session must be removed");
  assert.equal(migrated[0].id, "session-loc");
  assert.equal(migrated[0].characterId, undefined);
});

test("migrateLegacySelectedId converts old location- prefix to current location: prefix", () => {
  const locations = [{ id: "loc-1", name: "Test Loc", source: "custom" }];
  assert.equal(migrateLegacySelectedId("location-loc-1", locations), "location:loc-1");
});

test("migrateLegacySelectedId preserves invalid location keys as unresolved Location references", () => {
  const locations = [{ id: "loc-1", name: "Test Loc", source: "custom" }];
  assert.equal(migrateLegacySelectedId("location-deleted", locations), "location:deleted");
  assert.equal(migrateLegacySelectedId("location:deleted", locations), "location:deleted");
});

test("migrateLegacySelectedId preserves valid character and current location keys", () => {
  const locations = [{ id: "loc-1", name: "Test Loc", source: "custom" }];
  assert.equal(migrateLegacySelectedId("coda", locations), "coda");
  assert.equal(migrateLegacySelectedId("heather", locations), "heather");
  assert.equal(migrateLegacySelectedId("location:loc-1", locations), "location:loc-1");
});

test("migrated legacy Location session never resolves to coda character id", () => {
  const retired = new Set(["ash", "seraphina"]);
  const validLocationIds = new Set(["custom-loc-1"]);
  const legacySession = {
    id: "session-legacy-1",
    characterId: "coda",
    locationId: "custom-loc-1",
    sceneId: "scene-1",
    title: "Legacy Location Session",
    messageKey: "session-legacy-1",
    createdAt: 1,
    updatedAt: 1,
  };

  const migrated = migrateLegacySessions([legacySession], validLocationIds, retired);
  assert.equal(migrated.length, 1);
  assert.notEqual(migrated[0].characterId, "coda", "migrated session must not retain coda characterId");
  assert.equal(migrated[0].locationId, "custom-loc-1");
});

test("isLocationKey detects both location: and location- prefixes", () => {
  assert.ok(isLocationKey("location:daycare"));
  assert.ok(isLocationKey("location-daycare"));
  assert.ok(!isLocationKey("coda"));
  assert.ok(!isLocationKey("heather"));
});

test("resolveLocationIdFromKey extracts id from both prefixes", () => {
  assert.equal(resolveLocationIdFromKey("location:daycare"), "daycare");
  assert.equal(resolveLocationIdFromKey("location-daycare"), "daycare");
  assert.equal(resolveLocationIdFromKey("coda"), null);
});

test("resolveSelectedTarget returns Character for valid character id", () => {
  const result = resolveSelectedTarget("coda", ["coda", "heather"], {});
  assert.equal(result.id, "coda");
  assert.equal(result.name, "coda");
  assert.ok(!result.isLocation);
});

test("resolveSelectedTarget returns LocationTarget for valid location: key", () => {
  const locationTarget = {
    id: "location:daycare",
    name: "Daycare",
    role: "Location",
    status: "",
    image: "",
    sceneImage: "",
    backgroundFocalPoint: "center",
    accent: "#8aa4c9",
    memories: [],
    profile: "",
    scene: "Daycare",
    weather: "",
    reply: "",
  };
  const result = resolveSelectedTarget("location:daycare", ["coda"], { "location:daycare": locationTarget });
  assert.equal(result.id, "location:daycare");
  assert.equal(result.name, "Daycare");
  assert.ok(result.isLocation);
});

test("resolveSelectedTarget returns unavailable Location for missing location: key", () => {
  const result = resolveSelectedTarget("location:deleted", ["coda"], {});
  assert.equal(result.id, "location:deleted");
  assert.equal(result.name, "Unavailable Location");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("resolveSelectedTarget returns unavailable Location for missing location- legacy key", () => {
  const result = resolveSelectedTarget("location-deleted", ["coda"], {});
  assert.equal(result.id, "location:deleted");
  assert.equal(result.name, "Unavailable Location");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("resolveSelectedTarget falls back to default character only for non-location keys", () => {
  const result = resolveSelectedTarget("unknown-character", ["coda"], {});
  assert.equal(result.id, "coda");
  assert.ok(!result.isLocation);
});

test("existing Location resolves through locationTargets and never reaches Coda", () => {
  const locationTarget = {
    id: "location:daycare",
    name: "Daycare",
    role: "Location",
    status: "",
    image: "",
    sceneImage: "",
    backgroundFocalPoint: "center",
    accent: "#8aa4c9",
    memories: [],
    profile: "",
    scene: "Daycare",
    weather: "",
    reply: "",
  };
  const targets = { "location:daycare": locationTarget };
  const result = resolveSelectedTarget("location:daycare", ["coda"], targets);
  assert.equal(result.id, "location:daycare");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("legacy existing Location migrates and resolves without reaching Coda", () => {
  const locations = [{ id: "daycare", name: "Daycare", source: "custom" }];
  const migratedSelectedId = migrateLegacySelectedId("location-daycare", locations);
  assert.equal(migratedSelectedId, "location:daycare");
  const locationTarget = {
    id: "location:daycare",
    name: "Daycare",
    role: "Location",
    status: "",
    image: "",
    sceneImage: "",
    backgroundFocalPoint: "center",
    accent: "#8aa4c9",
    memories: [],
    profile: "",
    scene: "Daycare",
    weather: "",
    reply: "",
  };
  const targets = { "location:daycare": locationTarget };
  const result = resolveSelectedTarget(migratedSelectedId, ["coda"], targets);
  assert.equal(result.id, "location:daycare");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("missing current Location key produces unavailable state, not Coda", () => {
  const result = resolveSelectedTarget("location:deleted-place", ["coda"], {});
  assert.equal(result.id, "location:deleted-place");
  assert.equal(result.name, "Unavailable Location");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("missing legacy Location key produces unavailable state, not Coda", () => {
  const result = resolveSelectedTarget("location-deleted-place", ["coda"], {});
  assert.equal(result.id, "location:deleted-place");
  assert.equal(result.name, "Unavailable Location");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("stale Location session with characterId coda migrates to clean Location session", () => {
  const retired = new Set(["ash", "seraphina"]);
  const validLocationIds = new Set(["daycare"]);
  const legacySession = {
    id: "session-legacy-1",
    characterId: "coda",
    locationId: "daycare",
    sceneId: "scene-1",
    title: "Legacy Location Session",
    messageKey: "session-legacy-1",
    createdAt: 1,
    updatedAt: 1,
  };

  const migrated = migrateLegacySessions([legacySession], validLocationIds, retired);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].characterId, undefined, "stale characterId must be removed");
  assert.equal(migrated[0].locationId, "daycare");
});

test("valid Location with zero sessions still resolves through locationTargets", () => {
  const locationTarget = {
    id: "location:daycare",
    name: "Daycare",
    role: "Location",
    status: "",
    image: "",
    sceneImage: "",
    backgroundFocalPoint: "center",
    accent: "#8aa4c9",
    memories: [],
    profile: "",
    scene: "Daycare",
    weather: "",
    reply: "",
  };
  const targets = { "location:daycare": locationTarget };
  const result = resolveSelectedTarget("location:daycare", ["coda"], targets);
  assert.equal(result.id, "location:daycare");
  assert.ok(result.isLocation);
  assert.notEqual(result.id, "coda");
});

test("Location-originating selection never resolves to coda", () => {
  const locationKeys = ["location:daycare", "location-deleted", "location:deleted-place", "location-deleted-place"];
  for (const key of locationKeys) {
    const result = resolveSelectedTarget(key, ["coda"], {});
    assert.notEqual(result.id, "coda", `Location key ${key} must never resolve to coda`);
    assert.ok(result.isLocation, `Location key ${key} must be identified as Location`);
  }
});


