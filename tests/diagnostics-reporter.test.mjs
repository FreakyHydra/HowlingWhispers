import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const reporter = await readFile("components/diagnostics/diagnostics-reporter.tsx", "utf8");
const bridge = await readFile("app/api/curator/lib.ts", "utf8");
const changelog = `${await readFile("features/changelog/changelog-view.tsx", "utf8")}\n${await readFile("features/changelog/changelog-history.tsx", "utf8")}`;
const packageInfo = JSON.parse(await readFile("package.json", "utf8"));

test("diagnostics are opt-in, previewed, and privacy bounded", () => {
  assert.match(reporter, /Report a problem/);
  assert.match(reporter, /Review report/);
  assert.match(reporter, /Send diagnostic report/);
  assert.match(reporter, /View the exact technical details/);
  assert.match(reporter, /JSON\.stringify\(report, null, 2\)/);
  assert.match(reporter, /MAX_SIGNALS = 30/);
  assert.match(reporter, /notes\.slice\(0, 2000\)/);
  assert.doesNotMatch(reporter, /document\.cookie|localStorage|sessionStorage/);
  assert.doesNotMatch(reporter, /console\.(?:log|warn|error)/);
  assert.match(reporter, /Never included:<\/strong> cookies, tokens, Discord IDs, local storage, prompts, or story text/);
});

test("diagnostic transport is allowlisted and release is documented", () => {
  assert.match(bridge, /\|diagnostics\|/);
  assert.equal(packageInfo.version, "0.11.2.0");
  assert.match(changelog, /Version 0\.10\.3\.0 · The Signal Lantern/);
});
