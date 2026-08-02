import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const url = "http://127.0.0.1:5173/?preview=app";
const remoteAccess = process.env.HOWLING_REMOTE_ACCESS === "1";

async function isReady(target = url) {
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(1_500) });
    return response.ok;
  } catch {
    return false;
  }
}

function openBrowser() {
  spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((address) => address?.family === "IPv4" && !address.internal)?.address;
const remoteProbeUrl = lanAddress
  ? `http://${lanAddress}:5173/?preview=app`
  : null;

if (await isReady()) {
  if (remoteAccess && (!remoteProbeUrl || !(await isReady(remoteProbeUrl)))) {
    console.error("A localhost-only server is already using port 5173. Close it before starting remote mode.");
    process.exit(1);
  }
  console.log(`The Howling Whispers is already running at ${url}`);
  openBrowser();
  process.exit(0);
}

const command = remoteAccess ? "npm.cmd run dev:remote" : "npm.cmd run dev:local";
if (remoteAccess) {
  console.warn("REMOTE TEST MODE: HTTP port 5173 is listening on all network interfaces.");
  if (lanAddress) {
    console.warn(`Local network URL: http://${lanAddress}:5173/?preview=app`);
  }
  console.warn("Public access requires an explicitly configured firewall and router port-forwarding rule.");
}
const server = spawn("cmd.exe", ["/d", "/s", "/c", command], {
  stdio: "inherit",
});

let opened = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (await isReady()) {
    opened = true;
    console.log(`Opening ${url}`);
    openBrowser();
    break;
  }
  if (server.exitCode !== null) break;
}

if (!opened && server.exitCode === null) {
  console.error("The local server did not become ready within 30 seconds.");
  server.kill();
  process.exit(1);
}

if (!opened) {
  process.exit(server.exitCode ?? 1);
}

const exitCode = server.exitCode ?? await new Promise((resolve) => {
  server.once("exit", (code) => resolve(code ?? 1));
});
process.exitCode = exitCode;
