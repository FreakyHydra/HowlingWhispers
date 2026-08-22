export const HW_CARD_SPEC = "HW-Card";
export const HW_CARD_VERSION = "1.0";

export type HwCardIdentity = {
  gender?: string;
  genderIdentity?: string;
  pronouns?: string;
  presentation?: string;
  sex?: string;
  notes?: string;
};

export type HwCard = {
  spec: string;
  spec_version: string;
  type: string;
  name: string;
  pronouns?: string;
  age_group?: string;
  summary?: string;
  description?: string;
  appearance?: string;
  identity?: HwCardIdentity;
  personality?: string[];
  emotional_profile?: Record<string, unknown>;
  core_fears?: string[];
  core_needs?: string[];
  insecurities?: string[];
  defense_mechanisms?: string[];
  trust_behavior?: string;
  relationship_behavior?: string;
  social_behavior?: Record<string, unknown>;
  communication_style?: Record<string, unknown>;
  speech_patterns?: string[];
  likes?: string[];
  dislikes?: string[];
  interests?: string[];
  habits?: string[];
  boundaries?: string[];
  vulnerability_behavior?: string;
  conflict_behavior?: string;
  reassurance_behavior?: string;
  roleplay_guidance?: string[];
  memory_priorities?: string[];
  history?: Record<string, unknown>;
  creator?: string;
  card_version?: string;
  tags?: string[];
  extensions?: Record<string, unknown>;
};

export type HwCardParseResult =
  | { ok: true; card: HwCard }
  | { ok: false; error: string };

const MAX_CARD_BYTES = 256 * 1024;
const MAX_STRING = 4000;
const MAX_ARRAY_ITEMS = 40;
const MAX_ARRAY_STRING = 1000;

function clampString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.slice(0, MAX_STRING);
}

function clampStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => (typeof item === "string" ? item.slice(0, MAX_ARRAY_STRING).trim() : ""))
    .filter((item) => item.length > 0);
}

function clampRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function clampIdentity(value: unknown): HwCard["identity"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const src = value as Record<string, unknown>;
  const identity: HwCardIdentity = {};
  if (typeof src.gender === "string") identity.gender = src.gender.trim();
  if (typeof src.genderIdentity === "string") identity.genderIdentity = src.genderIdentity.trim();
  if (typeof src.pronouns === "string") identity.pronouns = src.pronouns.trim();
  if (typeof src.presentation === "string") identity.presentation = src.presentation.trim();
  if (typeof src.sex === "string") identity.sex = src.sex.trim();
  if (typeof src.notes === "string") identity.notes = src.notes.trim();
  return Object.keys(identity).length > 0 ? identity : undefined;
}

export function validateHwCard(data: unknown): HwCardParseResult {
  if (typeof data !== "string") {
    return { ok: false, error: "Expected a JSON string." };
  }
  if (data.length > MAX_CARD_BYTES) {
    return { ok: false, error: "This HW-Card file is too large to import safely." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "This file does not contain a valid HW-Card object." };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.spec !== HW_CARD_SPEC) {
    return { ok: false, error: `Expected spec "${HW_CARD_SPEC}", got "${String(obj.spec)}".` };
  }
  if (obj.type !== "persona") {
    return { ok: false, error: `Expected type "persona", got "${String(obj.type)}".` };
  }
  if (typeof obj.spec_version !== "string" || obj.spec_version.trim() === "") {
    return { ok: false, error: "Missing or invalid spec_version." };
  }
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    return { ok: false, error: "Missing required field: name." };
  }

  const card: HwCard = {
    spec: String(obj.spec),
    spec_version: String(obj.spec_version),
    type: String(obj.type),
    name: obj.name.trim(),
    pronouns: clampString(obj.pronouns) || undefined,
    age_group: clampString(obj.age_group) || undefined,
    summary: clampString(obj.summary) || undefined,
    description: clampString(obj.description) || undefined,
    appearance: clampString(obj.appearance) || undefined,
    identity: clampIdentity(obj.identity),
    personality: clampStringArray(obj.personality),
    emotional_profile: clampRecord(obj.emotional_profile),
    core_fears: clampStringArray(obj.core_fears),
    core_needs: clampStringArray(obj.core_needs),
    insecurities: clampStringArray(obj.insecurities),
    defense_mechanisms: clampStringArray(obj.defense_mechanisms),
    trust_behavior: clampString(obj.trust_behavior) || undefined,
    relationship_behavior: clampString(obj.relationship_behavior) || undefined,
    social_behavior: clampRecord(obj.social_behavior),
    communication_style: clampRecord(obj.communication_style),
    speech_patterns: clampStringArray(obj.speech_patterns),
    likes: clampStringArray(obj.likes),
    dislikes: clampStringArray(obj.dislikes),
    interests: clampStringArray(obj.interests),
    habits: clampStringArray(obj.habits),
    boundaries: clampStringArray(obj.boundaries),
    vulnerability_behavior: clampString(obj.vulnerability_behavior) || undefined,
    conflict_behavior: clampString(obj.conflict_behavior) || undefined,
    reassurance_behavior: clampString(obj.reassurance_behavior) || undefined,
    roleplay_guidance: clampStringArray(obj.roleplay_guidance),
    memory_priorities: clampStringArray(obj.memory_priorities),
    history: clampRecord(obj.history),
    creator: clampString(obj.creator) || undefined,
    card_version: clampString(obj.card_version) || undefined,
    tags: clampStringArray(obj.tags),
    extensions: obj.extensions && typeof obj.extensions === "object" && !Array.isArray(obj.extensions)
      ? (obj.extensions as Record<string, unknown>)
      : {},
  };

  return { ok: true, card };
}

export function serializeHwCard(card: HwCard): string {
  return JSON.stringify(card, null, 2);
}

export function migrateHwCard(card: HwCard): HwCard {
  switch (card.spec_version) {
    case "1.0":
      return card;
    default:
      return card;
  }
}
