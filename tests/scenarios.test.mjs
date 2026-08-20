import assert from "node:assert/strict";
import test from "node:test";

import {
  canonToScenario,
  newScenarioId,
  parseCanonicalScenario,
  sanitizeScenario,
  scenarioToCanon,
  serializeScenario,
  serializeScenarioLibrary,
  SCENARIO_FORMAT,
  SCENARIO_FORMAT_VERSION,
  ensureUniqueScenarioIds,
  parseScenarioImport,
} from "../lib/scenarios/index.ts";

function baseScenario(overrides) {
  return {
    id: overrides.id ?? "scenario-1",
    name: overrides.name ?? "Test Scenario",
    source: overrides.source ?? "custom",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    ...overrides,
  };
}

test("sanitizeScenario requires id and name", () => {
  assert.ok(sanitizeScenario({ id: "x", name: "X" }));
  assert.ok(!sanitizeScenario({ name: "X" }));
  assert.ok(!sanitizeScenario({ id: "x" }));
  assert.ok(!sanitizeScenario(null));
});

test("sanitizeScenario bounds arrays and strings", () => {
  const long = "a".repeat(30_000);
  const scenario = sanitizeScenario({
    id: "s1",
    name: "S",
    description: long,
    startingConditions: Array.from({ length: 100 }, (_, i) => `item-${i}`),
    linkedLocationIds: ["loc-1"],
    linkedCharacterIds: ["char-1"],
  });
  assert.ok(scenario);
  assert.ok(scenario.description.length <= 24_000);
  assert.ok(scenario.startingConditions.length <= 48);
  assert.ok(scenario.linkedLocationIds.length <= 48);
  assert.ok(scenario.linkedCharacterIds.length <= 48);
});

test("canonical round trip preserves scenario data", () => {
  const scenario = baseScenario({
    id: "c1",
    name: "The Forty Thieves",
    shortDescription: "Someone entered the cave.",
    description: "Full description here.",
    openingSituation: "The cave entrance is open.",
    atmosphere: "Tension",
    startingConditions: ["Night has fallen"],
    activeElements: ["The thieves are returning"],
    possibleHooks: ["A witness may come forward"],
    tags: ["Pursuit"],
    linkedWorldId: "world-1",
    linkedLocationIds: ["loc-1"],
    linkedCharacterIds: ["char-1"],
  });
  const canon = scenarioToCanon(scenario);
  const back = canonToScenario(canon);
  assert.equal(back.id, scenario.id);
  assert.equal(back.name, scenario.name);
  assert.equal(back.openingSituation, scenario.openingSituation);
  assert.deepEqual(back.startingConditions, scenario.startingConditions);
  assert.deepEqual(back.activeElements, scenario.activeElements);
  assert.deepEqual(back.possibleHooks, scenario.possibleHooks);
  assert.deepEqual(back.linkedLocationIds, scenario.linkedLocationIds);
  assert.deepEqual(back.linkedCharacterIds, scenario.linkedCharacterIds);
});

test("portable export/import round trips", () => {
  const scenario = baseScenario({
    name: "Storm Stranded",
    openingSituation: "Overnight storm.",
    activities: ["Waiting"],
  });
  const json = serializeScenario(scenario);
  const parsed = parseScenarioImport(json);
  assert.ok(parsed.ok);
  assert.equal(parsed.scenarios.length, 1);
  assert.equal(parsed.scenarios[0].name, "Storm Stranded");
  assert.equal(parsed.scenarios[0].source, "custom");
});

test("parseCanonicalScenario rejects bad format/version", () => {
  assert.ok(!parseCanonicalScenario({ format: "other", version: 1, id: "x", revision: "r", identity: { name: "N" } }));
  assert.ok(!parseCanonicalScenario({ format: SCENARIO_FORMAT, version: 99, id: "x", revision: "r", identity: { name: "N" } }));
  assert.ok(!parseCanonicalScenario({ format: SCENARIO_FORMAT, version: SCENARIO_FORMAT_VERSION }));
});

test("ensureUniqueScenarioIds regenerates conflicts", () => {
  const scenarios = [baseScenario({ id: "s1" })];
  const imported = [baseScenario({ id: "s1" })];
  const unique = ensureUniqueScenarioIds(imported, scenarios.map((s) => s.id));
  assert.equal(unique.length, 1);
  assert.notEqual(unique[0].id, "s1");
});

test("sanitizeScenario preserves timestamps", () => {
  const now = new Date().toISOString();
  const scenario = sanitizeScenario({ id: "s1", name: "S", createdAt: now, updatedAt: now });
  assert.ok(scenario);
  assert.equal(scenario.createdAt, now);
  assert.equal(scenario.updatedAt, now);
});

test("sanitizeScenario keeps optional fields absent", () => {
  const scenario = sanitizeScenario({ id: "s1", name: "S" });
  assert.ok(scenario);
  assert.equal(scenario.shortDescription, undefined);
  assert.equal(scenario.startingConditions, undefined);
  assert.equal(scenario.possibleHooks, undefined);
  assert.equal(scenario.linkedLocationIds, undefined);
  assert.equal(scenario.linkedCharacterIds, undefined);
});
