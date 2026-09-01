import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/novelai/route.ts";

const NOVELAI_COMPLETIONS = "https://text.novelai.net/oa/v1/completions";

const baseBody = {
  playerName: "Kael",
  playerPersona: "A cautious traveler.",
  provider: "novelai",
  apiToken: "test-token",
  model: "xialong-v1",
  temperature: 0.8,
  replyLength: "quick",
  initiative: "balanced",
  viewpoint: "character",
  tense: "present",
  proseFormat: "roleplay",
  character: {
    id: "peony",
    name: "Peony",
    role: "Wholesome succubus seeking purpose",
    profile: "Peony is observant, autonomous, and careful with trust.",
    scene: "A quiet greenhouse",
    sceneId: "peony-greenhouse",
    worldId: "peony",
    weather: "Rain against the glass",
    memories: [],
    sandbox: false,
    relationship: "Trusted friend; Bond 62/100",
    playerRole: "",
    contextMode: "balanced",
    matureContentRequested: false,
  },
  livingCast: [
    {
      id: "peony",
      name: "Peony",
      origin: "permanent",
      presence: "active",
      primary: true,
      notes: [],
      relationships: [],
    },
  ],
  autonomousCast: [],
  reroll: false,
};

function makeRequest(body) {
  return new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function stubNovelAi(text) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (typeof url === "string" && url.startsWith(NOVELAI_COMPLETIONS)) {
      return new Response(JSON.stringify({ choices: [{ text }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "unexpected fetch" }), { status: 500 });
  };
  return () => {
    globalThis.fetch = original;
  };
}

test("POST normal send returns a JSON reply instead of crashing", async () => {
  const restore = stubNovelAi("Peony looks up as you enter, a faint smile easing the worry in her eyes.");
  try {
    const response = await POST(makeRequest({
      ...baseBody,
      messages: [{ sender: "player", text: "How are you feeling today?" }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(typeof payload.reply, "string");
    assert.ok(payload.reply.length > 0);
  } finally {
    restore();
  }
});

test("POST compiles a participating side character from that character's real card", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (typeof url === "string" && url.startsWith(NOVELAI_COMPLETIONS)) {
      calls.push(JSON.parse(String(init?.body)));
      return Response.json({ choices: [{ text: "Ragna stops at the threshold and gives Skyler space." }] });
    }
    return Response.json({ error: "unexpected fetch" }, { status: 500 });
  };
  try {
    const response = await POST(makeRequest({
      ...baseBody,
      respondAs: "Ragna Holt",
      character: {
        ...baseBody.character,
        id: "ragna-holt",
        name: "Ragna Holt",
        role: "Pip's protective mother",
        profile: "REAL RAGNA CARD: blunt, independent, protective, and unwilling to abandon her own judgment.",
      },
      livingCast: [
        { id: "pip-holt", name: "Pip Holt", origin: "permanent", presence: "active", notes: [], relationships: [] },
        { id: "ragna-holt", name: "Ragna Holt", origin: "temporary", presence: "active", resolutionStatus: "resolved", resolvedCharacterId: "ragna-holt", activationReason: "entered through Pip interaction", activationSource: "relationship-linked-known-character", notes: [], relationships: [{ target: "Pip Holt", descriptor: "daughter: Ragna is Pip's mother" }] },
      ],
      messages: [{ sender: "player", text: "I recoil when Ragna enters." }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(calls.length, 1);
    assert.match(calls[0].prompt, /REAL RAGNA CARD/);
    assert.match(calls[0].prompt, /Resolved ragna-holt/);
    assert.match(calls[0].prompt, /Relationship to Pip Holt/);
    assert.doesNotMatch(calls[0].prompt, /Peony is observant/);
    assert.equal(payload.context.simulation.actor.characterId, "ragna-holt");
    assert.equal(payload.context.simulation.actor.activationSource, "relationship-linked-known-character");
    assert.equal(payload.context.simulation.actor.resolved, true);
  } finally {
    globalThis.fetch = original;
  }
});

test("POST refuses an unresolved temporary character instead of fabricating an identity", async () => {
  const response = await POST(makeRequest({
    ...baseBody,
    respondAs: "Known Stranger",
    livingCast: [
      ...baseBody.livingCast,
      { id: "known-stranger", name: "Known Stranger", origin: "temporary", presence: "active", resolutionStatus: "unresolved", notes: [], relationships: [] },
    ],
    messages: [{ sender: "player", text: "Known Stranger enters." }],
  }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /not an active resolved character/i);
});

test("POST preserves valid world timestamps and ignores legacy message ids", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (typeof url === "string" && url.startsWith(NOVELAI_COMPLETIONS)) {
      calls.push(JSON.parse(String(init?.body)));
      return Response.json({ choices: [{ text: "Peony waits beside the greenhouse door." }] });
    }
    return Response.json({ error: "unexpected fetch" }, { status: 500 });
  };
  try {
    const first = Date.UTC(2025, 7, 24, 12, 0, 0);
    const response = await POST(makeRequest({
      ...baseBody,
      messages: [
        { sender: "character", text: "Legacy greeting.", timestamp: 2 },
        { sender: "player", text: "I will be back soon.", timestamp: first },
        { sender: "player", text: "I am back.", timestamp: first + 20 * 60_000 },
      ],
    }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.match(calls[0].prompt, /Gap between the two most recent timestamped turns: 20 minutes\./);
    assert.doesNotMatch(calls[0].prompt, /1970/);
  } finally {
    globalThis.fetch = original;
  }
});

test("POST blank-start impersonate returns a JSON player turn without a prior message", async () => {
  const restore = stubNovelAi("I push the greenhouse door open and step inside out of the rain, shaking water from my sleeves as the warm, green air settles around me.");
  try {
    const response = await POST(makeRequest({
      ...baseBody,
      action: "impersonate",
      impersonationPrompt: "",
      messages: [],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(typeof payload.reply, "string");
    assert.ok(payload.reply.length > 0);
  } finally {
    restore();
  }
});

test("POST impersonate honors a typed direction", async () => {
  const restore = stubNovelAi("I set my pack down by the door and say, Trust me and let it happen. I keep my eyes on Peony the whole time.");
  try {
    const response = await POST(makeRequest({
      ...baseBody,
      action: "impersonate",
      impersonationPrompt: "Get angry and say exactly: Trust me and let it happen.",
      messages: [{ sender: "character", text: "The rain will pass." }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(typeof payload.reply, "string");
    assert.ok(payload.reply.length > 0);
  } finally {
    restore();
  }
});

test("POST impersonate formats bare player prose into deterministic roleplay markup", async () => {
  const restore = stubNovelAi("I look over at her. I don't know, maybe we should leave. I reach for the door.");
  try {
    const response = await POST(makeRequest({
      ...baseBody,
      action: "impersonate",
      impersonationPrompt: "",
      messages: [{ sender: "character", text: "The rain will pass." }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(
      payload.reply,
      "*I look over at her.* \"I don't know, maybe we should leave.\" *I reach for the door.*",
    );
  } finally {
    restore();
  }
});
