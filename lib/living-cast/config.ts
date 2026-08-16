export type ParticipationMode = "smart" | "round-robin";

export interface LivingCastConfig {
  enabled: boolean;
  participationMode: ParticipationMode;
}

export const DEFAULT_LIVING_CAST_CONFIG: LivingCastConfig = {
  enabled: false,
  participationMode: "smart",
};

const LIVING_CAST_CONFIG_KEY = "dreambound_livingCastConfig";

function readRaw(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

export function readLivingCastConfig(): LivingCastConfig {
  const raw = readRaw(LIVING_CAST_CONFIG_KEY);
  if (raw) {
    try {
      return { ...DEFAULT_LIVING_CAST_CONFIG, ...JSON.parse(raw) };
    } catch {
      /* ignore parse errors */
    }
  }
  return DEFAULT_LIVING_CAST_CONFIG;
}

export function writeLivingCastConfig(config: LivingCastConfig): void {
  writeRaw(LIVING_CAST_CONFIG_KEY, JSON.stringify(config));
}
