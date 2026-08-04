import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /The Howling Whispers/);
  assert.match(html, /Every whisper becomes a world\./);

  const assetsDirectory = new URL("../dist/client/assets/", import.meta.url);
  const clientBundleName = (await readdir(assetsDirectory)).find((name) =>
    /^dreambound-app-.*\.js$/.test(name),
  );
  assert.ok(clientBundleName, "compiled character bundle was not found");
  const clientBundle = await readFile(new URL(clientBundleName, assetsDirectory), "utf8");
  assert.match(clientBundle, /Peony/);
  assert.match(clientBundle, /peony-void-garden-v2\.png/);
  assert.match(clientBundle, /peony-bookcraft-workshop\.png/);
  assert.match(clientBundle, /Save for this computer/);
  assert.match(clientBundle, /Local server/);
  assert.match(clientBundle, /This computer/);
  assert.match(clientBundle, /Refresh server models/);
  assert.match(clientBundle, /Refresh this computer's models/);
  assert.match(clientBundle, /OLLAMA_ORIGINS=/);
  assert.match(clientBundle, /Mistral Nemo 12B/);
  assert.match(clientBundle, /Generation through server-local Ollama/);
  assert.match(clientBundle, /fully canine anatomy/);
  assert.match(clientBundle, /never wears glasses/);
  assert.match(clientBundle, /assets\/Coda\/coda-moonlit-study\.png/);
  assert.match(clientBundle, /coda-thunder-vigil\.png/);
  assert.match(clientBundle, /coda-bell-beneath-boiler\.png/);
  assert.match(clientBundle, /coda-missing-rune\.png/);
  assert.match(clientBundle, /coda-copper-rain\.png/);
  assert.match(clientBundle, /coda-old-boundary-road\.png/);
  assert.match(clientBundle, /coda-bookbinders-parcel\.png/);
  assert.match(clientBundle, /coda-footprints-after-rain\.png/);
  assert.match(clientBundle, /Keep Coda/);
  assert.match(clientBundle, /Resume rotation/);
  assert.match(clientBundle, /Tonight's voice/);
  assert.match(clientBundle, /Some borders remember every footprint/);
  assert.match(clientBundle, /Open Sandbox/);
  assert.match(clientBundle, /World draft/);
  assert.match(clientBundle, /A rainbound world at the first age of steam/);
  assert.match(clientBundle, /The Bell Beneath the Boiler/);
  assert.match(clientBundle, /The Bookbinder's Parcel/);
  assert.match(clientBundle, /Footprints After Rain/);
  assert.match(clientBundle, /Trusted Companion/);
  assert.match(clientBundle, /Choose your role/);
  assert.match(clientBundle, /Describe only your role, knowledge, and connection to Coda/);
  assert.match(clientBundle, /No preset scene, memories, or opening move/);
  assert.match(clientBundle, /What(?:'|&apos;)s new/);
  assert.match(clientBundle, /Peony remembers who she is/);
  assert.match(clientBundle, /Eight mysteries now wait beyond the study/);
  assert.match(clientBundle, /Every world sends only the details that matter/);
  assert.match(clientBundle, /Peek Context/);
  assert.match(clientBundle, /estimated context/);
  assert.match(clientBundle, /Remote test mode is not encrypted/);
  assert.match(clientBundle, /Release channel/);
  assert.match(clientBundle, /Hosted installations are updated by their server administrator/);
  assert.match(clientBundle, /No public releases are published yet/);
  assert.match(clientBundle, /Chat font size/);
  assert.match(clientBundle, /character panel/);
  assert.match(clientBundle, /context panel/);
  assert.match(clientBundle, /Delete story/);
  assert.match(clientBundle, /linked session/);
  assert.doesNotMatch(clientBundle, /\bAsh\b/);
  assert.doesNotMatch(clientBundle, /\bSeraphina\b/);
  assert.doesNotMatch(clientBundle, /(?:ash|seraphina)-portrait\.png/);

  const stylesheetName = (await readdir(assetsDirectory)).find((name) =>
    /^index-.*\.css$/.test(name),
  );
  assert.ok(stylesheetName, "compiled application stylesheet was not found");
  const stylesheet = await readFile(new URL(stylesheetName, assetsDirectory), "utf8");
  assert.match(stylesheet, /\.workspace\.hide-character-rail/);
  assert.match(stylesheet, /\.workspace\.hide-context-rail/);
  assert.match(stylesheet, /\.chat-view-controls/);
  assert.match(stylesheet, /--chat-font-size/);
  assert.match(stylesheet, /\.scene-delete-button/);
  assert.match(stylesheet, /\.provider-choice-options/);
  assert.match(stylesheet, /\.entrance-feature/);
  assert.match(stylesheet, /\.coda-lock/);
  assert.match(stylesheet, /\.coda-world-draft/);
  assert.match(stylesheet, /\.coda-world-foundations/);
  assert.match(stylesheet, /\.coda-custom-role/);
  assert.match(stylesheet, /\.selected-role-note/);
  assert.match(stylesheet, /\.context-inspector-card/);
  assert.match(stylesheet, /\.context-receipts/);
  assert.match(stylesheet, /@keyframes entrance-reveal/);

  const workerSource = await readFile(workerUrl, "utf8");
  assert.match(workerSource, /Continuation task/);
  assert.match(workerSource, /OLLAMA_MAX_CONCURRENT_GENERATIONS/);
  assert.match(workerSource, /OLLAMA_CONNECTION_TEST_TIMEOUT_MS/);
  assert.match(workerSource, /OLLAMA_GENERATION_TIMEOUT_MS/);
  assert.match(workerSource, /relevant-world-lore/);

  const comparisonResponse = await worker.fetch(
    new Request("http://localhost/comparison", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(comparisonResponse.status, 200);
  const comparisonHtml = await comparisonResponse.text();
  assert.match(comparisonHtml, /Two Eras of The Howling Whispers/);
  assert.match(comparisonHtml, /Velvet Game Console/);
  assert.match(comparisonHtml, /Patina Works/);
  assert.match(comparisonHtml, /Social roleplay ecosystem/);
  assert.match(comparisonHtml, /Private storytelling workspace/);
});
