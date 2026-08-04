# Changelog

## 0.4.6 — Keep Skip turn focused

**» Skip turn now produces one short character beat.** It no longer uses the full novel-length reply setting or allows the model to invent both sides of the conversation.

### What's new
- **Character-only skip** — the normal roleplay skip action now uses a dedicated 60–150-word contract and hard output cap.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.5 — Keep turns contained

**🛑 Autopilot Next is now one beat, not a marathon.** Error messages can also be dismissed, and impersonation directions are clearly separated from story text so they are less likely to be echoed into the conversation.

### What's new
- **One-shot Next** — manually advancing Autopilot generates one character beat and pauses instead of leaving the automatic 12-second loop running.
- **Dismissible errors** — the red NovelAI/Ollama error banner now has a close button.
- **Cleaner impersonation** — the model is explicitly restricted to one player turn, with private directions treated as control input rather than dialogue.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.4 — Sharper shares

**🔍 Shared scenes are now rendered at higher resolution** so you can zoom into the pasted image in Discord and actually read every line without downloading.

### What's new
- **50% more pixels** — the shared image is now painted at 3× density (3240px wide instead of 2160), and long conversations automatically hold the highest safe resolution the browser canvas allows.

### Quality
- 30/30 unit tests · lint clean · build okay.

## 0.4.3 — Share, redrawn

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
