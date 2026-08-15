export type {
  MemoryCard,
  MemoryCardRelationshipEntry,
  MemoryCardRelationships,
  MemoryCardStats,
  MemoryCardFlags,
  MemoryCardMilestones,
  MemoryCardMemoryRef,
  MemoryCardMemoryRefs,
} from "./schema.ts";

export {
  MEMORY_CARD_VERSION,
  createMemoryCard,
  isPlausibleMemoryCard,
} from "./schema.ts";

export type { MemoryCardStore } from "./core.ts";

export {
  getMemoryCard,
  getOrCreateMemoryCard,
  ensureMemoryCard,
  updateMemoryCardTimestamp,
  touchMemoryCard,
  removeMemoryCard,
  syncMemoryCardRelationships,
} from "./core.ts";

export { loadMemoryCards, saveMemoryCards } from "./storage.ts";
