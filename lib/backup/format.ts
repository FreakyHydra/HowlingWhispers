// Portable private-data backup format for The Howling Whispers.
//
// A backup is a self-contained JSON document that captures everything the user
// owns locally (characters they made or imported, conversations, relationship
// progress, chapters, personas, preferences, custom scenes) while *never*
// bundling the curated Howling Whispers character packages. Curated characters
// are stored only as stable ids plus the user's own state for that character
// (bond/relationship points, memories, and history kept in messages/sessions),
// so a restored backup reconnects to the curated character the site ships.
//
// Credentials (NovelAI tokens, passwords, etc.) must never be included.

import { sanitizeCast, type LivingCastEntry } from "../generation/living-cast.ts";

export const PORTABLE_BACKUP_FORMAT = "howling-whispers-backup";
export const PORTABLE_BACKUP_VERSION = 1;
export const BACKUP_FILE_EXTENSION = "hwb";
export const BACKUP_MIME = "application/json";

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export const CURATED_CHARACTER_IDS: ReadonlySet<string> = new Set([
  "coda",
  "heather",
  "peony",
  "senako-steel",
]);

export function isCuratedCharacterId(id: string): boolean {
  return CURATED_CHARACTER_IDS.has(id);
}

// ---------- Payload shapes ------------------------------------------------

export type BackupMessage = {
  id: number;
  sender: "character" | "player" | "narrator";
  text: string;
  speaker?: string;
  direction?: string;
  pages?: string[];
  pageIndex?: number;
};

export type BackupStorySession = {
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
};

export type BackupStoryScene = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  weather: string;
  background: string;
  backgroundFocalPoint: string;
  opening: string;
  theme?: Record<string, unknown>;
};

export type BackupUserCharacter = {
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
  ageCategory?: "adult" | "minor" | "unknown";
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
  pronouns?: string;
};

export type BackupCuratedState = {
  /** Stable curated character id, e.g. "coda". Never the curated package itself. */
  id: string;
  bond: number;
  relationship?: string;
  memories: string[];
};

export type BackupRelationshipEvent = {
  id: string;
  characterId: string;
  personaId: string;
  turnId: string;
  delta: number;
  reason: string;
  createdAt: number;
};

export type BackupRelationshipRecord = {
  characterId: string;
  personaId: string;
  score: number;
  updatedAt: number;
  events: BackupRelationshipEvent[];
};

export type BackupMemoryCard = {
  id: string;
  personaId: string;
  version: number;
  relationships: Record<string, { score: number; updatedAt: number }>;
  stats: Record<string, Record<string, number>>;
  flags: Record<string, Record<string, boolean | string | number>>;
  milestones: Record<string, string[]>;
  memoryRefs: Array<{
    id: string;
    participants: string[];
    event: string;
    context?: string;
    importance: number;
    origin?: string;
    timestamp: number;
    persistenceMetadata?: Record<string, unknown>;
  }>;
  createdAt: number;
  updatedAt: number;
};

export type BackupRelationshipState = Record<string, BackupRelationshipRecord>;

export type BackupPersona = {
  id: string;
  name: string;
  pronouns?: string;
  description: string;
  appearance?: string;
  personality?: string;
  background?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  hwCard?: import("../personas/hw-card").HwCard;
  identity?: import("../personas/hw-card").HwCardIdentity;
  personalityTraits?: string[];
  emotionalProfile?: Record<string, unknown>;
  socialBehavior?: Record<string, unknown>;
  communicationStyle?: Record<string, unknown>;
  likes?: string[];
  dislikes?: string[];
  interests?: string[];
  habits?: string[];
  boundaries?: string[];
  history?: Record<string, unknown>;
  roleplayGuidance?: string[];
  memoryPriorities?: string[];
  tags?: string[];
  creator?: string;
  cardVersion?: string;
};

export type BackupPreferences = {
  storyProvider?: string;
  model?: string;
  localModel?: string;
  deviceModel?: string;
  creativity?: number;
  replyLength?: string;
  initiative?: string;
  viewpoint?: string;
  storyTense?: string;
  textStyle?: { dialogue: string; action: string; narration: string; fontSize: number };
  shareCount?: number;
  shareCaptions?: boolean;
  shareHeader?: boolean;
  entranceCodaLocked?: boolean;
  showCharacterRail?: boolean;
  showContextRail?: boolean;
};

export type BackupData = {
  player: { name: string };
  personas: BackupPersona[];
  activePersonaId: string | null;
  /** User-owned characters only (created or imported). */
  characters: BackupUserCharacter[];
  /** User state tied to curated characters, never the curated packages. */
  curatedState: BackupCuratedState[];
  messages: Record<string, BackupMessage[]>;
  sessions: BackupStorySession[];
  currentSessionId: string | null;
  /** User-created scenes/backgrounds per character. */
  storyScenes: Record<string, BackupStoryScene[]>;
  preferences: BackupPreferences;
  /** Persistent relationship state keyed by "characterId::personaId". */
  relationships?: BackupRelationshipState;
  memoryCards?: Record<string, BackupMemoryCard>;
};

export type BackupPayload = {
  format: typeof PORTABLE_BACKUP_FORMAT;
  version: typeof PORTABLE_BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  device: string;
  source: string;
  data: BackupData;
};

// ---------- Build -----------------------------------------------------------

export type BackupSource = {
  characters: Array<{
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
    ageCategory?: "adult" | "minor" | "unknown";
    isMinor?: boolean | null;
    allowedRelationshipTypes?: string[];
    disallowedContent?: string[];
    pronouns?: string;
  }>;
  messages: BackupData["messages"];
  sessions: BackupData["sessions"];
  currentSessionId: string | null;
  storyScenes: BackupData["storyScenes"];
  personas: BackupData["personas"];
  activePersonaId: string | null;
  playerName: string;
  preferences: BackupPreferences;
  relationships: BackupRelationshipState;
  memoryCards?: Record<string, MemoryCard>;
};

/**
 * Build a portable private-data payload. Curated characters are reduced to
 * reference id + user state only; credentials are never part of the source
 * shape and therefore cannot leak in.
 */
export function buildBackupPayload(
  source: BackupSource,
  meta: { appVersion: string; device: string; source: string; createdAt?: string },
): BackupPayload {
  const characters: BackupUserCharacter[] = [];
  const curatedState: BackupCuratedState[] = [];

  for (const character of source.characters) {
    if (isCuratedCharacterId(character.id)) {
      curatedState.push({
        id: character.id,
        bond: clampBond(character.bond),
        relationship: typeof character.relationship === "string" ? character.relationship : undefined,
        memories: clampStringList(character.memories),
      });
    } else {
      characters.push({
        id: character.id,
        name: character.name || "Unnamed character",
        role: character.role ?? "",
        status: character.status ?? "Ready to meet",
        image: character.image ?? "",
        sceneImage: character.sceneImage ?? "",
        scene: character.scene ?? "",
        weather: character.weather ?? "",
        bond: clampBond(character.bond),
        memories: clampStringList(character.memories),
        reply: character.reply ?? "",
        profile: character.profile ?? "",
        accent: character.accent ?? "#d78a5e",
        credit: character.credit || undefined,
        creditUrl: character.creditUrl || undefined,
        relationship: character.relationship || undefined,
        portraitFocalPoint: character.portraitFocalPoint || undefined,
        backgroundFocalPoint: character.backgroundFocalPoint || undefined,
        ageCategory: character.ageCategory,
        isMinor: character.isMinor == null ? undefined : character.isMinor,
        allowedRelationshipTypes: character.allowedRelationshipTypes,
        disallowedContent: character.disallowedContent,
        pronouns: character.pronouns || undefined,
      });
    }
  }

  return {
    format: PORTABLE_BACKUP_FORMAT,
    version: PORTABLE_BACKUP_VERSION,
    createdAt: meta.createdAt ?? new Date().toISOString(),
    appVersion: meta.appVersion,
    device: meta.device,
    source: meta.source,
    data: {
      player: { name: typeof source.playerName === "string" ? source.playerName : "" },
      personas: sanitizePersonas(source.personas),
      activePersonaId: source.activePersonaId ?? null,
      characters,
      curatedState,
       messages: sanitizeMessages(source.messages),
      sessions: sanitizeSessions(source.sessions),
      currentSessionId: source.currentSessionId ?? null,
      storyScenes: sanitizeStoryScenes(source.storyScenes),
      preferences: sanitizePreferences(source.preferences),
      relationships: sanitizeRelationships(source.relationships ?? {}),
      memoryCards: sanitizeMemoryCards(source.memoryCards ?? {}),
    },
  };
}

// ---------- Sanitization -----------------------------------------------------

function clampBond(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function clampStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizePersonas(value: unknown): BackupPersona[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is BackupPersona => !!item && typeof item === "object")
    .map((persona) => {
      const p = persona as Record<string, unknown>;
      const out: BackupPersona = {
        id: typeof p.id === "string" ? p.id : "",
        name: typeof p.name === "string" ? p.name.slice(0, 100) : "",
        pronouns: typeof p.pronouns === "string" ? p.pronouns : undefined,
        description: typeof p.description === "string" ? p.description : "",
        appearance: typeof p.appearance === "string" ? p.appearance : undefined,
        personality: typeof p.personality === "string" ? p.personality : undefined,
        background: typeof p.background === "string" ? p.background : undefined,
        avatar: typeof p.avatar === "string" ? p.avatar : undefined,
        createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
        updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : 0,
      };

      if (p.hwCard && typeof p.hwCard === "object" && !Array.isArray(p.hwCard)) out.hwCard = p.hwCard as BackupPersona["hwCard"];
      if (p.identity && typeof p.identity === "object" && !Array.isArray(p.identity)) out.identity = p.identity as BackupPersona["identity"];
      if (Array.isArray(p.personalityTraits)) out.personalityTraits = p.personalityTraits.filter((t: unknown) => typeof t === "string");
      if (p.emotionalProfile && typeof p.emotionalProfile === "object" && !Array.isArray(p.emotionalProfile)) out.emotionalProfile = p.emotionalProfile as Record<string, unknown>;
      if (p.socialBehavior && typeof p.socialBehavior === "object" && !Array.isArray(p.socialBehavior)) out.socialBehavior = p.socialBehavior as Record<string, unknown>;
      if (p.communicationStyle && typeof p.communicationStyle === "object" && !Array.isArray(p.communicationStyle)) out.communicationStyle = p.communicationStyle as Record<string, unknown>;
      if (Array.isArray(p.likes)) out.likes = p.likes.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.dislikes)) out.dislikes = p.dislikes.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.interests)) out.interests = p.interests.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.habits)) out.habits = p.habits.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.boundaries)) out.boundaries = p.boundaries.filter((t: unknown) => typeof t === "string");
      if (p.history && typeof p.history === "object" && !Array.isArray(p.history)) out.history = p.history as Record<string, unknown>;
      if (Array.isArray(p.roleplayGuidance)) out.roleplayGuidance = p.roleplayGuidance.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.memoryPriorities)) out.memoryPriorities = p.memoryPriorities.filter((t: unknown) => typeof t === "string");
      if (Array.isArray(p.tags)) out.tags = p.tags.filter((t: unknown) => typeof t === "string");
      if (typeof p.creator === "string") out.creator = p.creator;
      if (typeof p.cardVersion === "string") out.cardVersion = p.cardVersion;

      return out;
    })
    .filter((persona) => persona.id && persona.name);
}

function sanitizeMessages(value: unknown): BackupData["messages"] {
  if (!value || typeof value !== "object") return {};
  const out: BackupData["messages"] = {};
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const messages: BackupMessage[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const m = item as Record<string, unknown>;
      if (typeof m.text !== "string") continue;
      messages.push({
        id: typeof m.id === "number" ? m.id : messages.length + 1,
        sender: m.sender === "player" || m.sender === "narrator" ? (m.sender as BackupMessage["sender"]) : "character",
        text: m.text.slice(0, 100000),
        speaker: typeof m.speaker === "string" && m.sender === "character" ? m.speaker.slice(0, 120) : undefined,
        direction: typeof m.direction === "string" ? m.direction.slice(0, 10000) : undefined,
        pages: Array.isArray(m.pages)
          ? (m.pages as unknown[]).filter((p) => typeof p === "string").map((p) => (p as string).slice(0, 100000))
          : undefined,
        pageIndex: typeof m.pageIndex === "number" ? m.pageIndex : undefined,
      });
    }
    out[key] = messages;
  }
  return out;
}

function sanitizeSessions(value: unknown): BackupStorySession[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((s) => ({
      id: typeof s.id === "string" ? s.id : "",
      characterId: typeof s.characterId === "string" ? s.characterId : "",
      sceneId: typeof s.sceneId === "string" ? s.sceneId : "",
      title: typeof s.title === "string" ? s.title : "",
      messageKey: typeof s.messageKey === "string" ? s.messageKey : "",
      createdAt: typeof s.createdAt === "number" ? s.createdAt : 0,
      updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : 0,
      sandbox: typeof s.sandbox === "boolean" ? s.sandbox : undefined,
      autopilot: typeof s.autopilot === "boolean" ? s.autopilot : undefined,
      autopilotPaused: typeof s.autopilotPaused === "boolean" ? s.autopilotPaused : undefined,
      autopilotStopped: typeof s.autopilotStopped === "boolean" ? s.autopilotStopped : undefined,
      autopilotPov: s.autopilotPov as BackupStorySession["autopilotPov"],
      playerRole: typeof s.playerRole === "string" ? s.playerRole : undefined,
      playerRoleContext: typeof s.playerRoleContext === "string" ? s.playerRoleContext : undefined,
      playerName: typeof s.playerName === "string" ? s.playerName : undefined,
      playerPersona: typeof s.playerPersona === "string" ? s.playerPersona : undefined,
      playerPersonaId: typeof s.playerPersonaId === "string" ? s.playerPersonaId : undefined,
      livingCast: sanitizeCast(s.livingCast),
    }))
    .filter((s) => s.id && s.characterId);
}

function sanitizeStoryScenes(value: unknown): BackupData["storyScenes"] {
  if (!value || typeof value !== "object") return {};
  const out: BackupData["storyScenes"] = {};
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const scenes: BackupStoryScene[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const scene = item as Record<string, unknown>;
      if (typeof scene.id !== "string" || typeof scene.title !== "string") continue;
      scenes.push({
        id: scene.id.slice(0, 120),
        title: scene.title.slice(0, 300),
        subtitle: typeof scene.subtitle === "string" ? scene.subtitle.slice(0, 300) : "",
        status: typeof scene.status === "string" ? scene.status.slice(0, 200) : "",
        weather: typeof scene.weather === "string" ? scene.weather.slice(0, 200) : "",
        background: typeof scene.background === "string" ? scene.background.slice(0, 3000) : "",
        backgroundFocalPoint:
          typeof scene.backgroundFocalPoint === "string" ? scene.backgroundFocalPoint.slice(0, 200) : "center",
        opening: typeof scene.opening === "string" ? scene.opening.slice(0, 20000) : "",
        theme: scene.theme && typeof scene.theme === "object" ? (scene.theme as Record<string, unknown>) : undefined,
      });
    }
    out[key] = scenes;
  }
  return out;
}

function sanitizeRelationships(value: unknown): BackupRelationshipState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: BackupRelationshipState = {};
  for (const [key, unknownRecord] of Object.entries(value as Record<string, unknown>)) {
    if (typeof unknownRecord !== "object" || unknownRecord === null || Array.isArray(unknownRecord)) continue;
    const record = unknownRecord as Record<string, unknown>;
    const events: BackupRelationshipEvent[] = [];
    if (Array.isArray(record.events)) {
      for (const raw of record.events) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const event = raw as Record<string, unknown>;
        if (
          typeof event.turnId === "string"
          && typeof event.delta === "number"
          && Number.isFinite(event.delta)
          && typeof event.reason === "string"
          && typeof event.createdAt === "number"
          && Number.isFinite(event.createdAt)
        ) {
          events.push({
            id: typeof event.id === "string" ? event.id : nextBackupEventId(),
            characterId: typeof event.characterId === "string" ? event.characterId : "",
            personaId: typeof event.personaId === "string" ? event.personaId : "",
            turnId: event.turnId,
            delta: Math.round(event.delta),
            reason: event.reason.slice(0, 500),
            createdAt: Math.round(event.createdAt),
          });
        }
      }
    }
    out[key] = {
      characterId: typeof record.characterId === "string" ? record.characterId : "",
      personaId: typeof record.personaId === "string" ? record.personaId : "",
      score: typeof record.score === "number" && Number.isFinite(record.score)
        ? Math.round(record.score)
        : events.reduce((total, event) => total + event.delta, 0),
      updatedAt: typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt) ? record.updatedAt : 0,
      events,
    };
  }
  return out;
}

function nextBackupEventId(): string {
  return `rel-backup-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeMemoryCards(value: unknown): Record<string, BackupMemoryCard> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, BackupMemoryCard> = {};
  for (const [personaId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const card = raw as Record<string, unknown>;
    const relationships: Record<string, { score: number; updatedAt: number }> = {};
    if (card.relationships && typeof card.relationships === "object" && !Array.isArray(card.relationships)) {
      for (const [charId, rel] of Object.entries(card.relationships as Record<string, unknown>)) {
        if (!rel || typeof rel !== "object" || Array.isArray(rel)) continue;
        const r = rel as Record<string, unknown>;
        relationships[charId] = {
          score: typeof r.score === "number" && Number.isFinite(r.score) ? Math.round(r.score) : 0,
          updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
        };
      }
    }
    const stats: Record<string, Record<string, number>> = {};
    if (card.stats && typeof card.stats === "object" && !Array.isArray(card.stats)) {
      for (const [charId, charStats] of Object.entries(card.stats as Record<string, unknown>)) {
        if (!charStats || typeof charStats !== "object" || Array.isArray(charStats)) continue;
        const statMap: Record<string, number> = {};
        for (const [k, v] of Object.entries(charStats as Record<string, unknown>)) {
          if (typeof v === "number" && Number.isFinite(v)) statMap[k] = Math.round(v);
        }
        stats[charId] = statMap;
      }
    }
    const flags: Record<string, Record<string, boolean | string | number>> = {};
    if (card.flags && typeof card.flags === "object" && !Array.isArray(card.flags)) {
      for (const [charId, charFlags] of Object.entries(card.flags as Record<string, unknown>)) {
        if (!charFlags || typeof charFlags !== "object" || Array.isArray(charFlags)) continue;
        const flagMap: Record<string, boolean | string | number> = {};
        for (const [k, v] of Object.entries(charFlags as Record<string, unknown>)) {
          if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") flagMap[k] = v;
        }
        flags[charId] = flagMap;
      }
    }
    const milestones: Record<string, string[]> = {};
    if (card.milestones && typeof card.milestones === "object" && !Array.isArray(card.milestones)) {
      for (const [charId, ms] of Object.entries(card.milestones as Record<string, unknown>)) {
        if (!Array.isArray(ms)) continue;
        milestones[charId] = ms.filter((m): m is string => typeof m === "string").slice(0, 100);
      }
    }
    const memoryRefs: BackupMemoryCard["memoryRefs"] = Array.isArray(card.memoryRefs)
      ? card.memoryRefs.filter((m): m is BackupMemoryCard["memoryRefs"][number] => {
          if (!m || typeof m !== "object" || Array.isArray(m)) return false;
          const ref = m as Record<string, unknown>;
          return (
            typeof ref.id === "string" &&
            typeof ref.event === "string" &&
            typeof ref.importance === "number" &&
            typeof ref.timestamp === "number" &&
            Array.isArray(ref.participants) &&
            ref.participants.every((p: unknown) => typeof p === "string")
          );
        }).slice(0, 500)
      : [];
    out[personaId] = {
      id: typeof card.id === "string" ? card.id : `mc-${personaId}`,
      personaId: typeof card.personaId === "string" ? card.personaId : personaId,
      version: typeof card.version === "number" ? card.version : 0,
      relationships,
      stats,
      flags,
      milestones,
      memoryRefs,
      createdAt: typeof card.createdAt === "number" ? card.createdAt : 0,
      updatedAt: typeof card.updatedAt === "number" ? card.updatedAt : 0,
    };
  }
  return out;
}

function sanitizePreferences(value: unknown): BackupPreferences {
  if (!value || typeof value !== "object") return {};
  const p = value as Record<string, unknown>;
  const out: BackupPreferences = {};
  if (typeof p.storyProvider === "string") out.storyProvider = p.storyProvider;
  if (typeof p.creativity === "number") out.creativity = p.creativity;
  if (typeof p.replyLength === "string") out.replyLength = p.replyLength;
  if (typeof p.initiative === "string") out.initiative = p.initiative;
  if (typeof p.viewpoint === "string") out.viewpoint = p.viewpoint;
  if (typeof p.storyTense === "string") out.storyTense = p.storyTense;
  if (typeof p.selectedModel === "string") out.model = p.selectedModel;
  if (typeof p.localModel === "string") out.localModel = p.localModel;
  if (typeof p.deviceModel === "string") out.deviceModel = p.deviceModel;
  if (typeof p.shareCount === "number") out.shareCount = p.shareCount;
  if (typeof p.shareCaptions === "boolean") out.shareCaptions = p.shareCaptions;
  if (typeof p.shareHeader === "boolean") out.shareHeader = p.shareHeader;
  if (typeof p.entranceCodaLocked === "boolean") out.entranceCodaLocked = p.entranceCodaLocked;
  if (typeof p.showCharacterRail === "boolean") out.showCharacterRail = p.showCharacterRail;
  if (typeof p.showContextRail === "boolean") out.showContextRail = p.showContextRail;
  if (p.textStyle && typeof p.textStyle === "object") {
    const t = p.textStyle as Record<string, unknown>;
    if (typeof t.dialogue === "string" && typeof t.action === "string" && typeof t.narration === "string") {
      out.textStyle = {
        dialogue: t.dialogue,
        action: t.action,
        narration: t.narration,
        fontSize: typeof t.fontSize === "number" ? t.fontSize : 19,
      };
    }
  }
  return out;
}

// ---------- Parsing -----------------------------------------------------------

export type ParseBackupResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string };

export function serializeBackupPayload(payload: BackupPayload): string {
  return JSON.stringify(payload);
}

export function parsePortableBackup(json: string): ParseBackupResult {
  if (json.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: "This backup is too large to restore safely." };
  }
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "This is not readable JSON." };
  }
  const payload = validatePayload(data);
  if (!payload) {
    return { ok: false, error: "This file is not a Howling Whispers private-data backup." };
  }
  return { ok: true, payload };
}

export function validatePayload(value: unknown): BackupPayload | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (obj.format !== PORTABLE_BACKUP_FORMAT) return null;
  if (obj.version !== PORTABLE_BACKUP_VERSION) return null;
  const data = obj.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return null;

  const curatedState: BackupCuratedState[] = Array.isArray(data.curatedState)
    ? data.curatedState
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : "",
          bond: clampBond(item.bond),
          relationship: typeof item.relationship === "string" ? item.relationship : undefined,
          memories: clampStringList(item.memories),
        }))
        .filter((item) => item.id)
    : [];

  return {
    format: PORTABLE_BACKUP_FORMAT,
    version: PORTABLE_BACKUP_VERSION,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    appVersion: typeof obj.appVersion === "string" ? obj.appVersion : "",
    device: typeof obj.device === "string" ? obj.device : "",
    source: typeof obj.source === "string" ? obj.source : "",
    data: {
      player: {
        name: typeof data.player === "string" ? data.player : typeof (data.player as unknown) === "object" && typeof (data.player as Record<string, unknown>).name === "string" ? (data.player as Record<string, unknown>).name as string : "",
      },
      personas: sanitizePersonas(data.personas),
      activePersonaId: typeof data.activePersonaId === "string" ? data.activePersonaId : null,
      characters: sanitizeCharacters(data.characters),
      curatedState,
      messages: sanitizeMessages(data.messages),
      sessions: sanitizeSessions(data.sessions),
      currentSessionId: typeof data.currentSessionId === "string" ? data.currentSessionId : null,
      storyScenes: sanitizeStoryScenes(data.storyScenes),
       preferences: sanitizePreferences(data.preferences),
      relationships: sanitizeRelationships(data.relationships),
      memoryCards: sanitizeMemoryCards(data.memoryCards),
    },
  };
}

function sanitizeCharacters(value: unknown): BackupUserCharacter[] {
  if (!Array.isArray(value)) return [];
  const out: BackupUserCharacter[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.name !== "string") continue;
    if (isCuratedCharacterId(c.id)) continue;
    out.push({
      id: c.id.slice(0, 100),
      name: c.name.slice(0, 100),
      role: typeof c.role === "string" ? c.role.slice(0, 12000) : "",
      status: typeof c.status === "string" ? c.status.slice(0, 12000) : "",
      image: typeof c.image === "string" ? c.image.slice(0, 3000) : "",
      sceneImage: typeof c.sceneImage === "string" ? c.sceneImage.slice(0, 3000) : "",
      scene: typeof c.scene === "string" ? c.scene.slice(0, 1000) : "",
      weather: typeof c.weather === "string" ? c.weather.slice(0, 1000) : "",
      bond: clampBond(c.bond),
      memories: clampStringList(c.memories),
      reply: typeof c.reply === "string" ? c.reply.slice(0, 20000) : "",
      profile: typeof c.profile === "string" ? c.profile.slice(0, 24000) : "",
      accent: typeof c.accent === "string" ? c.accent.slice(0, 100) : "",
      credit: typeof c.credit === "string" ? c.credit.slice(0, 300) : undefined,
      creditUrl: typeof c.creditUrl === "string" ? c.creditUrl.slice(0, 1000) : undefined,
      relationship: typeof c.relationship === "string" ? c.relationship.slice(0, 1000) : undefined,
      portraitFocalPoint:
        typeof c.portraitFocalPoint === "string" ? c.portraitFocalPoint.slice(0, 200) : undefined,
      backgroundFocalPoint:
        typeof c.backgroundFocalPoint === "string" ? c.backgroundFocalPoint.slice(0, 200) : undefined,
      ageCategory:
        c.ageCategory === "adult" || c.ageCategory === "minor" || c.ageCategory === "unknown"
          ? c.ageCategory
          : undefined,
      isMinor: typeof c.isMinor === "boolean" ? c.isMinor : undefined,
      allowedRelationshipTypes: Array.isArray(c.allowedRelationshipTypes)
        ? c.allowedRelationshipTypes.filter((t): t is string => typeof t === "string").slice(0, 30)
        : undefined,
      disallowedContent: Array.isArray(c.disallowedContent)
        ? c.disallowedContent.filter((t): t is string => typeof t === "string").slice(0, 30)
        : undefined,
      pronouns: typeof c.pronouns === "string" ? c.pronouns.slice(0, 60) : undefined,
    });
  }
  return out;
}