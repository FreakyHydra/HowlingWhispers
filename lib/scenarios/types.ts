export const SCENARIO_FORMAT = "howling-whispers-scenario";
export const SCENARIO_FORMAT_VERSION = 1;

export type ScenarioSource = "curated" | "custom";

export type Scenario = {
  id: string;
  name: string;

  shortDescription?: string;
  description?: string;
  openingSituation?: string;
  image?: string;

  atmosphere?: string;

  startingConditions?: string[];
  activeElements?: string[];
  possibleHooks?: string[];

  tags?: string[];

  source: ScenarioSource;

  linkedWorldId?: string;
  linkedLocationIds?: string[];
  linkedCharacterIds?: string[];

  createdAt?: string;
  updatedAt?: string;
};

export type PortableScenario = {
  format: typeof SCENARIO_FORMAT;
  version: typeof SCENARIO_FORMAT_VERSION;
  scenario: Scenario;
};

export type CanonicalScenarioV1 = {
  format: typeof SCENARIO_FORMAT;
  version: typeof SCENARIO_FORMAT_VERSION;
  id: string;
  revision: string;
  identity: {
    name: string;
    shortDescription?: string;
    description?: string;
    openingSituation?: string;
    image?: string;
    atmosphere?: string;
  };
  state?: {
    startingConditions?: string[];
    activeElements?: string[];
    possibleHooks?: string[];
  };
  connections?: {
    linkedWorldId?: string;
    linkedLocationIds?: string[];
    linkedCharacterIds?: string[];
  };
  tags?: string[];
};

const MAX_NAME = 120;
const MAX_TEXT = 24_000;
const MAX_LIST_ITEMS = 48;
const MAX_ITEM_LENGTH = 240;

export function newScenarioId(seed = Date.now()): string {
  return `scenario-${seed.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sanitizeScenario(input: unknown): Scenario | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;

  const id = limitedString(src.id, MAX_NAME).trim();
  const name = limitedString(src.name, MAX_NAME).trim();
  const source = src.source === "curated" || src.source === "custom" ? src.source : "custom";

  if (!id || !name) return null;

  return {
    id,
    name,
    shortDescription: limitedString(src.shortDescription, MAX_ITEM_LENGTH * 4).trim() || undefined,
    description: limitedString(src.description, MAX_TEXT).trim() || undefined,
    openingSituation: limitedString(src.openingSituation, MAX_TEXT).trim() || undefined,
    image: limitedString(src.image, MAX_NAME).trim() || undefined,
    atmosphere: limitedString(src.atmosphere, MAX_ITEM_LENGTH * 2).trim() || undefined,
    startingConditions: stringList(src.startingConditions, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    activeElements: stringList(src.activeElements, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    possibleHooks: stringList(src.possibleHooks, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    tags: stringList(src.tags, MAX_LIST_ITEMS, MAX_ITEM_LENGTH),
    source,
    linkedWorldId: limitedString(src.linkedWorldId, MAX_NAME).trim() || undefined,
    linkedLocationIds: stringList(src.linkedLocationIds, MAX_LIST_ITEMS, MAX_NAME),
    linkedCharacterIds: stringList(src.linkedCharacterIds, MAX_LIST_ITEMS, MAX_NAME),
    createdAt: limitedString(src.createdAt, 64).trim() || undefined,
    updatedAt: limitedString(src.updatedAt, 64).trim() || undefined,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
