import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compareVersions, isNewerVersion, parseVersion } from "../lib/version.mjs";

test("parses release tags and ignores build metadata for precedence", () => {
  assert.deepEqual(parseVersion("v0.2.0+windows.1"), {
    major: 0,
    minor: 2,
    patch: 0,
    build: 0,
    prerelease: [],
  });
  assert.equal(parseVersion("0.4.5.3").build, 3);
  assert.equal(parseVersion("0.2"), null);
  assert.equal(parseVersion("release-0.2.0"), null);
});

test("compares stable semantic versions", () => {
  assert.equal(compareVersions("v0.2.0", "0.1.0"), 1);
  assert.equal(compareVersions("0.2.0", "0.2.0"), 0);
  assert.equal(compareVersions("0.1.9", "0.2.0"), -1);
  assert.equal(isNewerVersion("v1.0.0", "0.2.0"), true);
  assert.equal(compareVersions("0.4.2.6", "0.4.2.5"), 1);
  assert.equal(compareVersions("0.4.2.6", "0.4.7"), 1);
  assert.equal(compareVersions("0.4.2.6", "0.4.8"), 0);
});

test("does not offer prereleases over the matching stable version", () => {
  assert.equal(isNewerVersion("0.2.0-beta.1", "0.2.0"), false);
  assert.equal(isNewerVersion("0.2.0", "0.2.0-beta.1"), true);
  assert.equal(isNewerVersion("0.2.0-beta.10", "0.2.0-beta.2"), true);
  assert.equal(isNewerVersion("not-a-version", "0.2.0"), false);
});

test("release metadata uses one version across package and launcher sources", async () => {
  const packageInfo = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const launcher = await readFile(new URL("../launcher/HowlingWhispersLauncher.cs", import.meta.url), "utf8");
  const updateConfig = JSON.parse(
    await readFile(new URL("../public/update-config.json", import.meta.url), "utf8"),
  );
  assert.equal(packageInfo.version, "0.5.0");
  assert.equal(packageLock.version, packageInfo.version);
  assert.equal(packageLock.packages[""].version, packageInfo.version);
  assert.match(launcher, new RegExp(`AssemblyVersion\\("${packageInfo.version}"\\)`));
  assert.match(launcher, new RegExp(`AssemblyFileVersion\\("${packageInfo.version}"\\)`));
  assert.equal(updateConfig.repository, "FreakyHydra/HowlingWhispers");
  assert.equal(updateConfig.assetName, "the-howling-whispers-windows.zip");
  assert.equal(updateConfig.checksumAssetName, "the-howling-whispers-windows.zip.sha256");
});
