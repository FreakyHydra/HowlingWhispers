export const WORLD_TIME_ZONE = "Europe/Berlin";

export type WorldTimeMessage = {
  timestamp?: number;
};

export type WorldClockSnapshot = {
  timestamp: number;
  timeZone: typeof WORLD_TIME_ZONE;
  localDate: string;
  localTime: string;
  localDateTime: string;
  weekday: string;
  dayPeriod: "night" | "morning" | "afternoon" | "evening";
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORLD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "long",
});

function partsFor(timestamp: number): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of DATE_TIME_FORMATTER.formatToParts(new Date(timestamp))) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

function dayPeriodFor(hour: number): WorldClockSnapshot["dayPeriod"] {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

export function captureWorldTime(timestamp = Date.now()): WorldClockSnapshot {
  const safeTimestamp = Number.isFinite(timestamp) ? Math.floor(timestamp) : Date.now();
  const parts = partsFor(safeTimestamp);
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const localTime = `${parts.hour}:${parts.minute}:${parts.second}`;
  return {
    timestamp: safeTimestamp,
    timeZone: WORLD_TIME_ZONE,
    localDate,
    localTime,
    localDateTime: `${localDate} ${localTime}`,
    weekday: parts.weekday,
    dayPeriod: dayPeriodFor(Number(parts.hour)),
  };
}

export function normalizeWorldTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const timestamp = Math.floor(value);
  // Reject obviously invalid dates while allowing old imported conversations.
  if (timestamp < 0 || timestamp > 8_640_000_000_000_000) return undefined;
  return timestamp;
}

export function elapsedWorldTime(fromTimestamp: number, toTimestamp: number): string {
  const deltaMs = Math.max(0, toTimestamp - fromTimestamp);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    return remainder === 0
      ? `${hours} hour${hours === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"} ${remainder} minute${remainder === 1 ? "" : "s"}`;
  }
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder === 0
    ? `${days} day${days === 1 ? "" : "s"}`
    : `${days} day${days === 1 ? "" : "s"} ${remainder} hour${remainder === 1 ? "" : "s"}`;
}

export function renderWorldClockContext(
  messages: WorldTimeMessage[],
  nowTimestamp = Date.now(),
): string {
  const now = captureWorldTime(nowTimestamp);
  let latestTimestamp: number | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = normalizeWorldTimestamp(messages[index]?.timestamp);
    if (candidate !== undefined) {
      latestTimestamp = candidate;
      break;
    }
  }

  const lines = [
    "<world-clock>",
    `Canonical roleplay clock: ${now.localDateTime} (${now.weekday}, ${now.dayPeriod}) in ${WORLD_TIME_ZONE}.`,
    "Treat timestamps as continuity facts. Use them to reason about elapsed time, day/night, waiting, sleep, travel duration, schedules, and other time-dependent events when relevant.",
    "Do not mention the clock or timestamps unless time is naturally relevant in the scene.",
  ];
  if (latestTimestamp !== undefined && latestTimestamp <= now.timestamp) {
    const latest = captureWorldTime(latestTimestamp);
    lines.push(
      `Most recent timestamped turn: ${latest.localDateTime}; ${elapsedWorldTime(latestTimestamp, now.timestamp)} elapsed before this generation.`,
    );
  }
  lines.push("</world-clock>");
  return lines.join("\n");
}
