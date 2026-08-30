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
  replyLength: "immersive",
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
  messages: [{ sender: "player", text: "Where is Pip?" }],
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
      return Response.json({ choices: [{ text }] });
    }
    return Response.json({ error: "unexpected fetch" }, { status: 500 });
  };
  return () => { globalThis.fetch = original; };
}

test("character dialogue keeps required double quotes", async () => {
  const raw = [
    "*Ragna looks up from the worn wooden table in the main room, a map of nearby trails spread before her.*",
    "\"She's out back with the bow stave.\"",
    "*Her ears flick, noting your arrival without her needing to turn.*",
    "\"Come in. She'll be glad to see you.\"",
    "*The room smells of pine resin and leather, the hearth keeping a steady low heat even in summer.*",
  ].join("\n\n");
  const restore = stubNovelAi(raw);
  try {
    const response = await POST(makeRequest(baseBody));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(payload.reply, /\"She's out back with the bow stave\.\"/);
    assert.match(payload.reply, /\"Come in\. She'll be glad to see you\.\"/);
    assert.match(payload.reply, /\*Ragna looks up from the worn wooden table/);
  } finally {
    restore();
  }
});

test("smart dialogue quotes are normalized to ordinary double quotes", async () => {
  const raw = "*Ragna glances toward the back door.*\n\n“She's out back with the bow stave.”";
  const restore = stubNovelAi(raw);
  try {
    const response = await POST(makeRequest(baseBody));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(payload.reply, /\"She's out back with the bow stave\.\"/);
    assert.doesNotMatch(payload.reply, /[“”]/);
  } finally {
    restore();
  }
});
