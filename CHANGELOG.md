# Changelog

## 0.6.0.2 — Story pipeline hotfix

A small set of fixes to the story-generation pipeline, shipped under the same 0.6.0.2 version.

### What changed (fixes)
- **Safe story responses** — the app now reads and parses story replies safely. When a request
  returns an empty or non-JSON body, you get a useful error naming the HTTP status and a short
  preview of the response instead of a bare "unexpected end of JSON input", and real server or
  provider errors are never hidden behind a parse error.
- **Impersonate works on a blank conversation** — you can now start a brand-new scene by having
  the app write the first player turn (◐) before anything has been said. Normal story generation
  without any messages still asks for a leading message, and autopilot/skip-turn behavior is unchanged.
- **Impersonate is an action, not a mode** — the Dialogue/Action/Narration menu no longer hides a
  separate impersonation editor. The ◐ button beside Send now works with whatever you already
  typed in the normal composer (kept private as the direction), clears the composer like a normal
  sent message, and then continues the conversation from the character side. A blank composer still
  generates a plausible player turn.
- **Impersonated turns are cleaned like normal player messages** — generated player drafts (new
  and rerun alike) have leaked generation wrappers such as `player user message:` / `Player:` /
  `<|user|>` stripped and are normalized to the same roleplay formatting as a manually written
  player message, with action, dialogue, and narration markers preserved.

### Quality
- Regression coverage for blank-start impersonation prompt compilation and cleaned player-turn
  formatting, plus end-to-end story-route tests (160 tests).

## 0.6.0.2 — Drives that remember

**◐ A side character's inner state now persists across the whole conversation instead of being
rebuilt for a single reply.** Goals, wants, fears, unresolved concerns, and basic needs carry
forward turn after turn — including after reloads — and evolve from what actually happens in the
story, so a character who was just fed, rested, or wronged remembers it the next time they act.

### What's new
- **Persistent character drives** — autonomous state is now stored with each conversation, so a
  side character's goal, intent, wants, fears, concerns, and needs survive across turns, reloads,
  and speaker switches instead of being recomputed fresh every reply.
- **State that follows the story** — drives are updated deterministically from the recent beats
  with no extra AI call: eating eases hunger, resting eases fatigue, comfort and company soothe,
  discovery answers curiosity and settles a concern, an unanswered question weighs on a character,
  and conflict seeds a fear. When nothing meaningful happens, the state stays stable.
- **Only real characters hold state** — autonomous state is keyed to the Living Cast member, and
  identities that are not valid cast members (including the old sentence-start ghosts like What,
  Why, Did, Tell, Both, Because, Got, and Jail) are pruned instead of accumulating drive state.
- **Speaker-stays-authoritative** — replying as a specific side character (for example Melody)
  updates Melody's own state; the driving character is never guessed from the reply text.

### What changed (fixes)
- Stale autonomous state from characters no longer present is cleaned up automatically.
- Idle characters keep their current state instead of drifting on every turn.

### Quality
- Regression coverage for persistent state round trips, drive deltas from story beats, identity
  pruning, the perception boundary, and prompt integration (146 tests).

## 0.6.0.1 — The room listens back

**◐ Living Cast stops mistaking ordinary words for people, and present side characters now act
with their own inner momentum.** The false cast members seen in real use (What, Why, Did, Tell,
Both, Because, Got, Jail) are gone, and active NPCs carry a lightweight autonomous state that
shapes how they act even when nobody asks them anything.

### What's new
- **Autonomous Cast (MVP)** — each present side character carries a small drive state: a current
  goal, immediate intent, wants, fears, unresolved concerns, and basic needs (hunger, fatigue,
  comfort, social, curiosity). These drives influence the character's choices without ever
  mechanically forcing them: an NPC may disagree, hesitate, refuse, conceal something, or change
  their mind.
- **NPCs act on their own** — characters pursue their own goals and can initiate with the scene or
  with each other when their state gives them a reason, instead of always waiting for the player.
- **Perception boundary** — a character's private state is kept richer than the player ever sees.
  The prompt carries hidden subtext, while the player-facing story shows only physical residue
  ("her answers grow shorter", "she keeps glancing toward the doorway").

### What changed (fixes)
- **No more sentence-start ghosts** — capitalization alone no longer creates cast members. A name
  needs real evidence: mid-sentence capitalization, an introduction or arrival frame, speech
  attribution, or repeated context. Occurrences like "What", "Why", "Did", "Tell", "Both",
  "Because", "Got", and "Jail" from real conversations are no longer treated as characters.
- **Stale cast cleanup** — previously stored false names are pruned when cast state is loaded.
- **Speaker stays authoritative** — when a reply is requested as a specific side character (for
  example Melody), the message is stored and rendered as Melody even if the reply text starts with
  "What", "Why", or another question word.

### Quality
- Regression coverage for the real false-positive failure, the strong-evidence discovery rules,
  the perception boundary, autonomy seeding, and prompt integration.

## 0.6.0 — Side characters speak for themselves

**◐ The Living Cast keeps track of who is in the room, and named side characters now answer
for themselves when they are asked directly.** The story keeps a running cast of present
characters, so you no longer have to impersonate everyone the plot introduces.

### What's new
- **Living Cast detection** — the story watches each turn for newly introduced or departed
  characters and keeps a persistent cast per conversation.
- **Automatic side-character replies** — when the main character asks a present side character
  a direct question, the system answers as that character with no extra AI call, using the
  conversation's own cast.
- **Cast-aware speaker wiring** — replies are labeled with the speaking side character instead
  of only the selected main character, across Character Response, Impersonate, and Reroll.
- **Living Cast panel** — the chat context rail shows who is present and who is waiting to
  answer.
- **Per-conversation cast persistence** — the cast survives reloads and backup/restore rounds
  trips with each session.
- **Settings control** — automatic side-character replies can be turned off if you prefer to
  steer every side character yourself.

### Quality
- Living Cast detection, ordering (primary → player → arrival time), and side-speaker labels
  are covered by new unit tests alongside the existing context and version guarantees.

## 0.5.4 — Characters without borders

**◐ Character Card V2 is now Howling Whispers' standard portable character format.** Import V2
PNG cards from BotBooru and other compatible platforms with their artwork and structured character
definition intact, or download Howling Whispers characters as interoperable V2 PNG or JSON cards.

### What's new
- **V2 PNG by default** — each character's main download creates a standard Character Card V2 PNG
  using the character portrait as the visible card artwork.
- **Automatic format detection** — one Import Characters control accepts V2 PNG, V2 JSON, native
  character backups, and native character-library backups with format-specific errors.
- **Durable imported artwork** — a V2 PNG becomes the character card and chat portrait, persists
  across reloads in browser storage, and never becomes scene or world background art.
- **Structured round trips** — description, personality, scenario, opening message, examples,
  alternate greetings, creator details, tags, prompt-like fields, extensions, and character-book
  lore are retained separately and restored on V2 export.
- **Untrusted by design** — imported prompt fields and lore remain subordinate character content;
  they cannot replace application safety, provider rules, or generation contracts.
- **Native backups remain** — V2 handles portability while Howling Whispers backups continue to
  preserve app-specific character data.

### Quality
- Character Card parsing and PNG metadata use strict size, count, text, chunk-boundary, and CRC
  checks, with round-trip and native-backup regression coverage.

## 0.5.3 — Clean scenes, tidy tags

**◐ AI replies no longer leak their thinking labels into your story.** The local model sometimes
appends a `[Tags …; Mood …]` or `[scene …]` footnote to a reply. That note is now stripped from
the visible text and captured as structured story metadata (tags, mood, scene, location, weather,
time) so later features — chapters, sagas, memory — can use it without it ever cluttering the
narration.

### What's new
- **Cleaner replies** — emergent `[Tags …; Mood …]` footnotes from the local provider are removed
  from what you read, in every mode: Character Response, Impersonate, Skip Turn, Reroll, and
  Autopilot.
- **Conservative parsing** — inner voice like `[she hesitates]`, `[I can't]`, or stage directions
  are never mistaken for metadata; only footer blocks at the end of a reply are interpreted.
- **Filed for the future** — each message now carries structured metadata in the background,
  ready to power scenes, moods, sagas, and memory in later releases.
- **Bookkeeping** — curated and custom scenes keep your canvas clean; no reply is ever truncated
  or rewritten as part of this fix.

### Quality
- 76/76 tests passed · lint clean · build validated.

## 0.5.2 — Your story belongs to you

**◐ Private data can now be backed up and restored.** Sign in to your archive for encrypted server-side backups of your characters, personas, messages, and settings, or download everything as a single portable file.

### What's new
- **Local backup file** — export all private data as a portable `.json` payload and restore it from the same Settings panel.
- **Server-side backups** — create, list, download, restore, or delete per-account backups from the backup panel.
- **Encryption at rest** — server backups are AES-256-GCM encrypted with a per-install key before being stored.
- **Per-account isolation** — a signed-in user can only see, restore, or delete their own backups.
- **Curated character protection** — backup payloads exclude the four curated characters' proprietary canon; user-created characters and per-character states are preserved.
- **Local backups stay** — the existing local import/export flow is unchanged and always available offline.

### Quality
- 65/65 tests passed · lint clean · build validated.

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
