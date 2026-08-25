import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("curated workflow reuses the existing HWCC editor", async () => {
  const [app, roleplay, editor] = await Promise.all([
    read("app/dreambound-app.tsx"),
    read("app/features/roleplay/roleplay-area.tsx"),
    read("app/features/characters/advanced-character-editor.tsx"),
  ]);

  assert.match(app, /AdvancedCharacterEditor/);
  assert.match(app, /saveCuratedCharacter/);
  assert.match(app, /contextLabel=.*Create Curated Character/);
  assert.match(editor, /HWCC v1/);
  assert.doesNotMatch(roleplay, /raw[- ]json[- ]only curated/i);
});

test("curated controls and exports use the central capability", async () => {
  const [app, roleplay, bridge] = await Promise.all([
    read("app/dreambound-app.tsx"),
    read("app/features/roleplay/roleplay-area.tsx"),
    read("app/api/curator/lib.ts"),
  ]);

  assert.match(app, /canManageCuratedCharacters/);
  assert.match(roleplay, /props\.canManageCuratedCharacters/);
  assert.match(app, /authorizedExportSource/);
  assert.match(app, /authorize-export/);
  assert.match(bridge, /cookie/);
  assert.match(bridge, /curated-characters/);
});

test("curated identity remains stable when display data changes", async () => {
  const app = await read("app/dreambound-app.tsx");
  assert.match(app, /id: advancedEditingCharacter\.id/);
  assert.doesNotMatch(app, /curated.*name\.toLowerCase\(\).*id/is);
});


test("Archive uses Discord auth and Human Verified approval", () => {
  const archiveView = read("components/archive/archive-view.tsx");
  const archiveAuth = read("server/archive/auth.ts");
  const adminBridge = read("app/api/curator/lib.ts");

  assert.match(archiveView, /Continue with Discord/);
  assert.doesNotMatch(archiveView, /type="password"/);
  assert.match(archiveAuth, /humanVerified/);
  assert.match(archiveAuth, /canUseArchive/);
  assert.match(archiveAuth, /Discord login and Human Verified approval are required/);
  assert.match(adminBridge, /auth\/identity/);
});
