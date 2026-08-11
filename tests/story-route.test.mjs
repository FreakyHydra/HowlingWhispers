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
