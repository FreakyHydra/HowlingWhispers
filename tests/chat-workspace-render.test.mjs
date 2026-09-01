import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const WRAPPER_SOURCE_PATH = new URL("../features/chat/chat-workspace.tsx", import.meta.url);
const LEGACY_SOURCE_PATH = new URL("../features/chat/chat-workspace-legacy.tsx", import.meta.url);
const RS_V2_PANEL_PATH = new URL("../features/chat/relationship-v2-panel.tsx", import.meta.url);
const CSS_PATH = new URL("../app/globals.css", import.meta.url);

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

const EXPECTED_PANEL_IDS = [
  "scene",
  "memory",
  "living-cast",
  "context-inspector",
  "connection",
];

const RS_V2_DIMENSIONS = [
  "trust",
  "affection",
  "respect",
  "fear",
  "comfort",
  "suspicion",
  "attachment",
  "protectiveness",
  "resentment",
  "loyalty",
  "familiarity",
  "authority",
];

test("ChatWorkspace panel layout regression", async () => {
  const source = await readFile(LEGACY_SOURCE_PATH, "utf8");
  const css = await readFile(CSS_PATH, "utf8");

  const destructureMatch = source.match(
    /export\s+function\s+ChatWorkspace\s*\(\s*props\s*:\s*ChatWorkspaceProps\s*\)\s*\{\s*const\s+\{([\s\S]*?)\}\s*=\s*props;/,
  );
  assert.ok(destructureMatch, "Could not locate preserved ChatWorkspace destructuring block");
  const destructureBlock = destructureMatch[1];

  for (const prop of REQUIRED_DESTRUCTURED) {
    assert.ok(
      new RegExp(`\\b${prop}\\b`).test(destructureBlock),
      `"${prop}" must be destructured from props`,
    );
  }

  assert.ok(source.includes("panelOrder.map("), "panelOrder.map( must be used for panel rendering");
  assert.ok(
    source.includes("if (panelVisibility[panelId] === false) return null;"),
    "Visibility guard must skip hidden panels",
  );

  for (const panelId of EXPECTED_PANEL_IDS) {
    assert.ok(
      source.includes(`case "${panelId}":`),
      `Panel ID "${panelId}" must have its own case branch`,
    );
  }

  const contextCardMatches = [...source.matchAll(/<section\b[^>]*className="context-rail-card context-card"/g)];
  assert.ok(contextCardMatches.length > 0, "context-rail-card context-card sections must exist");

  const renderMapIndex = source.lastIndexOf("panelOrder.map(");
  const renderBlockStart = source.lastIndexOf("{", renderMapIndex);
  const afterRenderBlock = source.indexOf("</aside>", renderBlockStart);

  for (const match of contextCardMatches) {
    assert.ok(
      match.index >= renderBlockStart && match.index <= afterRenderBlock,
      "All context-rail-card context-card sections must be inside panelOrder.map render block",
    );
  }

  assert.ok(
    source.includes("[next[index - 1], next[index]] = [next[index], next[index - 1]]"),
    "Move Up must swap with previous index",
  );
  assert.ok(
    source.includes("[next[index], next[index + 1]] = [next[index + 1], next[index]]"),
    "Move Down must swap with next index",
  );

  assert.ok(source.includes("const PANEL_LABELS:"), "PANEL_LABELS constant must exist");
  assert.ok(
    source.includes("PANEL_LABELS[panelId]"),
    "PANEL_LABELS[panelId] must be used for dropdown labels",
  );

  assert.ok(
    css.includes(".panel-controls-dropdown") &&
      css.includes("max-height") &&
      css.includes("overflow-y: auto"),
    "Dropdown CSS must constrain height with max-height and overflow-y: auto",
  );

  const visibilityChangeMatch = source.match(
    /onPanelVisibilityChange\(\s*\w+\s*\)/,
  );
  assert.ok(visibilityChangeMatch, "onPanelVisibilityChange must be called with a variable/update");

  const orderChangeMatch = source.match(
    /onPanelOrderChange\(\s*\w+\s*\)/,
  );
  assert.ok(orderChangeMatch, "onPanelOrderChange must be called with a variable/update");
});

test("RS V2 wrapper preserves ChatWorkspace and mounts live relationship state below the bond meter", async () => {
  const wrapper = await readFile(WRAPPER_SOURCE_PATH, "utf8");
  const panel = await readFile(RS_V2_PANEL_PATH, "utf8");

  assert.match(wrapper, /ChatWorkspace as LegacyChatWorkspace/);
  assert.match(wrapper, /<LegacyChatWorkspace \{\.\.\.props\} \/>/);
  assert.match(wrapper, /\.context-rail \.connection-card \.bond-meter/);
  assert.match(wrapper, /bondMeter\.insertAdjacentElement\("afterend", host\)/);
  assert.match(wrapper, /className = "rs-v2-host"/);
  assert.match(wrapper, /<RelationshipV2Panel/);
  assert.match(wrapper, /characterId=\{props\.selected\.id\}/);
  assert.match(wrapper, /personaId=\{props\.activeSession\.playerPersonaId\}/);
  assert.match(wrapper, /relationshipScore=\{props\.relationshipScore\}/);
  assert.match(wrapper, /activeContextManifest\?\.simulation\?\.relationshipDimensions/);
  assert.match(wrapper, /activeContextManifest\?\.simulation\?\.relationshipMomentum/);
  assert.match(wrapper, /props\.activeSession\.locationId/);

  assert.match(panel, /RELATIONSHIPS_UPDATED_EVENT/);
  assert.match(panel, /window\.addEventListener\(RELATIONSHIPS_UPDATED_EVENT, refresh\)/);
  assert.match(panel, /role="meter"/);
  assert.match(panel, /aria-valuemin=\{-100\}/);
  assert.match(panel, /aria-valuemax=\{100\}/);
  assert.match(panel, /Existing story detected/);

  for (const dimension of RS_V2_DIMENSIONS) {
    assert.ok(
      panel.includes(`${dimension}: "`),
      `RS V2 panel must expose the ${dimension} dimension`,
    );
  }
});
