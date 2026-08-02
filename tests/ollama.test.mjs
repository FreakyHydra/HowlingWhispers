import assert from "node:assert/strict";
import test from "node:test";

import {
  describeOllamaModel,
  isValidOllamaModelName,
  parseOllamaModels,
} from "../lib/ollama.ts";
import { GET as listServerModels } from "../app/api/ollama/models/route.ts";
import {
  parseConnectionTestTimeoutMs,
  parseGenerationTimeoutMs,
  parseMaxConcurrentGenerations,
  POST as generateStory,
} from "../app/api/novelai/route.ts";
import { legacyCharacterToCanon } from "../lib/characters/canonical.ts";

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
  assert.deepEqual(await response.json(), {
    ok: true,
    message: "The Howling Whispers connected",
  });
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
