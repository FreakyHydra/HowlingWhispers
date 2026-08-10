import assert from "node:assert/strict";
import test from "node:test";

import {
  createCast,
  detectLivingCast,
  detectPendingInteraction,
  matchesName,
  renderLivingCastBlock,
  renderSpeakerInstruction,
  sanitizeCast,
} from "../lib/generation/living-cast.ts";

const primary = { id: "senako-steel", name: "Senako Steel" };

function run(messages, cast, overrides = {}) {
  return detectLivingCast({
    messages,
    cast,
    primary,
    playerName: "Alex",
    now: 1_700_000_000_000,
    ...overrides,
  });
}

test("createCast seeds a player entry and a permanent primary entry", () => {
  const cast = createCast(primary, "Alex", 1);
  assert.equal(cast.length, 2);
  const senako = cast.find((entry) => matchesName(entry.name, "Senako Steel"));
  const alex = cast.find((entry) => matchesName(entry.name, "Alex"));
  assert.deepEqual(
    { name: senako.name, origin: senako.origin, presence: senako.presence, primary: senako.primary },
    { name: "Senako Steel", origin: "permanent", presence: "active", primary: true },
  );
  assert.deepEqual(
    { name: alex.name, origin: alex.origin, presence: alex.presence, primary: alex.primary },
    { name: "Alex", origin: "player", presence: "active", primary: undefined },
  );
});

test("the spec example discovers a temporary character arriving with the player", () => {
  const result = run(
    [{ sender: "player", text: "I enter Senako's room with Melody." }],
    createCast(primary, "Alex"),
  );
  assert.deepEqual(result.newNames, ["Melody"]);
  const melody = result.cast.find((entry) => matchesName(entry.name, "Melody"));
  assert.ok(melody, "Melody should be discovered");
  assert.equal(melody.origin, "temporary");
  assert.equal(melody.presence, "active");
  assert.deepEqual(result.cast.find((entry) => entry.primary)?.presence, "active");
  assert.equal(result.pending, null);
  assert.equal(result.autoSpeakerName, null);
  assert.ok(melody.notes[0].includes("the player entered Senako's room with Melody"));
});

test("a known character named in a mention without a presence verb becomes mentioned", () => {
  const cast = createCast(primary, "Alex");
  const result = run(
    [
      { sender: "player", text: "I enter Senako's room with Melody." },
      { sender: "character", text: "*Senako looks toward the door.* Melody is waiting outside." },
    ],
    cast,
  );
  const melody = result.cast.find((entry) => matchesName(entry.name, "Melody"));
  assert.equal(melody.presence, "active");
});

test("a departure verb marks an active cast member absent", () => {
  const cast = [...createCast(primary, "Alex"), {
    id: "melody",
    name: "Melody",
    origin: "temporary",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  }];
  const result = run(
    [{ sender: "character", text: "*Melody gathers her coat.* Melody stepped out into the rain and left the room behind her." }],
    cast,
  );
  const melody = result.cast.find((entry) => matchesName(entry.name, "Melody"));
  assert.equal(melody.presence, "absent");
  assert.ok(result.events.some((event) => event.includes("Melody left the scene")));
});

test("an arrival verb reactivates a departed member", () => {
  const cast = [...createCast(primary, "Alex"), {
    id: "melody",
    name: "Melody",
    origin: "temporary",
    presence: "absent",
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  }];
  const result = run(
    [{ sender: "player", text: "A moment later Melody returns through the door." }],
    cast,
  );
  assert.equal(result.cast.find((entry) => matchesName(entry.name, "Melody")).presence, "active");
});

test("a direct question to a present cast member marks that member as the pending responder", () => {
  const first = run(
    [{ sender: "player", text: "I enter Senako's room with Melody." }],
    createCast(primary, "Alex"),
  );
  const result = run(
    [
      { sender: "player", text: "*I take a seat.*" },
      { sender: "character", text: "Melody, what do you make of all this? *Senako glances between the two of you.*" },
      { sender: "player", text: "*I wait.*" },
    ],
    first.cast,
  );
  assert.deepEqual(
    { kind: result.pending?.kind, asker: result.pending?.asker, targetName: result.pending?.targetName },
    { kind: "cast", asker: "Senako Steel", targetName: "Melody" },
  );
  assert.equal(result.autoSpeakerName, "Melody");
});

test("a question asked by a side character does not auto-trigger another NPC reply", () => {
  const first = run(
    [{ sender: "player", text: "I enter Senako's room with Melody." }],
    createCast(primary, "Alex"),
  );
  const result = run(
    [
      { sender: "player", text: "*I step back.*" },
      { sender: "character", text: "Melody, what do you make of all this?" },
      { sender: "character", text: "*Melody looks at the window.* I think we should leave soon.", speaker: "Melody" },
      { sender: "player", text: "*I nod.*" },
    ],
    first.cast,
  );
  assert.equal(result.autoSpeakerName, null);
});

test("once a side character answers, the next player turn is not auto-answered by them again", () => {
  const first = run(
    [{ sender: "player", text: "I enter Senako's room with Melody." }],
    createCast(primary, "Alex"),
  );
  const result = run(
    [
      { sender: "player", text: "*I step back.*" },
      { sender: "character", text: "Melody, what do you make of all this?" },
      { sender: "character", text: "*Melody looks at the window.* I think we should leave soon.", speaker: "Melody" },
      { sender: "player", text: "*I check the door.*" },
    ],
    first.cast,
    { playerName: "Alex" },
  );
  assert.equal(result.pending, null);
  assert.equal(result.autoSpeakerName, null);
});

test("the primary re-asking reactivates the side-character response", () => {
  const first = run(
    [{ sender: "player", text: "I enter Senako's room with Melody." }],
    createCast(primary, "Alex"),
  );
  const result = run(
    [
      { sender: "player", text: "*I step back.*" },
      { sender: "character", text: "Melody, what do you make of all this?" },
      { sender: "character", text: "*Melody shrugs.* I am still figuring it out.", speaker: "Melody" },
      { sender: "player", text: "*I wait again.*" },
      { sender: "character", text: "*Senako turns to Melody again.* Melody, truly, I want your real answer this time." },
    ],
    first.cast,
  );
  assert.equal(result.autoSpeakerName, "Melody");
});

test("a question addressed to the player resolves as a player pending interaction", () => {
  const cast = createCast(primary, "Alex");
  const result = run(
    [
      { sender: "character", text: "*Senako sets the papers down.* Alex, what do you really think about all of this?" },
      { sender: "player", text: "*I keep my hands relaxed.*" },
    ],
    cast,
  );
  assert.equal(result.pending?.kind, "player");
  assert.equal(result.autoSpeakerName, null);
});

test("no question leaves no pending interaction", () => {
  const cast = createCast(primary, "Alex");
  const result = run(
    [{ sender: "character", text: "*Senako pours a cup of tea and slides it across the table.*" }],
    cast,
  );
  assert.equal(result.pending, null);
  assert.equal(result.autoSpeakerName, null);
});

test("detectPendingInteraction reports the last character message even after a player message", () => {
  const cast = createCast(primary, "Alex");
  const pending = detectPendingInteraction(
    [
      { sender: "character", text: "Melody, what do you think?" },
      { sender: "player", text: "*I look between them.*" },
    ],
    [...cast, {
      id: "melody",
      name: "Melody",
      origin: "temporary",
      presence: "active",
      addedAt: 1,
      updatedAt: 1,
      notes: [],
      relationships: [],
    }],
    primary.name,
    "Alex",
  );
  assert.equal(pending?.targetName, "Melody");
});

test("renderLivingCastBlock renders the compact roster with pending interaction", () => {
  const cast = [...createCast(primary, "Alex"), {
    id: "melody",
    name: "Melody",
    origin: "temporary",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: ["the player entered the room with Melody"],
    relationships: [],
  }];
  const block = renderLivingCastBlock(cast, {
    pending: { kind: "cast", asker: "Senako Steel", targetId: "melody", targetName: "Melody" },
  });
  assert.equal(block, [
    "<living-cast>",
    "[ACTIVE CAST]",
    "- Senako Steel — Permanent — Active — Primary",
    "- Alex — Player — Active",
    "- Melody — Temporary — Active — the player entered the room with Melody",
    "[PENDING INTERACTION]",
    "Senako Steel asked Melody a question. Melody has not responded.",
    "</living-cast>",
  ].join("\n"));
});

test("renderLivingCastBlock omits the pending line when the pending member is the one speaking", () => {
  const cast = createCast(primary, "Alex");
  const block = renderLivingCastBlock(cast, {
    pending: { kind: "cast", asker: "Senako Steel", targetId: "alex", targetName: "Alex" },
    speakerName: "Alex",
  });
  assert.ok(!block.includes("PENDING INTERACTION"));
});

test("renderSpeakerInstruction keeps the speaker and primary names and stays safety-aware", () => {
  const instruction = renderSpeakerInstruction({
    id: "melody",
    name: "Melody",
    origin: "temporary",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: ["short answers", "dry humor"],
    relationships: [],
  }, "Senako Steel");
  assert.ok(instruction.includes("you speak as Melody"));
  assert.ok(instruction.includes("Senako Steel"));
  assert.ok(instruction.includes("short answers"));
  assert.ok(instruction.toLowerCase().includes("unconfirmed"));
});

test("sanitizeCast bounds entries and keeps only the first primary", () => {
  const dirty = {
    id: "x",
    name: "Junk",
    origin: "temporary",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: ["a".repeat(500), "kept"],
    relationships: [{ target: "Senako Steel", descriptor: "familiar" }, { target: "", descriptor: "" }],
  };
  const cast = sanitizeCast([
    { ...dirty, primary: true, origin: "permanent" },
    dirty,
    "not-an-object",
  ]);
  assert.equal(cast.length, 2);
  const primaries = cast.filter((entry) => entry.primary);
  assert.equal(primaries.length, 1);
  assert.equal(cast[0].notes[0].length, 200);
  assert.deepEqual(cast[0].relationships.map((rel) => rel.target), ["Senako Steel"]);
  assert.equal(sanitizeCast("garbage").length, 0);
  assert.equal(sanitizeCast([{ name: "" }]).length, 0);
});

test("matchesName compares normalized display names", () => {
  assert.equal(matchesName("Senako Steel", "senako-steel"), true);
  assert.equal(matchesName("Senako", "Senako Steel"), false);
});