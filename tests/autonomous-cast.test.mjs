import assert from "node:assert/strict";
import test from "node:test";

import {
  blankDrive,
  autonomousAgentsToArray,
  deriveAutonomyPulse,
  perceptionBoundary,
  recentResidue,
  renderAutonomousBlock,
  renderAutonomyInstruction,
  sanitizeAutonomousCast,
  seedAutonomyFromCast,
} from "../lib/generation/autonomous-cast.ts";

const NOW = 1_700_000_000_000;

function seededAgent(name, drive = blankDrive()) {
  return {
    id: `rc:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    drive,
    revisions: [],
    updatedAt: NOW - 10,
  };
}

test("blankDrive has empty goal/intent and zeroed needs", () => {
  const drive = blankDrive();
  assert.equal(drive.goal, "");
  assert.equal(drive.intent, "");
  assert.deepEqual(Object.keys(drive.needs).sort(), ["comfort", "curiosity", "fatigue", "hunger", "social"]);
  assert.equal(drive.needs.hunger, 0);
});

test("perceptionBoundary turns internal intent-to-leave into observable glances at the door", () => {
  const observable = perceptionBoundary(["Melody intends to leave"]);
  assert.ok(observable.some((signal) => signal.includes("glancing toward the way out")));
  assert.ok(!observable.some((signal) => signal.includes("intends to leave")));
});

test("perceptionBoundary maps distrust into shorter, guarded answers", () => {
  const observable = perceptionBoundary(["Melody distrust increased"]);
  assert.ok(observable.some((signal) => signal.includes("answers grow shorter")));
});

test("internal drives never leak verbatim into player-facing residue", () => {
  const internal = ["Melody refuses to leave", "Melody hides the ledger from the player"];
  const observable = perceptionBoundary(internal).join(" ");
  for (const line of internal) {
    assert.ok(!observable.includes(line.toLowerCase()), `internal line leaked: ${line}`);
  }
});

test("deriveAutonomyPulse records unanswered pressure on the pending cast member", () => {
  const melody = seededAgent("Melody");
  const map = new Map([["rc:melody", melody]]);
  const pulse = deriveAutonomyPulse(map, [{ id: "rc:melody", name: "Melody" }], {
    primaryName: "Senako Steel",
    pendingTargetName: "Melody",
    now: NOW,
  });
  const entry = pulse.get("rc:melody");
  assert.ok(entry, "Melody should keep an autonomy entry");
  assert.ok(entry.revisions[0].internal.some((line) => line.includes("asked and has not answered")));
  assert.ok(entry.revisions[0].observable.some((signal) => signal.includes("half-formed thought")));
});

test("deriveAutonomyPulse marks bystander NPCs as present but unaddressed without overwriting other fields", () => {
  const melody = seededAgent("Melody", {
    ...blankDrive(),
    goal: "find the ledger before sundown",
    needs: { hunger: 0.7, fatigue: 0.2, comfort: 0, social: 0.4, curiosity: 0.3 },
  });
  const map = new Map([["rc:melody", melody]]);
  const pulse = deriveAutonomyPulse(map, [{ id: "rc:melody", name: "Melody" }], {
    primaryName: "Senako Steel",
    pendingTargetName: null,
    now: NOW,
  });
  const entry = pulse.get("rc:melody");
  assert.ok(entry.revisions[0].internal.some((line) => line.includes("has not been given a clear reason to speak")));
  assert.equal(entry.drive.goal, "find the ledger before sundown");
});

test("deriveAutonomyPulse keeps the primary and the current speaker out of the pulse", () => {
  const senako = seededAgent("Senako Steel");
  const melody = seededAgent("Melody");
  const map = new Map([
    ["rc:senako-steel", senako],
    ["rc:melody", melody],
  ]);
  const pulse = deriveAutonomyPulse(
    map,
    [
      { id: "rc:senako-steel", name: "Senako Steel" },
      { id: "rc:melody", name: "Melody" },
    ],
    { primaryName: "Senako Steel", speakerName: "Melody", now: NOW },
  );
  assert.equal(pulse.get("rc:senako-steel")?.revisions.length, 0);
  assert.equal(pulse.get("rc:melody")?.revisions.length, 0);
});

test("renderAutonomyBlock includes the strong drive fields and hides none of the pressed needs", () => {
  const melody = seededAgent("Melody", {
    ...blankDrive(),
    goal: "leave before the winter market closes",
    intent: "find an excuse to step outside",
    wants: ["the ledger", "an hour alone"],
    fears: ["being caught", "losing the ledger"],
    concerns: ["the note in her coat"],
    needs: { hunger: 0.8, fatigue: 0.1, comfort: 0.2, social: 0.9, curiosity: 0.5 },
  });
  melody.revisions = [{ internal: ["Melody intends to leave"], observable: ["keeps glancing toward the way out"] }];
  melody.updatedAt = NOW;
  const block = renderAutonomousBlock([melody], { primaryName: "Senako Steel" });
  assert.ok(block.includes("[NPC SUBTEXT: Melody]"));
  assert.ok(block.includes("Goal: leave before the winter market closes"));
  assert.ok(block.includes("Fears: being caught; losing the ledger"));
  assert.ok(block.includes("Unresolved: the note in her coat"));
  assert.ok(block.includes("Pressed needs: hunger, social"));
  assert.ok(block.includes("[OBSERVABLE] Melody — Melody keeps glancing toward the way out"));
});

test("renderAutonomyBlock omits the primary character", () => {
  const senako = seededAgent("Senako Steel", { ...blankDrive(), goal: "guard the entryway" });
  const block = renderAutonomousBlock([senako], { primaryName: "Senako Steel" });
  assert.equal(block, "");
});

test("renderAutonomyInstruction grants the NPC independence, disagreement, and concealment", () => {
  const melody = seededAgent("Melody", {
    ...blankDrive(),
    goal: "slip out of the keep",
    wants: ["her freedom"],
    fears: ["the warden"],
    needs: { hunger: 0.7, fatigue: 0, comfort: 0.4, social: 0.2, curiosity: 0.1 },
  });
  melody.revisions = [{ internal: ["Melody intends to leave"], observable: ["keeps glancing toward the way out"] }];
  const instruction = renderAutonomyInstruction(melody, "Senako Steel");
  assert.ok(instruction.includes("independent participant"));
  assert.ok(/you may disagree, hesitate, refuse, conceal what you know, or change your mind/i.test(instruction));
  assert.ok(instruction.toLocaleLowerCase("en-US").includes("you are trying to slip out of the keep"));
  assert.ok(instruction.includes("Keep this hidden"));
  assert.ok(instruction.includes("Melody intends to leave"));
});

test("sanitizeAutonomousCast bounds, refills needs, and prunes malformed entries", () => {
  const cast = sanitizeAutonomousCast({
    "rc:melody": {
      id: "rc:melody",
      name: "Melody",
      drive: {
        goal: "x".repeat(500),
        wants: "not-an-array",
        needs: { hunger: "high", fatigue: 5, comfort: "low", social: 0, curiosity: "middle" },
      },
      revisions: [
        { internal: ["one"], observable: ["two"] },
        { internal: [], observable: [] },
        { internal: ["kept"], observable: ["also kept"] },
        { internal: ["dropped"], observable: ["dropped again"] },
      ],
      updatedAt: NOW,
    },
    broken: "garbage",
    empty: { id: "", name: "" },
  });
  const melody = cast.get("rc:melody");
  assert.ok(melody, "Melody should survive");
  assert.equal(melody.drive.goal.length, 120);
  assert.deepEqual(melody.drive.wants, []);
  assert.equal(melody.drive.needs.hunger, 1);
  assert.equal(melody.drive.needs.fatigue, 1);
  assert.equal(melody.drive.needs.curiosity, 0);
  assert.equal(melody.drive.needs.comfort, 0.33);
  assert.equal(melody.revisions.length, 3);
  assert.equal(melody.revisions[2].internal[0], "dropped" ? "dropped" : "kept");
});

test("autonomousAgentsToArray returns deterministic updatedAt-ordered agents", () => {
  const older = seededAgent("Older");
  older.updatedAt = NOW - 5;
  const newer = seededAgent("Newer", blankDrive());
  newer.updatedAt = NOW;
  const list = autonomousAgentsToArray(new Map([
    ["rc:newer", newer],
    ["rc:older", older],
  ]));
  assert.deepEqual(list.map((agent) => agent.name), ["Older", "Newer"]);
});

test("seedAutonomyFromCast backfills blank agents for cast members and keeps richer drives", () => {
  const melody = seededAgent("Melody", { ...blankDrive(), goal: "find the ledger" });
  const seeded = seedAutonomyFromCast(
    new Map([["rc:melody", melody]]),
    [
      { id: "rc:melody", name: "Melody" },
      { id: "rc:coda", name: "Coda" },
      { id: "", name: "" },
    ],
    NOW,
  );
  assert.equal(seeded.size, 2);
  assert.equal(seeded.get("rc:melody")?.drive.goal, "find the ledger");
  const coda = seeded.get("rc:coda");
  assert.ok(coda, "Coda should be seeded");
  assert.equal(coda.drive.goal, "");
  assert.equal(coda.revisions.length, 0);
});

test("a derived pulse after seeding produces a prompt-ready subtext block for a bystander NPC", () => {
  const seeded = seedAutonomyFromCast(new Map(), [
    { id: "rc:melody", name: "Melody" },
  ], NOW);
  const pulse = deriveAutonomyPulse(seeded, [{ id: "rc:melody", name: "Melody" }], {
    primaryName: "Senako Steel",
    pendingTargetName: null,
    now: NOW,
  });
  const block = renderAutonomousBlock(autonomousAgentsToArray(pulse), { primaryName: "Senako Steel" });
  assert.ok(block.includes("[NPC SUBTEXT: Melody]"));
  assert.ok(block.includes("has not been given a clear reason to speak yet"));
  assert.ok(block.includes("[OBSERVABLE] Melody — Melody keeps to themselves, still but watchful"));
});

test("recentResidue flattens the newest revisions only", () => {
  const agent = seededAgent("Melody");
  agent.revisions = [
    { internal: ["newest internal"], observable: ["newest visible"] },
    { internal: ["older internal"], observable: ["older visible"] },
    { internal: ["ancient"], observable: ["ancient visible"] },
  ];
  const residue = recentResidue(agent, 2);
  assert.ok(residue.internal.includes("newest internal"));
  assert.ok(residue.internal.includes("older internal"));
  assert.ok(!residue.internal.includes("ancient"));
  assert.deepEqual(residue.observable, ["newest visible", "older visible"]);
});