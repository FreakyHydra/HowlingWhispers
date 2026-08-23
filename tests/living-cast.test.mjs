import assert from "node:assert/strict";
import test from "node:test";

import {
  createCast,
  detectLivingCast,
  detectPendingInteraction,
  findCastEntryById,
  matchesName,
  renderLivingCastBlock,
  renderSpeakerInstruction,
  sanitizeCast,
} from "../lib/generation/living-cast.ts";
import { autonomousAgentsToArray, seedAutonomyFromCast } from "../lib/generation/autonomous-cast.ts";

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

test("sanitizeCast bounds entries and rejects stray primary:true unless it matches the supplied identity", () => {
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
  assert.equal(cast.filter((entry) => entry.primary).length, 0);
  assert.equal(cast[0].notes[0].length, 200);
  assert.deepEqual(cast[0].relationships.map((rel) => rel.target), ["Senako Steel"]);
  assert.equal(sanitizeCast("garbage").length, 0);
  assert.equal(sanitizeCast([{ name: "" }]).length, 0);
});

test("sanitizeCast makes the ID-matched entry primary regardless of array order", () => {
  const cast = sanitizeCast([
    { id: "side", name: "Side", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "senako-steel", name: "Senako Steel", origin: "permanent", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
  ], { id: "senako-steel", name: "Senako Steel" });
  const senako = cast.find((entry) => entry.id === "senako-steel");
  assert.ok(senako?.primary, "Senako should be primary by ID");
  assert.ok(!cast.find((entry) => entry.id === "side")?.primary, "Side should not be primary");
});

test("sanitizeCast falls back to name matching when ID is absent", () => {
  const cast = sanitizeCast([
    { id: "side", name: "Side", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "senako", name: "Senako Steel", origin: "permanent", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
  ], { name: "Senako Steel" });
  assert.ok(cast.find((entry) => entry.id === "senako")?.primary, "Senako should be primary by name");
});

test("sanitizeCast never makes a player entry primary", () => {
  const cast = sanitizeCast([
    { id: "player", name: "Alex", origin: "player", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "senako", name: "Senako Steel", origin: "permanent", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
  ], { id: "senako", name: "Senako Steel" });
  assert.ok(!cast.find((entry) => entry.id === "player")?.primary, "Player must not be primary");
  assert.ok(cast.find((entry) => entry.id === "senako")?.primary, "Senako should be primary");
});

test("sanitizeCast restores exactly one primary when the supplied identity is missing from the array", () => {
  const cast = sanitizeCast([
    { id: "side", name: "Side", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "other", name: "Other", origin: "temporary", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
  ], { id: "senako", name: "Senako Steel" });
  const primaries = cast.filter((entry) => entry.primary);
  assert.equal(primaries.length, 1, "Exactly one primary should be restored defensively");
});

test("sanitizeCast strips duplicate primaries when the supplied identity matches one entry", () => {
  const cast = sanitizeCast([
    { id: "senako", name: "Senako Steel", origin: "permanent", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [], primary: true },
    { id: "side", name: "Side", origin: "temporary", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [], primary: true },
  ], { id: "senako", name: "Senako Steel" });
  assert.equal(cast.filter((entry) => entry.primary).length, 1);
  assert.ok(cast.find((entry) => entry.id === "senako")?.primary);
  assert.ok(!cast.find((entry) => entry.id === "side")?.primary);
});

test("matchesName compares normalized display names", () => {
  assert.equal(matchesName("Senako Steel", "senako-steel"), true);
  assert.equal(matchesName("Senako", "Senako Steel"), false);
});

test("sentence-start question and function words never become cast members (real-world regression)", () => {
  const result = run(
    [
      { sender: "player", text: "*I hold up the ledger.* Why did you tell her all of that? What was the point?" },
      { sender: "character", text: "*Senako studies the page.* Because the truth was going to come out either way. Got it?" },
      { sender: "player", text: "*I sit down.* Did you think about what happens now? Both of us are on the line here. Jail is real, you know." },
    ],
    createCast(primary, "Alex"),
  );
  const bugWords = ["Did", "Tell", "Both", "Because", "Jail", "What", "Why", "Got"];
  for (const word of bugWords) {
    assert.ok(
      !result.cast.some((entry) => matchesName(entry.name, word)),
      `"${word}" must not be a cast member; cast = ${result.cast.map((entry) => entry.name).join(", ")}`,
    );
    assert.ok(!result.newNames.includes(word), `"${word}" must not be reported as a new name`);
  }
  const names = result.cast.map((entry) => entry.name);
  assert.deepEqual(names, ["Senako Steel", "Alex"]);
  assert.equal(result.pending, null);
});

test("common English words capitalized mid-sentence are still not treated as names", () => {
  const result = run(
    [{ sender: "player", text: "I asked whether jail is really that bad. Tell me the truth, though. What happened today?" }],
    createCast(primary, "Alex"),
  );
  for (const word of ["Jail", "Tell", "What"]) {
    assert.ok(!result.cast.some((entry) => matchesName(entry.name, word)), `"${word}" must not be a member`);
  }
  assert.equal(result.newNames.length, 0);
});

test("a genuinely introduced name still joins the cast", () => {
  const result = run(
    [{ sender: "player", text: "A tall woman steps in behind me. I recognize her as Valeria, who left the guild years ago." }],
    createCast(primary, "Alex"),
  );
  assert.ok(result.cast.some((entry) => matchesName(entry.name, "Valeria")), "Valeria should join the cast");
  assert.equal(result.cast.filter((entry) => entry.origin === "temporary").length, 1);
});

test("a side character introduced by accompaniment appears without being an extra", () => {
  const result = run(
    [{ sender: "player", text: "I step into the courtyard with Coda at my heels." }],
    createCast(primary, "Alex"),
  );
  assert.ok(result.cast.some((entry) => matchesName(entry.name, "Coda")));
  const coda = result.cast.find((entry) => matchesName(entry.name, "Coda"));
  assert.equal(coda.presence, "active");
});

test("speaker attribution makes a quoted name a stable cast member", () => {
  const result = run(
    [{ sender: "character", text: "*A thin woman in a shawl settles into the chair across from you.* \"Melody said you would come,\" she begins." }],
    createCast(primary, "Alex"),
  );
  assert.ok(result.cast.some((entry) => matchesName(entry.name, "Melody")));
});

test("sanitizeCast prunes single-token common-word names left behind by the old detector", () => {
  const stale = [
    ...createCast(primary, "Alex"),
    { id: "why", name: "Why", origin: "temporary", presence: "mentioned", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "jail", name: "Jail", origin: "temporary", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "valeria-name", name: "Valeria", origin: "temporary", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
  ];
  const cleaned = sanitizeCast(stale);
  assert.ok(!cleaned.some((entry) => matchesName(entry.name, "Why")));
  assert.ok(!cleaned.some((entry) => matchesName(entry.name, "Jail")));
  assert.ok(cleaned.some((entry) => matchesName(entry.name, "Valeria")), "real names survive pruning");
});

test("a reply requested as Melody keeps Melody as the authoritative speaker even when the text opens like a question", async () => {
  const cast = await import("../lib/generation/living-cast.ts");
  const requested = {
    id: "melody",
    name: "Melody",
    origin: "temporary",
    presence: "active",
    addedAt: 1,
    updatedAt: 1,
    notes: [],
    relationships: [],
  };
  const resolved = [...createCast(primary, "Alex"), requested];

  const pending = detectPendingInteraction(
    [
      { sender: "player", text: "*I lean forward.*" },
      { sender: "character", text: "Melody, what did you see down there? Why did you lie?" },
      { sender: "player", text: "*I keep still, waiting.*" },
    ],
    resolved,
    primary.name,
    "Alex",
  );
  assert.equal(pending?.kind, "cast");
  assert.equal(pending?.targetName, "Melody");

  const autop = run(
    [
      { sender: "player", text: "*I lean forward.*" },
      { sender: "character", text: "Melody, what did you see down there? Why did you lie?" },
      { sender: "player", text: "*I keep still, waiting.*" },
    ],
    resolved,
  );
  assert.equal(autop.autoSpeakerName, "Melody");

  const speaker = cast.findCastEntryByName(resolved, "Melody");
  assert.equal(cast.matchesName(speaker?.name ?? "", "Melody"), true);
  const blockSuffix = cast.renderLivingCastBlock(resolved, {
    pending: autop.pending,
    speakerName: autop.autoSpeakerName ?? undefined,
  });
  assert.ok(!blockSuffix.includes("PENDING INTERACTION"), "no pending line when Melody is the one speaking");
});

test("scene opening introducing a side character seeds them into initial livingCast and autonomy", () => {
  const character = { id: "senako-steel", name: "Senako Steel" };
  const scene = { id: "test", title: "Test", opening: "*Senako enters the room with Melody.*" };
  const session = { createdAt: Date.now() };
  const baseCast = createCast({ id: character.id, name: character.name }, "Alex");
  const detected = detectLivingCast({
    messages: [{ id: session.createdAt, sender: "character", text: scene.opening }],
    cast: baseCast,
    primary: { id: character.id, name: character.name },
    playerName: "Alex",
  });
  const melody = detected.cast.find((entry) => matchesName(entry.name, "Melody"));
  assert.ok(melody, "Melody should be discovered from the opening");
  assert.equal(melody.presence, "active");
  const autonomy = seedAutonomyFromCast(new Map(), detected.cast);
  assert.ok(autonomy.has(melody.id), "Melody should receive initial autonomy");
  const agent = autonomy.get(melody.id);
  assert.ok(agent, "Melody autonomy entry should exist");
  assert.equal(agent.name, "Melody");
});

test("findCastEntryById returns the exact entry while duplicate display names stay separate", () => {
  const cast = [
    { id: "custom-a", name: "Peony", origin: "invited", presence: "active", addedAt: 1, updatedAt: 1, notes: [], relationships: [] },
    { id: "custom-b", name: "Peony", origin: "invited", presence: "active", addedAt: 2, updatedAt: 2, notes: [], relationships: [] },
    { id: "rc:peony", name: "Peony", origin: "permanent", presence: "active", addedAt: 3, updatedAt: 3, notes: [], relationships: [] },
  ];
  assert.equal(findCastEntryById(cast, "custom-a")?.id, "custom-a");
  assert.equal(findCastEntryById(cast, "custom-b")?.id, "custom-b");
  assert.equal(findCastEntryById(cast, "rc:peony")?.id, "rc:peony");
  assert.equal(findCastEntryById(cast, "nonexistent"), null);
});
