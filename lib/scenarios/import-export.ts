import type { Scenario } from "./types.ts";
import {
  sanitizeScenario,
  SCENARIO_FORMAT,
  SCENARIO_FORMAT_VERSION,
  newScenarioId,
} from "./types.ts";

export const MAX_SCENARIO_BYTES = 256 * 1024;
const MAX_LIBRARY_SCENARIOS = 60;

export function serializeScenario(scenario: Scenario): string {
  return JSON.stringify(
    { format: SCENARIO_FORMAT, version: SCENARIO_FORMAT_VERSION, scenario },
    null,
    2,
  );
}

export function serializeScenarioLibrary(scenarios: Scenario[]): string {
  return JSON.stringify(
    { format: `${SCENARIO_FORMAT}-library`, version: SCENARIO_FORMAT_VERSION, scenarios },
    null,
    2,
  );
}

export type ImportResult =
  | { ok: true; scenarios: Scenario[] }
  | { ok: false; error: string };

export function parseScenarioImport(json: string): ImportResult {
  if (json.length > MAX_SCENARIO_BYTES) {
    return { ok: false, error: "This scenario file is too large to import safely." };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "This file does not contain a scenario backup." };
  }
  const obj = data as Record<string, unknown>;

  if (obj.format === SCENARIO_FORMAT) {
    if (obj.version !== SCENARIO_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers scenario backup version is not supported." };
    }
    if (!isRecord(obj.scenario)) {
      return { ok: false, error: "The scenario in this file is malformed." };
    }
    const scenario = sanitizeScenario(obj.scenario);
    if (!scenario) return { ok: false, error: "The scenario in this file is missing a name." };
    return { ok: true, scenarios: [scenario] };
  }

  if (obj.format === `${SCENARIO_FORMAT}-library`) {
    if (obj.version !== SCENARIO_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers scenario-library backup version is not supported." };
    }
    if (!Array.isArray(obj.scenarios)) {
      return { ok: false, error: "The scenario library file has no scenarios list." };
    }
    if (obj.scenarios.length > MAX_LIBRARY_SCENARIOS) {
      return { ok: false, error: "This scenario library contains too many scenarios to import." };
    }
    const scenarios = obj.scenarios
      .map((item) => (isRecord(item) ? sanitizeScenario(item) : null))
      .filter((scenario): scenario is Scenario => scenario !== null);
    if (scenarios.length === 0) {
      return { ok: false, error: "The scenario library contains no valid scenarios." };
    }
    return { ok: true, scenarios };
  }

  return { ok: false, error: "This file is not a Howling Whispers scenario backup." };
}

export function ensureUniqueScenarioIds(
  scenarios: Scenario[],
  existing: Array<string | undefined>,
): Scenario[] {
  const taken = new Set(existing.filter(Boolean) as string[]);
  return scenarios.map((scenario) => {
    if (!taken.has(scenario.id)) {
      taken.add(scenario.id);
      return scenario;
    }
    let fresh = newScenarioId();
    while (taken.has(fresh)) fresh = newScenarioId();
    taken.add(fresh);
    return { ...scenario, id: fresh };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
