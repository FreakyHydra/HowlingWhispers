import assert from "node:assert/strict";
import test from "node:test";

import {
  inviteCharacter,
  removeInvitedCharacter,
  resetCast,
  isInvitedCharacter,
} from "../lib/living-cast/invitation.ts";

import {
  RoundRobinSelector,
  SmartSelector,
  createParticipantSelector,
} from "../lib/living-cast/participant-selector.ts";

import {
  readLivingCastConfig,
  writeLivingCastConfig,
} from "../lib/living-cast/config.ts";

const LEGACY_AUTO_NPC_KEY = "dreambound_autoNpcReplies";
const LIVING_CAST_CONFIG_KEY = "dreambound_livingCastConfig";

function entry(overrides = {}) {
  return {
    id: "char-1",
    name: "Test Character",
    origin: "invited",
    presence: "active",
    primary: false,
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
    ...overrides,
  };
}

function primaryEntry() {
  return {
    id: "primary-id",
    name: "Primary Character",
    origin: "permanent",
    presence: "active",
    primary: true,
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  };
}

function playerEntry(name = "Player") {
  return {
    id: "player-id",
    name,
    origin: "player",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  };
}

function roundRobinEntries() {
  return [
    { ...entry({ id: "c1", name: "Coda", origin: "invited" }) },
    { ...entry({ id: "c2", name: "Heather", origin: "invited" }) },
    { ...entry({ id: "c3", name: "Peony", origin: "invited" }) },
    playerEntry("Alex"),
  ];
}

// --- invitation.ts ---

test("inviteCharacter adds a new invited character to an empty cast", () => {
  const cast = inviteCharacter([], "melody", "Melody");
  assert.equal(cast.length, 1);
  assert.equal(cast[0].id, "melody");
  assert.equal(cast[0].name, "Melody");
  assert.equal(cast[0].origin, "invited");
  assert.equal(cast[0].primary, false);
});

test("inviteCharacter is idempotent (same character twice does not duplicate)", () => {
  const first = inviteCharacter([], "melody", "Melody");
  const second = inviteCharacter(first, "melody", "Melody");
  assert.equal(second.length, 1);
  assert.ok(second[0].updatedAt >= first[0].updatedAt);
});

test("inviteCharacter respects max cast size (10 total)", () => {
  const base = Array.from({ length: 9 }, (_, i) => entry({ id: `c${i}`, name: `Char ${i}` }));
  const result = inviteCharacter(base, "overflow", "Overflow");
  assert.equal(result.length, 10);
  assert.ok(result.some((e) => e.id === "overflow"));
});

test("removeInvitedCharacter removes an invited character", () => {
  const cast = [primaryEntry(), playerEntry(), entry({ id: "invited-id", name: "Invited" })];
  const result = removeInvitedCharacter(cast, "invited-id");
  assert.equal(result.length, 2);
  assert.ok(!result.some((e) => e.id === "invited-id"));
});

test("removeInvitedCharacter does not remove the primary character", () => {
  const cast = [primaryEntry(), playerEntry(), entry({ id: "invited-id" })];
  const result = removeInvitedCharacter(cast, "primary-id");
  assert.ok(result.some((e) => e.id === "primary-id" && e.primary));
});

test("removeInvitedCharacter does not remove the player", () => {
  const cast = [primaryEntry(), playerEntry(), entry({ id: "invited-id" })];
  const result = removeInvitedCharacter(cast, "player-id");
  assert.ok(result.some((e) => e.origin === "player"));
});

test("resetCast returns a cast with only primary and optional player", () => {
  const result = resetCast({ id: "p1", name: "Primary" }, "Alex");
  assert.equal(result.length, 2);
  assert.ok(result.some((e) => e.primary && e.origin === "permanent"));
  assert.ok(result.some((e) => e.origin === "player"));
});

test("isInvitedCharacter returns true for invited characters", () => {
  const cast = [primaryEntry(), playerEntry(), entry({ id: "inv1" })];
  assert.ok(isInvitedCharacter(cast, "inv1"));
});

test("isInvitedCharacter returns false for primary and player", () => {
  const cast = [primaryEntry(), playerEntry(), entry({ id: "inv1" })];
  assert.ok(!isInvitedCharacter(cast, "primary-id"));
  assert.ok(!isInvitedCharacter(cast, "player-id"));
});

// --- participant-selector.ts ---

test("RoundRobinSelector returns entries in stable order", () => {
  const selector = new RoundRobinSelector(roundRobinEntries());
  assert.equal(selector.next([]).id, "c1");
  assert.equal(selector.next([]).id, "c2");
  assert.equal(selector.next([]).id, "c3");
});

test("RoundRobinSelector wraps around after reaching the end", () => {
  const selector = new RoundRobinSelector(roundRobinEntries());
  selector.next([]);
  selector.next([]);
  selector.next([]);
  assert.equal(selector.next([]).id, "c1");
});

test("RoundRobinSelector skips the player entry", () => {
  const selector = new RoundRobinSelector(roundRobinEntries());
  assert.equal(selector.next([]).id, "c1");
  assert.notEqual(selector.next([]).id, "player-id");
});

test("RoundRobinSelector includes the primary character", () => {
  const entries = [primaryEntry(), entry({ id: "side" })];
  const selector = new RoundRobinSelector(entries);
  const seen = new Set();
  for (let i = 0; i < 4; i++) {
    const next = selector.next([]);
    if (next) seen.add(next.id);
  }
  assert.ok(seen.has("primary-id"));
});

test("SmartSelector returns empty array when conversation is empty", () => {
  const selector = new SmartSelector(roundRobinEntries(), "Primary Character");
  assert.deepEqual(selector.select([], []), []);
});

test("SmartSelector returns a character when directly addressed by name", () => {
  const selector = new SmartSelector(roundRobinEntries(), "Primary Character");
  const conversation = [
    { sender: "player", text: "Coda, what do you think?" },
  ];
  const result = selector.select(conversation, conversation);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "c1");
});

test("SmartSelector returns a character when asked a direct question", () => {
  const selector = new SmartSelector(roundRobinEntries(), "Primary Character");
  const conversation = [
    { sender: "player", text: "Ask Heather about the plan." },
  ];
  const result = selector.select(conversation, conversation);
  assert.ok(result.some((e) => e.id === "c2"));
});

test("SmartSelector allows a character to remain silent when no heuristics match", () => {
  const selector = new SmartSelector(roundRobinEntries(), "Primary Character");
  const conversation = [
    { sender: "player", text: "I look around the room." },
  ];
  assert.equal(selector.select(conversation, conversation).length, 0);
});

test("SmartSelector can return multiple participants when multiple heuristics match", () => {
  const selector = new SmartSelector(roundRobinEntries(), "Primary Character");
  const conversation = [
    { sender: "player", text: "Coda and Heather, what do you think?" },
  ];
  const result = selector.select(conversation, conversation);
  assert.ok(result.length >= 2);
  assert.ok(result.some((e) => e.id === "c1"));
  assert.ok(result.some((e) => e.id === "c2"));
});

test("createParticipantSelector returns a RoundRobinSelector for round-robin", () => {
  const selector = createParticipantSelector("round-robin", roundRobinEntries(), "Primary");
  assert.ok(selector instanceof RoundRobinSelector);
});

test("createParticipantSelector returns a SmartSelector for smart", () => {
  const selector = createParticipantSelector("smart", roundRobinEntries(), "Primary");
  assert.ok(selector instanceof SmartSelector);
});

// --- config.ts ---

test("readLivingCastConfig returns defaults when localStorage is empty", () => {
  globalThis.localStorage = new Proxy({}, {
    get(target, key) {
      if (key === "getItem") return () => null;
      return target[key];
    },
    set() {
      return true;
    },
  });
  const config = readLivingCastConfig();
  assert.deepEqual(config, { enabled: false, participationMode: "smart" });
});

test("writeLivingCastConfig persists to localStorage", () => {
  const record = {};
  globalThis.localStorage = new Proxy(record, {
    get(target, key) {
      if (key === "getItem") return (k) => target[k] ?? null;
      if (key === "setItem") return (k, v) => { target[k] = v; };
      if (key === "removeItem") return (k) => { delete target[k]; };
      return target[key];
    },
  });
  const config = { enabled: true, participationMode: "round-robin" };
  writeLivingCastConfig(config);
  assert.equal(record[LIVING_CAST_CONFIG_KEY], JSON.stringify(config));
});

test("readLivingCastConfig round-trips with writeLivingCastConfig", () => {
  const record = {};
  globalThis.localStorage = new Proxy(record, {
    get(target, key) {
      if (key === "getItem") return (k) => target[k] ?? null;
      if (key === "setItem") return (k, v) => { target[k] = v; };
      if (key === "removeItem") return (k) => { delete target[k]; };
      return target[key];
    },
  });
  const written = { enabled: true, participationMode: "round-robin" };
  writeLivingCastConfig(written);
  const read = readLivingCastConfig();
  assert.deepEqual(read, written);
});

// --- Migration ---

function simulateMigration() {
  const oldVal = globalThis.localStorage.getItem(LEGACY_AUTO_NPC_KEY);
  if (oldVal !== null) {
    const config = readLivingCastConfig();
    writeLivingCastConfig({ ...config, enabled: oldVal === "true" });
    globalThis.localStorage.removeItem(LEGACY_AUTO_NPC_KEY);
  }
  return readLivingCastConfig();
}

test("legacy autoNpcReplies=true migrates to livingCastConfig.enabled=true", () => {
  const record = { [LEGACY_AUTO_NPC_KEY]: "true" };
  globalThis.localStorage = new Proxy(record, {
    get(target, key) {
      if (key === "getItem") return (k) => target[k] ?? null;
      if (key === "setItem") return (k, v) => { target[k] = v; };
      if (key === "removeItem") return (k) => { delete target[k]; };
      return target[key];
    },
  });
  const config = simulateMigration();
  assert.equal(config.enabled, true);
  assert.ok(!(LEGACY_AUTO_NPC_KEY in record));
});

test("legacy autoNpcReplies=false migrates to livingCastConfig.enabled=false", () => {
  const record = { [LEGACY_AUTO_NPC_KEY]: "false" };
  globalThis.localStorage = new Proxy(record, {
    get(target, key) {
      if (key === "getItem") return (k) => target[k] ?? null;
      if (key === "setItem") return (k, v) => { target[k] = v; };
      if (key === "removeItem") return (k) => { delete target[k]; };
      return target[key];
    },
  });
  const config = simulateMigration();
  assert.equal(config.enabled, false);
  assert.ok(!(LEGACY_AUTO_NPC_KEY in record));
});

test("missing legacy key leaves defaults intact", () => {
  const record = {};
  globalThis.localStorage = new Proxy(record, {
    get(target, key) {
      if (key === "getItem") return (k) => target[k] ?? null;
      if (key === "setItem") return (k, v) => { target[k] = v; };
      if (key === "removeItem") return (k) => { delete target[k]; };
      return target[key];
    },
  });
  const config = simulateMigration();
  assert.deepEqual(config, { enabled: false, participationMode: "smart" });
});
