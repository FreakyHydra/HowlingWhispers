import type { Character } from "../../app/dreambound-app";
import type { CharacterTraits } from "./traits.ts";
import type { CharacterBookV2, CharacterCardV2 } from "./character-card-v2.ts";
import { CHARACTER_CARD_V2_SPEC, CHARACTER_CARD_V2_VERSION } from "./character-card-v2.ts";
import { compileCharacterProfile } from "./compile.ts";

/**
 * HWCC = Howling Whispers Character Card.
 *
 * HWCC v1 is Character Card V2 with Howling-specific structured data carried
 * under `data.extensions.howling_whispers`. CCV2 remains the compatibility
 * foundation: every normal CCV2 field keeps its standard meaning, and software
 * that does not understand HWCC simply ignores the `howling_whispers` namespace.
 *
 * For a Howling Whispers character the structured extension is the authoritative
 * editable model. The standard CCV2 fields are a projection of it for other tools.
 */

export const HWCC_VERSION = "1";
export const HOWLING_EXTENSION_KEY = "howling_whispers";

/** The structured Howling Whispers extension schema (HWCC v1). */
export type HowlingExtensionV1 = {
  hwcc_version: typeof HWCC_VERSION;
  identity?: Character["identity"];
  ageBehavior?: Character["ageBehavior"];
  appearance?: Character["appearance"];
  personality?: Character["personality"];
  traits?: CharacterTraits;
  voice?: Character["voice"];
  background?: Character["background"];
  relationships?: Character["relationships"];
  interests?: Character["interests"];
  knowledge?: Character["knowledge"];
  rpBehavior?: Character["rpBehavior"];
  worldLore?: Character["worldLore"];
  greetings?: Character["greetings"];
  image?: {
    portrait?: string;
    scene?: string;
    portraitFocalPoint?: string;
    backgroundFocalPoint?: string;
  };
  generation?: {
    contextNotes?: string;
    authorNote?: string;
    allowedRelationshipTypes?: string[];
    disallowedContent?: string[];
  };
};

/** True when a parsed CCV2 card carries the HWCC v1 extension. */
export function isHWCC(card: CharacterCardV2): boolean {
  if (!isRecord(card?.data?.extensions)) return false;
  const extension = card.data.extensions[HOWLING_EXTENSION_KEY];
  return isRecord(extension) && extension.hwcc_version === HWCC_VERSION;
}

/** Build the HWCC v1 extension object from a Howling character model. */
export function characterToExtensionV1(character: Character): HowlingExtensionV1 {
  return {
    hwcc_version: HWCC_VERSION,
    identity: character.identity,
    ageBehavior: character.ageBehavior,
    appearance: character.appearance,
    personality: character.personality,
    traits: character.traits,
    voice: character.voice,
    background: character.background,
    relationships: character.relationships,
    interests: character.interests,
    knowledge: character.knowledge,
    rpBehavior: character.rpBehavior,
    worldLore: character.worldLore,
    greetings: character.greetings,
    image: {
      portrait: character.image,
      scene: character.sceneImage,
      portraitFocalPoint: character.portraitFocalPoint,
      backgroundFocalPoint: character.backgroundFocalPoint,
    },
    generation: {
      contextNotes: character.contextNotes,
      authorNote: character.authorNote,
      allowedRelationshipTypes: character.allowedRelationshipTypes,
      disallowedContent: character.disallowedContent,
    },
  };
}

/** Load HWCC v1 extension data back onto the Howling character model. */
export function extensionV1ToCharacterFields(ext: HowlingExtensionV1): Partial<Character> {
  return {
    identity: ext.identity,
    ageBehavior: ext.ageBehavior,
    appearance: ext.appearance,
    personality: ext.personality,
    traits: ext.traits,
    voice: ext.voice,
    background: ext.background,
    relationships: ext.relationships,
    interests: ext.interests,
    knowledge: ext.knowledge,
    rpBehavior: ext.rpBehavior,
    worldLore: ext.worldLore,
    greetings: ext.greetings,
    image: ext.image?.portrait,
    sceneImage: ext.image?.scene,
    portraitFocalPoint: ext.image?.portraitFocalPoint,
    backgroundFocalPoint: ext.image?.backgroundFocalPoint,
    contextNotes: ext.generation?.contextNotes,
    authorNote: ext.generation?.authorNote,
    allowedRelationshipTypes: ext.generation?.allowedRelationshipTypes,
    disallowedContent: ext.generation?.disallowedContent,
  };
}

/**
 * Serialize a Howling character to an HWCC v1 card (CCV2 + howling_whispers).
 *
 * Standard CCV2 fields are projected from the structured model. Unknown CCV2
 * data fields and other extension namespaces from the original import are
 * preserved so nothing is silently discarded.
 */
export function characterToHWCCCard(character: Character): CharacterCardV2 {
  const original = character.cardV2?.original;
  const extension = characterToExtensionV1(character);
  const preservedData = original ? extraDataFields(original.data) : {};
  const preservedExtensions = original?.data.extensions
    ? omitKey(original.data.extensions, HOWLING_EXTENSION_KEY)
    : {};

  return {
    spec: CHARACTER_CARD_V2_SPEC,
    spec_version: CHARACTER_CARD_V2_VERSION,
    data: {
      ...preservedData,
      name: character.name,
      description: compileCharacterProfile(character),
      personality: character.profile,
      scenario: [character.scene, character.weather].filter(Boolean).join(". "),
      first_mes: character.reply,
      mes_example: character.cardV2?.mesExample ?? "",
      creator_notes: character.cardV2?.creatorNotes ?? "",
      system_prompt: character.cardV2?.importedSystemPrompt ?? "",
      post_history_instructions: character.cardV2?.importedPostHistoryInstructions ?? "",
      alternate_greetings: character.cardV2?.alternateGreetings ?? [],
      tags: character.cardV2?.tags ?? [],
      creator: character.credit ?? "",
      character_version: character.cardV2?.characterVersion ?? "1.0",
      ...(character.cardV2?.characterBook ? { character_book: character.cardV2.characterBook } : {}),
      extensions: {
        ...preservedExtensions,
        [HOWLING_EXTENSION_KEY]: extension,
      },
    },
  };
}

function extraDataFields(value: Record<string, unknown>): Record<string, unknown> {
  const KNOWN = new Set([
    "name", "description", "personality", "scenario", "first_mes", "mes_example",
    "creator_notes", "system_prompt", "post_history_instructions", "alternate_greetings",
    "tags", "creator", "character_version", "extensions", "character_book",
  ]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !KNOWN.has(key))
      .map(([key, fieldValue]) => [key, fieldValue]),
  );
}

function omitKey(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { CharacterBookV2 };
