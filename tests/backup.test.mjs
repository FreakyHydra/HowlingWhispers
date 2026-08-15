import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BACKUP_BYTES,
  PORTABLE_BACKUP_FORMAT,
  PORTABLE_BACKUP_VERSION,
  buildBackupPayload,
  isCuratedCharacterId,
  parsePortableBackup,
  serializeBackupPayload,
  validatePayload,
} from "../lib/backup/format.ts";

const CURATED_SECRET = "TOP-SECRET curated canon profile text";
const USER_SECRET = "My own character's hand-written profile.";

function sampleSource(overrides = {}) {
  return {
    characters: [
      {
        id: "coda",
        name: "Coda",
        role: "Beloved companion",
        status: "With you now",
        image: "/assets/Coda/coda-moonlit-study.png",
        sceneImage: "/assets/Coda/coda-moonlit-study.png",
        scene: "The Moonlit Study",
        weather: "Rain after midnight",
        bond: 78,
        memories: ["User added a memory about Coda"],
        reply: "curated opening line",
        profile: CURATED_SECRET,
        accent: "#45b8b3",
      },
      {
        id: "my-mira",
        name: "Mira",
        role: "Night harborer",
        status: "Ready to meet",
        image: "",
        sceneImage: "",
        scene: "An Imported Story",
        weather: "The world waits",
        bond: 42,
        memories: ["Met under a bridge"],
        reply: "I was wondering when you would arrive.",
        profile: USER_SECRET,
        accent: "#d78a5e",
        ageCategory: "adult",
      },
    ],
    messages: {
      coda: [{ id: 1, sender: "character", text: "You came back." }],
      miramessages: [{ id: 1, sender: "player", text: "Hello there." }],
    },
    sessions: [
      {
        id: "session-abc",
        characterId: "coda",
        sceneId: "moonlit-study",
        title: "The Moonlit Study",
        messageKey: "session-abc",
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    currentSessionId: "session-abc",
    storyScenes: { "my-mira": [] },
    personas: [
      {
        id: "persona-1",
        name: "Rinn",
        description: "A quiet archivist.",
        createdAt: 3,
        updatedAt: 4,
      },
    ],
     activePersonaId: "persona-1",
     playerName: "Rinn",
     preferences: {
       storyProvider: "novelai",
       model: "xialong-v1",
       creativity: 8,
       replyLength: "immersive",
     },
     relationships: {
       "coda::persona-1": {
         characterId: "coda",
         personaId: "persona-1",
         score: 82,
         updatedAt: 9,
         events: [
           { id: "ev-1", characterId: "coda", personaId: "persona-1", turnId: "char-3", delta: 82, reason: "shared a secret", createdAt: 8 },
         ],
       },
     },
     ...overrides,
   };
 }

function build(overrides = {}) {
  return buildBackupPayload(
    sampleSource(overrides),
    { appVersion: "1.2.3", device: "Linux", source: "web" },
  );
}

test("curated characters are backed up as reference + user state only, never the package", () => {
  const payload = build();
  const curated = payload.data.curatedState.find((entry) => entry.id === "coda");
  assert.ok(curated, "curated entry present");
  assert.equal(curated.bond, 78);
  assert.deepEqual(curated.memories, ["User added a memory about Coda"]);
  assert.ok(!("name" in curated), "no curated name");
  assert.ok(!("profile" in curated), "no curated profile");
  assert.ok(!("reply" in curated), "no curated opening");
  assert.ok(!("image" in curated), "no curated artwork");

  assert.equal(
    payload.data.characters.some((character) => character.id === "coda"),
    false,
    "curated packages never appear in user characters",
  );

  const serialized = serializeBackupPayload(payload);
  assert.ok(!serialized.includes(CURATED_SECRET), "curated canon does not leak");
});

test("user-owned characters are backed up in full", () => {
  const payload = build();
  const mira = payload.data.characters.find((character) => character.id === "my-mira");
  assert.ok(mira);
  assert.equal(mira.name, "Mira");
  assert.equal(mira.profile, USER_SECRET);
  assert.equal(mira.bond, 42);
  assert.equal(mira.ageCategory, "adult");
});

test("conversations, sessions, personas and preferences survive the round trip", () => {
  const payload = build();
  assert.equal(payload.data.personas[0].name, "Rinn");
  assert.equal(payload.data.preferences.storyProvider, "novelai");
  assert.equal(payload.data.sessions[0].characterId, "coda");
  assert.ok(payload.data.messages.coda[0].text.includes("came back"));

  const reparsed = parsePortableBackup(serializeBackupPayload(payload));
  assert.ok(reparsed.ok);
  if (reparsed.ok) {
    assert.equal(reparsed.payload.data.personas[0].name, "Rinn");
    assert.deepEqual(
      reparsed.payload.data.curatedState.find((entry) => entry.id === "coda")?.memories,
      ["User added a memory about Coda"],
    );
  }
});

test("labels and versions are part of the format", () => {
  const payload = build();
  assert.equal(payload.format, PORTABLE_BACKUP_FORMAT);
  assert.equal(payload.version, PORTABLE_BACKUP_VERSION);
  assert.equal(payload.device, "Linux");
  assert.equal(payload.source, "web");
  assert.equal(payload.appVersion, "1.2.3");
  assert.ok(validatePayload(JSON.parse(serializeBackupPayload(payload))));
});

test("foreign, malformed and oversized files are rejected on restore", () => {
  assert.equal(parsePortableBackup(JSON.stringify({ format: "some-other-app" })).ok, false);
  assert.equal(parsePortableBackup("not json{").ok, false);
  assert.equal(parsePortableBackup(JSON.stringify({ format: PORTABLE_BACKUP_FORMAT, data: null })).ok, false);
});

test("oversized backups are rejected", () => {
  const big = `{"format":"${PORTABLE_BACKUP_FORMAT}","data":${JSON.stringify("x".repeat(MAX_BACKUP_BYTES + 1))}}`;
  assert.equal(parsePortableBackup(big).ok, false);
});

test("curated helper matches the curated ids", () => {
  assert.equal(isCuratedCharacterId("coda"), true);
  assert.equal(isCuratedCharacterId("heather"), true);
  assert.equal(isCuratedCharacterId("peony"), true);
  assert.equal(isCuratedCharacterId("senako-steel"), true);
  assert.equal(isCuratedCharacterId("my-own"), false);
});

test("relationship state survives the round trip", () => {
  const payload = build();
  const reparsed = parsePortableBackup(serializeBackupPayload(payload));
  assert.ok(reparsed.ok);
  if (!reparsed.ok) return;
  const rel = reparsed.payload.data.relationships?.["coda::persona-1"];
  assert.ok(rel, "relationship record restored");
  assert.equal(rel.score, 82);
  assert.equal(rel.personaId, "persona-1");
  assert.equal(rel.events[0].turnId, "char-3");
  assert.equal(rel.events[0].delta, 82);
  assert.equal(rel.events[0].reason, "shared a secret");
});

test("backups without relationship state restore as empty (backward compatible)", () => {
  // A source with no relationships builds an empty relationship map, and an old
  // backup that simply lacks the field still restores to an empty map so the app
  // can re-seed from legacy bond values.
  const payload = build({ relationships: undefined });
  assert.deepEqual(payload.data.relationships, {});
  const reparsed = parsePortableBackup(serializeBackupPayload(payload));
  assert.ok(reparsed.ok);
  if (!reparsed.ok) return;
  assert.deepEqual(reparsed.payload.data.relationships ?? {}, {});
});

test("malformed relationship events are dropped during sanitize", () => {
  const payload = build({
    relationships: {
      "coda::persona-1": {
        characterId: "coda",
        personaId: "persona-1",
        score: 5,
        updatedAt: 1,
        events: [
          { turnId: "char-3", delta: "not-a-number", reason: "bad" },
          { turnId: "char-4", delta: 5, reason: "good", createdAt: 2 },
        ],
      },
    },
  });
  const reparsed = parsePortableBackup(serializeBackupPayload(payload));
  assert.ok(reparsed.ok);
  if (!reparsed.ok) return;
  const rel = reparsed.payload.data.relationships?.["coda::persona-1"];
  assert.equal(rel.events.length, 1);
  assert.equal(rel.events[0].turnId, "char-4");
});