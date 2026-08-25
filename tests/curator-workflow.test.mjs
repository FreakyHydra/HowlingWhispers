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
  assert.match(app, /record\.id === record\.character\.id/);
});


test("Archive uses Discord auth and Human Verified approval", async () => {
  const [archiveView, archiveAuth, adminBridge] = await Promise.all([
    read("components/archive/archive-view.tsx"),
    read("server/archive/auth.ts"),
    read("app/api/curator/lib.ts"),
  ]);

  assert.match(archiveView, /Continue with Discord/);
  assert.doesNotMatch(archiveView, /type="password"/);
  assert.match(archiveAuth, /humanVerified/);
  assert.match(archiveAuth, /canUseArchive/);
  assert.match(archiveAuth, /Discord login and Human Verified approval are required/);
  assert.match(adminBridge, /login\|logout\|identity/);
});


test("Discord bridge preserves cookies, encoded IDs, and shared logout state", async () => {
  const [bridge, app, archiveView] = await Promise.all([
    read("app/api/curator/lib.ts"),
    read("app/dreambound-app.tsx"),
    read("components/archive/archive-view.tsx"),
  ]);

  assert.match(bridge, /getSetCookie/);
  assert.match(bridge, /%\[0-9A-Fa-f\]/);
  assert.match(app, /setArchiveUser\(null\)/);
  assert.match(app, /howling:discord-auth-changed/);
  assert.match(archiveView, /howling:discord-auth-changed/);
});


test("welcome mat owns Discord login and only admins receive the Admin entry", async () => {
  const [app, archiveView, styles] = await Promise.all([
    read("app/dreambound-app.tsx"),
    read("components/archive/archive-view.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(app, /archiveRole\?: "user" \| "moderator"/);
  assert.match(app, /function handleDiscordLogin\(\)/);
  assert.match(app, /new URL\("\/", window\.location\.origin\)/);
  assert.match(app, /discordIdentity\.archiveRole === "moderator"/);
  assert.match(app, /https:\/\/admin\.thehowlingwhispers\.com/);
  assert.match(app, />\s*Open Admin\s*</);
  assert.match(app, />\s*Login with Discord\s*</);
  assert.match(archiveView, /discordLoginUrl\(new URL\("\/", window\.location\.origin\)\.toString\(\)\)/);
  assert.doesNotMatch(app, /return_to=.*admin\.thehowlingwhispers\.com/);
  assert.match(styles, /\.settings-page > \.persona-library\s*\{[\s\S]*?margin-inline: auto;[\s\S]*?max-width: 1180px;[\s\S]*?width: 100%;/);
});
