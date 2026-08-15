import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MEMORY_CARD_VERSION,
  createMemoryCard,
  isPlausibleMemoryCard,
  loadMemoryCards,
  saveMemoryCards,
  getMemoryCard,
  getOrCreateMemoryCard,
  ensureMemoryCard,
  updateMemoryCardTimestamp,
  touchMemoryCard,
  removeMemoryCard,
  syncMemoryCardRelationships,
} from "../lib/memory-card/index.ts";

import {
  relationshipKey,
  getRecord,
  getOrCreateRecord,
  effectiveScore,
  commitEvent,
  removeEventsForTurns,
  scoreFromEvents,
  migrateBondToScore,
} from "../lib/relationships/index.ts";

import {
  buildBackupPayload,
  parsePortableBackup,
  serializeBackupPayload,
} from "../lib/backup/format.ts";

// --- localStorage mock ---

function createLocalStorageMock() {
  const store = new Map();
  const api = {
    getItem: (key) => (store.has(key) ? String(store.get(key)) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  return { api, store };
}

function withLocalStorage(fn) {
  const original = globalThis.localStorage;
  const { api, store } = createLocalStorageMock();
  globalThis.localStorage = api;
  try {
    fn(store);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
}

// --- 1. createMemoryCard produces a valid card ---

describe("createMemoryCard", () => {
  it("produces a valid card with correct fields", () => {
    const personaId = "persona-alpha";
    const card = createMemoryCard(personaId);
    assert.equal(card.id, `mc-${personaId}`);
    assert.equal(card.personaId, personaId);
    assert.equal(card.version, MEMORY_CARD_VERSION);
    assert.deepEqual(card.relationships, {});
    assert.deepEqual(card.stats, {});
    assert.deepEqual(card.flags, {});
    assert.deepEqual(card.milestones, {});
    assert.deepEqual(card.memoryRefs, []);
    assert.ok(typeof card.createdAt === "number" && card.createdAt > 0);
    assert.ok(typeof card.updatedAt === "number" && card.updatedAt > 0);
    assert.ok(card.createdAt <= card.updatedAt);
  });
});

// --- 2. isPlausibleMemoryCard validates shape ---

describe("isPlausibleMemoryCard", () => {
  it("returns true for a valid card", () => {
    const card = createMemoryCard("p1");
    assert.equal(isPlausibleMemoryCard(card), true);
  });

  it("returns false for null", () => {
    assert.equal(isPlausibleMemoryCard(null), false);
  });

  it("returns false for non-object primitives", () => {
    assert.equal(isPlausibleMemoryCard("string"), false);
    assert.equal(isPlausibleMemoryCard(42), false);
    assert.equal(isPlausibleMemoryCard(true), false);
  });

  it("returns false for arrays", () => {
    assert.equal(isPlausibleMemoryCard([]), false);
    assert.equal(isPlausibleMemoryCard([{}]), false);
  });

  it("returns false when required fields are missing", () => {
    assert.equal(isPlausibleMemoryCard({}), false);
    assert.equal(isPlausibleMemoryCard({ id: "x" }), false);
    assert.equal(isPlausibleMemoryCard({ id: "x", personaId: "p", version: 1 }), false);
    assert.equal(isPlausibleMemoryCard({ id: "x", personaId: "p", version: 1, createdAt: 1 }), false);
    assert.equal(isPlausibleMemoryCard({ id: "x", personaId: "p", version: 1, createdAt: 1, updatedAt: 1 }), true);
  });
});

// --- 3. loadMemoryCards / saveMemoryCards round-trip ---

describe("loadMemoryCards / saveMemoryCards", () => {
  it("round-trips two cards with rounded numbers", () => {
    withLocalStorage((store) => {
      const cardA = createMemoryCard("persona-a");
      const cardB = createMemoryCard("persona-b");
      cardA.relationships["coda"] = { score: 1234.7, updatedAt: 1000 };
      cardB.stats["heather"] = { loyalty: 56.9 };
      cardB.flags["peony"] = { secret: true, count: 7 };
      saveMemoryCards({ "persona-a": cardA, "persona-b": cardB });
      const loaded = loadMemoryCards();
      assert.equal(Object.keys(loaded).length, 2);
      assert.equal(loaded["persona-a"].personaId, "persona-a");
      assert.equal(loaded["persona-a"].relationships["coda"].score, 1235);
      assert.equal(loaded["persona-b"].stats["heather"].loyalty, 57);
      assert.equal(loaded["persona-b"].flags["peony"].secret, true);
      assert.equal(loaded["persona-b"].flags["peony"].count, 7);
    });
  });

  it("returns {} when localStorage is empty", () => {
    withLocalStorage(() => {
      assert.deepEqual(loadMemoryCards(), {});
    });
  });
});

// --- 4. getMemoryCard returns existing or undefined ---

describe("getMemoryCard", () => {
  it("returns card when personaId exists", () => {
    const store = { "p1": createMemoryCard("p1") };
    assert.equal(getMemoryCard(store, "p1").personaId, "p1");
  });

  it("returns undefined when missing", () => {
    assert.equal(getMemoryCard({}, "missing"), undefined);
  });
});

// --- 5. getOrCreateMemoryCard creates when missing ---

describe("getOrCreateMemoryCard", () => {
  it("returns existing card if present", () => {
    const store = { "p1": createMemoryCard("p1") };
    const result = getOrCreateMemoryCard(store, "p1");
    assert.equal(result.personaId, "p1");
    assert.equal(result, store["p1"]);
  });

  it("creates and returns new card if missing", () => {
    const result = getOrCreateMemoryCard({}, "p2");
    assert.equal(result.personaId, "p2");
    assert.equal(result.id, `mc-p2`);
  });
});

// --- 6. ensureMemoryCard is idempotent ---

describe("ensureMemoryCard", () => {
  it("does not mutate store when card exists", () => {
    const existing = createMemoryCard("p1");
    const store = { "p1": existing };
    const next = ensureMemoryCard(store, "p1");
    assert.equal(next["p1"], existing);
  });

  it("adds new card when missing", () => {
    const next = ensureMemoryCard({}, "p1");
    assert.equal(next["p1"].personaId, "p1");
    assert.equal(next["p1"].id, `mc-p1`);
  });
});

// --- 7. updateMemoryCardTimestamp updates only updatedAt ---

describe("updateMemoryCardTimestamp", () => {
  it("preserves all other fields and updates updatedAt", () => {
    const card = createMemoryCard("p1");
    card.relationships["coda"] = { score: 500, updatedAt: 123 };
    const before = { ...card };
    const updated = updateMemoryCardTimestamp(card);
    assert.equal(updated.id, before.id);
    assert.equal(updated.personaId, before.personaId);
    assert.equal(updated.version, before.version);
    assert.equal(updated.createdAt, before.createdAt);
    assert.deepEqual(updated.relationships, before.relationships);
    assert.ok(updated.updatedAt >= before.updatedAt);
  });
});

// --- 8. touchMemoryCard creates or timestamps ---

describe("touchMemoryCard", () => {
  it("creates new card if missing", () => {
    const next = touchMemoryCard({}, "p1");
    assert.equal(next["p1"].personaId, "p1");
  });

  it("updates timestamp if exists", () => {
    const card = createMemoryCard("p1");
    const store = { "p1": card };
    const next = touchMemoryCard(store, "p1");
    assert.equal(next["p1"].updatedAt, card.updatedAt);
  });
});

// --- 9. removeMemoryCard removes entry ---

describe("removeMemoryCard", () => {
  it("returns store without the personaId", () => {
    const store = { "p1": createMemoryCard("p1"), "p2": createMemoryCard("p2") };
    const next = removeMemoryCard(store, "p1");
    assert.equal(next["p1"], undefined);
    assert.ok(next["p2"]);
  });

  it("does not mutate other entries", () => {
    const p2 = createMemoryCard("p2");
    const store = { "p1": createMemoryCard("p1"), "p2": p2 };
    const next = removeMemoryCard(store, "p1");
    assert.equal(next["p2"], p2);
  });
});

// --- 10. syncMemoryCardRelationships merges scores ---

describe("syncMemoryCardRelationships", () => {
  it("adds new relationship entry", () => {
    const store = { "p1": createMemoryCard("p1") };
    const next = syncMemoryCardRelationships(store, "p1", { coda: 800 });
    assert.equal(next["p1"].relationships["coda"].score, 800);
  });

  it("updates existing relationship entry without clearing others", () => {
    const card = createMemoryCard("p1");
    card.relationships["coda"] = { score: 100, updatedAt: 1 };
    const store = { "p1": card };
    const next = syncMemoryCardRelationships(store, "p1", { coda: 200, heather: 50 });
    assert.equal(next["p1"].relationships["coda"].score, 200);
    assert.equal(next["p1"].relationships["heather"].score, 50);
  });

  it("does nothing when persona has no card", () => {
    const store = {};
    const next = syncMemoryCardRelationships(store, "missing", { coda: 100 });
    assert.equal(next, store);
  });
});

// --- 11. Persona ownership: one card per persona ---

describe("Persona ownership", () => {
  it("ensures distinct cards for distinct personas", () => {
    const store = {};
    const nextA = ensureMemoryCard(store, "persona-a");
    const nextB = ensureMemoryCard(nextA, "persona-b");
    assert.notEqual(nextA["persona-a"], nextB["persona-b"]);
    assert.equal(nextA["persona-a"].personaId, "persona-a");
    assert.equal(nextB["persona-b"].personaId, "persona-b");
  });
});

// --- 12. Duplicate persona gets new empty card ---

describe("Duplicate persona isolation", () => {
  it("clone persona gets empty card without affecting original", () => {
    const cardA = createMemoryCard("persona-a");
    cardA.relationships["coda"] = { score: 500, updatedAt: 1 };
    const storeA = { "persona-a": cardA };

    const cardB = getOrCreateMemoryCard(storeA, "persona-b");
    const storeB = ensureMemoryCard(storeA, "persona-b");

    assert.deepEqual(storeB["persona-b"].relationships, {});
    assert.deepEqual(storeA["persona-a"].relationships, { coda: { score: 500, updatedAt: 1 } });
  });
});

// --- 13. Memory Card cannot be reassigned ---

describe("Memory Card personaId immutability", () => {
  it("persona B gets a new card, not persona A's card", () => {
    const cardA = createMemoryCard("persona-a");
    const store = { "persona-a": cardA };
    const cardForB = getOrCreateMemoryCard(store, "persona-b");
    assert.equal(cardForB.personaId, "persona-b");
    assert.equal(store["persona-a"].personaId, "persona-a");
    assert.equal(store["persona-b"], undefined);
  });
});

// --- 14. Default persona gets stable card ---

describe("Default persona stable card", () => {
  it("ensure card for default persona persists across loads", () => {
    withLocalStorage((lsStore) => {
      const store1 = ensureMemoryCard({}, "default");
      saveMemoryCards(store1);
      const loaded = loadMemoryCards();
      const store2 = ensureMemoryCard(loaded, "default");
      assert.equal(store2["default"].id, store1["default"].id);
      assert.equal(store2["default"].personaId, "default");
    });
  });
});

// --- 15. Migration is idempotent ---

describe("Migration idempotency", () => {
  it("running ensureMemoryCard twice yields one card", () => {
    let store = {};
    store = ensureMemoryCard(store, "p1");
    store = ensureMemoryCard(store, "p1");
    assert.equal(Object.keys(store).length, 1);
    assert.equal(store["p1"].personaId, "p1");
  });
});

// --- 16. Backup includes Memory Card ---

describe("Backup includes Memory Card", () => {
  it("builds and parses backup with memoryCards present", () => {
    const card = createMemoryCard("persona-1");
    card.relationships["coda"] = { score: 250, updatedAt: 50 };
    card.memoryRefs.push({
      id: "ref-1",
      participants: ["coda"],
      event: "First meeting",
      importance: 8,
      timestamp: 100,
    });

    const payload = buildBackupPayload(
      {
        characters: [],
        messages: {},
        sessions: [],
        currentSessionId: null,
        storyScenes: {},
        personas: [{ id: "persona-1", name: "P1", description: "", createdAt: 1, updatedAt: 2 }],
        activePersonaId: "persona-1",
        playerName: "Test",
        preferences: {},
        relationships: {},
        memoryCards: { "persona-1": card },
      },
      { appVersion: "0.1.0", device: "test", source: "unit" },
    );

    const serialized = serializeBackupPayload(payload);
    const parsed = parsePortableBackup(serialized);
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    const mc = parsed.payload.data.memoryCards?.["persona-1"];
    assert.ok(mc, "memoryCard present in backup");
    assert.equal(mc.personaId, "persona-1");
    assert.equal(mc.relationships["coda"].score, 250);
    assert.equal(mc.memoryRefs.length, 1);
    assert.equal(mc.memoryRefs[0].id, "ref-1");
  });
});

// --- 17. Restore preserves ownership ---

describe("Restore preserves ownership", () => {
  it("restores memoryCards with correct personaIds for multiple personas", () => {
    const cards = {
      "persona-a": createMemoryCard("persona-a"),
      "persona-b": createMemoryCard("persona-b"),
    };
    cards["persona-a"].relationships["coda"] = { score: 10, updatedAt: 1 };

    const payload = buildBackupPayload(
      {
        characters: [],
        messages: {},
        sessions: [],
        currentSessionId: null,
        storyScenes: {},
        personas: [
          { id: "persona-a", name: "A", description: "", createdAt: 1, updatedAt: 2 },
          { id: "persona-b", name: "B", description: "", createdAt: 1, updatedAt: 2 },
        ],
        activePersonaId: "persona-a",
        playerName: "Test",
        preferences: {},
        relationships: {},
        memoryCards: cards,
      },
      { appVersion: "0.1.0", device: "test", source: "unit" },
    );

    const parsed = parsePortableBackup(serializeBackupPayload(payload));
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    const mcs = parsed.payload.data.memoryCards;
    assert.equal(mcs["persona-a"].personaId, "persona-a");
    assert.equal(mcs["persona-b"].personaId, "persona-b");
    assert.equal(mcs["persona-a"].relationships["coda"].score, 10);
    assert.deepEqual(mcs["persona-b"].relationships, {});
  });
});

// --- 18. Relationship events survive backup ---

describe("Relationship events survive backup", () => {
  it("preserves relationship events through backup round-trip", () => {
    const relationships = {
      "coda::persona-1": {
        characterId: "coda",
        personaId: "persona-1",
        score: 42,
        updatedAt: 99,
        events: [
          { id: "ev-1", turnId: "char-3", delta: 42, reason: "shared a secret", createdAt: 88 },
        ],
      },
    };

    const payload = buildBackupPayload(
      {
        characters: [],
        messages: {},
        sessions: [],
        currentSessionId: null,
        storyScenes: {},
        personas: [{ id: "persona-1", name: "P1", description: "", createdAt: 1, updatedAt: 2 }],
        activePersonaId: "persona-1",
        playerName: "Test",
        preferences: {},
        relationships,
      },
      { appVersion: "0.1.0", device: "test", source: "unit" },
    );

    const parsed = parsePortableBackup(serializeBackupPayload(payload));
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    const rel = parsed.payload.data.relationships?.["coda::persona-1"];
    assert.ok(rel, "relationship record restored");
    assert.equal(rel.score, 42);
    assert.equal(rel.personaId, "persona-1");
    assert.equal(rel.events.length, 1);
    assert.equal(rel.events[0].turnId, "char-3");
    assert.equal(rel.events[0].delta, 42);
    assert.equal(rel.events[0].reason, "shared a secret");
  });
});

// --- 19. Reroll still replaces relationship event ---

describe("Reroll replaces relationship event", () => {
  it("committing same turnId replaces event without stacking", () => {
    const state = {};
    commitEvent(state, {
      characterId: "coda",
      personaId: "default",
      turnId: "c:1",
      delta: 10,
      reason: "first",
      createdAt: 1,
    });
    assert.equal(state["coda::default"].events.length, 1);

    commitEvent(state, {
      characterId: "coda",
      personaId: "default",
      turnId: "c:1",
      delta: -5,
      reason: "rerolled",
      createdAt: 2,
    });
    assert.equal(state["coda::default"].events.length, 1);
    assert.equal(state["coda::default"].events[0].delta, -5);
    assert.equal(state["coda::default"].score, -5);
  });
});

// --- 20. Delete/rewind rolls relationship state back correctly ---

describe("Delete/rewind rolls relationship state back", () => {
  it("removing events recomputes score from remaining events", () => {
    const state = {};
    commitEvent(state, { characterId: "coda", personaId: "default", turnId: "char-1", delta: 14, reason: "a", createdAt: 1 });
    commitEvent(state, { characterId: "coda", personaId: "default", turnId: "char-2", delta: 9, reason: "b", createdAt: 2 });
    assert.equal(state["coda::default"].score, 23);

    removeEventsForTurns(state, "coda", "default", ["char-1"]);
    assert.equal(state["coda::default"].events.length, 1);
    assert.equal(state["coda::default"].events[0].turnId, "char-2");
    assert.equal(state["coda::default"].score, 9);
  });
});

// --- 21. Character Hub uses real relationship state ---

describe("Character Hub uses real relationship state", () => {
  it("lookup via relationshipKey returns record from state, not bond", () => {
    const state = {};
    const key = relationshipKey("coda", "persona-1");
    getOrCreateRecord(state, "coda", "persona-1", 50);
    const record = getRecord(state, "coda", "persona-1");
    assert.ok(record, "record exists in state");
    assert.equal(record.score, migrateBondToScore(50));
    assert.equal(effectiveScore(state, "coda", "persona-1"), record.score);
  });
});

// --- 22. Character.bond is not used as authoritative live state ---

describe("Character.bond fallback only", () => {
  it("when a relationship record exists, its score is used; bond is fallback only", () => {
    const state = {};
    const key = relationshipKey("coda", "default");
    const record = getOrCreateRecord(state, "coda", "default", 80);
    assert.equal(record.score, migrateBondToScore(80));
    assert.equal(effectiveScore(state, "coda", "default"), record.score);

    // Even if bond were different, record score wins.
    const bondFallback = migrateBondToScore(0);
    assert.notEqual(effectiveScore(state, "coda", "default"), bondFallback);
  });
});
