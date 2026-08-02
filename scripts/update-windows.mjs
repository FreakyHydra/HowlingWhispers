import { createHash } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { isNewerVersion } from "../lib/version.mjs";

const root = resolve(import.meta.dirname, "..");
const configPath = join(root, "public", "update-config.json");
const packagePath = join(root, "package.json");

async function fetchResponse(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "the-howling-whispers-updater",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  return response;
}

async function runPowerShell(args) {
  const process = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", ...args], {
    stdio: "inherit",
  });
  const code = await new Promise((resolveExit) => process.once("exit", resolveExit));
  if (code !== 0) throw new Error(`PowerShell exited with code ${code ?? 1}`);
}

function powerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const packageInfo = JSON.parse(await readFile(packagePath, "utf8"));
if (!config.repository) {
  console.log("Automatic updates are not configured yet; continuing with the installed version.");
  process.exit(0);
}

console.log(`Checking GitHub for updates to ${packageInfo.displayName}...`);
const release = await (await fetchResponse(
  `https://api.github.com/repos/${config.repository}/releases/latest`,
)).json();
if (!isNewerVersion(release.tag_name, packageInfo.version)) {
  console.log(`Version ${packageInfo.version} is current.`);
  process.exit(0);
}

const archiveAsset = release.assets?.find((asset) => asset.name === config.assetName);
const checksumAsset = release.assets?.find((asset) => asset.name === config.checksumAssetName);
if (!archiveAsset || !checksumAsset) {
  throw new Error("The latest release does not contain the configured ZIP and checksum assets.");
}

const updateDirectory = join(tmpdir(), "TheHowlingWhispersUpdate");
const archivePath = join(updateDirectory, config.assetName);
const extractPath = join(updateDirectory, "extracted");
await rm(updateDirectory, { recursive: true, force: true });
await mkdir(extractPath, { recursive: true });

console.log(`Downloading ${release.tag_name}...`);
const archive = Buffer.from(await (await fetchResponse(archiveAsset.browser_download_url)).arrayBuffer());
const checksumText = await (await fetchResponse(checksumAsset.browser_download_url)).text();
const expectedChecksum = checksumText.match(/[a-f0-9]{64}/i)?.[0]?.toLowerCase();
const actualChecksum = createHash("sha256").update(archive).digest("hex");
if (!expectedChecksum || expectedChecksum !== actualChecksum) {
  throw new Error("The downloaded update failed SHA-256 verification.");
}
await writeFile(archivePath, archive);
await runPowerShell([
  "-Command",
  `Expand-Archive -LiteralPath ${powerShellLiteral(archivePath)} -DestinationPath ${powerShellLiteral(extractPath)} -Force`,
]);

const extractedEntries = await readdir(extractPath, { withFileTypes: true });
const singleDirectory = extractedEntries.length === 1 && extractedEntries[0].isDirectory()
  ? join(extractPath, extractedEntries[0].name)
  : extractPath;
let applicationPayload = singleDirectory;
try {
  await access(join(singleDirectory, "System", "package.json"));
  applicationPayload = join(singleDirectory, "System");
} catch { /* legacy flat release layout */ }

const protectedPaths = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vinext",
  ".wrangler",
  ".sites-runtime",
  "public/update-config.json",
  "START THE HOWLING WHISPERS.bat",
  "The Howling Whispers.exe",
]);
await cp(applicationPayload, root, {
  recursive: true,
  force: true,
  filter(source) {
    const path = relative(applicationPayload, source).replaceAll("\\", "/");
    return !protectedPaths.has(path) && ![...protectedPaths].some((item) => path.startsWith(`${item}/`));
  },
});
await rm(updateDirectory, { recursive: true, force: true });
console.log(`Updated application files to ${release.tag_name}. User stories were not touched.`);
