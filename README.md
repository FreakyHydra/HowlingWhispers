# The Howling Whispers

> Every whisper becomes a world.

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

Supported NovelAI models:

- `xialong-v1` (Xialong)
- `glm-4-6` (GLM 4.6)

Default Windows local model:

- `mistral-nemo:12b` through Ollama, configured with a 16K roleplay context

The settings page discovers installed Ollama models dynamically. **Local
server** lists models from the app server; **This computer** asks Ollama in the
current browser's computer and falls back to manual entry if browser security
blocks discovery.

Install the local engine on Windows:

```powershell
winget install --id Ollama.Ollama --exact
ollama pull mistral-nemo:12b
```

Select **Settings → Generation provider → This computer**, then run **Test
connection**. Ollama remains on localhost and the browser contacts it directly.
For a deployed host, **Local server** keeps the browser isolated from Ollama.

Server deployments can set `OLLAMA_BASE_URL`, `OLLAMA_ADULT_MODELS`,
`OLLAMA_MAX_CONCURRENT_GENERATIONS`, and `OLLAMA_CONNECTION_TEST_TIMEOUT_MS`
as documented in `.env.example`. Keep Ollama private; do not expose port
`11434` to the internet.

## Quick Start on Windows

1. Install the current Node.js LTS release from
   [nodejs.org](https://nodejs.org/en/download). Node.js 22.13 or newer is
   required.
2. Extract the complete application folder. Do not run it from inside a ZIP
   preview.
3. Double-click `The Howling Whispers.exe`. The BAT launcher remains available
   as `START THE HOWLING WHISPERS.bat`.
4. Keep the terminal window open while using the application.

The small EXE starts the Windows BAT launcher from the application directory.
It does not bundle a second browser or Node runtime. The launcher verifies Node.js, installs the exact packages in
`package-lock.json` when dependencies are missing or changed, starts the local
server on port 5173, waits until it responds, and opens the application in the
default browser. Project dependencies are automated; Node.js itself is kept as
an explicit prerequisite so the launcher does not silently modify the user's
computer.

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

## Manual Launch and Development

On Windows PowerShell, use the executable shim if script execution blocks
`npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Open:

```text
http://localhost:5173/?preview=app
```

## Remote Test Mode

`START REMOTE ACCESS.bat` binds the development server to all network
interfaces and enables an inbound Windows Firewall rule for TCP 5173. The
normal EXE remains localhost-only. Router forwarding must map external TCP 5173
to this PC's LAN address and internal port 5173.

Use `DISABLE REMOTE ACCESS.bat` after testing to remove the firewall rule. See
`REMOTE ACCESS - READ ME.txt` for the test-bench addresses and router steps.

This mode is unencrypted HTTP and is not hardened production hosting. DNS alone
does not hide the port or protect NovelAI tokens in transit. Use it only as a
temporary test bench with trusted users.

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

Local and temporary remote-test operation are documented here. Production
hosting requires a separate HTTPS deployment and explicit access controls.

## Distribution

Distribute the source folder with `package.json`, `package-lock.json`, the
application source, public assets, scripts, and the Windows launcher. Do not
include generated or machine-local directories such as:

- `node_modules/`
- `dist/`
- `.vinext/`
- `.wrangler/`
- `.sites-runtime/`
- `.openai/`
- `*.tsbuildinfo`
- `.env*`

Those paths are covered by `.gitignore`. Recipients install only Node.js; the
launcher handles npm packages. This is a local web application distribution,
not a standalone desktop executable. Producing an installer with an embedded
Node runtime would be a separate packaging step.

To create the Windows release ZIP and matching SHA-256 file, double-click
`PACKAGE WINDOWS RELEASE.bat` or run:

```powershell
npm.cmd run package:windows
```

The output is written to `release/`. The package builder recompiles
`The Howling Whispers.exe`, excludes dependencies and generated state, and
places the EXE plus first-start instructions at the top of a `The Howling
Whispers` folder. Application source and runtime files are contained in its
`System` subfolder. It creates these GitHub Release assets:

- `the-howling-whispers-windows.zip`
- `the-howling-whispers-windows.zip.sha256`

## Updates

The Windows launcher checks for a newer public GitHub Release before checking
dependencies or starting the server. Before the first release is published it
continues normally with the installed version. The configured repository is:

```json
{
  "repository": "FreakyHydra/HowlingWhispers",
  "assetName": "the-howling-whispers-windows.zip",
  "checksumAssetName": "the-howling-whispers-windows.zip.sha256"
}
```

Each release tag must be a complete semantic version matching `package.json`,
such as `v0.2.0`, and include both assets produced by the package builder. The updater
requires a matching SHA-256 checksum before copying application files. It does
not replace the launcher, local caches, dependency directory, update
configuration, or Git metadata.

Stable releases take precedence over prereleases with the same numeric version.
For example, `v0.2.0` updates `v0.2.0-beta.2`, while a beta never replaces an
installed stable `v0.2.0`.

Settings includes a manual version checker. When a release is available it
reports that version and notes that installation occurs on the next launch.

Stories, custom characters, scenarios, sessions, and preferences use browser
`localStorage`. On Windows this resides in the selected browser's profile under
its AppData-managed storage, outside the application directory. The NovelAI
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
