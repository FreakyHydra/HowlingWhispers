import {
  legacyCharacterToCanon,
  parseCanonicalCharacter,
  type CanonicalCharacterV1,
} from "../../../lib/characters/canonical.ts";
import { resolveLatestBuiltinCanon } from "../../../lib/characters/builtins.ts";
import {
  compileContext,
  type ContextManifest,
  type ContextMode,
  type RoleplayMessage,
  type StoryPreferences,
} from "../../../lib/generation/compile-context.ts";
import { resolveBuiltinWorldLore } from "../../../lib/worlds/builtins.ts";
import type { WorldLorebookV1 } from "../../../lib/worlds/schema.ts";
import { parseWorldLorebook } from "../../../lib/worlds/schema.ts";
import { isValidOllamaModelName } from "../../../lib/ollama.ts";
import {
  fetchInstalledOllamaModels,
  isAdultOllamaModel,
  OLLAMA_BASE_URL,
} from "../../../lib/ollama-server.ts";

export const runtime = "edge";

const NOVELAI_BASE = "https://text.novelai.net/oa/v1";
const CONNECTION_TEST_RESPONSE = "The Howling Whispers connected";
const ALLOWED_MODELS = new Set(["xialong-v1", "glm-4-6"]);
const ALLOWED_SENDERS = new Set(["character", "player", "narrator"]);
const MAX_SERVER_GENERATIONS = positiveInteger(
  process.env.OLLAMA_MAX_CONCURRENT_GENERATIONS,
  1,
);
const SERVER_CONNECTION_TEST_TIMEOUT_MS = positiveInteger(
  process.env.OLLAMA_CONNECTION_TEST_TIMEOUT_MS,
  60_000,
);
let activeServerGenerations = 0;

const REPLY_LENGTHS = {
  quick: {
    maxTokens: 360,
    instruction: "Write 1–2 complete paragraphs, usually 90–160 words. Keep it responsive, but still include characterful action and sensory context.",
  },
  immersive: {
    maxTokens: 850,
    instruction: "Write 3–5 substantial paragraphs, usually 220–400 words. Develop the moment through physical reactions, sensory environment, emotionally revealing dialogue, and subtext.",
  },
  novel: {
    maxTokens: 1300,
    instruction: "Write 5–8 substantial paragraphs, usually 400–650 words. Treat the reply like a polished scene from a character-driven novel, with patient pacing, vivid atmosphere, layered emotion, and meaningful dialogue.",
  },
} as const;

const IMPERSONATION_LENGTHS: Record<keyof typeof REPLY_LENGTHS, string> = {
  quick: "Write 1–2 focused paragraphs totaling 60–130 words. A response under 60 words is incomplete.",
  immersive: "Write 2–4 developed paragraphs totaling 140–300 words, combining a meaningful reaction, action, and dialogue when appropriate. A response under 140 words is incomplete.",
  novel: "Write 3–6 substantial paragraphs totaling 300–550 words. A response under 300 words is incomplete.",
};

type ReplyLength = keyof typeof REPLY_LENGTHS;
type CharacterPrompt = {
  name: string;
  role: string;
  canonical: CanonicalCharacterV1;
  scene: string;
  weather: string;
  memories: string[];
  sandbox: boolean;
  relationship: string;
  contextMode: ContextMode;
  matureContentRequested: boolean;
  playerRole: string;
  worldLore: WorldLorebookV1 | null;
  sceneId: string;
};
type ProseFormat = "roleplay" | "novel";
type StoryProvider = "novelai" | "local" | "device";

const LOCAL_MINIMUM_WORDS: Record<ReplyLength, { character: number; player: number }> = {
  quick: { character: 90, player: 60 },
  immersive: { character: 220, player: 140 },
  novel: { character: 400, player: 300 },
};

const LOCAL_MINIMUM_SEGMENTS: Record<ReplyLength, { character: number; player: number }> = {
  quick: { character: 3, player: 2 },
  immersive: { character: 6, player: 5 },
  novel: { character: 10, player: 8 },
};

function localRoleplayFormat(minSegments: number) {
  return {
    type: "object",
    properties: {
      segments: {
        type: "array",
        minItems: minSegments,
        maxItems: 24,
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["dialogue", "action", "narration"],
              description: "Dialogue is spoken only by the portrayed character. Action and narration must never assign the player an action, feeling, perception, or decision.",
            },
            text: { type: "string" },
          },
          required: ["kind", "text"],
        },
      },
    },
    required: ["segments"],
  };
}

async function getDisplayName(requestedName: string): Promise<string> {
  try {
    const { getChatGPTUser } = await import("../../chatgpt-auth");
    const user = await getChatGPTUser();
    if (user) return user.displayName;
  } catch { /* ignore */ }
  return requestedName || "Player";
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "The request was not valid JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: "The story request was malformed." }, { status: 400 });
  }
  if (body.action === "finalize-device") {
    const rawReply = limitedString(body.rawReply, 50_000);
    const outputName = limitedString(body.outputName, 120);
    const outputKind = body.outputKind === "player" ? "player" : "character";
    const proseFormat: ProseFormat = body.proseFormat === "novel" ? "novel" : "roleplay";
    const preparedReply = proseFormat === "roleplay"
      ? formatLocalRoleplayReply(rawReply, outputKind, outputName)
      : rawReply;
    const reply = cleanReply(preparedReply, outputName, proseFormat, outputKind);
    return reply
      ? Response.json({ reply })
      : Response.json({ error: "The local model returned an empty reply." }, { status: 502 });
  }
  const playerName = await getDisplayName(limitedString(body.playerName, 100));

  const apiToken = limitedString(body.apiToken, 4096);
  const provider: StoryProvider = body.provider === "local" || body.provider === "device"
    ? body.provider
    : "novelai";
  const requestedModel = limitedString(body.model, 120);
  let model = requestedModel;
  const temperature = boundedNumber(body.temperature, 0.1, 1, 0.8);
  const replyLength = parseReplyLength(body.replyLength);
  const preferences = parseStoryPreferences(body);
  const isConnectionTest = body.action === "test";
  const isImpersonation = body.action === "impersonate";
  const impersonationPrompt = limitedString(body.impersonationPrompt, 1200);
  const doStream = body.stream === true;
  const character = isConnectionTest ? null : parseCharacter(body.character);
  const messages = isConnectionTest ? [] : parseMessages(body.messages);

  if (provider === "novelai" && !apiToken) {
    return Response.json({ error: "A NovelAI access token is required." }, { status: 400 });
  }
  if (provider === "novelai" && !ALLOWED_MODELS.has(model)) {
    return Response.json({ error: "Choose Xialong or GLM 4.6." }, { status: 400 });
  }
  if (provider === "local") {
    let installedModels;
    try {
      installedModels = await fetchInstalledOllamaModels();
    } catch {
      return Response.json({ error: "The app server could not list its Ollama models." }, { status: 502 });
    }
    model ||= installedModels[0]?.name ?? "";
    if (!installedModels.some((candidate) => candidate.name === model)) {
      return Response.json({ error: "Choose a model currently installed on the app server." }, { status: 400 });
    }
  }
  if (provider === "device" && !isValidOllamaModelName(model)) {
    return Response.json({ error: "Enter the Ollama model installed on this computer." }, { status: 400 });
  }
  if (!isConnectionTest && (!character || messages.length === 0)) {
    return Response.json({ error: "The character or conversation is incomplete." }, { status: 400 });
  }
  if (
    provider === "local"
    && isAdultOllamaModel(model)
    && !isConnectionTest
    && (character?.canonical.safety.ageCategory !== "adult" || character.canonical.safety.isMinor !== false)
  ) {
    return Response.json({
      error: "The adult roleplay model requires a character explicitly confirmed as an adult.",
    }, { status: 400 });
  }

  const compiled = isConnectionTest ? null : compileContext({
      kind: isImpersonation ? "impersonation" : "roleplay",
      provider: provider === "novelai" ? "novelai" : "local",
      model,
      outputTokens: REPLY_LENGTHS[replyLength].maxTokens,
      contextMode: character!.contextMode,
      matureContentRequested: character!.matureContentRequested,
      character: character!.canonical,
      worldLore: character!.worldLore,
      relationship: character!.relationship,
      playerRole: character!.playerRole,
      scene: character!.scene,
      sceneId: character!.sceneId,
      weather: character!.weather,
      memories: character!.memories,
      sandbox: character!.sandbox,
      messages,
      playerName,
      preferences,
      lengthInstruction: isImpersonation
        ? IMPERSONATION_LENGTHS[replyLength]
        : REPLY_LENGTHS[replyLength].instruction,
      playerDirection: impersonationPrompt,
    });
  const prompt = isConnectionTest
    ? `Reply with exactly this text and nothing else: ${CONNECTION_TEST_RESPONSE}`
    : compiled!.prompt;
  const generationLength = replyLength;
  const stopSequences = isImpersonation
    ? impersonationStops(character?.name ?? "")
    : roleplayStops();
  const outputName = isImpersonation ? playerName : character?.name ?? "";
  const outputKind = isImpersonation ? "player" : "character";
  if (provider === "device") {
    const structuredRoleplay = preferences.proseFormat === "roleplay";
    const minimumWords = LOCAL_MINIMUM_WORDS[replyLength][outputKind];
    const minimumSegments = LOCAL_MINIMUM_SEGMENTS[replyLength][outputKind];
    const localPrompt = structuredRoleplay
      ? `${prompt}

Local output contract: Return a JSON object with a segments array containing at least ${minimumSegments} substantial segments and at least ${minimumWords} words total. The selected ${replyLength} length is mandatory. Each segment has kind dialogue, action, or narration and plain text without asterisks, brackets, quotation marks, or speaker labels. A dialogue segment contains only words spoken aloud. Put gestures, dialogue tags, sensory description, and narration in separate action or narration segments. Preserve reading order and never assign the player an action, feeling, perception, or decision.`
      : prompt;
    return Response.json({
      ollamaRequest: {
        model,
        prompt: localPrompt,
        stream: false,
        keep_alive: "10m",
        format: structuredRoleplay ? localRoleplayFormat(minimumSegments) : undefined,
        options: {
          num_ctx: 16_384,
          num_predict: REPLY_LENGTHS[replyLength].maxTokens,
          temperature,
          top_p: 0.95,
          repeat_penalty: 1.08,
          stop: stopSequences,
        },
      },
      finalization: { outputName, outputKind, proseFormat: preferences.proseFormat },
      context: compiled?.manifest,
    });
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    provider === "local" ? isConnectionTest ? SERVER_CONNECTION_TEST_TIMEOUT_MS : 600_000 : 45_000,
  );

  try {
    if (provider === "local") {
      if (activeServerGenerations >= MAX_SERVER_GENERATIONS) {
        clearTimeout(timeout);
        return Response.json({
          error: "The server model is busy with another generation. Try again shortly.",
        }, { status: 429 });
      }
      activeServerGenerations += 1;
      try {
        return await localReply(
          model, prompt, isConnectionTest, temperature, generationLength,
          outputName, preferences.proseFormat,
          outputKind, stopSequences, compiled?.manifest, controller, timeout,
        );
      } finally {
        activeServerGenerations -= 1;
      }
    }

    if (doStream) {
      return streamReply(
        apiToken, model, prompt, isConnectionTest, temperature, generationLength,
        stopSequences, controller, timeout,
      );
    }

    return await nonStreamReply(
      apiToken, model, prompt, isConnectionTest, temperature, generationLength,
      isImpersonation ? playerName : character?.name ?? "", preferences.proseFormat,
      isImpersonation ? "player" : "character", stopSequences, compiled?.manifest, controller, timeout,
    );
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut
        ? `${provider === "local" ? "The local model" : "NovelAI"} took too long. Try again.`
        : provider === "local"
          ? "Could not reach Ollama. Make sure it is running, then try again."
          : "Could not reach NovelAI. Try again."
    }, { status: 502 });
  }
}

async function localReply(
  model: string, prompt: string, isTest: boolean,
  temperature: number, replyLength: ReplyLength, outputName: string,
  proseFormat: ProseFormat, outputKind: "player" | "character", stopSequences: string[],
  contextManifest: ContextManifest | undefined, controller: AbortController, timeout: NodeJS.Timeout,
) {
  if (isTest) {
    const upstream = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `Reply with exactly this text and nothing else: ${CONNECTION_TEST_RESPONSE}`,
        stream: false,
        keep_alive: "5m",
        options: { num_ctx: 2_048, num_predict: 24, temperature: 0.1 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return Response.json({
        error: `Ollama could not find ${model}. ${details}`.trim(),
      }, { status: 502 });
    }
    const result: unknown = await upstream.json();
    const reply = isRecord(result) && typeof result.response === "string" ? result.response : "";
    if (!isSuccessfulConnectionReply(reply)) {
      return Response.json({ error: "The local model returned an unexpected test response." }, { status: 502 });
    }
    return Response.json({ ok: true, message: CONNECTION_TEST_RESPONSE });
  }

  const structuredRoleplay = !isTest && proseFormat === "roleplay";
  const minimumWords = LOCAL_MINIMUM_WORDS[replyLength][outputKind];
  const minimumSegments = LOCAL_MINIMUM_SEGMENTS[replyLength][outputKind];
  const localPrompt = structuredRoleplay
    ? `${prompt}

Local output contract: Return a JSON object with a segments array containing at least ${minimumSegments} substantial segments and at least ${minimumWords} words total. The selected ${replyLength} length is mandatory; a shorter draft is invalid. Each segment has kind dialogue, action, or narration and plain text without asterisks, brackets, quotation marks, or speaker labels. A dialogue segment contains only words spoken aloud. Put gestures, dialogue tags, sensory description, and internal or external narration in separate action or narration segments. Preserve the intended reading order. Never address the player by the character's own name. In an open sandbox, do not invent a current location, earlier meeting, or shared history that the player did not establish.`
    : prompt;
  const generate = (generationPrompt: string) => fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: generationPrompt,
        stream: false,
        keep_alive: "10m",
        format: structuredRoleplay ? localRoleplayFormat(minimumSegments) : undefined,
        options: {
          num_ctx: 16_384,
          num_predict: REPLY_LENGTHS[replyLength].maxTokens,
          temperature,
          top_p: 0.95,
          repeat_penalty: 1.08,
          stop: stopSequences,
        },
      }),
      signal: controller.signal,
    });

  let upstream = await generate(localPrompt);
  if (!upstream.ok) {
    clearTimeout(timeout);
    const details = await upstream.text().catch(() => "");
    const missingModel = upstream.status === 404
      ? ` Install it with: ollama pull ${model}`
      : "";
    return Response.json({
      error: `Ollama returned HTTP ${upstream.status}.${missingModel} ${details}`.trim(),
    }, { status: 502 });
  }

  let result: unknown = await upstream.json();
  let rawReply = isRecord(result) && typeof result.response === "string"
    ? result.response
    : "";
  let preparedReply = structuredRoleplay
    ? formatLocalRoleplayReply(rawReply, outputKind, outputName)
    : rawReply;

  for (let attempt = 0; structuredRoleplay && countWords(preparedReply) < minimumWords && attempt < 3; attempt += 1) {
    const remainingWords = minimumWords - countWords(preparedReply);
    upstream = await generate(`${prompt}

Continuation task: The response draft below is incomplete and still needs at least ${remainingWords} additional words. Continue directly after its final beat with new, developed action, dialogue, and sensory or emotional detail. Do not repeat, restart, summarize, conclude early, or contradict the draft. Return only a JSON object containing the additional segments, using the same dialogue/action/narration schema and no markup characters.

Incomplete response draft:
${preparedReply}`);
    if (!upstream.ok) {
      clearTimeout(timeout);
      return Response.json({ error: `Ollama continuation returned HTTP ${upstream.status}.` }, { status: 502 });
    }
    result = await upstream.json();
    rawReply = isRecord(result) && typeof result.response === "string" ? result.response : "";
    const continuation = formatLocalRoleplayReply(rawReply, outputKind, outputName);
    if (!continuation.trim()) break;
    preparedReply = `${preparedReply}\n\n${continuation}`;
  }

  clearTimeout(timeout);
  const reply = isTest
    ? rawReply.trim().slice(0, 200)
    : cleanReply(
      preparedReply,
      outputName, proseFormat, outputKind,
    );

  if (!reply) {
    return Response.json({
      error: isTest ? "The local model returned no test response." : "The local model returned an empty reply.",
    }, { status: 502 });
  }
  if (isTest && !isSuccessfulConnectionReply(reply)) {
    return Response.json({ error: "The local model returned an unexpected test response." }, { status: 502 });
  }

  return Response.json(isTest ? { ok: true, message: CONNECTION_TEST_RESPONSE } : { reply, context: contextManifest });
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function formatLocalRoleplayReply(
  value: string, outputKind: "player" | "character", characterName: string,
): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || !Array.isArray(parsed.segments)) return value;

    const segments = parsed.segments.flatMap((segment: unknown) => {
      if (!isRecord(segment)) return [];
      const kind = limitedString(segment.kind, 20);
      const text = limitedString(segment.text, 4000)
        .replace(/^\s*[*\[]+|[*\]]+\s*$/g, "")
        .replace(/^[“”"']+|[“”"']+$/g, "")
        .trim();
      if (!text) return [];
      if (outputKind === "character" && kind !== "dialogue" && /^(?:you|your|you're|you've|you'll)\b/i.test(text)) {
        return [];
      }
      if (outputKind === "character" && kind === "dialogue") {
        const escapedName = characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`(?:^|[,;:]\\s*)${escapedName}[.!?]*$`, "i").test(text)) return [];
      }
      if (kind === "action") return [`*${text}*`];
      if (kind === "narration") return [`[${text}]`];
      if (kind === "dialogue") return [text];
      return [];
    }).slice(0, 40);

    return segments.length > 0 ? segments.join("\n\n") : value;
  } catch {
    return value.replace(/^\s*\*\s*(?:\r?\n)+/, "").trim();
  }
}

async function streamReply(
  apiToken: string, model: string, prompt: string, isTest: boolean,
  temperature: number, replyLength: ReplyLength,
  stopSequences: string[], controller: AbortController, timeout: NodeJS.Timeout,
) {
  const upstream = await fetch(`${NOVELAI_BASE}/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      max_tokens: isTest ? 32 : REPLY_LENGTHS[replyLength].maxTokens,
      temperature: isTest ? 0.1 : temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
      stop: stopSequences,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    const err = providerError(upstream.status);
    return Response.json({ error: `${err} ${text}`.trim() }, { status: 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async pull(c) {
      try {
        const { done, value } = await reader.read();
        if (done) { c.close(); return; }
        const chunk = decoder.decode(value, { stream: true });
        c.enqueue(new TextEncoder().encode(chunk));
      } catch { c.close(); }
    },
    cancel() { reader.cancel().catch(() => {}); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function nonStreamReply(
  apiToken: string, model: string, prompt: string, isTest: boolean,
  temperature: number, replyLength: ReplyLength, outputName: string,
  proseFormat: ProseFormat, outputKind: "player" | "character", stopSequences: string[],
  contextManifest: ContextManifest | undefined, controller: AbortController, timeout: NodeJS.Timeout,
) {
  const upstream = await fetch(`${NOVELAI_BASE}/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      max_tokens: isTest ? 32 : REPLY_LENGTHS[replyLength].maxTokens,
      temperature: isTest ? 0.1 : temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
      stop: stopSequences,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!upstream.ok) {
    return Response.json({ error: providerError(upstream.status) }, { status: 502 });
  }

  const result: unknown = await upstream.json();
  const rawReply = extractReply(result);
  const reply = isTest
    ? rawReply.trim().slice(0, 200)
    : cleanReply(rawReply, outputName, proseFormat, outputKind);

  if (!reply) {
    return Response.json({
      error: isTest ? "NovelAI returned no test response." : "NovelAI returned an empty reply.",
    }, { status: 502 });
  }

  if (isTest && !isSuccessfulConnectionReply(reply)) {
    return Response.json({
      error: "NovelAI returned an unexpected connection-test response.",
    }, { status: 502 });
  }

  return Response.json(isTest ? { ok: true, message: CONNECTION_TEST_RESPONSE } : { reply, context: contextManifest });
}

function isSuccessfulConnectionReply(value: string): boolean {
  const normalized = value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[“”"'`*_#.:!?-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return normalized.includes(CONNECTION_TEST_RESPONSE.toLowerCase());
}

function parseCharacter(v: unknown): CharacterPrompt | null {
  if (!isRecord(v)) return null;
  const id = limitedString(v.id, 120);
  const name = limitedString(v.name, 120);
  const role = limitedString(v.role, 300);
  const profile = limitedString(v.profile, 8000);
  const scene = limitedString(v.scene, 300);
  const weather = limitedString(v.weather, 300);
  const memories = Array.isArray(v.memories)
    ? v.memories.map((m: unknown) => limitedString(m, 600)).filter(Boolean).slice(0, 12)
    : [];
  const canonical = resolveLatestBuiltinCanon(id)
    ?? parseCanonicalCharacter(v.canonical)
    ?? (name && role && profile
      ? legacyCharacterToCanon({ id: id || name, name, role, profile })
      : null);
  if (!canonical) return null;
  const sandbox = v.sandbox === true;
  const worldId = limitedString(v.worldId, 120);
  const worldLore = sandbox
    ? null
    : resolveBuiltinWorldLore(worldId) ?? parseWorldLorebook(v.worldLore);
  return {
    name: canonical.identity.name,
    role: canonical.identity.role,
    canonical,
    scene,
    weather,
    memories,
    sandbox,
    relationship: limitedString(v.relationship, 240),
    contextMode: parseContextMode(v.contextMode),
    matureContentRequested: v.matureContentRequested === true,
    playerRole: limitedString(v.playerRole, 1000),
    worldLore,
    sceneId: limitedString(v.sceneId, 120),
  };
}

function parseMessages(v: unknown): RoleplayMessage[] {
  if (!Array.isArray(v)) return [];
  return v.slice(-30).map((m: unknown): RoleplayMessage | null => {
    if (!isRecord(m)) return null;
    const sender = limitedString(m.sender, 24);
    const text = limitedString(m.text, 4000);
    if (!ALLOWED_SENDERS.has(sender) || !text) return null;
    return { sender: sender as RoleplayMessage["sender"], text };
  }).filter((m): m is RoleplayMessage => m !== null);
}

function extractReply(v: unknown): string {
  if (!isRecord(v) || !Array.isArray(v.choices)) return "";
  const first = v.choices[0];
  if (!isRecord(first)) return "";
  if (typeof first.text === "string") return first.text;
  if (isRecord(first.message) && typeof first.message.content === "string") return first.message.content;
  return "";
}

function cleanReply(
  v: string, name: string, proseFormat: ProseFormat, outputKind: "player" | "character",
): string {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wrappedReply = outputKind === "player"
    ? v.match(/<(?:player|user)[^>]*>([\s\S]*?)<\/(?:player|user)>/i)
    : v.match(/<character_reply[^>]*>([\s\S]*?)<\/character_reply>/i);
  const withoutLeakTail = (wrappedReply?.[1] ?? v)
    .split(/\n\s*(?:<\/?(?:player|user|system|scene|character_reply)\b|(?:Player|User|System|Emotion|Mood|Analysis|Thinking|Write only the next roleplay passage)(?:\s*:|\s*$))/i)[0];
  let reply = withoutLeakTail
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/^(?:(?:Message|Response|Character|Narrator|Scene|Emotion|Mood|Analysis|Thinking)(?:\s*:\s*|\s*\n+))+/i, "")
    .replace(new RegExp(`\\b${esc}\\s*:\\s*`, "gi"), "")
    .replace(
      /(?:^|\s+)([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2}):\s*/g,
      "\n\n$1\n\n",
    )
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (proseFormat === "roleplay") {
    reply = reply
      .replace(/[“”"]/g, "")
      .replace(/\s*(\*[^*]+\*)\s*/g, "\n\n$1\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return reply.slice(0, 12_000);
}

function roleplayStops(): string[] {
  return [
    "\nPlayer:", "\nUser:", "\nSystem:", "\nEmotion:", "\nMood:",
    "\nAnalysis:", "\nThinking:", "\nWrite only the next roleplay passage",
    "\n<player>", "\n<user>", "\n<system>",
  ];
}

function impersonationStops(characterName: string): string[] {
  return [
    `\n${characterName}:`, "\nNarration:", "\nSystem:", "\nEmotion:", "\nMood:",
    "\nAnalysis:", "\nThinking:", "\nWrite the suggested player response",
    "\n<character_reply>", "\n<system>",
  ];
}

function providerError(status: number): string {
  if (status === 401) return "NovelAI rejected that access token.";
  if (status === 402 || status === 403) return "NovelAI did not authorize this generation.";
  if (status === 404) return "That NovelAI model is not currently available.";
  if (status === 429) return "NovelAI is receiving too many requests. Wait and try again.";
  if (status >= 500) return "NovelAI is temporarily unavailable.";
  return "NovelAI could not generate this reply.";
}

function limitedString(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function boundedNumber(v: unknown, min: number, max: number, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 16) : fallback;
}

function parseReplyLength(v: unknown): ReplyLength {
  return v === "quick" || v === "novel" || v === "immersive" ? v : "immersive";
}

function parseStoryPreferences(v: Record<string, unknown>): StoryPreferences {
  return {
    initiative: v.initiative === "reactive" || v.initiative === "proactive"
      ? v.initiative
      : "balanced",
    viewpoint: v.viewpoint === "user" || v.viewpoint === "roving"
      ? v.viewpoint
      : "character",
    tense: v.tense === "past" ? "past" : "present",
    proseFormat: v.proseFormat === "novel" ? "novel" : "roleplay",
  };
}

function parseContextMode(v: unknown): ContextMode {
  return v === "character" || v === "story" ? v : "balanced";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
