import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/novelai/route.ts";

const NOVELAI_COMPLETIONS = "https://text.novelai.net/oa/v1/completions";

const baseBody = {
  playerName: "Skyler",
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
    sandbox: true,
    relationship: "Trusted friend; Bond 62/100",
    playerRole: "",
    contextMode: "balanced",
    matureContentRequested: false,
  },
  livingCast: [],
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

test("POST strips a complete echoed latest player turn before returning character output", async () => {
  const playerTurn = `"Good to know your mother is no longer mad at me"\n\n*smile*\n\n"Pip"`;
  const modelReply = `${playerTurn}\n\n*Peony looks up with a crooked smile.*\n\n"She's not mad at all."`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (typeof url === "string" && url.startsWith(NOVELAI_COMPLETIONS)) {
      return Response.json({ choices: [{ text: modelReply }] });
    }
    return Response.json({ error: "unexpected fetch" }, { status: 500 });
  };

  try {
    const response = await POST(makeRequest({
      ...baseBody,
      messages: [{ sender: "player", text: playerTurn }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.doesNotMatch(payload.reply, /Good to know your mother/);
    assert.doesNotMatch(payload.reply, /^\s*smile\b/i);
    assert.match(payload.reply, /Peony looks up with a crooked smile/);
    assert.match(payload.reply, /She's not mad at all/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST preserves a normal character reply that only quotes a fragment", async () => {
  const playerTurn = `"Good to know your mother is no longer mad at me"\n\n*smile*\n\n"Pip"`;
  const modelReply = `"Good to know," Peony echoes. "But don't get smug."`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (typeof url === "string" && url.startsWith(NOVELAI_COMPLETIONS)) {
      return Response.json({ choices: [{ text: modelReply }] });
    }
    return Response.json({ error: "unexpected fetch" }, { status: 500 });
  };

  try {
    const response = await POST(makeRequest({
      ...baseBody,
      messages: [{ sender: "player", text: playerTurn }],
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(payload.reply, /Good to know/);
    assert.match(payload.reply, /don't get smug/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
