import type { FormEvent, ChangeEvent } from "react";
import type { AgeCategory } from "../../lib/characters/canonical";
import type { HowlingV2Metadata } from "../../lib/characters/character-card-v2";
import type { ContextManifest } from "../../lib/generation/compile-context.ts";
import type { ArchivePublication } from "../../lib/archive/client";
import type { StoryMetadata } from "../../lib/generation/story-metadata.ts";
import type { LivingCastEntry } from "../../lib/generation/living-cast.ts";
import type { AutonomousAgent } from "../../lib/generation/autonomous-cast.ts";

import {
  ensureUniqueCharacterIds,
  parseCharacterImport,
  serializeCharacter,
  serializeCharacterLibrary,
} from "../../lib/characters/import-export";
import {
  characterCardV2ToHowling,
  CHARACTER_CARD_V2_LIMITS,
  embedCharacterCardV2InPng,
  extractCharacterCardV2FromPng,
  howlingCharacterToV2,
  howlingWorldLoreToCharacterBook,
  isCharacterCardV2,
  parseCharacterCardV2Json,
  serializeCharacterCardV2,
} from "../../lib/characters/character-card-v2";
import {
  deleteCharacterPortrait,
  isStoredPortraitReference,
  loadCharacterPortrait,
  persistCharacterPortrait,
} from "../../lib/characters/portrait-storage";
import { resolveBuiltinWorldLore } from "../../lib/worlds/builtins";

type Character = {
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
  ageCategory?: AgeCategory;
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
  cardV2?: HowlingV2Metadata;
  pronouns?: string;
};

type VisualTheme = {
  accent: string;
  accentMuted: string;
  glow: string;
  surface: string;
  wash: string;
  motif: string;
};

type SceneDefinition = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  weather: string;
  background: string;
  backgroundFocalPoint: string;
  opening: string;
  theme: VisualTheme;
};

type CommonScene = {
  id: string;
  title: string;
  subtitle: string;
  weather: string;
  opening: string;
  createdAt: number;
  updatedAt: number;
};

type StorySession = {
  id: string;
  characterId: string;
  sceneId: string;
  title: string;
  messageKey: string;
  createdAt: number;
  updatedAt: number;
  sandbox?: boolean;
  autopilot?: boolean;
  autopilotPaused?: boolean;
  autopilotStopped?: boolean;
  autopilotPov?: "first" | "third" | "narrator";
  playerRole?: string;
  playerRoleContext?: string;
  playerName?: string;
  playerPersona?: string;
  playerPersonaId?: string;
  livingCast?: LivingCastEntry[];
  autonomousCast?: AutonomousAgent[];
};

type StoryEditor = {
  mode: "create" | "edit";
  scene: SceneDefinition;
};

type Message = {
  id: number;
  sender: "character" | "player" | "narrator";
  text: string;
  speaker?: string;
  direction?: string;
  pages?: string[];
  pageIndex?: number;
  meta?: StoryMetadata | null;
};

type AppView = "home" | "scenes" | "chat" | "changelog" | "settings" | "archive" | "personas";

export const DEFAULT_COMMON_SCENE_THEME: VisualTheme = {
  accent: "#8aa4c9",
  accentMuted: "#4a5f7a",
  glow: "#1e293b",
  surface: "#0f172a",
  wash: "#020617",
  motif: "common",
};

export const fallbackTheme: VisualTheme = {
  accent: "#d78a5e",
  accentMuted: "#7c4937",
  glow: "rgba(183, 101, 63, 0.28)",
  surface: "rgba(25, 16, 18, 0.95)",
  wash: "linear-gradient(90deg, rgba(8, 7, 9, 0.78), rgba(8, 7, 9, 0.08) 58%, rgba(8, 7, 9, 0.36)), linear-gradient(0deg, rgba(8, 7, 9, 0.96), transparent 70%)",
  motif: "HOWLING WHISPERS",
};

export const retiredCharacterIds = new Set(["ash", "seraphina"]);
export const sandboxSceneId = "open-sandbox";

export function commonSceneToSceneDefinition(commonScene: CommonScene): SceneDefinition {
  return {
    id: commonScene.id,
    title: commonScene.title,
    subtitle: commonScene.subtitle,
    status: "",
    weather: commonScene.weather,
    background: "",
    backgroundFocalPoint: "",
    opening: commonScene.opening,
    theme: DEFAULT_COMMON_SCENE_THEME,
  };
}

export function isUserOwnedCharacter(character: Character, curatedCharacterIds: Set<string>): boolean {
  return !curatedCharacterIds.has(character.id);
}

export function scenesFor(
  character: Character,
  handcraftedScenes: Record<string, SceneDefinition[]>,
  fallbackTheme: VisualTheme,
): SceneDefinition[] {
  return handcraftedScenes[character.name] ?? [{
    id: "opening-scene",
    title: character.scene,
    subtitle: character.role,
    status: character.status,
    weather: character.weather,
    background: character.sceneImage || (character.cardV2 ? "" : character.image),
    backgroundFocalPoint: character.backgroundFocalPoint ?? "center top",
    opening: character.reply,
    theme: { ...fallbackTheme, accent: character.accent },
  }];
}

export function sandboxSceneFor(character: Character, fallbackTheme: VisualTheme): SceneDefinition {
  return {
    id: sandboxSceneId,
    title: "Open Sandbox",
    subtitle: "No preset scene, memories, or opening move",
    status: "Waiting for your first move",
    weather: "No setting has been established",
    background: character.cardV2 ? "" : character.image,
    backgroundFocalPoint: character.portraitFocalPoint ?? "center",
    opening: "",
    theme: {
      ...fallbackTheme,
      accent: character.accent,
      glow: `${character.accent}45`,
      motif: "UNWRITTEN",
    },
  };
}

export function openSceneLibrary(
  characterId: string,
  setSelectedId: (id: string) => void,
  setStoryEditor: (editor: StoryEditor | null) => void,
  setView: (view: AppView) => void,
): void {
  setSelectedId(characterId);
  setStoryEditor(null);
  setView("scenes");
}

export function openStoryCreator(
  selected: Character,
  fallbackTheme: VisualTheme,
  setStoryEditor: (editor: StoryEditor | null) => void,
  setView: (view: AppView) => void,
): void {
  setStoryEditor({
    mode: "create",
    scene: {
      id: "",
      title: "",
      subtitle: "",
      status: "A new story is waiting",
      weather: "The world holds its breath",
      background: selected.sceneImage || (selected.cardV2 ? "" : selected.image),
      backgroundFocalPoint: selected.backgroundFocalPoint ?? "center top",
      opening: "",
      theme: {
        ...fallbackTheme,
        accent: selected.accent,
        glow: `${selected.accent}45`,
        motif: "UNWRITTEN",
      },
    },
  });
  setView("scenes");
}

export function saveStory(
  event: FormEvent<HTMLFormElement>,
  storyEditor: StoryEditor | null,
  selected: Character,
  storyScenes: Record<string, SceneDefinition[]>,
  handcraftedScenes: Record<string, SceneDefinition[]>,
  fallbackTheme: VisualTheme,
  setStoryScenes: (value: React.SetStateAction<Record<string, SceneDefinition[]>>) => void,
  setSessions: (value: React.SetStateAction<StorySession[]>) => void,
  setStoryEditor: (value: React.SetStateAction<StoryEditor | null>) => void,
): void {
  event.preventDefault();
  if (!storyEditor) return;

  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim();
  const subtitle = String(form.get("subtitle") || "").trim();
  const status = String(form.get("status") || "").trim();
  const weather = String(form.get("weather") || "").trim();
  const opening = String(form.get("opening") || "").trim();
  if (!title || !subtitle || !opening) return;

  const scene: SceneDefinition = {
    ...storyEditor.scene,
    id: storyEditor.scene.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    subtitle,
    status: status || "A new story is waiting",
    weather: weather || "The world holds its breath",
    opening,
    theme: {
      ...storyEditor.scene.theme,
      motif: storyEditor.mode === "create"
        ? title.toUpperCase().slice(0, 24)
        : storyEditor.scene.theme.motif,
    },
  };
  const currentScenes = storyScenes[selected.id] ?? scenesFor(selected, handcraftedScenes, fallbackTheme);
  const nextScenes = storyEditor.mode === "edit"
    ? currentScenes.map((item) => item.id === scene.id ? scene : item)
    : [...currentScenes, scene];

  setStoryScenes((current) => ({ ...current, [selected.id]: nextScenes }));
  if (storyEditor.mode === "edit") {
    setSessions((current) => current.map((session) =>
      session.characterId === selected.id && session.sceneId === scene.id
        ? { ...session, title: scene.title }
        : session,
    ));
  }
  setStoryEditor(null);
}

export function deleteCustomScene(
  scene: SceneDefinition,
  selected: Character,
  sessions: StorySession[],
  currentSessionId: string | null,
  storyEditor: StoryEditor | null,
  handcraftedScenes: Record<string, SceneDefinition[]>,
  fallbackTheme: VisualTheme,
  setStoryScenes: (value: React.SetStateAction<Record<string, SceneDefinition[]>>) => void,
  setSessions: (value: React.SetStateAction<StorySession[]>) => void,
  setMessages: (value: React.SetStateAction<Record<string, Message[]>>) => void,
  setCurrentSessionId: (value: React.SetStateAction<string | null>) => void,
  setStoryEditor: (value: React.SetStateAction<StoryEditor | null>) => void,
): void {
  if (!scene.id.startsWith("custom-")) return;

  const linkedSessions = sessions.filter((session) => (
    session.characterId === selected.id && session.sceneId === scene.id
  ));
  const sessionNote = linkedSessions.length === 0
    ? ""
    : ` This will also delete ${linkedSessions.length} linked ${linkedSessions.length === 1 ? "session" : "sessions"} and their message history.`;
  if (!window.confirm(`Delete the custom scene "${scene.title}"?${sessionNote}`)) return;

  const linkedSessionIds = new Set(linkedSessions.map((session) => session.id));
  const linkedMessageKeys = new Set(linkedSessions.map((session) => session.messageKey));
  setStoryScenes((current) => ({
    ...current,
    [selected.id]: (current[selected.id] ?? scenesFor(selected, handcraftedScenes, fallbackTheme))
      .filter((candidate) => candidate.id !== scene.id),
  }));
  setSessions((current) => current.filter((session) => !linkedSessionIds.has(session.id)));
  setMessages((current) => Object.fromEntries(
    Object.entries(current).filter(([messageKey]) => !linkedMessageKeys.has(messageKey)),
  ));
  if (currentSessionId && linkedSessionIds.has(currentSessionId)) setCurrentSessionId(null);
  if (storyEditor?.scene.id === scene.id) setStoryEditor(null);
}

export function createCharacter(
  event: FormEvent<HTMLFormElement>,
  handcraftedScenes: Record<string, SceneDefinition[]>,
  fallbackTheme: VisualTheme,
  setCharacters: (value: React.SetStateAction<Character[]>) => void,
  setMessages: (value: React.SetStateAction<Record<string, Message[]>>) => void,
  setSessions: (value: React.SetStateAction<StorySession[]>) => void,
  setCurrentSessionId: (value: React.SetStateAction<string | null>) => void,
  setSelectedId: (value: string) => void,
  setIsCreating: (value: React.SetStateAction<boolean>) => void,
  setView: (value: AppView) => void,
): void {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "Unnamed soul").trim();
  const role = String(form.get("role") || "New companion").trim();
  const spark = String(form.get("spark") || "").trim();
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const newCharacter: Character = {
    id,
    name,
    role,
    status: "Just awakened",
    image: "",
    sceneImage: "",
    scene: "An Unwritten Place",
    weather: "The air holds its breath",
    bond: 8,
    memories: ["This is where your story begins"],
    reply: "I was wondering when you would find me.",
    profile:
      spark ||
      `${name} is ${role.toLowerCase()} whose personality and history will emerge through the roleplay.`,
    accent: "#d78a5e",
  };
  const scene = scenesFor(newCharacter, handcraftedScenes, fallbackTheme)[0];
  const session: StorySession = {
    id: `session-${id}`,
    characterId: id,
    sceneId: scene.id,
    title: scene.title,
    messageKey: id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    livingCast: { id, name, relationship: "new", messageKey: id, speaking: true },
  };
  setCharacters((current) => [...current, newCharacter]);
  setMessages((current) => ({
    ...current,
    [id]: [
      {
        id: Date.now(),
        sender: "narrator",
        text: `${name} looks up as the unwritten world takes shape around you.`,
      },
      { id: Date.now() + 1, sender: "character", text: newCharacter.reply },
    ],
  }));
  setSessions((current) => [session, ...current]);
  setCurrentSessionId(session.id);
  setSelectedId(id);
  setIsCreating(false);
  setView("chat");
}

export async function handleCharacterImport(
  file: File,
  characters: Character[],
  setCharacters: (value: React.SetStateAction<Character[]>) => void,
  setSelectedId: (value: string) => void,
  setIsCreating: (value: React.SetStateAction<boolean>) => void,
  setImportError: (value: React.SetStateAction<string>) => void,
  setCharacterBackupError: (value: React.SetStateAction<string>) => void,
  setCharacterBackupMsg: (value: React.SetStateAction<string>) => void,
): Promise<void> {
  try {
    if (file.name.toLowerCase().endsWith(".png") || file.type === "image/png") {
      if (file.size > CHARACTER_CARD_V2_LIMITS.pngBytes) {
        throw new Error("This PNG is too large to import safely.");
      }
      const png = new Uint8Array(await file.arrayBuffer());
      const result = extractCharacterCardV2FromPng(png);
      if (!result.ok) throw new Error(result.error);
      const imported = characterCardV2ToHowling(result.card);
      const [unique] = ensureUniqueCharacterIds(
        [imported],
        characters.map((character) => character.id),
      );
      unique.image = await persistCharacterPortrait(unique.id, png);
      setCharacters((current) => [...current, unique]);
      setSelectedId(unique.id);
      setIsCreating(false);
      setCharacterBackupMsg(`Imported ${unique.name} from a Character Card V2 PNG.`);
      return;
    }

    if (file.size > CHARACTER_CARD_V2_LIMITS.jsonBytes) {
      throw new Error("This character JSON is too large to import safely.");
    }
    const json = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("This JSON is malformed and could not be read.");
    }

    if (isCharacterCardV2(parsed) || (parsed && typeof parsed === "object" && "spec" in parsed)) {
      const result = parseCharacterCardV2Json(json);
      if (!result.ok) throw new Error(result.error);
      const [unique] = ensureUniqueCharacterIds(
        [characterCardV2ToHowling(result.card)],
        characters.map((character) => character.id),
      );
      setCharacters((current) => [...current, unique]);
      setSelectedId(unique.id);
      setIsCreating(false);
      setCharacterBackupMsg(`Imported ${unique.name} from Character Card V2 JSON.`);
      return;
    }

    const native = parseCharacterImport(json);
    if (!native.ok) {
      const format = parsed && typeof parsed === "object" && "format" in parsed
        ? String((parsed as { format?: unknown }).format ?? "")
        : "";
      if (!format.startsWith("howling-whispers-character")) {
        throw new Error("This JSON is not a supported character format.");
      }
      throw new Error(native.error);
    }
    const unique = ensureUniqueCharacterIds(
      native.characters,
      characters.map((character) => character.id),
    );
    setCharacters((current) => [...current, ...unique]);
    if (unique.length === 1) setSelectedId(unique[0].id);
    setIsCreating(false);
    setCharacterBackupMsg(`Imported ${unique.length} ${unique.length === 1 ? "character" : "characters"}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That character file could not be read.";
    setImportError(message);
    setCharacterBackupError(message);
  }
}

export function importCharacterFile(
  event: ChangeEvent<HTMLInputElement>,
  handleCharacterImport: (file: File) => Promise<void>,
): void {
  const file = event.target.files?.[0];
  if (file) void handleCharacterImport(file);
  event.target.value = "";
}

export function importArchiveCharacter(
  publication: ArchivePublication,
  setCharacters: (value: React.SetStateAction<Character[]>) => void,
  setSelectedId: (value: string) => void,
  setView: (value: AppView) => void,
  requestPersonaStart: (start: { kind: string; characterId: string }) => void,
): void {
  const id = `archive-${publication.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Date.now()}`;
  const ageCategory: AgeCategory =
    publication.age_category === "adult"
      ? "adult"
      : publication.age_category === "minor"
        ? "minor"
        : "unknown";
  const memories = publication.profile
    ? publication.profile
        .split(/[.\n]/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const importedCharacter: Character = {
    id,
    name: publication.name,
    role: publication.role || "From the Whispering Archive",
    status: "Ready to meet",
    image: publication.avatar_url ?? "",
    sceneImage: publication.scene_image_url ?? "",
    scene: "A Shared Story",
    weather: "The world waits for your first choice",
    bond: 12,
    memories: memories.length ? memories : ["Their history is waiting to be discovered"],
    reply: publication.opening_message,
    profile: publication.profile || `${publication.name} is a character shared through the Whispering Archive.`,
    accent: "#d78a5e",
    ageCategory,
    credit: publication.creator_credit || publication.owner || undefined,
  };
  setCharacters((current) =>
    ensureUniqueCharacterIds(
      [...current, importedCharacter],
      current.map((character) => character.id),
    ),
  );
  setSelectedId(id);
  setView("home");
  requestPersonaStart({ kind: "imported", characterId: id });
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadBinaryFile(filename: string, bytes: Uint8Array, type: string): void {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportCharacterLibrary(
  characters: Character[],
  curatedCharacterIds: Set<string>,
  downloadTextFile: (filename: string, text: string) => void,
  setCharacterBackupMsg: (value: React.SetStateAction<string>) => void,
): void {
  const ownedCharacters = characters.filter((character) => isUserOwnedCharacter(character, curatedCharacterIds));
  if (ownedCharacters.length === 0) {
    setCharacterBackupMsg("You have no characters of your own to export yet.");
    return;
  }
  downloadTextFile(
    "howling-whispers-character-library.json",
    serializeCharacterLibrary(ownedCharacters),
  );
  setCharacterBackupMsg("Your own characters exported.");
}

export function exportNativeCharacter(
  character: Character,
  curatedCharacterIds: Set<string>,
  downloadTextFile: (filename: string, text: string) => void,
  setDownloadingCharacter: (value: React.SetStateAction<Character | null>) => void,
): void {
  if (!isUserOwnedCharacter(character, curatedCharacterIds)) return;
  downloadTextFile(
    `howling-whispers-character-${character.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
    serializeCharacter(character),
  );
  setDownloadingCharacter(null);
}

export function exportV2Json(
  character: Character,
  downloadTextFile: (filename: string, text: string) => void,
  setDownloadingCharacter: (value: React.SetStateAction<Character | null>) => void,
): void {
  downloadTextFile(
    `${fileSlug(character.name)}.v2.json`,
    serializeCharacterCardV2(portableExportSource(character)),
  );
  setDownloadingCharacter(null);
}

export async function exportV2Png(
  character: Character,
  downloadBinaryFile: (filename: string, bytes: Uint8Array, type: string) => void,
  setDownloadingCharacter: (value: React.SetStateAction<Character | null>) => void,
  setCharacterDownloadError: (value: React.SetStateAction<string>) => void,
): Promise<void> {
  setCharacterDownloadError("");
  try {
    const portrait = await portraitPngBytes(character);
    const png = embedCharacterCardV2InPng(portrait, howlingCharacterToV2(portableExportSource(character)));
    downloadBinaryFile(`${fileSlug(character.name)}.card.png`, png, "image/png");
    setDownloadingCharacter(null);
  } catch (error) {
    setCharacterDownloadError(error instanceof Error ? error.message : "The V2 card could not be created.");
  }
}

export async function portraitPngBytes(character: Character): Promise<Uint8Array> {
  if (isStoredPortraitReference(character.image)) {
    const bytes = await loadCharacterPortrait(character.image);
    if (!bytes) throw new Error("The stored portrait is unavailable. Assign artwork before downloading a V2 PNG.");
    return bytes;
  }
  if (!character.image) throw new Error("This character has no portrait. Use V2 JSON or assign artwork first.");
  const response = await fetch(character.image);
  if (!response.ok) throw new Error("The character portrait could not be loaded for export.");
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return bytes;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The portrait could not be converted to PNG.");
    context.drawImage(bitmap, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("The portrait could not be converted to PNG.");
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export function fileSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character";
}

export function portableExportSource(character: Character) {
  return {
    ...character,
    portableCharacterBook: character.cardV2?.characterBook
      ? undefined
      : howlingWorldLoreToCharacterBook(resolveBuiltinWorldLore(character.id)),
  };
}

export function updateCharacter(
  id: string,
  updates: Partial<Character>,
  characters: Character[],
  setCharacters: (value: React.SetStateAction<Character[]>) => void,
  setEditingCharacter: (value: React.SetStateAction<Character | null>) => void,
): void {
  const previousImage = characters.find((character) => character.id === id)?.image;
  if (updates.image !== undefined && previousImage && updates.image !== previousImage
    && isStoredPortraitReference(previousImage)) {
    void deleteCharacterPortrait(previousImage);
  }
  setCharacters((current) => current.map((character) => (
    character.id === id ? { ...character, ...updates } : character
  )));
  setEditingCharacter(null);
}

export function deleteCharacter(
  character: Character,
  characters: Character[],
  sessions: StorySession[],
  currentSessionId: string | null,
  selectedId: string,
  setCharacters: (value: React.SetStateAction<Character[]>) => void,
  setSessions: (value: React.SetStateAction<StorySession[]>) => void,
  setMessages: (value: React.SetStateAction<Record<string, Message[]>>) => void,
  setStoryScenes: (value: React.SetStateAction<Record<string, SceneDefinition[]>>) => void,
  setContextManifests: (value: React.SetStateAction<Record<string, ContextManifest>>) => void,
  setDirectionEditor: (value: React.SetStateAction<{ id: number; text: string } | null>) => void,
  setStoryEditor: (value: React.SetStateAction<StoryEditor | null>) => void,
  setEditingCharacter: (value: React.SetStateAction<Character | null>) => void,
  setConfirmDeleteCharacter: (value: React.SetStateAction<Character | null>) => void,
  setCurrentSessionId: (value: React.SetStateAction<string | null>) => void,
  setSelectedId: (value: string) => void,
  setView: (value: AppView) => void,
): void {
  if (!isUserOwnedCharacter(character, new Set())) return;
  if (isStoredPortraitReference(character.image)) void deleteCharacterPortrait(character.image);

  const removedSessionMessageKeys = new Set(
    sessions
      .filter((session) => session.characterId === character.id)
      .map((session) => session.messageKey),
  );

  setCharacters((current) => current.filter((candidate) => candidate.id !== character.id));
  setSessions((current) => current.filter((session) => session.characterId !== character.id));

  setMessages((current) => {
    const next = { ...current };
    delete next[character.id];
    removedSessionMessageKeys.forEach((messageKey) => delete next[messageKey]);
    return next;
  });

  setStoryScenes((current) => {
    const next = { ...current };
    delete next[character.id];
    return next;
  });

  setContextManifests((current) => {
    const next = { ...current };
    removedSessionMessageKeys.forEach((messageKey) => delete next[messageKey]);
    delete next[character.id];
    return next;
  });

  setDirectionEditor(null);
  setStoryEditor(null);
  setEditingCharacter(null);
  setConfirmDeleteCharacter(null);

  if (currentSessionId && removedSessionMessageKeys.has(
    sessions.find((session) => session.id === currentSessionId)?.messageKey ?? "",
  )) {
    setCurrentSessionId(null);
  }

  if (selectedId === character.id) {
    setSelectedId("coda");
  }
  setView("home");
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatBackupDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function describeBackupDevice(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "web";
}

export function createCharacterAreaFunctions(deps: {
  characters: Character[];
  sessions: StorySession[];
  currentSessionId: string | null;
  selected: Character;
  storyEditor: StoryEditor | null;
  storyScenes: Record<string, SceneDefinition[]>;
  contextManifests: Record<string, ContextManifest>;
  directionEditor: { id: number; text: string } | null;
  editingCharacter: Character | null;
  confirmDeleteCharacter: Character | null;
  downloadingCharacter: Character | null;
  importError: string;
  characterBackupMsg: string;
  characterBackupError: string;
  characterDownloadError: string;
  curatedCharacterIds: Set<string>;
  fallbackTheme: VisualTheme;
  handcraftedScenes: Record<string, SceneDefinition[]>;
  buildSessionInitialState: (character: Character, scene: SceneDefinition, overrides?: Record<string, unknown>) => { session: StorySession; initialMessages: Message[] };
  requestPersonaStart: (start: { kind: string; characterId: string }) => void;
  setCharacters: (value: React.SetStateAction<Character[]>) => void;
  setSessions: (value: React.SetStateAction<StorySession[]>) => void;
  setCurrentSessionId: (value: React.SetStateAction<string | null>) => void;
  setSelectedId: (value: string) => void;
  setStoryEditor: (value: React.SetStateAction<StoryEditor | null>) => void;
  setView: (value: AppView) => void;
  setStoryScenes: (value: React.SetStateAction<Record<string, SceneDefinition[]>>) => void;
  setMessages: (value: React.SetStateAction<Record<string, Message[]>>) => void;
  setContextManifests: (value: React.SetStateAction<Record<string, ContextManifest>>) => void;
  setDirectionEditor: (value: React.SetStateAction<{ id: number; text: string } | null>) => void;
  setEditingCharacter: (value: React.SetStateAction<Character | null>) => void;
  setConfirmDeleteCharacter: (value: React.SetStateAction<Character | null>) => void;
  setDownloadingCharacter: (value: React.SetStateAction<Character | null>) => void;
  setCharacterBackupError: (value: React.SetStateAction<string>) => void;
  setCharacterBackupMsg: (value: React.SetStateAction<string>) => void;
  setCharacterDownloadError: (value: React.SetStateAction<string>) => void;
  setImportError: (value: React.SetStateAction<string>) => void;
  setIsCreating: (value: React.SetStateAction<boolean>) => void;
}) {
  return {
    isUserOwnedCharacter: (character: Character) => isUserOwnedCharacter(character, deps.curatedCharacterIds),
    commonSceneToSceneDefinition,
    scenesFor: (character: Character) => scenesFor(character, deps.handcraftedScenes, deps.fallbackTheme),
    sandboxSceneFor: (character: Character) => sandboxSceneFor(character, deps.fallbackTheme),
    openSceneLibrary: (characterId: string) => openSceneLibrary(characterId, deps.setSelectedId, deps.setStoryEditor, deps.setView),
    openStoryCreator: () => openStoryCreator(deps.selected, deps.fallbackTheme, deps.setStoryEditor, deps.setView),
    saveStory: (event: FormEvent<HTMLFormElement>) => saveStory(event, deps.storyEditor, deps.selected, deps.storyScenes, deps.handcraftedScenes, deps.fallbackTheme, deps.setStoryScenes, deps.setSessions, deps.setStoryEditor),
    deleteCustomScene: (scene: SceneDefinition) => deleteCustomScene(scene, deps.selected, deps.sessions, deps.currentSessionId, deps.storyEditor, deps.handcraftedScenes, deps.fallbackTheme, deps.setStoryScenes, deps.setSessions, deps.setMessages, deps.setCurrentSessionId, deps.setStoryEditor),
    createCharacter: (event: FormEvent<HTMLFormElement>) => createCharacter(event, deps.handcraftedScenes, deps.fallbackTheme, deps.setCharacters, deps.setMessages, deps.setSessions, deps.setCurrentSessionId, deps.setSelectedId, deps.setIsCreating, deps.setView),
    handleCharacterImport: (file: File) => handleCharacterImport(file, deps.characters, deps.setCharacters, deps.setSelectedId, deps.setIsCreating, deps.setImportError, deps.setCharacterBackupError, deps.setCharacterBackupMsg),
    importCharacterFile: (event: ChangeEvent<HTMLInputElement>) => importCharacterFile(event, deps.handleCharacterImport),
    importArchiveCharacter: (publication: ArchivePublication) => importArchiveCharacter(publication, deps.setCharacters, deps.setSelectedId, deps.setView, deps.requestPersonaStart),
    updateCharacter: (id: string, updates: Partial<Character>) => updateCharacter(id, updates, deps.characters, deps.setCharacters, deps.setEditingCharacter),
    deleteCharacter: (character: Character) => deleteCharacter(character, deps.characters, deps.sessions, deps.currentSessionId, deps.selectedId, deps.setCharacters, deps.setSessions, deps.setMessages, deps.setStoryScenes, deps.setContextManifests, deps.setDirectionEditor, deps.setStoryEditor, deps.setEditingCharacter, deps.setConfirmDeleteCharacter, deps.setCurrentSessionId, deps.setSelectedId, deps.setView),
    exportCharacterLibrary: () => exportCharacterLibrary(deps.characters, deps.curatedCharacterIds, downloadTextFile, deps.setCharacterBackupMsg),
    exportNativeCharacter: (character: Character) => exportNativeCharacter(character, deps.curatedCharacterIds, downloadTextFile, deps.setDownloadingCharacter),
    exportV2Json: (character: Character) => exportV2Json(character, downloadTextFile, deps.setDownloadingCharacter),
    exportV2Png: (character: Character) => exportV2Png(character, downloadBinaryFile, deps.setDownloadingCharacter, deps.setCharacterDownloadError),
    portraitPngBytes,
    fileSlug,
    portableExportSource,
    downloadTextFile,
    downloadBinaryFile,
    formatBackupSize,
    formatBackupDate,
    describeBackupDevice,
    retiredCharacterIds,
    fallbackTheme: deps.fallbackTheme,
    sandboxSceneId,
  };
}
