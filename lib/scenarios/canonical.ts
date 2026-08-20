import { isRecord, SCENARIO_FORMAT, SCENARIO_FORMAT_VERSION } from "./types.ts";
import type { CanonicalScenarioV1, Scenario } from "./types.ts";

export function parseCanonicalScenario(value: unknown): CanonicalScenarioV1 | null {
  if (!isRecord(value)) return null;
  if (value.format !== SCENARIO_FORMAT || value.version !== SCENARIO_FORMAT_VERSION) return null;

  const id = limitedString(value.id, 120);
  const revision = limitedString(value.revision, 64);
  const identityValue = isRecord(value.identity) ? value.identity : null;
  const name = limitedString(identityValue?.name, 120);
  if (!id || !revision || !name) return null;

  const stateValue = isRecord(value.state) ? value.state : null;
  const connectionsValue = isRecord(value.connections) ? value.connections : null;

  return {
    format: SCENARIO_FORMAT,
    version: SCENARIO_FORMAT_VERSION,
    id,
    revision,
    identity: {
      name,
      shortDescription: limitedString(identityValue?.shortDescription, 960).trim() || undefined,
      description: limitedString(identityValue?.description, 24_000).trim() || undefined,
      openingSituation: limitedString(identityValue?.openingSituation, 24_000).trim() || undefined,
      image: limitedString(identityValue?.image, 120).trim() || undefined,
      atmosphere: limitedString(identityValue?.atmosphere, 480).trim() || undefined,
    },
    state: stateValue
      ? {
          startingConditions: stringList(stateValue.startingConditions, 48, 240),
          activeElements: stringList(stateValue.activeElements, 48, 240),
          possibleHooks: stringList(stateValue.possibleHooks, 48, 240),
        }
      : undefined,
    connections: connectionsValue
      ? {
          linkedWorldId: limitedString(connectionsValue.linkedWorldId, 120).trim() || undefined,
          linkedLocationIds: stringList(connectionsValue.linkedLocationIds, 48, 120),
          linkedCharacterIds: stringList(connectionsValue.linkedCharacterIds, 48, 120),
        }
      : undefined,
    tags: stringList(value.tags, 48, 120),
  };
}

export function scenarioToCanon(scenario: Scenario): CanonicalScenarioV1 {
  const now = new Date().toISOString();
  const revision = scenario.updatedAt || scenario.createdAt || now;

  const hasState = (scenario.startingConditions?.length ?? 0) > 0 || (scenario.activeElements?.length ?? 0) > 0 || (scenario.possibleHooks?.length ?? 0) > 0;
  const hasConnections = (scenario.linkedWorldId?.trim()?.length ?? 0) > 0 || (scenario.linkedLocationIds?.length ?? 0) > 0 || (scenario.linkedCharacterIds?.length ?? 0) > 0;

  return {
    format: SCENARIO_FORMAT,
    version: SCENARIO_FORMAT_VERSION,
    id: scenario.id,
    revision,
    identity: {
      name: scenario.name,
      shortDescription: scenario.shortDescription,
      description: scenario.description,
      openingSituation: scenario.openingSituation,
      image: scenario.image,
      atmosphere: scenario.atmosphere,
    },
    ...(hasState ? { state: { startingConditions: scenario.startingConditions, activeElements: scenario.activeElements, possibleHooks: scenario.possibleHooks } } : {}),
    ...(hasConnections ? { connections: { linkedWorldId: scenario.linkedWorldId, linkedLocationIds: scenario.linkedLocationIds, linkedCharacterIds: scenario.linkedCharacterIds } } : {}),
    tags: scenario.tags,
  };
}

export function canonToScenario(canon: CanonicalScenarioV1): Scenario {
  return {
    id: canon.id,
    name: canon.identity.name,
    shortDescription: canon.identity.shortDescription,
    description: canon.identity.description,
    openingSituation: canon.identity.openingSituation,
    image: canon.identity.image,
    atmosphere: canon.identity.atmosphere,
    startingConditions: canon.state?.startingConditions,
    activeElements: canon.state?.activeElements,
    possibleHooks: canon.state?.possibleHooks,
    tags: canon.tags,
    source: "curated",
    linkedWorldId: canon.connections?.linkedWorldId,
    linkedLocationIds: canon.connections?.linkedLocationIds,
    linkedCharacterIds: canon.connections?.linkedCharacterIds,
  };
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
