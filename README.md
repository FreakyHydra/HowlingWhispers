# The Howling Whispers

> Every whisper becomes a world.

> [!IMPORTANT]
> **Source-available local-use license.** You may download, run, and modify this
> project for personal or private local use. You may not host it publicly, expose
> it as an internet-accessible service, offer it as SaaS, or redistribute it as a
> public service without written permission. See [`LICENSE`](./LICENSE) for the
> complete terms.

The Howling Whispers is a private, scene-based AI roleplay application powered
by either NovelAI or a local Ollama model. Characters, scenes, and conversations are stored in the local
browser. The user can keep the NovelAI token in the current tab or persist it in
the browser profile's local storage; it is never written to server storage or
logs.

Patina Works is the application's visual design language: black and charcoal
surfaces, copper and bronze hardware, warm cream serif typography, etched
details, subtle oxidized-green patina, and workshop-lit industrial fantasy.

## Technology

- Vinext, React 19, TypeScript, and Vite
- Next.js-compatible application and API routing
- Cloudflare Worker runtime
- Server-side dual-provider generation proxy

## Requirements

- Node.js `>=22.13.0`
- A NovelAI access token for cloud generation, or Ollama for local generation
- Internet access on first launch to install the locked npm dependencies
- A modern browser such as Chrome, Edge, Firefox, or Safari

Supported NovelAI models:

- `xialong-v1` (Xialong)
- `glm-4-6` (GLM 4.6)

Default local model:

- `mistral-nemo:12b` through Ollama, configured with a 16K roleplay context

The settings page discovers installed Ollama models dynamically. **Local
server** lists models from the app server; **This computer** asks Ollama in the
current browser's computer and falls back to manual entry if browser security
blocks discovery.

Install Ollama for local generation:

```powershell
winget install --id Ollama.Ollama --exact
ollama pull mistral-nemo:12b
```

Select **Settings → Generation provider → This computer**, then run **Test
connection**. Ollama remains on localhost and the browser contacts it directly.
For a deployed host, **Local server** keeps the browser isolated from Ollama.

Server deployments can set `OLLAMA_BASE_URL`, `OLLAMA_ADULT_MODELS`,
`OLLAMA_MAX_CONCURRENT_GENERATIONS`, `OLLAMA_CONNECTION_TEST_TIMEOUT_MS`, and
`OLLAMA_GENERATION_TIMEOUT_MS` as documented in `.env.example`. Keep Ollama
private; do not expose port `11434` to the internet.

## Quick Start

1. Install the current Node.js LTS release from
   [nodejs.org](https://nodejs.org/en/download). Node.js 22.13 or newer is
   required.
2. Clone or download the repository, then install dependencies:

   ```powershell
   npm.cmd ci
   ```

3. Start the browser-based development server:

   ```powershell
   npm.cmd run dev:local
   ```

4. Open the URL printed by the server in your browser.

The entrance requires no account. Select **Enter The Howling Whispers**, choose
a character, then create a scene, enter the context-free **Open Sandbox**, or
resume an existing local session. The in-app **What's new** page contains only
user-impacting changes and important operational notes. A NovelAI access token
is entered in Settings only for cloud generation; **Local GPU** requires no token.
**Save for this tab** clears when
the tab closes; **Save for this computer** remains in that browser profile until
the user removes it. Chat font size and text colors are also available in
Settings. While chatting, the character and context panels can be hidden
independently; those layout choices persist in the browser.

User-created scene presets can be deleted from the character's scene library.
Deleting one also removes its linked sessions and message histories after confirmation.

The entrance rotates through curated built-in characters. **Keep Coda** disables
the rotation and persists a static Coda entrance in the current browser profile.

## Autopilot Storytelling

The scene picker includes **Autopilot**, a self-driven story mode where the
selected character continues the scene in short beats. The start prompt accepts
an optional opening and offers three narration modes:

- **First person** — the character narrates with `I` and `my`.
- **Third person** — close third-person narration focused on the character.
- **Narrative telling** — an omniscient storyteller may move across the scene.

Autopilot reads as a continuous book-like page rather than chat bubbles. Its
controls provide Pause/Resume, Next, and Stop; stopping preserves the session as
an Autopilot story while returning the composer. The background blur slider
changes only the scene image, not the story text. While paused, the controller
and composer can be minimized together for uninterrupted reading.

Autopilot uses the application's roleplay format: actions and narration use
`*asterisks*`, inner voice uses `[…]`, and spoken dialogue remains plain text.

## Manual Launch and Development

If PowerShell blocks `npm.ps1`, use the `npm.cmd` shim:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Open the local URL printed by the development server, normally:

```text
http://localhost:5173/?preview=app
```

For browser testing from another device, bind the development server to a
trusted network interface and use HTTPS plus appropriate access controls. The
development server is not hardened production hosting.

When **Local GPU** is selected, remote browser sessions generate through Ollama
on the host PC. Do not forward Ollama's port `11434`; only the application port
should be reachable. Local prompts avoid a cloud provider but still cross the
unencrypted remote HTTP connection.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
```

These commands are cross-platform and include the production build, artifact
validation, and all automated tests.

## Storage

- Characters, sessions, messages, themes, and user preferences use browser
  `localStorage`.
- The NovelAI access token uses `sessionStorage` for **Save for this tab** or
  browser-profile `localStorage` for **Save for this computer**.
- Existing `dreambound_*` browser keys are intentionally retained so upgrades
  do not erase previously saved stories.

## Characters

Handcrafted characters include Coda, Heather Whiteclaw, Peony, and Senako Steel.
Imported character-card JSON is also supported. Senako is twelve;
her prompts preserve strict age-appropriate friendship, classmate, neighbor,
safe mentorship, teammate, and family-like boundaries.

## Deployment

Local development and browser-hosted operation are documented here. Production
hosting requires a separate HTTPS deployment and explicit access controls.

## Distribution

Distribute the browser application source with `package.json`,
`package-lock.json`, the application source, and public assets. Do not include
generated or machine-local directories such as:

- `node_modules/`
- `dist/`
- `.vinext/`
- `.wrangler/`
- `.sites-runtime/`
- `.openai/`
- `*.tsbuildinfo`
- `.env*`

Those paths are covered by `.gitignore`. Deploy the app as a browser-accessible
web service or run it locally with the development server.

## Updates

Browser deployments are updated by redeploying the web application. Local
browser data remains in the selected browser profile and is separate from the
application source files.

Stories, custom characters, scenarios, sessions, and preferences use browser
`localStorage`. The NovelAI
token uses either tab-only `sessionStorage` or browser-profile `localStorage`,
according to the user's explicit choice. Computer storage survives application
and PC restarts until explicitly removed. Updating or replacing application
files does not remove user-created content or a persistently saved token.

## Git and GitHub

The configured remote is `https://github.com/FreakyHydra/HowlingWhispers.git`.
Review a selective staging list before every commit; generated files and
machine-specific metadata are intentionally ignored.

Publication clearance for bundled character content and artwork is recorded in
`CONTENT-RIGHTS.md`; font licenses are under `public/fonts/`. No general source
code license is currently declared, so source availability does not grant reuse
rights beyond applicable law or separate written permission.
