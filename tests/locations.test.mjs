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
  assert.ok(result.error.includes("not a Howling Whispers location"));
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
