import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_TIME_ZONE,
  captureWorldTime,
  elapsedWorldTime,
  formatWorldTimestamp,
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

test("timestamp parser accepts modern epoch milliseconds and rejects legacy ids or junk", () => {
  assert.equal(normalizeWorldTimestamp(1_787_582_400_000), 1_787_582_400_000);
  assert.equal(normalizeWorldTimestamp(1), undefined);
  assert.equal(normalizeWorldTimestamp(2), undefined);
  assert.equal(normalizeWorldTimestamp("1787582400000"), undefined);
  assert.equal(normalizeWorldTimestamp(Number.NaN), undefined);
  assert.equal(normalizeWorldTimestamp(-1), undefined);
});

test("world timestamps render in canonical Berlin time", () => {
  const timestamp = Date.UTC(2026, 7, 24, 14, 30, 15);
  assert.equal(formatWorldTimestamp(timestamp), "2026-08-24 16:30:15 Europe/Berlin");
  assert.equal(formatWorldTimestamp(1), "");
});

test("clock context reports latest turn time and recent turn gap without forcing narration", () => {
  const first = Date.UTC(2026, 7, 24, 12, 0, 0);
  const second = first + 10 * 60_000;
  const now = second + 65 * 60_000;
  const block = renderWorldClockContext([
    { timestamp: first },
    { timestamp: second },
  ], now);
  assert.match(block, /Canonical roleplay clock:/);
  assert.match(block, /Europe\/Berlin/);
  assert.match(block, /1 hour 5 minutes elapsed/);
  assert.match(block, /Gap between the two most recent timestamped turns: 10 minutes/);
  assert.match(block, /Do not mention the clock or timestamps unless time is naturally relevant/);
});
