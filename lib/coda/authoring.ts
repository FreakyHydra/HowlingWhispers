export type CodaMode = "generate" | "expand" | "fill" | "organize" | "transform";
export type CodaTarget = "character" | "world-lore";

export type CodaCharacterPatch = {
  name?: string;
  role?: string;
  pronouns?: string;
  profile?: string;
  identity?: { species?: string };
  ageBehavior?: {
    actualAge?: string;
    maturityLevel?: string;
    knowledgeBoundaries?: string;
    speechAge?: string;
    emotionalMaturity?: string;
    independenceLevel?: string;
    areasOfExpertise?: string;
    areasOfKnowledgeGaps?: string;
    ageConsistencyInstructions?: string;
  };
  appearance?: {
    height?: string;
    build?: string;
    hair?: string;
    eyes?: string;
    skin?: string;
    distinguishingFeatures?: string;
    clothing?: string;
    generalDescription?: string;
  };
  personality?: {
    coreTraits?: string;
    strengths?: string;
    flaws?: string;
    weaknesses?: string;
    fears?: string;
    habits?: string;
    quirks?: string;
    likes?: string;
    dislikes?: string;
    temperament?: string;
    confidence?: string;
    curiosity?: string;
    impulsiveness?: string;
    socialBehavior?: string;
    values?: string;
  };
  voice?: {
    speechStyle?: string;
    vocabulary?: string;
    vocabularyLevel?: string;
    accentDialect?: string;
    sentenceLength?: string;
    slang?: string;
    verbalHabits?: string;
    emotionalSpeechChanges?: string;
    phrasesToAvoid?: string;
    humorStyle?: string;
    swearingLevel?: string;
    emotionalExpressiveness?: string;
    bodyLanguage?: string;
    mannerisms?: string;
    rarePhrases?: string;
    exampleDialogue?: string;
  };
  knowledge?: {
    knowsWell?: string;
    knowsSomewhat?: string;
    doesNotKnow?: string;
    hobbies?: string;
    practicalSkills?: string;
    academicKnowledge?: string;
    professionalKnowledge?: string;
    misconceptions?: string;
    knowledgeLimits?: string;
  };
  background?: {
    biography?: string;
    childhood?: string;
    importantEvents?: string;
    family?: string;
    education?: string;
    occupation?: string;
    skills?: string;
    secrets?: string;
    trauma?: string;
    currentSituation?: string;
  };
  rpBehavior?: {
    goals?: string;
    motivations?: string;
    boundaries?: string;
    avoids?: string;
    pursues?: string;
    conflictBehavior?: string;
    responseToDanger?: string;
    responseToAffection?: string;
    responseToStrangers?: string;
    responseToAuthority?: string;
  };
  worldLore?: {
    worldId?: string;
    setting?: string;
    faction?: string;
    home?: string;
    defaultScenario?: string;
  };
  contextNotes?: string;
  authorNote?: string;
};

export type CodaWorldLoreEntryDraft = {
  id: string;
  title: string;
  content: string;
  triggers: string[];
  priority: "mandatory" | "high" | "normal" | "low";
  rating: "general" | "mature";
  constantActivation: boolean;
  locationTags: string[];
  sceneTags: string[];
};

export type CodaWorldLorePatch = {
  worldId?: string;
  entries?: CodaWorldLoreEntryDraft[];
};

export type CodaProposal = {
  target: CodaTarget;
  mode: CodaMode;
  summary: string;
  character?: CodaCharacterPatch;
  worldLore?: CodaWorldLorePatch;
};

const STRING_LIMIT = 4_000;
const SHORT_LIMIT = 240;

export function buildCodaPrompt(input: {
  target: CodaTarget;
  mode: CodaMode;
  instruction: string;
  current?: unknown;
}): string {
  const current = input.current === undefined ? "null" : JSON.stringify(input.current, null, 2).slice(0, 28_000);
  const modeInstruction = {
    generate: "Create a strong first draft from the user's instruction.",
    expand: "Enrich the supplied material without contradicting or replacing established facts.",
    fill: "Fill useful empty or missing fields only. Do not replace non-empty established fields unless the instruction explicitly asks for it.",
    organize: "Interpret messy free text and distribute facts into the most appropriate structured fields.",
    transform: "Apply the requested change while preserving unrelated established facts.",
  }[input.mode];

  const schema = input.target === "character"
    ? CHARACTER_SCHEMA_TEXT
    : WORLD_LORE_SCHEMA_TEXT;

  return [
    "You are Codename Coda, the Howling Whispers authoring backend.",
    "You are an authoring assistant, not the authority over the user's fictional world.",
    "Do not moralize, lecture, shame, or redirect the user's creative intent. Do not invent restrictions, taboos, safety rules, or cultural rules that are absent from the supplied material.",
    "Preserve established character personality, experience, world rules, continuity, and tone. Never infer expertise merely because an action or genre appears.",
    "When details are unspecified, prefer leaving them absent over inventing facts that could constrain later roleplay.",
    "Return ONLY one valid JSON object. No Markdown fences, commentary, preface, or trailing prose.",
    modeInstruction,
    `TARGET: ${input.target}`,
    `MODE: ${input.mode}`,
    `USER INSTRUCTION:\n${input.instruction.trim().slice(0, 8_000)}`,
    `CURRENT DATA:\n${current}`,
    `OUTPUT SHAPE:\n${schema}`,
  ].join("\n\n");
}

export function parseCodaProposal(value: unknown, target: CodaTarget, mode: CodaMode): CodaProposal | null {
  if (!isRecord(value)) return null;
  const summary = cleanString(value.summary, 800) || "Coda prepared a structured draft.";
  if (target === "character") {
    const character = sanitizeCharacterPatch(value.character ?? value.patch ?? value);
    if (!character || Object.keys(character).length === 0) return null;
    return { target, mode, summary, character };
  }
  const worldLore = sanitizeWorldLorePatch(value.worldLore ?? value.patch ?? value);
  if (!worldLore || (!worldLore.worldId && !worldLore.entries?.length)) return null;
  return { target, mode, summary, worldLore };
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) candidates.push(fenced.trim());
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try next candidate */ }
  }
  return null;
}

function sanitizeCharacterPatch(value: unknown): CodaCharacterPatch | null {
  if (!isRecord(value)) return null;
  const out: CodaCharacterPatch = {};
  copyString(value, out, "name", 120);
  copyString(value, out, "role", 300);
  copyString(value, out, "pronouns", 120);
  copyString(value, out, "profile", 8_000);
  copyString(value, out, "contextNotes", 8_000);
  copyString(value, out, "authorNote", 8_000);

  out.identity = sanitizeStringObject(value.identity, ["species"], SHORT_LIMIT);
  out.ageBehavior = sanitizeStringObject(value.ageBehavior, [
    "actualAge", "maturityLevel", "knowledgeBoundaries", "speechAge", "emotionalMaturity",
    "independenceLevel", "areasOfExpertise", "areasOfKnowledgeGaps", "ageConsistencyInstructions",
  ], STRING_LIMIT);
  out.appearance = sanitizeStringObject(value.appearance, [
    "height", "build", "hair", "eyes", "skin", "distinguishingFeatures", "clothing", "generalDescription",
  ], STRING_LIMIT);
  out.personality = sanitizeStringObject(value.personality, [
    "coreTraits", "strengths", "flaws", "weaknesses", "fears", "habits", "quirks", "likes", "dislikes",
    "temperament", "confidence", "curiosity", "impulsiveness", "socialBehavior", "values",
  ], STRING_LIMIT);
  out.voice = sanitizeStringObject(value.voice, [
    "speechStyle", "vocabulary", "vocabularyLevel", "accentDialect", "sentenceLength", "slang", "verbalHabits",
    "emotionalSpeechChanges", "phrasesToAvoid", "humorStyle", "swearingLevel", "emotionalExpressiveness",
    "bodyLanguage", "mannerisms", "rarePhrases", "exampleDialogue",
  ], STRING_LIMIT);
  out.knowledge = sanitizeStringObject(value.knowledge, [
    "knowsWell", "knowsSomewhat", "doesNotKnow", "hobbies", "practicalSkills", "academicKnowledge",
    "professionalKnowledge", "misconceptions", "knowledgeLimits",
  ], STRING_LIMIT);
  out.background = sanitizeStringObject(value.background, [
    "biography", "childhood", "importantEvents", "family", "education", "occupation", "skills", "secrets",
    "trauma", "currentSituation",
  ], STRING_LIMIT);
  out.rpBehavior = sanitizeStringObject(value.rpBehavior, [
    "goals", "motivations", "boundaries", "avoids", "pursues", "conflictBehavior", "responseToDanger",
    "responseToAffection", "responseToStrangers", "responseToAuthority",
  ], STRING_LIMIT);
  out.worldLore = sanitizeStringObject(value.worldLore, ["worldId", "setting", "faction", "home", "defaultScenario"], STRING_LIMIT);

  for (const key of Object.keys(out) as Array<keyof CodaCharacterPatch>) {
    if (out[key] && typeof out[key] === "object" && Object.keys(out[key] as object).length === 0) delete out[key];
  }
  return out;
}

function sanitizeWorldLorePatch(value: unknown): CodaWorldLorePatch | null {
  if (!isRecord(value)) return null;
  const worldId = cleanString(value.worldId, 120);
  const entries = Array.isArray(value.entries)
    ? value.entries.slice(0, 32).flatMap((entry, index) => {
        if (!isRecord(entry)) return [];
        const title = cleanString(entry.title, 160);
        const content = cleanString(entry.content, 4_000);
        if (!title || !content) return [];
        const id = cleanString(entry.id, 120) || slugify(title) || `coda-entry-${index + 1}`;
        const priority = entry.priority === "mandatory" || entry.priority === "high" || entry.priority === "low"
          ? entry.priority
          : "normal";
        return [{
          id,
          title,
          content,
          triggers: stringList(entry.triggers, 32, 100),
          priority,
          rating: entry.rating === "mature" ? "mature" : "general",
          constantActivation: entry.constantActivation === true,
          locationTags: stringList(entry.locationTags, 16, 100),
          sceneTags: stringList(entry.sceneTags, 16, 100),
        } satisfies CodaWorldLoreEntryDraft];
      })
    : undefined;
  return { ...(worldId ? { worldId } : {}), ...(entries?.length ? { entries } : {}) };
}

function sanitizeStringObject<T extends string>(value: unknown, keys: readonly T[], max: number): Record<T, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out = {} as Record<T, string>;
  for (const key of keys) {
    const cleaned = cleanString(value[key], max);
    if (cleaned) out[key] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

function copyString<T extends object, K extends keyof T>(source: Record<string, unknown>, target: T, key: K, max: number): void {
  const cleaned = cleanString(source[String(key)], max);
  if (cleaned) target[key] = cleaned as T[K];
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CHARACTER_SCHEMA_TEXT = `{
  "summary": "short explanation of what was generated",
  "character": {
    "name": "optional",
    "role": "optional",
    "pronouns": "optional",
    "profile": "optional",
    "identity": { "species": "optional" },
    "ageBehavior": { "actualAge": "", "maturityLevel": "", "knowledgeBoundaries": "", "speechAge": "", "emotionalMaturity": "", "independenceLevel": "", "areasOfExpertise": "", "areasOfKnowledgeGaps": "", "ageConsistencyInstructions": "" },
    "appearance": { "height": "", "build": "", "hair": "", "eyes": "", "skin": "", "distinguishingFeatures": "", "clothing": "", "generalDescription": "" },
    "personality": { "coreTraits": "", "strengths": "", "flaws": "", "weaknesses": "", "fears": "", "habits": "", "quirks": "", "likes": "", "dislikes": "", "temperament": "", "confidence": "", "curiosity": "", "impulsiveness": "", "socialBehavior": "", "values": "" },
    "voice": { "speechStyle": "", "vocabulary": "", "vocabularyLevel": "", "accentDialect": "", "sentenceLength": "", "slang": "", "verbalHabits": "", "emotionalSpeechChanges": "", "phrasesToAvoid": "", "humorStyle": "", "swearingLevel": "", "emotionalExpressiveness": "", "bodyLanguage": "", "mannerisms": "", "rarePhrases": "", "exampleDialogue": "" },
    "knowledge": { "knowsWell": "", "knowsSomewhat": "", "doesNotKnow": "", "hobbies": "", "practicalSkills": "", "academicKnowledge": "", "professionalKnowledge": "", "misconceptions": "", "knowledgeLimits": "" },
    "background": { "biography": "", "childhood": "", "importantEvents": "", "family": "", "education": "", "occupation": "", "skills": "", "secrets": "", "trauma": "", "currentSituation": "" },
    "rpBehavior": { "goals": "", "motivations": "", "boundaries": "", "avoids": "", "pursues": "", "conflictBehavior": "", "responseToDanger": "", "responseToAffection": "", "responseToStrangers": "", "responseToAuthority": "" },
    "worldLore": { "worldId": "", "setting": "", "faction": "", "home": "", "defaultScenario": "" },
    "contextNotes": "optional",
    "authorNote": "optional"
  }
}`;

const WORLD_LORE_SCHEMA_TEXT = `{
  "summary": "short explanation of what was generated",
  "worldLore": {
    "worldId": "optional stable slug",
    "entries": [
      {
        "id": "stable slug",
        "title": "entry title",
        "content": "concise authoritative lore",
        "triggers": ["keywords that should activate this entry"],
        "priority": "mandatory | high | normal | low",
        "rating": "general | mature",
        "constantActivation": false,
        "locationTags": [],
        "sceneTags": []
      }
    ]
  }
}`;
