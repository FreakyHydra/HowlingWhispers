# Changelog

## 0.8.0 — Echoes Remembered

🏆 MILESTONE RELEASE

> The story no longer has to forget what mattered.

### Context Engine

- Memory, Author's Note, and NovelAI-compatible Lorebooks are now first-class context systems
- Context compilation wired into generation pipeline
- Active Context tracking and Debug view
- Context data persists and integrates with backups

### Memory

- Dedicated Memory system for persistent story facts
- Manual and auto-generated entries
- Token counting, enable/disable, import/export
- Long-term story truth separate from temporary scene steering

### Author's Note / Scene Direction

- Strong short-range scene guidance
- Preset support
- Enable/disable, token counting, import/export
- Temporary instructions no longer masquerade as permanent memory

### NovelAI Lorebook Compatibility

- Direct `.lorebook` format support (v3/v4/v6)
- Import, create, edit, enable/disable, export
- Round-trip fidelity via raw JSON preservation
- Trigger-based and constant activation

### Context Compilation

- Memory, Author's Note, and Lorebooks injected into generation prompt
- Ordered context flow: System → Character → Persona → Memory → Author's Note → Lorebooks → Living Cast → Relationship → History
- Budget-aware selection with manifest tracking

### UI

- Large Context workspace modal with tabbed editing
- Compact context rail summary
- Context button in chat composer
- Lorebook entry editor with keys, content, and enable toggles

### Foundation

- Context data model, storage, and import/export
- NovelAI lorebook parsing and serialization
- Backup integration
- Dedicated context tests
- Panel migration for existing users

### Why this matters

Before 0.8.0, Howling Whispers had context scattered across several systems. After 0.8.0, context becomes a first-class part of the engine.

**Memory remembers. Lore awakens. Context finally becomes something you can control.**

### Quality

315/315 tests passed · lint clean · build validated.

## 0.8.1 — Scoped Author's Notes

- Author's Notes now support scoping: Global, This Character, or This Scene
- Character-scoped notes only appear in the selected character's prompt
- Scene-scoped notes only appear in the active scene's prompt
- Global notes continue to appear for all characters and scenes
- Scope selector added to the Context workspace and compact panel with auto-fill
- New notes default to character-scoped with the active character pre-selected
- Imported notes default to global scope
- Backward-compatible: existing notes without a scope are treated as global
- Context compilation filters notes by scope before rendering
- Manifest `includedAuthorNotes` count reflects filtered results
- Author note type guards widened to allow scoping fields
- Backup sanitization accepts scoped note fields
- Character ID and scene ID passed through to context UI
- Added tests for character, scene, global, disabled, and legacy notes

### Persistent Radio Player

- Live radio player integrated with compact trigger and floating overlay
- Playback state persists across routes via root `RadioProvider`
- Trigger appears bottom-right on the welcome screen and top header on active RP scenes
- Overlay provides play/pause, station controls, and volume
- Dev server proxy configured for `/radio/` endpoint
- New radio CSS for trigger, popover, animations, and placement variants

### Infrastructure

- Version bumped to 0.8.1 across package.json, package-lock.json, launcher, and tests


## 0.7.3 — The Living Stage: Second Act

Planned fixes and completion work:

### Living Cast
- Fix Round Robin so the saved session cursor is actually used across turns.
- Verify Round Robin rotates through the active cast instead of repeatedly selecting the first eligible Character.
- Fix Smart Participation edge cases discovered during live multi-character testing.
- Confirm disabled Living Cast fully stops cast participation logic.

### Character identity
- Add a stable Character ID to generated Character messages instead of relying only on the speaker display name.
- Preserve speaker identity correctly across reload, resume, backup, restore, edit, delete, and reroll.
- Make invited Character relationship scoring use the invited Character's actual Character data instead of Primary Character data.

### Relationships
- Verify each invited Character uses the correct Persona ↔ Character relationship.
- Prevent relationship state from bleeding between cast members.
- Verify reroll, edit, delete, and rewind remain mathematically consistent in multi-character roleplay.

### Multi-character output
- Complete proper multi-character bubble handling.
- Ensure meaningful dialogue from one Character does not get written inside another Character's bubble.
- Decide and implement the correct multi-bubble generation path rather than relying on a single-speaker reply pretending to cover the entire cast.

### Narrator
- Add the actual Narrator generation path for multi-character scenes.
- Narrator should only become available with 2+ active Characters.
- Narrator should appear only when useful, not every turn.
- Narrator handles shared scene description and should not control active Characters.

### Testing
- Add missing integration coverage for:
  - invited Character relationship scoring
  - Round Robin persistence across turns
  - multi-character rerolls
  - delete/rewind relationship reconciliation
  - disabled Living Cast behavior
  - separate Character speaker identity
  - Narrator availability
  - session cast isolation

### Manual sandbox verification
- Invite a second Character.
- Test Round Robin across several turns.
- Test Smart Participation.
- Confirm each Character gets the correct bubble.
- Confirm Narrator behavior.
- Confirm relationships remain separate.
- Reload and resume the roleplay.
- Verify cast persistence.
- Open another roleplay and confirm cast does not leak between sessions.
- Hide/show/reorder panels.
- Disable Living Cast and confirm it actually stops.

### Changelog correction
- Keep 0.7.2 as the release that introduced The Living Stage foundation.
- 0.7.3 documents the stabilization and completion work rather than claiming those unfinished parts were already fully working in 0.7.2.


## 0.7.2 — The Living Stage

◐ "More than one voice can enter the scene."

### What's new

- Living Cast is now a configurable Add-on
- explicit Character invitation from the Character Library into an active roleplay
- Primary and invited Characters are clearly separated in the cast list
- Round Robin and Smart Participation mode selection added
- context rail panel layout controls (visibility toggles, reorder buttons)
- automatic random-word cast discovery removed from the V1 workflow

### What changed

- Living Cast moved from general Settings to the Add-ons page as a built-in module
- cast membership is now explicit: only Characters invited through the UI participate
- old heuristic detection entries are discarded on migration; only valid Character Library IDs survive
- `autoNpcReplies` setting migrated to `livingCastConfig.enabled`
- generation sends explicit invited cast to the API instead of relying on name detection
- relationship scoring accepts per-character identity for invited Characters
- context rail gains a panel-layout cog

### Foundation notes

This release ships the Living Cast domain, UI, and integration foundation.
Multi-character bubble handling, Narrator generation path, Round Robin cursor persistence,
Smart Participation edge cases, and full manual verification are slated for 0.7.3.

### Quality

307/307 tests passed · lint clean · build validated.

## 0.7.1 — The Black Memory

◐ "The player remembers now."

### What's new

- Howling Add-ons let you import, enable, disable, export, and uninstall JSON add-on packages
- Add-ons can contribute Common Scenes with source attribution
- Reusable Common Scenes work with any character via the normal scene pipeline
- `{{char}}` and `{{user}}` resolve at runtime only
- Reply-length ceilings are now enforced across all generation paths
- Living Cast initializes from scene openings and seeds autonomy automatically
- Story Pulse restored as a compact relationship meter
- Character pronouns propagate authoritatively through the context compiler
- Add-ons in main nav; What's New and Settings moved to account menu

### What changed

- Howling Add-ons — data-only JSON manifests for Common Scenes and character content. Install, enable/disable, export, and uninstall. Malformed packages are rejected during validation. No executable mod or plugin API yet.
- Add-on Common Scenes — add-ons contribute scenes separate from personal Common Scenes, show source attribution, and hide automatically when disabled.
- Common Scenes — reusable starter scenes that work with any character or persona through the normal `startCommonScene()` pipeline. Includes built-in starter scenes.
- Runtime template variables — `{{char}}` and `{{user}}` resolve only at runtime. Stored templates remain unchanged. Active persona has priority for `{{user}}`.
- Reply-length enforcement — Quick, Immersive, and Novel-like ceilings are hard-enforced via truncation, bounded local contracts, and continuation guards.
- Living Cast initialization — scene openings detect side characters and seed autonomy from the detected cast.
- Story Pulse UI — restored compact dynamic relationship meter between active persona and primary character.
- Pronoun propagation — authoritative character pronouns survive canonical conversion and context compilation. Built-in female characters carry `she/her`. They/them preserved per character.
- Navigation cleanup — Add-ons added to main navigation. What's New and Settings moved to account menu.

### Foundation notes

This release adds the data-only add-on system, reusable Common Scenes, and the Living Stage foundation.

### Quality

307/307 tests passed · lint clean · build validated.
