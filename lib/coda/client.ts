import type { CodaMode, CodaProposal, CodaTarget } from "./authoring.ts";

export type CodaProvider = "novelai" | "local" | "device";

export type CodaClientRequest = {
  provider: CodaProvider;
  model: string;
  apiToken?: string;
  ollamaOrigin?: string;
  target: CodaTarget;
  mode: CodaMode;
  instruction: string;
  current?: unknown;
  signal?: AbortSignal;
};

export type CodaClientResult = {
  proposal: CodaProposal;
};

export async function requestCoda(input: CodaClientRequest): Promise<CodaClientResult> {
  if (input.provider === "device") return requestDeviceCoda(input);

  const response = await fetch("/api/coda/author", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate",
      provider: input.provider,
      model: input.model,
      apiToken: input.apiToken,
      target: input.target,
      mode: input.mode,
      instruction: input.instruction,
      current: input.current,
    }),
    signal: input.signal,
  });
  return readCodaResponse(response);
}

async function requestDeviceCoda(input: CodaClientRequest): Promise<CodaClientResult> {
  const preparedResponse = await fetch("/api/coda/author", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare-device",
      provider: "device",
      model: input.model,
      target: input.target,
      mode: input.mode,
      instruction: input.instruction,
      current: input.current,
    }),
    signal: input.signal,
  });
  const preparedPayload = await readJson(preparedResponse);
  if (!preparedResponse.ok) throw new Error(errorMessage(preparedPayload, "Coda could not prepare the local request."));
  if (!isRecord(preparedPayload) || !isRecord(preparedPayload.prepared)) {
    throw new Error("Coda returned an invalid local request contract.");
  }

  const prepared = preparedPayload.prepared;
  const prompt = typeof prepared.prompt === "string" ? prepared.prompt : "";
  if (!prompt) throw new Error("Coda prepared an empty local prompt.");

  const ollamaOrigin = (input.ollamaOrigin || "http://127.0.0.1:11434").replace(/\/$/, "");
  const localResponse = await fetch(`${ollamaOrigin}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      prompt,
      stream: false,
      options: isRecord(prepared.ollama) && isRecord(prepared.ollama.options)
        ? prepared.ollama.options
        : { temperature: 0.55, top_p: 0.95 },
    }),
    signal: input.signal,
  });
  const localPayload = await readJson(localResponse);
  if (!localResponse.ok) throw new Error(errorMessage(localPayload, `Ollama rejected Coda's request (HTTP ${localResponse.status}).`));
  const rawReply = isRecord(localPayload) && typeof localPayload.response === "string"
    ? localPayload.response.trim()
    : "";
  if (!rawReply) throw new Error("The local model returned an empty Coda response.");

  const finalizeResponse = await fetch("/api/coda/author", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finalize-device",
      target: input.target,
      mode: input.mode,
      rawReply,
    }),
    signal: input.signal,
  });
  return readCodaResponse(finalizeResponse);
}

async function readCodaResponse(response: Response): Promise<CodaClientResult> {
  const payload = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, `Coda failed (HTTP ${response.status}).`));
  if (!isRecord(payload) || !isRecord(payload.proposal)) throw new Error("Coda returned an invalid proposal.");
  return { proposal: payload.proposal as CodaProposal };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return { error: text.slice(0, 500) }; }
}

function errorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" && value.error.trim()
    ? value.error.trim()
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
