export type HowlingAddonManifest = {
  format: "howling-addon";
  formatVersion: 1;

  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;

  content: {
    commonScenes?: AddonCommonScene[];
  };
};

export type AddonCommonScene = {
  id: string;
  title: string;
  subtitle: string;
  weather: string;
  opening: string;
};

export type InstalledAddon = {
  manifest: HowlingAddonManifest;
  enabled: boolean;
  installedAt: number;
  updatedAt: number;
};

export function isHowlingAddon(value: unknown): value is HowlingAddonManifest {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.format !== "howling-addon") return false;
  if (record.formatVersion !== 1) return false;
  if (typeof record.id !== "string" || !record.id.trim()) return false;
  if (typeof record.name !== "string" || !record.name.trim()) return false;
  if (typeof record.version !== "string" || !record.version.trim()) return false;
  if (record.content && typeof record.content !== "object") return false;
  return true;
}

export function validateAddonContent(
  content: unknown,
): AddonCommonScene[] | null {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  if (!Array.isArray(record.commonScenes)) return null;
  const scenes: AddonCommonScene[] = [];
  for (const scene of record.commonScenes) {
    if (!scene || typeof scene !== "object") continue;
    const entry = scene as Record<string, unknown>;
    if (typeof entry.id !== "string" || !entry.id.trim()) continue;
    if (typeof entry.title !== "string" || !entry.title.trim()) continue;
    if (typeof entry.opening !== "string" || !entry.opening.trim()) continue;
    scenes.push({
      id: entry.id.trim().slice(0, 120),
      title: entry.title.trim().slice(0, 200),
      subtitle: typeof entry.subtitle === "string" ? entry.subtitle.trim().slice(0, 400) : "",
      weather: typeof entry.weather === "string" ? entry.weather.trim().slice(0, 200) : "",
      opening: entry.opening.trim(),
    });
  }
  return scenes;
}
