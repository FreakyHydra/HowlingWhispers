import {
  buildCodaPrompt,
  extractJsonObject,
  parseCodaProposal,
  type CodaMode,
  type CodaTarget,
} from "../../../../lib/coda/authoring.ts";

export const runtime = "edge";

const NOVELAI_BASE = "https://text.novelai.net/oa/v1";
const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ALLOWED_MODELS = new Set(["xialong-v1", "glm-4-6"]);
const ALLOWED_MODES = new Set<CodaMode>(["generate", "expand", "fill", "organize", "transform"]);
const ALLOWED_TARGETS = new Set<CodaTarget>(["character", "world-lore"]);

type CodaProvider = "novelai" | "local" | "device";
type CodaAction = "generate" | "prepare-device" | "finalize-device";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The Coda request was not valid JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: "The Coda request was malformed." }, { status: 400 });
  }

  const action = parseAction(body.action);
  const instruction = limitedString(body.instruction, 8_000);
  const target = parseTarget(body.target);
  const mode = parseMode(body.mode);
  const provider = parseProvider(body.provider);
  const model = limitedString(body.model, 160) || (provider === "novelai" ? "xialong-v1" : "");

  if (!action) return Response.json({ error: "Choose a valid Coda action." }, { status: 400 });
  if (!target) return Response.json({ error: "Choose character or world-lore as Coda's target." }, { status: 400 });
  if (!mode) return Response.json({ error: "Choose a valid Coda authoring mode." }, { status: 400 });

  if (action === "finalize-device") {
    const raw = limitedString(body.rawReply, 80_000);
    if (!raw) return Response.json({ error: "The local model returned an empty Coda response." }, { status: 502 });
    return proposalResponse(raw, target, mode);
  }

  if (!instruction) return Response.json({ error: "Tell Coda what you want her to create or change." }, { status: 400 });
  if (!provider) return Response.json({ error: "Choose NovelAI, Local, or This computer for Coda." }, { status: 400 });
  if (!model) return Response.json({ error: "Choose a model for Coda." }, { status: 400 });
  if (provider === "novelai" && !ALLOWED_MODELS.has(model)) {
    return Response.json({ error: "Choose Xialong or GLM 4.6 for NovelAI Coda." }, { status: 400 });
  }

  const prompt = buildCodaPrompt({
    target,
    mode,
    instruction,
    current: body.current,
  });

  if (action === "prepare-device" || provider === "device") {
    return Response.json({
      prepared: {
        prompt,
        model,
        target,
        mode,
        ollama: {
          stream: false,
          options: { temperature: 0.55, top_p: 0.95 },
        },
      },
    });
  }

  if (provider === "local") {
    return runServerOllama({ request, prompt, model, target, mode });
  }

  const apiToken = limitedString(body.apiToken, 4096);
  if (!apiToken) return Response.json({ error: "A NovelAI access token is required." }, { status: 400 });
  return runNovelAi({ request, prompt, model, apiToken, target, mode });
}

async function runNovelAi(input: {
  request: Request;
  prompt: string;
  model: string;
  apiToken: string;
  target: CodaTarget;
  mode: CodaMode;
}) {
  const controller = linkedAbortController(input.request.signal);
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const upstream = await fetch(`${NOVELAI_BASE}/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        max_tokens: input.target === "world-lore" ? 1600 : 1900,
        temperature: 0.55,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
        stop: ["<|user|>", "<|assistant|>"],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return Response.json({
        error: `${providerError(upstream.status)} ${details.slice(0, 300)}`.trim(),
      }, { status: 502 });
    }

    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      return Response.json({ error: "NovelAI returned an invalid response to Coda." }, { status: 502 });
    }
    const raw = extractNovelAiReply(payload);
    if (!raw) return Response.json({ error: "Coda received an empty response from NovelAI." }, { status: 502 });
    return proposalResponse(raw, input.target, input.mode);
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut
        ? "Coda took too long waiting for NovelAI. Try again."
        : "Coda could not reach NovelAI. Try again.",
    }, { status: 502 });
  }
}

async function runServerOllama(input: {
  request: Request;
  prompt: string;
  model: string;
  target: CodaTarget;
  mode: CodaMode;
}) {
  const controller = linkedAbortController(input.request.signal);
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const upstream = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        stream: false,
        keep_alive: -1,
        options: { temperature: 0.55, top_p: 0.95 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return Response.json({
        error: `Local Coda model failed (HTTP ${upstream.status}). ${details.slice(0, 300)}`.trim(),
      }, { status: 502 });
    }
    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      return Response.json({ error: "The local Coda model returned invalid JSON." }, { status: 502 });
    }
    const raw = isRecord(payload) ? limitedString(payload.response, 80_000) : "";
    if (!raw) return Response.json({ error: "The local Coda model returned an empty response." }, { status: 502 });
    return proposalResponse(raw, input.target, input.mode);
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({
      error: timedOut
        ? "The local Coda model took too long. Try again."
        : "Coda could not reach the server-local Ollama model.",
    }, { status: 502 });
  }
}

function proposalResponse(raw: string, target: CodaTarget, mode: CodaMode) {
  const decoded = extractJsonObject(raw);
  const proposal = parseCodaProposal(decoded, target, mode);
  if (!proposal) {
    return Response.json({
      error: "Coda could not turn that response into a valid structured proposal. Try Regenerate or make the instruction more specific.",
      raw: raw.slice(0, 1_500),
    }, { status: 502 });
  }
  return Response.json({ proposal });
}

function linkedAbortController(signal: AbortSignal): AbortController {
  const controller = new AbortController();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller;
}

function parseAction(value: unknown): CodaAction | null {
  if (value === undefined || value === null || value === "") return "generate";
  return value === "generate" || value === "prepare-device" || value === "finalize-device"
    ? value
    : null;
}

function parseProvider(value: unknown): CodaProvider | null {
  if (value === undefined || value === null || value === "") return "novelai";
  return value === "novelai" || value === "local" || value === "device" ? value : null;
}

function parseTarget(value: unknown): CodaTarget | null {
  return typeof value === "string" && ALLOWED_TARGETS.has(value as CodaTarget)
    ? value as CodaTarget
    : null;
}

function parseMode(value: unknown): CodaMode | null {
  if (value === undefined || value === null || value === "") return "organize";
  return typeof value === "string" && ALLOWED_MODES.has(value as CodaMode)
    ? value as CodaMode
    : null;
}

function extractNovelAiReply(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.choices)) return "";
  const first = value.choices[0];
  if (!isRecord(first)) return "";
  if (typeof first.text === "string") return first.text.trim();
  if (isRecord(first.message) && typeof first.message.content === "string") return first.message.content.trim();
  return "";
}

function providerError(status: number): string {
  if (status === 401 || status === 403) return "NovelAI rejected the access token.";
  if (status === 429) return "NovelAI is rate-limiting Coda.";
  if (status >= 500) return "NovelAI is temporarily unavailable.";
  return `NovelAI rejected Coda's request (HTTP ${status}).`;
}

function limitedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
