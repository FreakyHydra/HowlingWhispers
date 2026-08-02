export type OllamaModelInfo = {
  name: string;
  size: number | null;
  family: string;
  parameterSize: string;
  quantization: string;
};

const MODEL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

export function parseOllamaModels(value: unknown): OllamaModelInfo[] {
  if (!isRecord(value) || !Array.isArray(value.models)) return [];

  const models = new Map<string, OllamaModelInfo>();
  for (const candidate of value.models.slice(0, 200)) {
    if (!isRecord(candidate)) continue;
    const name = modelName(candidate.name) || modelName(candidate.model);
    if (!name) continue;
    const details = isRecord(candidate.details) ? candidate.details : {};
    const previous = models.get(name);
    models.set(name, {
      name,
      size: typeof candidate.size === "number" && Number.isFinite(candidate.size)
        ? Math.max(0, candidate.size)
        : previous?.size ?? null,
      family: shortString(details.family, 80) || previous?.family || "",
      parameterSize: shortString(details.parameter_size, 40) || previous?.parameterSize || "",
      quantization: shortString(details.quantization_level, 40) || previous?.quantization || "",
    });
  }

  return [...models.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

export function isValidOllamaModelName(value: unknown): value is string {
  return typeof value === "string" && MODEL_NAME_PATTERN.test(value);
}

export function describeOllamaModel(model: OllamaModelInfo): string {
  const details = [model.parameterSize, model.quantization, model.family]
    .filter(Boolean)
    .join(" · ");
  if (details) return details;
  if (model.size !== null) return `${formatBytes(model.size)} installed`;
  return "Installed in Ollama";
}

function modelName(value: unknown): string {
  const name = shortString(value, 120);
  return isValidOllamaModelName(name) ? name : "";
}

function shortString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function formatBytes(value: number): string {
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(0)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
