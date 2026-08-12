import assert from "node:assert/strict";
import test from "node:test";

import {
  describeOllamaModel,
  isValidOllamaModelName,
  parseOllamaModels,
} from "../lib/ollama.ts";
import { GET as listServerModels } from "../app/api/ollama/models/route.ts";
import {
  cleanPlayerContinuationDelta,
  parseConnectionTestTimeoutMs,
  parseGenerationTimeoutMs,
  parseMaxConcurrentGenerations,
  POST as generateStory,
} from "../app/api/novelai/route.ts";
import { legacyCharacterToCanon } from "../lib/characters/canonical.ts";
import { freshRerollSeed } from "../lib/generation/compile-context.ts";

test("normalizes, deduplicates, and sorts Ollama model tags", () => {
  const models = parseOllamaModels({
    models: [
      {
        name: "mistral-nemo:12b",
        size: 7_500_000_000,
        details: {
          family: "llama",
          parameter_size: "12.2B",
          quantization_level: "Q4_K_M",
        },
      },
      { model: "Alpha/model:latest", size: 1_500_000_000 },
      { name: "mistral-nemo:12b", size: 7_600_000_000 },
      { name: "invalid model name" },
    ],
  });

  assert.deepEqual(models.map((model) => model.name), [
    "Alpha/model:latest",
    "mistral-nemo:12b",
  ]);
  assert.equal(models[1].size, 7_600_000_000);
  assert.equal(describeOllamaModel(models[1]), "12.2B · Q4_K_M · llama");
});

test("validates model names accepted by Ollama requests", () => {
  assert.equal(isValidOllamaModelName("R4C3R/gemma-3-12b-it-heretic:q4_k_m"), true);
  assert.equal(isValidOllamaModelName("model with spaces"), false);
  assert.equal(isValidOllamaModelName("../model"), false);
  assert.equal(isValidOllamaModelName(""), false);
});

test("bounds server concurrency and connection-test timeout independently", () => {
  assert.equal(parseMaxConcurrentGenerations("100"), 16);
  assert.equal(parseConnectionTestTimeoutMs("60000"), 60_000);
  assert.equal(parseConnectionTestTimeoutMs("300000"), 300_000);
  assert.equal(parseGenerationTimeoutMs("1800000"), 1_800_000);
  assert.equal(parseGenerationTimeoutMs("3600000"), 3_600_000);

  assert.equal(parseMaxConcurrentGenerations("invalid"), 1);
  assert.equal(parseMaxConcurrentGenerations("-4"), 1);
  assert.equal(parseConnectionTestTimeoutMs("invalid"), 60_000);
  assert.equal(parseConnectionTestTimeoutMs("-5000"), 60_000);
  assert.equal(parseGenerationTimeoutMs("invalid"), 1_800_000);
  assert.equal(parseGenerationTimeoutMs("-5000"), 1_800_000);
});

test("server discovery reports installed models and adult classification", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    models: [{
      name: "R4C3R/gemma-3-12b-it-heretic:q4_k_m",
      size: 7_000_000_000,
      details: { parameter_size: "12B", quantization_level: "Q4_K_M" },
    }],
  });

  const response = await listServerModels();
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.models[0].value, "R4C3R/gemma-3-12b-it-heretic:q4_k_m");
  assert.equal(payload.models[0].adult, true);
  assert.equal(payload.models[0].description, "12B · Q4_K_M");
});

test("server discovery handles empty and unavailable Ollama responses", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async () => Response.json({ models: [] });
  const emptyResponse = await listServerModels();
  assert.deepEqual((await emptyResponse.json()).models, []);

  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  const unavailableResponse = await listServerModels();
  assert.equal(unavailableResponse.status, 502);
  assert.deepEqual(await unavailableResponse.json(), {
    error: "The app server could not list its Ollama models.",
  });
});

test("server generation rejects models that are not installed", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ models: [{ name: "mistral-nemo:12b" }] });

  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", provider: "local", model: "missing:latest" }),
  }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Choose a model currently installed on the app server.",
  });
});

test("server connection test accepts a non-empty model response", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const model = "mistral-nemo:12b";
  globalThis.fetch = async (url) => String(url).endsWith("/api/tags")
    ? Response.json({ models: [{ name: model }] })
    : Response.json({ response: "Connection confirmed in different words." });

  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", provider: "local", model }),
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
  const events = await readTestStream(response);
  assert.ok(events.some((event) =>
    event.type === "done" && event.ok === true && event.message === "The Howling Whispers connected"
  ));
});

async function readTestStream(response) {
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
      if (!raw.startsWith("data:")) continue;
      try {
        events.push(JSON.parse(raw.slice(5).trim()));
      } catch {
        // Ignore malformed events.
      }
    }
  }
  return events;
}

test("NovelAI replies drop the leaked player turn", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    if (String(url).includes("text.novelai.net")) {
      return Response.json({
        choices: [{ text: "*Coda's tail sweeps the hearth.* \"I kept your place warm.\"\n\nYou: *I step closer.* \"Thank you.\"" }],
      });
    }
    return Response.json({});
  };

  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "novelai",
      apiToken: "test-token",
      model: "xialong-v1",
      playerName: "",
      temperature: 0.8,
      replyLength: "quick",
      proseFormat: "roleplay",
      character: {
        id: "coda",
        name: "Coda",
        role: "Wolf guardian",
        profile: "A test wolf guardian.",
        canonical: legacyCharacterToCanon({
          id: "coda",
          name: "Coda",
          role: "Wolf guardian",
          profile: "A test wolf guardian.",
        }),
      },
      messages: [
        { sender: "player", text: "Hello." },
        { sender: "character", text: "*Coda looks up.* \"You're back.\"" },
      ],
    }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.reply && payload.reply.includes("I kept your place warm"));
  assert.ok(!/You\s*:/i.test(payload.reply));
  assert.ok(!/\*I step closer\*/i.test(payload.reply));
});

test("freshRerollSeed returns a non-negative 32-bit integer and varies across calls", () => {
  for (let index = 0; index < 50; index += 1) {
    const seed = freshRerollSeed();
    assert.ok(Number.isInteger(seed));
    assert.ok(seed >= 0 && seed <= 0xffffffff);
  }
  const seen = new Set(Array.from({ length: 20 }, () => freshRerollSeed()));
  assert.ok(seen.size > 1, "seeds should vary across calls");
});

test("device impersonation targets only the player and allows short turns", async () => {
  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "device",
      model: "mistral-nemo:12b",
      action: "impersonate",
      playerName: "Kael",
      replyLength: "quick",
      character: {
        id: "coda",
        name: "Coda",
        role: "Wolf guardian",
        profile: "A test wolf guardian.",
        canonical: legacyCharacterToCanon({
          id: "coda",
          name: "Coda",
          role: "Wolf guardian",
          profile: "A test wolf guardian.",
        }),
      },
      messages: [{ sender: "character", text: "*Coda looks up.* The rain will pass." }],
    }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.finalization.outputKind, "player");
  assert.equal(payload.finalization.outputName, "Kael");
  const prompt = payload.ollamaRequest.prompt;
  assert.match(prompt, /The selected quick length is mandatory. Write 12–160 words. A shorter or longer draft is invalid./);
  assert.match(prompt, /Use 1–4 substantial segments. Fewer than 1 or more than 4 segments is invalid./);
  assert.match(prompt, /never write the character's dialogue, actions, voice, reactions/);
  assert.match(prompt, /Never continue, finish, extend, or reword the character's last message/);
  assert.ok(payload.ollamaRequest.options.stop.some((stop) => stop === "\nCoda:"));
});

test("device character roleplay targets only the character with a hard length floor", async () => {
  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "device",
      model: "mistral-nemo:12b",
      playerName: "Kael",
      replyLength: "novel",
      character: {
        id: "coda",
        name: "Coda",
        role: "Wolf guardian",
        profile: "A test wolf guardian.",
        canonical: legacyCharacterToCanon({
          id: "coda",
          name: "Coda",
          role: "Wolf guardian",
          profile: "A test wolf guardian.",
        }),
      },
      messages: [{ sender: "player", text: "Hello, Coda." }],
    }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.finalization.outputKind, "character");
  assert.equal(payload.finalization.outputName, "Coda");
  const prompt = payload.ollamaRequest.prompt;
  assert.match(prompt, /The selected novel length is mandatory. Write 400–650 words. A shorter or longer draft is invalid./);
  assert.match(prompt, /Use 10–16 substantial segments. Fewer than 10 or more than 16 segments is invalid./);
  assert.match(prompt, /Never assign the player an action, feeling, perception, or decision/);
  assert.doesNotMatch(prompt, /soft ceiling, not a hard minimum/);
});

test("NovelAI impersonation extends a short player turn to the immersive floor and keeps the direction", async (context) => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const shortTurn = "*I step closer.* I'm done with the excuses.";
  const longTurn = "*I plant my feet and lower my voice.* I came here to say what I actually mean, and I am not leaving until you have heard it. I kept quiet for too long, and every silence made it worse, so this time I will say it plainly and let the words land where they belong. *I hold my ground instead of looking away, keeping my hands open at my sides.* Whatever follows, it will not be another excuse or another retreat into silence.";
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("text.novelai.net")) {
      calls.push({ body: JSON.parse(String(init?.body)) });
      return Response.json({ choices: [{ text: calls.length === 1 ? shortTurn : longTurn }] });
    }
    return Response.json({});
  };

  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "novelai",
      apiToken: "test-token",
      model: "xialong-v1",
      action: "impersonate",
      playerName: "Arrax",
      replyLength: "immersive",
      temperature: 0.8,
      impersonationPrompt: "Say I am angry about the cubs.",
      character: {
        id: "senako-steel",
        name: "Senako Steel",
        role: "Fiercely loyal friend",
        profile: "A test cub.",
        canonical: legacyCharacterToCanon({
          id: "senako-steel",
          name: "Senako Steel",
          role: "Fiercely loyal friend",
          profile: "A test cub.",
          ageCategory: "minor",
          isMinor: true,
        }),
      },
      messages: [{ sender: "character", text: "*Senako fidgets.* It is not that simple." }],
    }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.reply.includes("I step closer"));
  assert.ok(payload.reply.includes("I came here to say what I actually mean"));
  assert.ok(payload.reply.trim().split(/\s+/).length >= 70, `expected >=70 words, got ${payload.reply.trim().split(/\s+/).length}`);
  assert.equal(calls.length, 2);
  assert.match(calls[0].body.prompt, /PRIVATE DIRECTION \(MANDATORY\)/);
  assert.match(calls[0].body.prompt, /Say I am angry about the cubs/);
  assert.match(calls[1].body.prompt, /<\|system\|>\nContinue the existing first-person player turn/);
  assert.match(calls[1].body.prompt, /Say I am angry about the cubs/);
  assert.match(calls[1].body.prompt, /<\|user\|>\nArrax:\*I step closer\.\* "I'm done with the excuses\."$/);
});

test("player continuation removes leaked directives and repeated prefix from the delta", () => {
  const existing = "You are still a kid in my eyes. Only you can change that for yourself though. There are eighteen-year-old cubs out there who behave like six-year-olds. There are six-year-olds who have seen things that no one should have to see, and yet they go on.";
  const continuation = "*I let the silence hold for a moment before meeting her gaze again.* What matters is what you choose to do next.";
  const leaked = `Continue this SAME turn from the player's side, preserving and expanding on the current intent without concluding or ending the turn yet. Do not stop or wrap up. Keep the player's perspective flowing forward into the next natural beat.\n\n${existing}\n\n${continuation}`;

  const delta = cleanPlayerContinuationDelta(existing, leaked);

  assert.equal(delta, continuation);
  assert.doesNotMatch(delta, /Continue this SAME turn/);
  assert.doesNotMatch(delta, /yet they go on/i);
  assert.equal(
    cleanPlayerContinuationDelta(existing, "I continue watching the player across the room."),
    "I continue watching the player across the room.",
  );
});

test("reroll NovelAI request sends a fresh seed and same history, ordinary reply does not", async (context) => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("text.novelai.net")) {
      calls.push({ body: JSON.parse(String(init?.body)) });
      return Response.json({ choices: [{ text: "*A fresh candle lit.*" }] });
    }
    return Response.json({});
  };

  const common = {
    provider: "novelai",
    apiToken: "test-token",
    model: "xialong-v1",
    playerName: "",
    temperature: 0.8,
    replyLength: "quick",
    proseFormat: "roleplay",
    character: {
      id: "coda",
      name: "Coda",
      role: "Wolf guardian",
      profile: "A test wolf guardian.",
      canonical: legacyCharacterToCanon({
        id: "coda",
        name: "Coda",
        role: "Wolf guardian",
        profile: "A test wolf guardian.",
      }),
    },
    messages: [
      { sender: "player", text: "Hello." },
      { sender: "character", text: "*Coda looks up.* \"You're back.\"" },
    ],
  };

  const first = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(common),
  }));
  assert.equal(first.status, 200);

  const rerollRequest = { ...common, reroll: true };
  const second = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rerollRequest),
  }));
  assert.equal(second.status, 200);

  assert.equal(calls.length, 2);
  const [ordinary, reroll] = calls;
  assert.equal(ordinary.body.seed, undefined);
  assert.ok(Number.isInteger(reroll.body.seed) && reroll.body.seed >= 0);
  assert.equal(ordinary.body.prompt.startsWith("<|system|>"), true);
  assert.equal(reroll.body.prompt.startsWith("<|system|>"), true);
  assert.match(reroll.body.prompt, /This turn is a reroll: generate a fresh alternative response/);
  assert.doesNotMatch(ordinary.body.prompt, /This turn is a reroll: generate a fresh alternative response/);
});

test("adult server models reject characters that are not confirmed adults", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const adultModel = "R4C3R/gemma-3-12b-it-heretic:q4_k_m";
  globalThis.fetch = async () => Response.json({ models: [{ name: adultModel }] });
  const canonical = legacyCharacterToCanon({
    id: "test-minor",
    name: "Test Character",
    role: "Friend",
    profile: "A test character.",
    ageCategory: "minor",
    isMinor: true,
  });

  const response = await generateStory(new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "local",
      model: adultModel,
      character: {
        id: "test-minor",
        canonical,
        scene: "Test scene",
        contextMode: "balanced",
      },
      messages: [{ sender: "player", text: "Hello." }],
    }),
  }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "The adult roleplay model requires a character explicitly confirmed as an adult.",
  });
});

function longImmersiveCharacterReply() {
  const paragraphs = [];
  for (let i = 0; i < 8; i++) {
    paragraphs.push(`*Coda shifts her weight from paw to paw, the rain dripping from her coat.* She breathes in the wet pine air and lets it out slowly, watching the sky. "The river will be high by morning," she says, her voice rough but calm. *She turns her head, ears pricked, listening to the forest around them.* The campfire pops and sends a few sparks upward into the dark branches. "We should move before the trail washes out."`);
  }
  return paragraphs.join("\n\n");
}

function makeNovelAIRequest(overrides = {}) {
  return new Request("http://localhost/api/novelai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "novelai",
      apiToken: "test-token",
      model: "xialong-v1",
      playerName: "Kael",
      temperature: 0.8,
      replyLength: "immersive",
      proseFormat: "roleplay",
      character: {
        id: "coda",
        name: "Coda",
        role: "Wolf guardian",
        profile: "A test wolf guardian.",
        canonical: legacyCharacterToCanon({
          id: "coda",
          name: "Coda",
          role: "Wolf guardian",
          profile: "A test wolf guardian.",
        }),
        scene: "Test scene",
        sceneId: "test",
        worldId: "coda",
        worldLore: null,
        weather: "Rainy",
        memories: [],
        sandbox: false,
        relationship: "Bond 50/100",
        playerRole: "",
        playerRoleContext: "",
        contextMode: "balanced",
        matureContentRequested: false,
      },
      messages: [
        { sender: "player", text: "Hello, Coda." },
        { sender: "character", text: "*Coda looks up.* \"You're back.\"" },
      ],
      ...overrides,
    }),
  });
}

test("Immersive NovelAI character output over 400 words is capped", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    choices: [{ text: longImmersiveCharacterReply() }],
  });

  const response = await generateStory(makeNovelAIRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  const words = payload.reply.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 400, `Immersive reply should be <= 400 words, got ${words}`);
});

test("Immersive NovelAI output over 5 paragraphs is capped", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    choices: [{ text: longImmersiveCharacterReply() }],
  });

  const response = await generateStory(makeNovelAIRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  const paragraphs = payload.reply.split(/\n\s*\n/).filter((p) => p.trim()).length;
  assert.ok(paragraphs <= 5, `Immersive reply should be <= 5 paragraphs, got ${paragraphs}`);
});

test("NovelAI reply already inside limits remains unchanged", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const shortReply = "*Coda nods.* \"Good. Stay close.\"";
  globalThis.fetch = async () => Response.json({
    choices: [{ text: shortReply }],
  });

  const response = await generateStory(makeNovelAIRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.reply.includes("*Coda nods.*"), "Should preserve action markup");
  assert.ok(payload.reply.includes("Stay close"), "Should preserve dialogue content");
});

test("Quick NovelAI ceiling is distinct from Immersive", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const quickReply = Array.from({ length: 20 }, () => "*Coda listens.* \"We move now.\"").join("\n\n");
  globalThis.fetch = async () => Response.json({
    choices: [{ text: quickReply }],
  });

  const response = await generateStory(makeNovelAIRequest({ replyLength: "quick" }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const words = payload.reply.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 160, `Quick reply should be <= 160 words, got ${words}`);
  const paragraphs = payload.reply.split(/\n\s*\n/).filter((p) => p.trim()).length;
  assert.ok(paragraphs <= 2, `Quick reply should be <= 2 paragraphs, got ${paragraphs}`);
});

test("Novel-like NovelAI ceiling is distinct from Immersive", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const novelReply = Array.from({ length: 12 }, (_, i) => `*Coda moves through the ${i + 1}th scene.* "This is a longer chapter."`).join("\n\n");
  globalThis.fetch = async () => Response.json({
    choices: [{ text: novelReply }],
  });

  const response = await generateStory(makeNovelAIRequest({ replyLength: "novel" }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const words = payload.reply.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 650, `Novel-like reply should be <= 650 words, got ${words}`);
  const paragraphs = payload.reply.split(/\n\s*\n/).filter((p) => p.trim()).length;
  assert.ok(paragraphs <= 8, `Novel-like reply should be <= 8 paragraphs, got ${paragraphs}`);
});

test("NovelAI player impersonation continuation cannot exceed maxWords", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("text.novelai.net")) {
      calls.push({ body: JSON.parse(String(init?.body)) });
      return Response.json({
        choices: [{ text: "*I keep going.* I say more and more and more and more and more and more words here to try to blow past the limit." }],
      });
    }
    return Response.json({});
  };

  const response = await generateStory(makeNovelAIRequest({
    action: "impersonate",
    playerDirection: "Say something short.",
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const words = payload.reply.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 160, `Immersive impersonation should be <= 160 words, got ${words}`);
});

test("NovelAI reroll still respects the selected Reply Length", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    choices: [{ text: longImmersiveCharacterReply() }],
  });

  const response = await generateStory(makeNovelAIRequest({ reroll: true }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const words = payload.reply.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 400, `Reroll should respect Immersive word limit, got ${words}`);
});

test("NovelAI truncation preserves roleplay formatting", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const formatted = Array.from({ length: 10 }, (_, i) => `*Action ${i + 1}.* "Dialogue ${i + 1}." [Inner thought ${i + 1}.]`).join("\n\n");
  globalThis.fetch = async () => Response.json({
    choices: [{ text: formatted }],
  });

  const response = await generateStory(makeNovelAIRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  const lines = payload.reply.split("\n\n").filter((p) => p.trim());
  assert.ok(lines.length <= 5, `Should cap paragraphs, got ${lines.length}`);
  for (const line of lines) {
    assert.ok(!line.includes("``"), "Truncation should not leave broken markup");
  }
  assert.ok(payload.reply.includes("*Action 1.*"), "Should preserve leading action markup");
  assert.ok(payload.reply.includes("Dialogue 1"), "Should preserve leading dialogue content");
});
