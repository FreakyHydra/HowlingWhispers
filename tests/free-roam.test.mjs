import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FREE_ROAM_LOCATION_ID,
  createFreeRoamLocation,
  hasExplicitCast,
} from "../lib/locations/free-roam.ts";
import { sanitizeLocation } from "../lib/locations/types.ts";

test("Free Roam creates a stable persona-first Location", () => {
  const location = createFreeRoamLocation(Date.parse("2026-08-31T12:00:00.000Z"));
  assert.equal(location.id, FREE_ROAM_LOCATION_ID);
  assert.equal(location.name, "Free Roam");
  assert.deepEqual(location.occupants, []);
  assert.ok(location.tags?.includes("free-roam"));
  assert.ok(sanitizeLocation(location));
});

test("an intentional empty Free Roam cast is not replaced by a fake primary character", () => {
  assert.equal(hasExplicitCast([]), true);
  assert.equal(hasExplicitCast(undefined), false);
});

test("Living Cast Smart Focus runs without a hidden Speak composer mode", () => {
  const source = readFileSync(new URL("../app/dreambound-app.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(livingCastConfig\.enabled && activeSession\)/);
  assert.doesNotMatch(source, /livingCastConfig\.enabled && mode === ["']Speak["']/);
  assert.match(source, />\s*Start Free Roam\s*</);
});

test("Free Roam sessions persist their explicit mode flag in backups", () => {
  const backupSource = readFileSync(new URL("../lib/backup/format.ts", import.meta.url), "utf8");
  assert.match(backupSource, /freeRoam\?: boolean/);
  assert.match(backupSource, /freeRoam: typeof s\.freeRoam === "boolean" \? s\.freeRoam : undefined/);
});
