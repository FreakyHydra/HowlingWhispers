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

  select(conversation: Message[], playerMessage: Message[]): LivingCastEntry[] {
    if (conversation.length === 0) return [];

    const lastFew = conversation.slice(-10);
    const candidates = new Set<LivingCastEntry>();

    // Heuristic 2: direct name mentions in recent messages
    for (const message of lastFew) {
      const text = message.text ?? "";
      for (const entry of this.entries) {
        if (entry.origin === "player") continue;
        if (textMentionsName(text, entry.name)) {
          candidates.add(entry);
        }
      }
    }

    // Heuristic 3: unanswered direct questions to specific cast members
    for (const message of playerMessage) {
      const text = message.text ?? "";
      const hasQuestion =
        /[?？]/.test(text) ||
        /\b(?:ask|question|tell|what|why|how|who|when|where|do|does|did|is|are|can|could|would|will|should)\b/i.test(text);

      if (!hasQuestion) continue;

      for (const entry of this.entries) {
        if (entry.origin === "player") continue;
        const mentionsName = textMentionsName(text, entry.name);
        const askPattern = new RegExp(`\\bask\\s+${escapeRegex(entry.name)}\\b`, "i").test(text);
        if (mentionsName || askPattern) {
          candidates.add(entry);
        }
      }
    }

    // Heuristic 4: last speaker was a cast member and scene is still active
    const lastCharacterMessage = [...conversation].reverse().find(
      (msg) => msg.sender === "character" && msg.speaker,
    );
    if (lastCharacterMessage?.speaker) {
      for (const entry of this.entries) {
        if (entry.origin === "player") continue;
        if (matchesName(entry.name, lastCharacterMessage.speaker!) && entry.presence === "active") {
          candidates.add(entry);
        }
      }
    }

    // Final filter: active non-player characters only
    const result = [...candidates].filter(
      (entry) => entry.presence === "active" && entry.origin !== "player",
    );

    return result;
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
