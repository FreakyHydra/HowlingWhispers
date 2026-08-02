import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const workerPath = resolve(import.meta.dirname, "..", "dist", "server", "index.js");

try {
  await access(workerPath);
} catch {
  throw new Error("Missing Worker entry: dist/server/index.js");
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("artifact-validation", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href);

if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error(
    "dist/server/index.js must have an ESM default export with fetch(request, env, ctx)",
  );
}

console.log("Validated artifact: the ESM Worker default.fetch export is present.");
