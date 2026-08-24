import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_TIME_ZONE,
  captureWorldTime,
  elapsedWorldTime,
  normalizeWorldTimestamp,
  renderWorldClockContext,
} from "../lib/generation/world-clock.ts";

test("world clock is pinned to Europe/Berlin", () => {
  const snapshot = captureWorldTime(Date.UTC(2026, 7, 24, 14, 30, 15));
  assert.equal(WORLD_TIME_ZONE, "Europe/Berlin");
  assert.equal(snapshot.localDate, "2026-08-24");
  assert.equal(snapshot.localTime, "16:30:15");
  assert.equal(snapshot.weekday, "Monday");
  assert.equal(snapshot.dayPeriod, "afternoon");
});

test("world clock follows Berlin daylight-saving changes", () => {
  const summer = captureWorldTime(Date.UTC(2026, 7, 24, 12, 0, 0));
  const winter = captureWorldTime(Date.UTC(2026, 11, 24, 12, 0, 0));
  assert.equal(summer.localTime, "14:00:00");
  assert.equal(winter.localTime, "13:00:00");
});

test("elapsed world time produces compact continuity text", () => {
  const start = Date.UTC(2026, 7, 24, 10, 0, 0);
  assert.equal(elapsedWorldTime(start, start + 45_000), "45 seconds");
  assert.equal(elapsedWorldTime(start, start + 90 * 60_000), "1 hour 30 minutes");
  assert.equal(elapsedWorldTime(start, start + 26 * 60 * 60_000), "1 day 2 hours");
});

test("timestamp parser accepts finite epoch milliseconds and rejects junk", () => {
  assert.equal(normalizeWorldTimestamp(1_787_582_400_000), 1_787_582_400_000);
  assert.equal(normalizeWorldTimestamp("1787582400000"), undefined);
  assert.equal(normalizeWorldTimestamp(Number.NaN), undefined);
  assert.equal(normalizeWorldTimestamp(-1), undefined);
});

test("clock context reports latest turn elapsed time without forcing narration", () => {
  const previous = Date.UTC(2026, 7, 24, 12, 0, 0);
  const now = previous + 75 * 60_000;
  const block = renderWorldClockContext([
    { timestamp: previous - 10_000 },
    { timestamp: previous },
  ], now);
  assert.match(block, /Canonical roleplay clock:/);
  assert.match(block, /Europe\/Berlin/);
  assert.match(block, /1 hour 15 minutes elapsed/);
  assert.match(block, /Do not mention the clock or timestamps unless time is naturally relevant/);
});
