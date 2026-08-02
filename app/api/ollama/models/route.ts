import { describeOllamaModel } from "../../../../lib/ollama.ts";
import {
  fetchInstalledOllamaModels,
  isAdultOllamaModel,
} from "../../../../lib/ollama-server.ts";

export const runtime = "edge";

export async function GET() {
  try {
    const models = (await fetchInstalledOllamaModels()).map((model) => ({
      ...model,
      value: model.name,
      label: model.name,
      description: describeOllamaModel(model),
      adult: isAdultOllamaModel(model.name),
    }));
    return Response.json(
      { models },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "The app server could not list its Ollama models." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
