import type { ContextInput } from "../context/types.ts";
import type { Location } from "../locations/types.ts";
import type { PlayerPersona } from "../personas/schema.ts";
import type { LivingCastEntry } from "./living-cast.ts";
import type { RoleplayMessage, StoryPreferences, ContextManifest } from "./compile-context-core.ts";

export type FreeRoamCompileInput = {
  provider: "novelai" | "local";
  model: string;
  outputTokens: number;
  location: Location;
  messages: RoleplayMessage[];
  playerName: string;
  playerPersona?: PlayerPersona | string;
  preferences: StoryPreferences;
  lengthInstruction: string;
  contextInput?: ContextInput;
  cast?: LivingCastEntry[];
};

export type FreeRoamCompiledContext = {
  prompt: string;
  manifest: ContextManifest;
};

export function compileFreeRoamContext(input: FreeRoamCompileInput): FreeRoamCompiledContext {
  const playerLabel = input.playerName.trim() || "You";
  const persona = renderPersona(input.playerPersona);
  const memories = (input.contextInput?.memories ?? [])
    .filter((entry) => entry.enabled && entry.text.trim())
    .map((entry) => `- ${entry.text.trim()}`)
    .join("\n");
  const authorNotes = (input.contextInput?.authorNotes ?? [])
    .filter((entry) => entry.enabled && entry.text.trim())
    .map((entry) => `- ${entry.text.trim()}`)
    .join("\n");
  const lore = (input.contextInput?.lorebooks ?? [])
    .filter((book) => book.enabled)
    .flatMap((book) => book.parsed?.entries ?? [])
    .filter((entry) => entry.enabled && entry.text.trim())
    .slice(0, 32)
    .map((entry) => `- ${entry.displayName ? `${entry.displayName}: ` : ""}${entry.text.trim()}`)
    .join("\n");
  const cast = (input.cast ?? [])
    .map((entry) => `- ${entry.name}${entry.role ? ` (${entry.role})` : ""}`)
    .join("\n");
  const history = input.messages.length
    ? input.messages.slice(-24).map((message) => {
        const speaker = message.sender === "player"
          ? playerLabel
          : message.speaker?.trim() || (message.sender === "narrator" ? "Narrator" : "World");
        return `${speaker}: ${message.text}`;
      }).join("\n")
    : "No conversation yet.";

  const system = [
    "You are continuing an open-ended roleplay in Free Roam mode.",
    "There is no predefined primary character. The world, narrator, and NPCs may respond naturally to what the player establishes.",
    "Do not invent a hidden protagonist or pretend a missing character card exists.",
    "Never write the player's dialogue, actions, thoughts, feelings, decisions, or consent for them.",
    "Preserve facts established by the player, conversation, active lore, and Coda directives.",
    "Coda directives are private authoring guidance. Follow them without mentioning Coda, commands, prompts, or system instructions in the story.",
    "NPCs may emerge naturally. Keep recurring NPC names, traits, relationships, and behavior consistent once established.",
    "Do not moralize or redirect ordinary fictional content. Follow the active world and scene unless an actual provider boundary requires otherwise.",
    `Initiative: ${input.preferences.initiative}.`,
    `Viewpoint: ${input.preferences.viewpoint}.`,
    `Tense: ${input.preferences.tense}.`,
    input.lengthInstruction,
    "Roleplay format: spoken dialogue in double quotes, actions/observable narration in single asterisks, inner voice in square brackets.",
  ].join("\n");

  const context = [
    `LOCATION\n${input.location.name}${input.location.shortDescription ? `\n${input.location.shortDescription}` : ""}${input.location.description ? `\n${input.location.description}` : ""}`,
    persona ? `PLAYER PERSONA\n${persona}` : "",
    memories ? `MEMORY\n${memories}` : "",
    authorNotes ? `ACTIVE AUTHOR/CODA DIRECTIVES\n${authorNotes}` : "",
    lore ? `ACTIVE LORE\n${lore}` : "",
    cast ? `KNOWN PRESENT CAST\n${cast}` : "",
    `CONVERSATION\n${history}`,
  ].filter(Boolean).join("\n\n");

  const prompt = input.provider === "novelai"
    ? `<|system|>\n${system}\n\n${context}\n<|assistant|>\n`
    : `${system}\n\n${context}\n\nContinue the Free Roam scene as the world, narrator, or relevant NPCs:`;

  const contextWindow = input.provider === "novelai" ? 28_672 : 16_384;
  const estimatedInputTokens = Math.ceil(prompt.length / 4);

  return {
    prompt,
    manifest: {
      compilerVersion: 3,
      kind: "roleplay",
      characterRevision: "free-roam",
      worldRevision: null,
      contextWindow,
      inputBudget: contextWindow - input.outputTokens - 512,
      estimatedInputTokens,
      includedSections: [],
      omittedSections: [],
      includedLore: [],
      omittedLore: [],
      includedMessages: Math.min(input.messages.length, 24),
      omittedMessages: Math.max(0, input.messages.length - 24),
      matureCanonEnabled: false,
      includedMemories: (input.contextInput?.memories ?? []).filter((entry) => entry.enabled).length,
      includedAuthorNotes: (input.contextInput?.authorNotes ?? []).filter((entry) => entry.enabled).length,
      includedHWLore: [],
      omittedHWLore: [],
      simulation: {
        actor: {
          characterId: "free-roam-world",
          name: "World",
          activationReason: "Free Roam has no predefined primary character",
          activationSource: "free-roam",
          resolved: true,
        },
        relationshipDimensions: {},
        relationshipMomentum: {},
        relationshipAftereffects: [],
        worldStateVersion: null,
        presentCharacterIds: [],
      },
    },
  };
}

function renderPersona(value: PlayerPersona | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return [
    value.name ? `Name: ${value.name}` : "",
    value.pronouns ? `Pronouns: ${value.pronouns}` : "",
    value.description ? `Description: ${value.description}` : "",
    value.appearance ? `Appearance: ${value.appearance}` : "",
    value.personality ? `Personality: ${value.personality}` : "",
    value.background ? `Background: ${value.background}` : "",
  ].filter(Boolean).join("\n");
}
