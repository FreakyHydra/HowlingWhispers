import type { MemoryCard } from "./schema.ts";
import { createMemoryCard } from "./schema.ts";
import { loadMemoryCards, saveMemoryCards } from "./storage.ts";

export type MemoryCardStore = Record<string, MemoryCard>;

export function getMemoryCard(store: MemoryCardStore, personaId: string): MemoryCard | undefined {
  return store[personaId];
}

export function getOrCreateMemoryCard(store: MemoryCardStore, personaId: string): MemoryCard {
  const existing = store[personaId];
  if (existing) return existing;
  const created = createMemoryCard(personaId);
  return created;
}

export function ensureMemoryCard(store: MemoryCardStore, personaId: string): MemoryCardStore {
  if (store[personaId]) return store;
  return { ...store, [personaId]: createMemoryCard(personaId) };
}

export function updateMemoryCardTimestamp(card: MemoryCard): MemoryCard {
  return { ...card, updatedAt: Date.now() };
}

export function touchMemoryCard(store: MemoryCardStore, personaId: string): MemoryCardStore {
  const card = store[personaId];
  if (!card) return ensureMemoryCard(store, personaId);
  return { ...store, [personaId]: updateMemoryCardTimestamp(card) };
}

export function removeMemoryCard(store: MemoryCardStore, personaId: string): MemoryCardStore {
  const next = { ...store };
  delete next[personaId];
  return next;
}

export function syncMemoryCardRelationships(
  store: MemoryCardStore,
  personaId: string,
  scores: Record<string, number>,
): MemoryCardStore {
  const card = store[personaId];
  if (!card) return store;
  const now = Date.now();
  const relationships = { ...card.relationships };
  for (const [charId, score] of Object.entries(scores)) {
    relationships[charId] = { score, updatedAt: now };
  }
  return { ...store, [personaId]: { ...card, relationships, updatedAt: now } };
}
