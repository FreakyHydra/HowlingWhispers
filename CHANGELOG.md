# Changelog

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
