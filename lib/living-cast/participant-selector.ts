import type { LivingCastEntry } from "../generation/living-cast.ts";
import type { ParticipationMode } from "./config.ts";
import { matchesName } from "../generation/living-cast.ts";

export interface Message {
  sender: string;
  text: string;
  speaker?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textMentionsName(text: string, name: string): boolean {
  const lower = text.toLocaleLowerCase("en-US");
  const nameLower = name.toLocaleLowerCase("en-US");
  if (lower.includes(nameLower)) return true;
  const firstToken = nameLower.split(/\s+/)[0];
  if (firstToken.length >= 3 && new RegExp(`\\b${escapeRegex(firstToken)}\\b`, "i").test(lower)) {
    return true;
  }
  return false;
}

function isCollectiveAddress(text: string): boolean {
  return /\b(?:everyone|everybody|all of you|you all|you two|you three|both of you|the two of you|the three of you|guys|folks|crew)\b/i.test(text);
}

function activeNonPlayerEntries(entries: LivingCastEntry[]): LivingCastEntry[] {
  return entries.filter((entry) => entry.origin !== "player" && entry.presence === "active");
}

export class RoundRobinSelector {
  private cursor: { index: number };
  private entries: LivingCastEntry[];

  constructor(entries: LivingCastEntry[]) {
    this.entries = entries;
    this.cursor = { index: 0 };
  }

  next(_conversation: Message[]): LivingCastEntry | null {
    if (this.entries.length === 0) return null;

    const len = this.entries.length;
    const start = this.cursor.index;

    for (let offset = 0; offset < len; offset += 1) {
      const index = (start + offset) % len;
      const entry = this.entries[index];
      if (entry.origin !== "player" && entry.presence === "active") {
        this.cursor.index = (index + 1) % len;
        return entry;
      }
    }

    return null;
  }
}

export class SmartSelector {
  private entries: LivingCastEntry[];
  private primaryName: string;

  constructor(entries: LivingCastEntry[], primaryName: string) {
    this.entries = entries;
    this.primaryName = primaryName;
  }

  next(conversation: Message[]): LivingCastEntry | null {
    const playerMessages = conversation.filter((msg) => msg.sender === "player");
    const candidates = this.select(conversation, playerMessages);
    return candidates[0] ?? null;
  }

  select(conversation: Message[], playerMessages: Message[]): LivingCastEntry[] {
    if (conversation.length === 0) return [];

    const activeEntries = activeNonPlayerEntries(this.entries);
    if (activeEntries.length === 0) return [];

    const latestPlayerMessage = [...playerMessages].reverse().find((msg) => msg.sender === "player")
      ?? [...conversation].reverse().find((msg) => msg.sender === "player");

    // Direct player address is authoritative for this turn. If the player names
    // Riley, Riley gets the conversational focus while the rest of the cast stays
    // present but silent. Naming two or more characters focuses exactly those
    // characters. This prevents old mentions and the previous speaker from
    // dragging extra cast members into every reply.
    if (latestPlayerMessage) {
      const explicitMentions = activeEntries.filter((entry) =>
        textMentionsName(latestPlayerMessage.text ?? "", entry.name),
      );
      if (explicitMentions.length > 0) {
        return explicitMentions;
      }

      // Collective wording is the explicit opt-in for a group response.
      if (isCollectiveAddress(latestPlayerMessage.text ?? "")) {
        return activeEntries;
      }
    }

    const candidates = new Set<LivingCastEntry>();

    // If the newest player turn asks a direct question without naming anyone,
    // prefer the current conversational speaker rather than waking the full cast.
    if (latestPlayerMessage) {
      const text = latestPlayerMessage.text ?? "";
      const hasQuestion =
        /[?？]/.test(text) ||
        /\b(?:ask|question|tell|what|why|how|who|when|where|do|does|did|is|are|can|could|would|will|should)\b/i.test(text);

      if (hasQuestion) {
        const lastCharacterMessage = [...conversation].reverse().find(
          (msg) => msg.sender === "character" && msg.speaker,
        );
        if (lastCharacterMessage?.speaker) {
          const currentSpeaker = activeEntries.find((entry) =>
            matchesName(entry.name, lastCharacterMessage.speaker!),
          );
          if (currentSpeaker) candidates.add(currentSpeaker);
        }
      }
    }

    // Otherwise let the last active speaker keep the floor. This preserves a
    // natural one-on-one exchange while other cast members remain scene-aware.
    if (candidates.size === 0) {
      const lastCharacterMessage = [...conversation].reverse().find(
        (msg) => msg.sender === "character" && msg.speaker,
      );
      if (lastCharacterMessage?.speaker) {
        const currentSpeaker = activeEntries.find((entry) =>
          matchesName(entry.name, lastCharacterMessage.speaker!),
        );
        if (currentSpeaker) candidates.add(currentSpeaker);
      }
    }

    // If there has not been a cast speaker yet, use the configured primary only
    // when it is actually part of the active cast.
    if (candidates.size === 0 && this.primaryName.trim()) {
      const primary = activeEntries.find((entry) => matchesName(entry.name, this.primaryName));
      if (primary) candidates.add(primary);
    }

    return [...candidates];
  }
}

export function createParticipantSelector(
  mode: ParticipationMode,
  cast: LivingCastEntry[],
  primaryName: string,
): RoundRobinSelector | SmartSelector {
  switch (mode) {
    case "round-robin":
      return new RoundRobinSelector(cast);
    case "smart":
    default:
      return new SmartSelector(cast, primaryName);
  }
}
