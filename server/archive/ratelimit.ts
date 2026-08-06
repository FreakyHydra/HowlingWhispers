const buckets = new Map<string, number[]>();

export type RateLimitRule = {
  windowMs: number;
  max: number;
};

const DEFAULTS: Record<string, RateLimitRule> = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  publish: { windowMs: 60 * 60 * 1000, max: 20 },
  report: { windowMs: 60 * 60 * 1000, max: 20 },
  search: { windowMs: 60 * 1000, max: 60 },
  media: { windowMs: 60 * 60 * 1000, max: 30 },
};

export function rateLimit(key: string, rule?: RateLimitRule): boolean {
  const config = rule ?? DEFAULTS[key] ?? { windowMs: 60 * 1000, max: 60 };
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < config.windowMs);
  if (timestamps.length >= config.max) {
    buckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}

// Prune stale buckets so the map does not grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const alive = timestamps.filter((t) => now - t < 10 * 60 * 1000);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}, 5 * 60 * 1000).unref();

export function clientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  const real = req.headers["x-real-ip"];
  return typeof real === "string" ? real : "unknown";
}