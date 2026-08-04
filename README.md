# The Howling Whispers

> Every whisper becomes a world.

> [!IMPORTANT]
> **Source-available local-use license.** You may download, run, and modify this
> project for personal or private local use. You may not host it publicly, expose
> it as an internet-accessible service, offer it as SaaS, or redistribute it as a
> public service without written permission. See [`LICENSE`](./LICENSE).

The Howling Whispers is a private, scene-based AI roleplay application. Stories,
characters, sessions, messages, and preferences stay in the browser profile.

## Providers

The Settings page supports three generation targets:

- **NovelAI** — cloud generation using the tester's own NovelAI token.
- **Local server** — Ollama running on the application server.
- **This computer** — Ollama running on the browser user's computer.

NovelAI tokens are sent over HTTPS to generate a reply, but are not written to
server storage or logs. Users can store a token for the current tab or in their
own browser profile. Do not use persistent storage on a shared computer.

Supported NovelAI models:

- `xialong-v1`
- `glm-4-6`

The default Ollama model is `mistral-nemo:12b`. Ollama should remain private;
never expose port `11434` to the internet.

## Local Development

Requirements:

- Node.js `>=22.13.0`
- A modern browser
- A NovelAI token for cloud generation, or Ollama for local generation

Install dependencies and start the development server:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173/?preview=app
```

For local Ollama generation:

```powershell
winget install --id Ollama.Ollama --exact
ollama pull mistral-nemo:12b
```

Then choose **Settings → Generation provider → This computer** and run the
connection test.

## Windows Package

The Windows launcher and packaging helpers are under [`tools/windows/`](./tools/windows/).
The packaged release keeps its user-facing launcher, startup scripts, and help
files at the release-folder root.

The source package can be built from Windows with:

```powershell
tools\windows\BUILD WINDOWS LAUNCHER.bat
tools\windows\PACKAGE WINDOWS RELEASE.bat
```

The packaged application starts a private local server. Public hosting is not
permitted by the project license.

## Features

- Curated characters, custom character-card imports, scenes, memories, and roles
- Open Sandbox scenes without preset world history
- Persistent local browser sessions and story libraries
- Autopilot storytelling with first-person, third-person, or narrator POV
- Manual dialogue, action, narration, impersonation, and character-only Skip turn
- Share-as-image export with captions, scene headers, and high-resolution PNGs
- Character/context panels, chat font controls, and text color controls
- Context inspection showing selected canon, lore, history, and token estimates

## Storage And Privacy

- Story data and preferences use browser `localStorage`.
- Tab-only NovelAI tokens use `sessionStorage`.
- Computer-persistent NovelAI tokens use browser-profile `localStorage`.
- Clearing browser site data removes locally stored stories and settings.
- Hosted HTTPS protects traffic in transit.
- Direct HTTP remote test mode is separate, insecure, and intended only for temporary testing.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
```

The test command builds the application, validates the worker artifact, and runs
the automated tests.

## Repository Layout

- `app/` — pages, UI, styles, and API routes
- `lib/` — character canon, world lore, generation context, and provider helpers
- `public/` — artwork, fonts, favicon, and update configuration
- `docs/` — rights records, setup notes, and world/art documentation
- `scripts/` — build, validation, update, and Windows packaging support
- `tools/windows/` — Windows-only developer and local-launch helpers
- `tests/` — compiler, provider, rendered-bundle, and version tests

Generated and machine-local directories are intentionally ignored, including
`node_modules/`, `dist/`, `.vinext/`, `.wrangler/`, `.sites-runtime/`, `release/`,
`outputs/`, `.env*`, and `*.tsbuildinfo`.

## Rights And License

Bundled character content and artwork rights are documented in
[`docs/CONTENT-RIGHTS.md`](./docs/CONTENT-RIGHTS.md). Font licenses and notices
are under [`public/fonts/`](./public/fonts/).

Project source is governed by [`LICENSE`](./LICENSE). Third-party dependencies,
fonts, artwork, character content, trademarks, and AI-generated material may
have separate rights or limitations.

Fix releases use a fourth version component. For example, `0.4.2` is a feature
release and `0.4.2.1` is its first follow-up fix.
