import type { MemoryCard } from "./schema.ts";

const MEMORY_CARDS_KEY = "dreambound_memory_cards";

function readRaw(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

export function loadMemoryCards(): Record<string, MemoryCard> {
  const raw = readRaw(MEMORY_CARDS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const cards: Record<string, MemoryCard> = {};
    for (const [personaId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      const relationships: Record<string, { score: number; updatedAt: number }> = {};
      if (record.relationships && typeof record.relationships === "object" && !Array.isArray(record.relationships)) {
        for (const [charId, rel] of Object.entries(record.relationships as Record<string, unknown>)) {
          if (!rel || typeof rel !== "object" || Array.isArray(rel)) continue;
          const r = rel as Record<string, unknown>;
          relationships[charId] = {
            score: typeof r.score === "number" && Number.isFinite(r.score) ? Math.round(r.score) : 0,
            updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
          };
        }
      }
      const stats: Record<string, Record<string, number>> = {};
      if (record.stats && typeof record.stats === "object" && !Array.isArray(record.stats)) {
        for (const [charId, charStats] of Object.entries(record.stats as Record<string, unknown>)) {
          if (!charStats || typeof charStats !== "object" || Array.isArray(charStats)) continue;
          const statMap: Record<string, number> = {};
          for (const [k, v] of Object.entries(charStats as Record<string, unknown>)) {
            if (typeof v === "number" && Number.isFinite(v)) statMap[k] = Math.round(v);
          }
          stats[charId] = statMap;
        }
      }
      const flags: Record<string, Record<string, boolean | string | number>> = {};
      if (record.flags && typeof record.flags === "object" && !Array.isArray(record.flags)) {
        for (const [charId, charFlags] of Object.entries(record.flags as Record<string, unknown>)) {
          if (!charFlags || typeof charFlags !== "object" || Array.isArray(charFlags)) continue;
          const flagMap: Record<string, boolean | string | number> = {};
          for (const [k, v] of Object.entries(charFlags as Record<string, unknown>)) {
            if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") flagMap[k] = v;
          }
          flags[charId] = flagMap;
        }
      }
      const milestones: Record<string, string[]> = {};
      if (record.milestones && typeof record.milestones === "object" && !Array.isArray(record.milestones)) {
        for (const [charId, ms] of Object.entries(record.milestones as Record<string, unknown>)) {
          if (!Array.isArray(ms)) continue;
          milestones[charId] = ms.filter((m): m is string => typeof m === "string").slice(0, 100);
        }
      }
      const memoryRefs: MemoryCard["memoryRefs"] = Array.isArray(record.memoryRefs)
        ? record.memoryRefs.filter((m): m is MemoryCardMemoryRef => {
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

      cards[personaId] = {
        id: typeof record.id === "string" ? record.id : `mc-${personaId}`,
        personaId: typeof record.personaId === "string" ? record.personaId : personaId,
        version: typeof record.version === "number" ? record.version : 0,
        relationships,
        stats,
        flags,
        milestones,
        memoryRefs,
        createdAt: typeof record.createdAt === "number" ? record.createdAt : 0,
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
      };
    }
    return cards;
  } catch {
    return {};
  }
}

export function saveMemoryCards(cards: Record<string, MemoryCard>) {
  writeRaw(MEMORY_CARDS_KEY, JSON.stringify(cards));
}
