# Changelog

## 0.5.1.1 — Each turn has one speaker

**◐ Character Response and Impersonate now run on a shared generation pipeline with an explicit target speaker.** The provider always knows whose turn it is allowed to write, instead of inferring it from the button that was clicked.

### What's new
- **Character Response writes only the character** — the character can speak, act, react, think, and move the scene, but never takes control of the player's persona.
- **Impersonate writes only the player** — a first-person player turn with the player's dialogue, actions, and reactions; it never continues or takes over the AI character.
- **Impersonate turns can be short** — Quick Impersonate may be a single complete action or line (roughly 15–60 words); length settings no longer force a player turn into a mini-novel.
- **Same generation controls for both targets** — response length, prose detail, dialogue/action balance, narration, POV, creativity, and roleplay instructions all feed one shared pipeline and respect the selected target.

### Quality
- 57/57 tests passed · lint clean · build validated.

## 0.5.1 — Personas step into their own space

**◐ The Persona Library now has its own top-level page.** Personas are easier to find and manage without digging through connection and application settings.

### What's new
- **Dedicated Personas tab** — the complete Persona Library now appears directly beside Characters.
- **Settings stays focused** — provider, connection, and appearance controls remain in Settings.
- **Existing persona data is unchanged** — saved personas, active selection, imports, exports, and story snapshots continue using the same underlying system.

### Quality
- 50/50 tests passed · lint clean · build validated.

## 0.4.2.8 — Anchor the player identity

**◐ Impersonate now has an explicit fallback player identity.** An empty display name or persona no longer leaves the model guessing who it is supposed to write.

### What's new
- **Stable player boundary** — unnamed players are explicitly identified as `You`, and character-style prose is rejected even when it appears inside a longer draft.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.7 — Make Impersonate directional

**◐ Impersonate now treats your text as a private road sign.** It generates a new player-side turn instead of copying the direction, answering it as the character, or placing character prose in the player bubble.

### What's new
- **Marinara-style separation** — direction input stays out of the visible conversation, while the generated player turn is checked and retried if it echoes the direction or starts as character-side prose.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.6 — Send direct player turns correctly

**◐ Complete first-person lines in Impersonate are now sent as the player turn.** The model no longer gets a chance to mistake a line like “I want…” for something the character should say or do.

### What's new
- **Direct-turn detection** — first-person dialogue, questions, and marked actions are preserved exactly in the player bubble; instruction-style prompts still receive an AI-generated draft.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.5 — Keep impersonation in first person

**◐ Impersonation now stays on the player's side of the scene.** It explicitly uses first-person player voice and rejects character-side descriptions such as voice, eyes, body, or reactions in the draft.

### What's new
- **Player-only viewpoint** — impersonation drafts must use `I`, `me`, and `my`, and may not write the character's turn or echo the character's actions.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.4 — Keep Skip turn focused

**» Skip turn now produces one short character beat.** It no longer uses the full novel-length reply setting or allows the model to invent both sides of the conversation.

### What's new
- **Character-only skip** — the normal roleplay skip action now uses a dedicated 60–150-word contract and hard output cap.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.3 — Keep turns contained

**🛑 Autopilot Next is now one beat, not a marathon.** Error messages can also be dismissed, and impersonation directions are clearly separated from story text so they are less likely to be echoed into the conversation.

### What's new
- **One-shot Next** — manually advancing Autopilot generates one character beat and pauses instead of leaving the automatic 12-second loop running.
- **Dismissible errors** — the red NovelAI/Ollama error banner now has a close button.
- **Cleaner impersonation** — the model is explicitly restricted to one player turn, with private directions treated as control input rather than dialogue.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.2 — Sharper shares

**🔍 Shared scenes are now rendered at higher resolution** so you can zoom into the pasted image in Discord and actually read every line without downloading.

### What's new
- **50% more pixels** — the shared image is now painted at 3× density (3240px wide instead of 2160), and long conversations automatically hold the highest safe resolution the browser canvas allows.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2.1 — Share, redrawn

**🖼️ The shared image actually renders now.** The first cut relied on a page-to-picture technique that silently lost the theme colors and could capture a blank frame. The image is now painted directly onto a canvas with the same fonts, theme colors, bubbles, and portraits you see in the chat.

### What's new
- **Dependable image export** — the share popup now draws the conversation itself instead of photographing the page, so copying or downloading always produces the conversation — no more blank pastes.
- **Faithful styling** — every conversation renders with its character's theme accent, portrait, name pills, and speech styling, in the chat font size you chose.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.2 — Share the story

**🖼️ The chat is now a picture you can paste.** The latest moments of any conversation render into a crisp, zoomable image you can drop straight into Discord.

### What's new
- **Share as image** — a **⇣ Share** button in the chat opens a config popup: how many messages to include (default 5), optional name captions on bubbles, and an optional scene header. **Copy image** puts a 2×-resolution PNG on your clipboard for pasting into Discord; **Download PNG** saves it instead.
- **Random entrance rotation** — the landing card no longer sticks to the same feature all day; every load picks a fresh one, and **Valerie Whiteclaw** now rotates in as a "coming soon" teaser.
- **Valerie teaser** — a movie-style *"Coming to a forest near you."* card on the character selection home page.
- **Credits** — every curated character now names its creator: Coda by Arrax Shadowfang, Heather & Valerie by Gigasad, Peony by Derkomor, Senako by FurbyMask.
- **New Peony art** — her portrait and scene got a fresh painting (served under a new URL to bust the year-long cache).

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.1 — Heather rebuilt

**🌕 Heather is back, exactly as written** — her official character card is now the canon: the 42-year-old werewolf supremacist, her vanished mate, and her grown daughter Valerie.

### What's new
- **Official greetings** — all three of Heather's real greetings are now starter scenes: *Whiteclaw Borderlands*, *The Ranger Station*, and *The Moon Dance*, each with hand-crafted custom art.
- **Custom art** — every Heather scene got its own painted backdrop; her art now lives in its own `assets/Heather` folder.
- **Curation card** — the entrance now rotates a card inviting creators to contact the owner on the Howling Whispers Discord.

### Changes
- **Curated scenes protected** — the "Edit story" button now appears only on custom scenes; curated canon can't be edited away accidentally.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.0 — Autopilot

**✨ Autopilot is alive** — your character now lives on their own, writing one beat every ~12s. Step in anytime.

### What's new
- **Start screen** → pick a **Mode**: *First person*, *Third person*, or *Narrative telling* (omniscient storyteller). Saved per session.
- **Controls** — Pause/Resume · Next · Stop. Collapse the bar while paused so the story is fully readable.
- **Storytelling view** — autopilot reads as flowing prose, no chat bubbles (like NovelAI Storytelling). Normal chat keeps bubbles.

### Writing format — fixed
- Uniform style now: actions `*…*`, inner voice `[…]`, dialogue plain text.
- No `Name:` labels, no leaked instructions, no stray asterisks.
- Beats are length-capped — no more cut-off sentences.

### Cleanup
- Dropped the "Novel prose" output option; everything writes in one roleplay style. Settings dropdown gone.

### Quality
- 16/16 unit tests · lint clean · typecheck okay (4 pre-existing baseline errors only) · dev server at `127.0.0.1:5174`.
