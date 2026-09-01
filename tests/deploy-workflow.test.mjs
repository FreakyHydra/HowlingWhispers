import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const deployScript = readFileSync(new URL("../scripts/deploy-dev-server.sh", import.meta.url), "utf8");

test("dev deployment is gated behind the full successful CI job", () => {
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /deploy-dev:[\s\S]*needs: validate/);
  assert.match(workflow, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/dev'/);
  assert.match(workflow, /APPROVED_SHA: \$\{\{ github\.sha \}\}/);
});

test("deployment targets only the dev checkout and sandbox service", () => {
  assert.match(workflow, /APP_DIR: \/var\/www\/hw/dev/);
  assert.match(workflow, /SERVICE: thehowlingwhispers-dev\.service/);
  assert.doesNotMatch(workflow, /howlingwhispers-promote/);
  assert.doesNotMatch(workflow, /SERVICE: thehowlingwhispers\.service/);
});

test("server refresh verifies the public page and bundle before success", () => {
  assert.match(deployScript, /curl -sS -L/);
  assert.match(deployScript, /src="\[\^"\]\+\\\.js/);
  assert.match(deployScript, /bundle_url="\$\{HEALTH_URL%\/\}\/\$\{bundle_path#\/\}"/);
  assert.match(deployScript, /verify_site/);
  assert.match(deployScript, /Rolling back to \$OLD_SHA/);
});

test("obsolete default-branch-only workflow_run deployment is removed", () => {
  assert.equal(existsSync(new URL("../.github/workflows/deploy-dev.yml", import.meta.url)), false);
});
