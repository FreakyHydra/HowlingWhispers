import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { strict as assert } from "node:assert";

const SOURCE_PATH = new URL("../features/chat/chat-workspace.tsx", import.meta.url);

const REQUIRED_DESTRUCTURED = [
  "livingCastEnabled",
  "livingCastConfig",
  "panelOrder",
  "panelVisibility",
  "onPanelOrderChange",
  "onPanelVisibilityChange",
  "onInviteCharacter",
  "onRemoveCharacter",
  "onConfigureLivingCast",
];

test("ChatWorkspace destructures all panel props used in render", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  const destructureMatch = source.match(
    /export\s+function\s+ChatWorkspace\s*\(\s*props\s*:\s*ChatWorkspaceProps\s*\)\s*\{\s*const\s+\{([\s\S]*?)\}\s*=\s*props;/,
  );
  assert.ok(destructureMatch, "Could not locate ChatWorkspace destructuring block");

  const destructureBlock = destructureMatch[1];

  for (const prop of REQUIRED_DESTRUCTURED) {
    const present = new RegExp(`\\b${prop}\\b`).test(destructureBlock);
    assert.ok(
      present,
      `"${prop}" is missing from the ChatWorkspace destructuring block — add it to the const { ... } = props block`,
    );
  }

  const hasPanelOrderIndexOf = source.includes("panelOrder.indexOf(");
  assert.ok(
    hasPanelOrderIndexOf,
    '"panelOrder" is destructured but not used with .indexOf( in the render body',
  );

  const hasPanelVisibilityUsage =
    source.includes("panelVisibility[") || source.includes("panelVisibility,");
  assert.ok(
    hasPanelVisibilityUsage,
    '"panelVisibility" is destructured but not referenced in the render body',
  );
});
