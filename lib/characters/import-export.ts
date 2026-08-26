export const CHARACTER_FORMAT = "howling-whispers-character";
export const CHARACTER_LIBRARY_FORMAT = "howling-whispers-character-library";
export const CHARACTER_FORMAT_VERSION = 1;

const MAX_CHARACTER_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = 12000;
const MAX_MEMORIES = 40;
const MAX_MEMORY_LENGTH = 600;
const MAX_LIBRARY_CHARACTERS = 60;
const MAX_SCENES = 24;

const CURATED_BUILTIN_IDS = new Set(["coda", "heather", "peony", "riley", "senako-steel"]);
const AGE_CATEGORIES = new Set(["adult", "minor", "unknown"]);

import { sanitizeTraits } from "./traits.ts";

export type CharacterPhotoAssets = {
  portraitUrl?: string;
  sceneUrl?: string;
  galleryUrls?: string[];
};

export type CharacterScene = {
  id: string;
  title: string;
  description?: string;
  scene?: string;
  weather?: string;
  opening?: string;
  backgroundImageUrl?: string;
  characterImageUrl?: string;
  backgroundFocalPoint?: string;
  characterFocalPoint?: string;
  tags?: string[];
};

export type BackupCharacter = {
  id: string;
  name: string;
  role: string;
  status: string;
  image: string;
  sceneImage: string;
  scene: string;
  weather: string;
  bond: number;
  memories: string[];
  reply: string;
  profile: string;
  accent: string;
  credit?: string;
  creditUrl?: string;
  relationship?: string;
  portraitFocalPoint?: string;
  backgroundFocalPoint?: string;
  assets?: CharacterPhotoAssets;
  scenes?: CharacterScene[];
  ageCategory?: "adult" | "minor" | "unknown";
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
  cardV2?: HowlingV2Metadata;
  traits?: import("./traits.ts").CharacterTraits;
  pronouns?: string;
  hwccVersion?: string;
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
    likes?: string;
    dislikes?: string;
    habits?: string;
    strengths?: string;
    flaws?: string;
    weaknesses?: string;
    fears?: string;
    quirks?: string;
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
  relationships?: Array<{
    characterId: string;
    type: string;
    description: string;
    trust?: string;
    affection?: string;
    familiarity?: string;
    notes?: string;
  }>;
  interests?: {
    interests?: string;
    skills?: string;
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
  greetings?: {
    alternateGreetings?: string[];
    exampleMessages?: string;
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

function clamp(
  value: unknown,
  fallback: string,
  trim = false,
): string {
  if (typeof value !== "string") return fallback;
  const result = value.slice(0, MAX_TEXT_LENGTH);
  return trim ? result.trim() : result;
}

function clampString(value: unknown, fallback = ""): string {
  return clamp(value, fallback);
}

function sanitizePhotoAssets(value: unknown): CharacterPhotoAssets | undefined {
  if (!isRecord(value)) return undefined;
  const portraitUrl = clampString(value.portraitUrl).trim();
  const sceneUrl = clampString(value.sceneUrl).trim();
  const galleryUrls = sanitizeStringList(value.galleryUrls, 24, 2000);
  if (!portraitUrl && !sceneUrl && !galleryUrls?.length) return undefined;
  return {
    portraitUrl: portraitUrl || undefined,
    sceneUrl: sceneUrl || undefined,
    galleryUrls,
  };
}

function sanitizeScenes(value: unknown): CharacterScene[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const scenes = value
    .slice(0, MAX_SCENES)
    .map((entry, index): CharacterScene | null => {
      if (!isRecord(entry)) return null;
      const title = clampString(entry.title).trim();
      if (!title) return null;
      const id = clampString(entry.id).trim() || `scene-${index + 1}`;
      return {
        id,
        title,
        description: clampString(entry.description).trim() || undefined,
        scene: clampString(entry.scene).trim() || undefined,
        weather: clampString(entry.weather).trim() || undefined,
        opening: clampString(entry.opening).trim() || undefined,
        backgroundImageUrl: clampString(entry.backgroundImageUrl).trim() || undefined,
        characterImageUrl: clampString(entry.characterImageUrl).trim() || undefined,
        backgroundFocalPoint: clampString(entry.backgroundFocalPoint).trim() || undefined,
        characterFocalPoint: clampString(entry.characterFocalPoint).trim() || undefined,
        tags: sanitizeStringList(entry.tags, 16, 120),
      };
    })
    .filter((scene): scene is CharacterScene => scene !== null);
  return scenes.length ? scenes : undefined;
}

function sanitizeCharacter(value: unknown): BackupCharacter | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Record<string, unknown>;
  const name = clamp(src.name, "").trim();
  if (!name) return null;

  const rawMemories = Array.isArray(src.memories)
    ? src.memories
        .slice(0, MAX_MEMORIES)
        .map((item) => typeof item === "string" ? item.slice(0, MAX_MEMORY_LENGTH).trim() : "")
        .filter(Boolean)
    : [];

  const rawBond = typeof src.bond === "number" && Number.isFinite(src.bond)
    ? Math.max(0, Math.min(100, Math.round(src.bond)))
    : 12;

  const ageCategory = AGE_CATEGORIES.has(src.ageCategory as string)
    ? (src.ageCategory as "adult" | "minor" | "unknown")
    : undefined;
  const cardV2 = sanitizeV2Metadata(src.cardV2);

  return {
    id: clamp(src.id, "").trim() || `imported-${Date.now().toString(36)}`,
    name,
    role: clamp(src.role, "Imported character").trim() || "Imported character",
    status: clamp(src.status, "Ready to meet").trim() || "Ready to meet",
    image: clamp(src.image, "").trim(),
    sceneImage: clamp(src.sceneImage, "").trim(),
    scene: clamp(src.scene, "An Imported Story").trim() || "An Imported Story",
    weather: clamp(src.weather, "The world waits for your first choice").trim(),
    bond: rawBond,
    memories: rawMemories.length > 0
      ? rawMemories
      : ["Their history is waiting to be discovered"],
    reply: clamp(src.reply, "I was wondering when you would arrive.").trim()
      || "I was wondering when you would arrive.",
    profile: clamp(
      [clampString(src.profile), clampString(src.description)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("\n\n"),
    ) || `${name} is an imported character whose personality should stay consistent with their opening message.`,
    accent: clamp(src.accent, "#d78a5e").trim(),
    credit: clamp(src.credit, "").trim() || undefined,
    creditUrl: clamp(src.creditUrl, "").trim() || undefined,
    relationship: clamp(src.relationship, "").trim() || undefined,
    portraitFocalPoint: clamp(src.portraitFocalPoint, "center").trim(),
    backgroundFocalPoint: clamp(src.backgroundFocalPoint, "center").trim(),
    assets: sanitizePhotoAssets(src.assets),
    scenes: sanitizeScenes(src.scenes),
    ageCategory,
    isMinor: typeof src.isMinor === "boolean" ? src.isMinor : src.isMinor === null ? null : undefined,
    allowedRelationshipTypes: sanitizeStringList(src.allowedRelationshipTypes, 24, 160),
    disallowedContent: sanitizeStringList(src.disallowedContent, 32, 240),
    cardV2,
    traits: sanitizeTraits(src.traits),
    pronouns: clamp(src.pronouns, "").trim() || undefined,
    hwccVersion: src.hwccVersion === "1" ? "1" : undefined,
    identity: isRecord(src.identity) ? { species: clampString(src.identity.species) } : undefined,
    ageBehavior: isRecord(src.ageBehavior) ? {
      actualAge: clampString(src.ageBehavior.actualAge),
      maturityLevel: clampString(src.ageBehavior.maturityLevel),
      knowledgeBoundaries: clampString(src.ageBehavior.knowledgeBoundaries),
      speechAge: clampString(src.ageBehavior.speechAge),
      emotionalMaturity: clampString(src.ageBehavior.emotionalMaturity),
      independenceLevel: clampString(src.ageBehavior.independenceLevel),
      areasOfExpertise: clampString(src.ageBehavior.areasOfExpertise),
      areasOfKnowledgeGaps: clampString(src.ageBehavior.areasOfKnowledgeGaps),
      ageConsistencyInstructions: clampString(src.ageBehavior.ageConsistencyInstructions),
    } : undefined,
    appearance: isRecord(src.appearance) ? {
      height: clampString(src.appearance.height),
      build: clampString(src.appearance.build),
      hair: clampString(src.appearance.hair),
      eyes: clampString(src.appearance.eyes),
      skin: clampString(src.appearance.skin),
      distinguishingFeatures: clampString(src.appearance.distinguishingFeatures),
      clothing: clampString(src.appearance.clothing),
      generalDescription: clampString(src.appearance.generalDescription),
    } : undefined,
    personality: isRecord(src.personality) ? {
      coreTraits: clampString(src.personality.coreTraits),
      likes: clampString(src.personality.likes),
      dislikes: clampString(src.personality.dislikes),
      habits: clampString(src.personality.habits),
      strengths: clampString(src.personality.strengths),
      flaws: clampString(src.personality.flaws),
      weaknesses: clampString(src.personality.weaknesses),
      fears: clampString(src.personality.fears),
      quirks: clampString(src.personality.quirks),
      temperament: clampString(src.personality.temperament),
      confidence: clampString(src.personality.confidence),
      curiosity: clampString(src.personality.curiosity),
      impulsiveness: clampString(src.personality.impulsiveness),
      socialBehavior: clampString(src.personality.socialBehavior),
      values: clampString(src.personality.values),
    } : undefined,
    voice: isRecord(src.voice) ? {
      speechStyle: clampString(src.voice.speechStyle),
      vocabulary: clampString(src.voice.vocabulary),
      vocabularyLevel: clampString(src.voice.vocabularyLevel),
      accentDialect: clampString(src.voice.accentDialect),
      sentenceLength: clampString(src.voice.sentenceLength),
      slang: clampString(src.voice.slang),
      verbalHabits: clampString(src.voice.verbalHabits),
      emotionalSpeechChanges: clampString(src.voice.emotionalSpeechChanges),
      phrasesToAvoid: clampString(src.voice.phrasesToAvoid),
      humorStyle: clampString(src.voice.humorStyle),
      swearingLevel: clampString(src.voice.swearingLevel),
      emotionalExpressiveness: clampString(src.voice.emotionalExpressiveness),
      bodyLanguage: clampString(src.voice.bodyLanguage),
      mannerisms: clampString(src.voice.mannerisms),
      rarePhrases: clampString(src.voice.rarePhrases),
      exampleDialogue: clampString(src.voice.exampleDialogue),
    } : undefined,
    background: isRecord(src.background) ? {
      biography: clampString(src.background.biography),
      childhood: clampString(src.background.childhood),
      importantEvents: clampString(src.background.importantEvents),
      family: clampString(src.background.family),
      education: clampString(src.background.education),
      occupation: clampString(src.background.occupation),
      skills: clampString(src.background.skills),
      secrets: clampString(src.background.secrets),
      trauma: clampString(src.background.trauma),
      currentSituation: clampString(src.background.currentSituation),
    } : undefined,
    relationships: Array.isArray(src.relationships) ? src.relationships.slice(0, 20).map((rel) => {
      if (!isRecord(rel)) return null;
      return {
        characterId: clampString(rel.characterId),
        type: clampString(rel.type),
        description: clampString(rel.description),
        trust: clampString(rel.trust),
        affection: clampString(rel.affection),
        familiarity: clampString(rel.familiarity),
        notes: clampString(rel.notes),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null) : undefined,
    rpBehavior: isRecord(src.rpBehavior) ? {
      goals: clampString(src.rpBehavior.goals),
      motivations: clampString(src.rpBehavior.motivations),
      boundaries: clampString(src.rpBehavior.boundaries),
      avoids: clampString(src.rpBehavior.avoids),
      pursues: clampString(src.rpBehavior.pursues),
      conflictBehavior: clampString(src.rpBehavior.conflictBehavior),
      responseToDanger: clampString(src.rpBehavior.responseToDanger),
      responseToAffection: clampString(src.rpBehavior.responseToAffection),
      responseToStrangers: clampString(src.rpBehavior.responseToStrangers),
      responseToAuthority: clampString(src.rpBehavior.responseToAuthority),
    } : undefined,
    worldLore: isRecord(src.worldLore) ? {
      worldId: clampString(src.worldLore.worldId),
      setting: clampString(src.worldLore.setting),
      faction: clampString(src.worldLore.faction),
      home: clampString(src.worldLore.home),
      defaultScenario: clampString(src.worldLore.defaultScenario),
    } : undefined,
    interests: isRecord(src.interests) ? {
      interests: clampString(src.interests.interests),
      skills: clampString(src.interests.skills),
    } : undefined,
    knowledge: isRecord(src.knowledge) ? {
      knowsWell: clampString(src.knowledge.knowsWell),
      knowsSomewhat: clampString(src.knowledge.knowsSomewhat),
      doesNotKnow: clampString(src.knowledge.doesNotKnow),
      hobbies: clampString(src.knowledge.hobbies),
      practicalSkills: clampString(src.knowledge.practicalSkills),
      academicKnowledge: clampString(src.knowledge.academicKnowledge),
      professionalKnowledge: clampString(src.knowledge.professionalKnowledge),
      misconceptions: clampString(src.knowledge.misconceptions),
      knowledgeLimits: clampString(src.knowledge.knowledgeLimits),
    } : undefined,
    greetings: isRecord(src.greetings) ? {
      alternateGreetings: sanitizeStringList(src.greetings.alternateGreetings, 24, 240),
      exampleMessages: clampString(src.greetings.exampleMessages),
    } : undefined,
    contextNotes: clampString(src.contextNotes),
    authorNote: clampString(src.authorNote),
  };
}

function sanitizeStringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, maxItems)
    .map((item) => typeof item === "string" ? item.slice(0, maxLength).trim() : "")
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeV2Metadata(value: unknown): HowlingV2Metadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const src = value as Record<string, unknown>;
  const original = parseCharacterCardV2(src.original);
  if (!original.ok) return undefined;
  const data = original.card.data;
  return {
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    mesExample: data.mes_example,
    alternateGreetings: [...data.alternate_greetings],
    creatorNotes: data.creator_notes,
    characterVersion: data.character_version,
    tags: [...data.tags],
    importedSystemPrompt: data.system_prompt,
    importedPostHistoryInstructions: data.post_history_instructions,
    characterBook: data.character_book,
    original: original.card,
  };
}

export function serializeCharacter(character: BackupCharacter): string {
  return JSON.stringify(
    { format: CHARACTER_FORMAT, version: CHARACTER_FORMAT_VERSION, character },
    null,
    2,
  );
}

export function serializeCharacterLibrary(characters: BackupCharacter[]): string {
  return JSON.stringify(
    { format: CHARACTER_LIBRARY_FORMAT, version: CHARACTER_FORMAT_VERSION, characters },
    null,
    2,
  );
}

export type BackupResult =
  | { ok: true; characters: BackupCharacter[] }
  | { ok: false; error: string };

export function parseCharacterImport(json: string): BackupResult {
  if (json.length > MAX_CHARACTER_BYTES) {
    return { ok: false, error: "This character file is too large to import safely." };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "This file does not contain a character backup." };
  }
  const obj = data as Record<string, unknown>;

  if (obj.format === CHARACTER_FORMAT) {
    if (obj.version !== CHARACTER_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers character backup version is not supported." };
    }
    const character = sanitizeCharacter(obj.character);
    if (!character) return { ok: false, error: "The character in this file has no name." };
    return { ok: true, characters: [character] };
  }

  if (obj.format === CHARACTER_LIBRARY_FORMAT) {
    if (obj.version !== CHARACTER_FORMAT_VERSION) {
      return { ok: false, error: "This Howling Whispers character-library backup version is not supported." };
    }
    if (!Array.isArray(obj.characters)) {
      return { ok: false, error: "The character library file has no characters list." };
    }
    if (obj.characters.length > MAX_LIBRARY_CHARACTERS) {
      return { ok: false, error: "This character library contains too many characters to import." };
    }
    const characters = obj.characters
      .map(sanitizeCharacter)
      .filter((c): c is BackupCharacter => c !== null);
    if (characters.length === 0) {
      return { ok: false, error: "The character library contains no valid characters." };
    }
    return { ok: true, characters };
  }

  return { ok: false, error: "This file is not a Howling Whispers character backup." };
}

export function isCuratedBuiltinId(id: string): boolean {
  return CURATED_BUILTIN_IDS.has(id);
}

export function newCharacterId(seed = Date.now()): string {
  return `imported-${seed.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ensureUniqueCharacterIds(
  characters: BackupCharacter[],
  existing: Array<string | undefined>,
): BackupCharacter[] {
  const taken = new Set(existing.filter(Boolean) as string[]);
  return characters.map((character) => {
    const conflicts = taken.has(character.id) || isCuratedBuiltinId(character.id);
    if (!conflicts) {
      taken.add(character.id);
      return character;
    }
    let fresh = newCharacterId();
    while (taken.has(fresh)) fresh = newCharacterId();
    taken.add(fresh);
    return { ...character, id: fresh };
  });
}
