# Changelog

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
