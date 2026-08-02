import { parseOllamaModels, type OllamaModelInfo } from "./ollama.ts";

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_ADULT_MODEL = "R4C3R/gemma-3-12b-it-heretic:q4_k_m";

export const OLLAMA_BASE_URL = normalizeBaseUrl(
  process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
);

const adultModels = new Set(
  (process.env.OLLAMA_ADULT_MODELS ?? DEFAULT_ADULT_MODEL)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

export async function fetchInstalledOllamaModels(): Promise<OllamaModelInfo[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status} while listing models.`);
  }
  return parseOllamaModels(await response.json());
}

export function isAdultOllamaModel(name: string): boolean {
  return adultModels.has(name);
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL must use HTTP or HTTPS.");
  }
  return url.href.replace(/\/$/, "");
}
