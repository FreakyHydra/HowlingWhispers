# Changelog

## 0.11.0.0 — Sensory Persona POV, Part One of Two

🏆 MAJOR FEATURE RELEASE

> The World Engine may know everything. The player persona should not. Part One establishes the boundary between world truth, persona perception, and the prose shown to the player.

### ✨ Added

#### Sensory Persona POV

- **New POV Style setting** — Roleplay Direction now offers **Standard** and **Sensory POV** without adding several unfinished narration modes
- **Player-persona-limited narration** — Sensory POV locks narration to the selected player persona’s physical perspective instead of allowing roving or character-limited knowledge
- **Dedicated perception layer** — structured world facts are resolved into a separate `<persona-perception>` context before the common generation compiler builds a provider prompt
- **Sensory channels** — the perception model supports sight, hearing, smell, touch, taste, body language, and spatial awareness
- **Contextual sensory guidance** — the model is told to use only senses relevant to the current story beat rather than forcing all five senses into every reply
- **Basic spatial relationships** — the resolver understands same place, near, far, behind, in front, beside, touching, separated by a barrier, and out of sight
- **Line-of-sight filtering** — facial expressions, visible movement, and body language are withheld when a character is behind the persona, beyond sight, or separated by an opaque barrier
- **Barrier-aware hearing** — quiet sounds can be muted by a barrier while explicitly loud sounds may remain audible
- **Contact-aware touch and taste** — direct touch and taste require physical contact; distant warmth, texture, pressure, and flavor are not presented as sensations the persona directly feels
- **Body-language evidence** — visible physical signals can support cautious interpretation without turning inferred emotion or motivation into confirmed fact

#### World Truth and Autonomous Characters

- **World-truth separation** — the World Engine can retain facts that are not passed into persona perception or narration
- **Private autonomous residue** — autonomous character intentions and internal developments can remain in world truth while observable actions remain available to Sensory POV
- **Off-screen protection** — absent characters and actions outside the persona’s perception are not automatically exposed in the sensory context
- **Living Cast integration** — active cast members can contribute observable residue without leaking their private goals, wants, fears, concerns, needs, or internal reasoning
- **Perception receipts** — the context manifest records safe totals for included facts, filtered facts, and active sensory channels

#### Development Perception Inspector

- **World Truth view** — the development Context Inspector can show every structured fact considered by the perception resolver
- **Persona Perception view** — developers can compare world truth with the facts actually delivered to the player-limited generation context
- **Filtering explanations** — rejected facts display their sensory channel, spatial relationship, certainty, and reason such as no line of sight, no contact, barrier muted, or private world truth
- **Two inspector locations** — receipts appear in the Roleplay context rail and the full Context workspace after a Sensory POV reply is generated
- **Development-only protection** — detailed hidden facts are returned only by a development deployment; production API responses retain safe summary counts and reject manually requested debug details

### 🔄 Changed

#### Generation Pipeline

- **Provider-independent compilation** — Sensory POV is owned by the common Howling Whispers generation layer and reaches NovelAI, server Ollama, device/local Ollama, and future providers through already-compiled context
- **Observable autonomy mode** — non-speaking autonomous cast entries contribute observable residue in Sensory POV while their private subtext is removed from the shared prompt
- **Anti-omniscience instructions** — generation is explicitly forbidden from revealing private thoughts, unseen expressions, undiscovered objects, unsupported motives, or actions outside the persona’s perception
- **Show, don’t tell preference** — emotions, pain, fear, attraction, deception, hostility, and intentions are represented through observable evidence unless a character deliberately reveals them
- **Safe context budgeting** — the sensory context is included in the existing fixed-context token accounting rather than bypassing the compiler budget

#### Settings and Portability

- **Persistent POV preference** — the selected POV Style survives browser sessions
- **Portable backups** — Standard or Sensory POV is preserved through private-data backup and restore
- **Viewpoint preservation** — switching to Sensory POV temporarily locks Player limited narration without deleting the user’s previous Standard viewpoint selection

### 🛡 Compatibility and Safety

- **Standard POV remains unchanged** — explicitly choosing Standard produces the same compiled prompt as the previous implicit default
- **No provider-specific sensory fork** — NovelAI and Ollama use the same perception decisions instead of developing incompatible sensory behavior
- **No species assumptions yet** — Part One does not automatically assign enhanced smell, night vision, hearing ranges, blindness, or other biological traits without structured persona support
- **No hidden debug leak** — world-truth text is absent from ordinary production manifests and never added to visible roleplay output
- **No reduction of World Engine knowledge** — unavailable information is filtered at generation time rather than deleted from the world model

### 🧪 Verification

- Added coverage for characters behind the persona, audible speech without visible expressions, closed barriers, quiet and loud sounds, direct-contact touch and taste, body-language evidence, private world truth, hidden autonomous actions, provider-independent compilation, backup round-tripping, development diagnostics, and Standard POV regression
- The complete automated suite, lint pass, and production artifact build were run before the feature was committed to `dev`

### 🧭 Part One Boundaries

Part One establishes the architecture and reliable rules using the state Howling Whispers already has. It deliberately does not attempt full coordinates, physics, acoustic ray tracing, smell propagation, complex vision cones, or automatic biological modelling.

Future parts can expand structured Scene State with rooms, barriers, orientation, distance, contact, held objects, discovered information, and persistent off-screen actions without rebuilding the perception system introduced here.

---

## 0.10.3.0 — The Signal Lantern

### ✨ Added

- **Optional Discord sign-in** — sign in from the welcoming mat and return there after authentication
- **Role-aware Admin entry** — verified administrators see an Admin button while regular users stay in the roleplay experience
- **Privacy-safe problem reports** — testers can review and manually send redacted runtime signals to the Admin diagnostics inbox

### 🔄 Changed

- **Archive identity** — public browsing stays open while sharing uses Discord login and Human Verified status
- **Persona library** — the redesigned command deck is isolated from Settings layout rules and stays centered at full width

### 🛠 Fixed

- **Persona precedence** — the selected persona now overrides the older session name during roleplay
- **Open Sandbox isolation** — sandbox sessions no longer inherit Riley's Player Two scene, preset memories, or other scene metadata
- **Authentication return** — users and admins return to the welcoming mat instead of being redirected into Admin

---

## 0.10.2.0 — Riley Picks the Battlefield

### ✨ Added

- **Player Two** — meet Riley as a stranger in a rainy late-night gaming lounge and survive her thirty-second co-op test
- **The Unbeaten Score** — face Riley beside the arcade cabinet that no longer displays the score she expected
- **Last Cookie Standing** — argue your case when Riley secures the final packet of chocolate cookies
- **Dedicated scene artwork** — every Riley scene has its own optimized widescreen illustration matching her established look and atmosphere
- **Scene-aware Riley lore** — each premise activates only its own setting and scenario facts without inventing trust, player actions, or shared history

---

## 0.10.1.1 — Riley Steps Into Frame

### 🛠 Fixed

- **Riley portrait** — Riley's dedicated portrait now appears on her curated Contact card
- **Riley scene artwork** — her gaming-room artwork now appears as the roleplay scene background with tailored focal points for both layouts

---

## 0.10.1.0 — Player Two Arrives

### ✨ Added

- **Riley** — the fiercely competitive, scruffy gamer joins the Curated Contacts library with her complete supplied character sheet
- **Stable curated identity** — Riley uses the permanent `riley` identity across conversations, backups, downloads, and duplicate-ID protection

### 🔄 Changed

- **Stranger starting point** — Riley begins each new Contact/persona relationship at 0 points so trust can develop naturally through roleplay

---

## 0.10.0.0 — The Clock Starts

🏆 MAJOR FEATURE RELEASE

> The clock is the backbone. This release gives roleplay a canonical time source and elapsed-time continuity without a constantly running background simulation.

### ✨ Added

- **Canonical roleplay world clock** — generation now receives the current date, time, weekday, and day period in the roleplay's canonical Europe/Berlin time zone
- **Elapsed-time continuity** — timestamped turns let the story reason about natural gaps, waiting, sleep, travel, schedules, and other time-dependent events without forcing clock references into the prose
- **On-demand clock context** — elapsed time is evaluated when generation happens, so the clock does not require an AI process running continuously in the background
- **Curated Contact versions** — curated Contacts can expose multiple canon versions from one library card; the original Peony remains intact beside Peony V2
- **Persistent version preference** — the selected curated Contact version is remembered across sessions, with existing stored Peony V2 data and artwork migrated safely

### 🔄 Changed

- **Relationship continuity** — relationship changes now build on each Contact/persona pair's established baseline instead of replacing it
- **Relationship meter precision** — small bond changes remain visible instead of being rounded out of the meter

### 🛠 Fixed

- **Imported card downloads** — downloading an imported CCV2/HWCC card preserves its original standard fields, extension namespaces, and author data instead of flattening them
- **Legacy roleplay timestamps** — old numeric message IDs are ignored as clock data, preventing legacy sessions from appearing to begin in 1970
- **Reroll timing** — rerolled turns keep their original timestamp so regeneration does not falsely advance the roleplay clock

---

## 0.9.1.1 — Rooms in Order

A focused stability pass across the Roleplay hub and the rest of the app.

### ✨ Added

- **Scenario activation** — Scenario cards can now begin a real roleplay through the existing persona/start flow
- **Scenario opening context** — opening situation, starting conditions, active elements, possible hooks, and atmosphere now carry into the Scenario start
- **Scenario Contact links** — linked Contacts are preferred when a Scenario starts, with a safe fallback when no linked Contact is available

### 🔄 Changed

- **Roleplay library layout** — Contacts, Locations, and Scenarios use a wider, more readable card layout with safer title sizing
- **Accessibility scaling** — UI Scale and UI Font Size are more strictly separated so text and physical interface sizing do not unintentionally scale together
- **Settings typography** — small print, helper text, status text, and related Settings copy now follow the UI font preference more consistently

### 🛠 Fixed

- **Settings sidebar isolation** — the Settings navigation no longer appears inside Personas, Add-ons, Living Cast, or other pages that reuse shared panel styling
- **Character identity isolation** — character lookup paths use stable IDs instead of display names, preventing duplicate names from being treated as the same Contact
- **Character card titles** — long names no longer dominate the portrait card or break into unreadable fragments as easily
- **Archive search** — search no longer remains stuck in a permanent loading state after a request finishes
- **Archive imports** — importing from search results now fetches the complete published character instead of copying an incomplete summary
- **Radio connection state** — the player only reports a successful connection after playback actually starts
- **Persona library copy** — clarified local-storage wording and corrected persona memory-card typing around milestones
- **Add-ons route typing** — the Add-ons view is now represented in the application view type instead of existing outside it

---

## 0.9.1 — Community Opens

### ✨ Added

- **Community Hub** — a dedicated Discord community page with join link and server description
- **Community navigation** — Discord link from the login screen and community links in the site navigation
- **Accessibility typography preferences** — OpenDyslexic font support and configurable text sizing

### 🛠 Fixed

- **Location isolation** — hardened the boundary between Location sessions and Character fallback so Locations no longer silently fall back to Contacts
- **Location fallback** — added a graceful unavailable-Location state so the UI no longer breaks when a Location becomes inaccessible
- **Legacy state migration** — existing sessions that relied on the old fallback behavior now migrate cleanly to the new isolation model

---

## 0.9.0 — Worlds Take Shape

🏆 MAJOR FEATURE RELEASE

> The roleplay library is no longer just a list of characters. It is becoming a world.

### ✨ Added

#### Roleplay Hub

- Roleplay now has three first-class content libraries: **Contacts**, **Locations**, and **Scenarios**
- The old character-only landing area has been expanded into a broader Roleplay workspace
- Curated and Custom content are separated where applicable
- Content-specific headings and controls now adapt to the selected Roleplay type

#### Character Factory

- Added a full Character Factory for creating and editing Custom Contacts
- Expanded character data now supports appearance, personality, voice, background, relationships, RP behavior, world lore, context notes, and related author-facing data
- Character import/export and backup formats preserve the expanded data

#### Character Traits

- Added a built-in library of **111 character traits**
- Traits can be assigned as Primary, Secondary, or Situational
- Custom traits are supported
- Trait data survives import/export, backups, canonical conversion, and context compilation

#### Locations

- Added a first-class Location domain
- Added dedicated Location cards and Location Factory
- Custom Locations can be created, edited, imported, exported, deleted, and persisted
- Location data supports areas, atmosphere, features, activities, occupants, staff roles, accessibility features, tags, optional age ranges, and other generic setting information
- Curated and Custom Locations are separated
- Saved Locations remain library data and are not automatically injected into active RP context

#### Scenarios

- Added a first-class Scenario domain
- Added dedicated Scenario cards and Scenario Factory
- Custom Scenarios can be created, edited, imported, exported, deleted, and persisted
- Scenarios support opening situations, starting conditions, active elements, possible hooks, atmosphere, linked Contacts, and linked Locations
- Scenario links remain metadata only until explicit RP activation is implemented
- Saved Scenarios are not automatically injected into active RP context

#### Central Prose Quality System

- Added a centralized server-side prose-quality policy
- Roleplay and Autopilot now share one controlled prose-quality layer
- Character voice remains authoritative over generic literary voice
- The engine distinguishes overall writing craftsmanship from individual vocabulary, dialect, slang, rhythm, education, and personality
- Added resistance to generic AI prose, repetitive emotional shorthand, social-media narration, journalistic narration, archetype clichés, forced slang, repetitive sentence structures, excessive summaries, stock AI phrasing, and thematic closing summaries
- Impersonation uses a reduced player-voice policy that preserves the player's established writing style instead of applying a literary lift
- Xialong-specific anti-slop guidance remains model-specific rather than being applied to every provider
- Prose-policy token cost is accounted for in context budgeting

### 🔄 Changed

#### Characters are now Contacts

- The visible Roleplay terminology now uses **Contacts**
- Internal `Character` domain names remain unchanged to avoid an unnecessary compatibility-breaking refactor

#### Roleplay Navigation

- The old character-only flow has been replaced with a broader **Begin a roleplay** experience
- Welcome copy and section headings now support Contacts, Locations, and Scenarios equally

#### Roleplay Architecture

- `CharacterArea` has been replaced by the broader `RoleplayArea`
- Location and Scenario editing now live in dedicated feature components rather than expanding the main Roleplay component indefinitely

#### Context UI

- Context creation controls now live in their appropriate tabs
- Memory controls remain with Memory
- Author's Note controls remain with Author's Notes
- Lorebook creation/import remains inside Lorebooks
- Context toggle interaction and keyboard handling were improved

#### Generation Pipeline

- Generic prose guidance is now rendered once centrally instead of being duplicated across Roleplay and Autopilot
- Character canon, world/context state, prose policy, and conversation history now follow an explicit generation hierarchy
- Prompt budgeting includes the new prose-quality block

### 🛠 Fixed

#### Roleplay Black Screen

- Fixed a black-screen regression after leaving the welcome screen and entering Roleplay
- Corrected incomplete Scenario prop wiring introduced during the Roleplay-area expansion
- Prevented `undefined.filter()` crashes during Roleplay rendering

#### Location Creation

- Fixed the non-working **Create a new Location** action
- `isCreatingLocation` state is now correctly passed from the parent application into `RoleplayArea`
- Location Factory now opens properly in create mode
- Saving creates a Custom Location
- Cancel closes the factory without persisting anything
- Location creation no longer interferes with Contacts or Scenarios

#### Location Integration

- Fixed Location import/module wiring issues encountered during the Location rollout
- Corrected canonical source handling and related tests

#### Context Controls

- Fixed Context toolbar layout regressions
- Fixed Context toggle presentation and interaction
- Removed redundant Context-launch UI that caused unnecessary composer/layout conflicts

#### Generation Quality

- Removed duplicated prose-quality instructions from Roleplay and Autopilot
- Kept general prose guidance separate from Xialong-specific correction rules

### 🗑 Removed

- Removed the old character-only `CharacterArea`
- Removed temporary prototype Location editing UI
- Removed placeholder-only Location and Scenario experiences
- Removed redundant Context launch controls
- Removed duplicated generic prose guidance from multiple generation paths

### 🧱 Foundation

0.9.0 also prepares the architecture for future systems without activating them prematurely:

- Location ↔ Contact relationships
- Scenario activation
- active Location and Scenario context
- Sandbox environments
- NPC schedules
- world time
- probabilistic presence
- encounter simulation
- future prose profiles such as Literary / Balanced / Direct

These systems are not active yet.

Saving a Location or Scenario does **not** silently alter the current RP prompt.

### Why this matters

0.8.x gave Howling Whispers memory and context.

**0.9.0 gives that context somewhere to live.**

Contacts are the people.  
Locations are the places.  
Scenarios are the situations.  
The writing engine decides how all of it should sound.

**The pieces are starting to become a world.**

### Quality

393/393 tests passed · lint clean · build validated.

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
