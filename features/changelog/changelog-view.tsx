export interface ChangelogViewProps {
  packageInfo: { version: string };
  setView: (view: string) => void;
}

export function ChangelogView(props: ChangelogViewProps) {
  return (
    <section className="changelog-page">
      <header className="changelog-heading">
        <div>
          <p className="eyebrow">Version {props.packageInfo.version}</p>
          <h1>What&apos;s new</h1>
          <p>Only the changes that affect how you use The Howling Whispers.</p>
        </div>
        <button className="outline-button" onClick={() => props.setView("roleplay")}>← Back to roleplay</button>
      </header>

           <div className="changelog-list">
             <article className="changelog-entry featured latest">
               <span className="changelog-mark">🏮</span>
               <div>
                 <span className="changelog-version">Version 0.10.3.0 · The Signal Lantern</span>
                 <h2>The Signal Lantern</h2>
                 <p>Discord identity, persona continuity, and opt-in diagnostics now work together without taking over the welcoming mat.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Optional Discord sign-in</strong> — sign in from the welcoming mat and return there after authentication</li>
                   <li><strong>Role-aware Admin entry</strong> — verified administrators see an Admin button while regular users stay in the roleplay experience</li>
                   <li><strong>Privacy-safe problem reports</strong> — testers can review and manually send redacted runtime errors, failed request paths, version, browser, viewport, and loaded asset paths</li>
                 </ul>
                 <h3>🔄 Changed</h3>
                 <ul>
                   <li><strong>Archive identity</strong> — public browsing stays open while sharing uses Discord login and Human Verified status</li>
                   <li><strong>Persona library</strong> — the redesigned command deck is isolated from Settings layout rules and stays centered at full width</li>
                 </ul>
                 <h3>🛠 Fixed</h3>
                 <ul>
                   <li><strong>Persona precedence</strong> — the selected persona now overrides the older session name during roleplay</li>
                   <li><strong>Open Sandbox isolation</strong> — sandbox sessions no longer inherit Riley&apos;s Player Two scene, preset memories, or other scene metadata</li>
                   <li><strong>Authentication return</strong> — users and admins return to the welcoming mat instead of being redirected into Admin</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry featured">
               <span className="changelog-mark">🕹️</span>
               <div>
                 <span className="changelog-version">Version 0.10.2.0 · Riley Picks the Battlefield</span>
                 <h2>Riley Picks the Battlefield</h2>
                 <p>Three first-meeting scenes let Riley test a stranger through games, rivalry, and one very important packet of cookies.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Player Two</strong> — meet Riley in a rainy late-night gaming lounge and survive her thirty-second co-op test</li>
                   <li><strong>The Unbeaten Score</strong> — face Riley beside the arcade cabinet that no longer displays the score she expected</li>
                   <li><strong>Last Cookie Standing</strong> — argue your case when Riley secures the final packet of chocolate cookies</li>
                   <li><strong>Dedicated artwork and lore</strong> — every scene has its own optimized widescreen illustration and premise-specific world context</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry featured">
               <span className="changelog-mark">🖼️</span>
               <div>
                 <span className="changelog-version">Version 0.10.1.1 · Riley Steps Into Frame</span>
                 <h2>Riley Steps Into Frame</h2>
                 <p>Riley now has dedicated artwork throughout her curated Contact and roleplay views.</p>
                 <h3>🛠 Fixed</h3>
                 <ul>
                   <li><strong>Riley portrait</strong> — Riley&apos;s dedicated portrait now appears on her curated Contact card</li>
                   <li><strong>Riley scene artwork</strong> — her gaming-room artwork now appears as the roleplay scene background with tailored focal points for both layouts</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry featured">
               <span className="changelog-mark">🎮</span>
               <div>
                 <span className="changelog-version">Version 0.10.1.0 · Player Two Arrives</span>
                 <h2>Player Two Arrives</h2>
                 <p>Riley joins the Curated Contacts library, ready to judge whether anyone can keep up.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Riley</strong> — the fiercely competitive, scruffy gamer joins the Curated Contacts library with her complete supplied character sheet</li>
                   <li><strong>Stable curated identity</strong> — Riley uses the permanent <code>riley</code> identity across conversations, backups, downloads, and duplicate-ID protection</li>
                 </ul>
                 <h3>🔄 Changed</h3>
                 <ul>
                   <li><strong>Stranger starting point</strong> — Riley begins each new Contact/persona relationship at 0 points so trust can develop naturally through roleplay</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry milestone">
               <span className="changelog-mark">◆</span>
               <div>
                 <span className="changelog-version">Version 0.10.0.0 · The Clock Starts</span>
                 <h2>The Clock Starts</h2>
                 <p>The clock is the backbone. This release gives roleplay a canonical time source and elapsed-time continuity without a constantly running background simulation.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Canonical roleplay world clock</strong> — generation now receives the current date, time, weekday, and day period in the roleplay&apos;s canonical Europe/Berlin time zone</li>
                   <li><strong>Elapsed-time continuity</strong> — timestamped turns let the story reason about natural gaps, waiting, sleep, travel, schedules, and other time-dependent events without forcing clock references into the prose</li>
                   <li><strong>On-demand clock context</strong> — elapsed time is evaluated when generation happens, so the clock does not require an AI process running continuously in the background</li>
                   <li><strong>Curated Contact versions</strong> — curated Contacts can expose multiple canon versions from one library card; the original Peony remains intact beside Peony V2</li>
                   <li><strong>Persistent version preference</strong> — the selected curated Contact version is remembered across sessions, with existing stored Peony V2 data and artwork migrated safely</li>
                 </ul>
                 <h3>🔄 Changed</h3>
                 <ul>
                   <li><strong>Relationship continuity</strong> — relationship changes now build on each Contact/persona pair&apos;s established baseline instead of replacing it</li>
                   <li><strong>Relationship meter precision</strong> — small bond changes remain visible instead of being rounded out of the meter</li>
                 </ul>
                 <h3>🛠 Fixed</h3>
                 <ul>
                   <li><strong>Imported card downloads</strong> — downloading an imported CCV2/HWCC card preserves its original standard fields, extension namespaces, and author data instead of flattening them</li>
                   <li><strong>Legacy roleplay timestamps</strong> — old numeric message IDs are ignored as clock data, preventing legacy sessions from appearing to begin in 1970</li>
                   <li><strong>Reroll timing</strong> — rerolled turns keep their original timestamp so regeneration does not falsely advance the roleplay clock</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry featured">
               <span className="changelog-mark">◐</span>
               <div>
                 <span className="changelog-version">Version 0.9.1.1 · Rooms in Order</span>
                 <h2>Rooms in Order</h2>
                 <p>A focused stability pass across the Roleplay hub and the rest of the app.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Scenario activation</strong> — Scenario cards can now begin a real roleplay through the existing persona/start flow</li>
                   <li><strong>Scenario opening context</strong> — opening situation, starting conditions, active elements, possible hooks, and atmosphere now carry into the Scenario start</li>
                   <li><strong>Scenario Contact links</strong> — linked Contacts are preferred when a Scenario starts, with a safe fallback when no linked Contact is available</li>
                 </ul>
                 <h3>🔄 Changed</h3>
                 <ul>
                   <li><strong>Roleplay library layout</strong> — Contacts, Locations, and Scenarios use a wider, more readable card layout with safer title sizing</li>
                   <li><strong>Accessibility scaling</strong> — UI Scale and UI Font Size are more strictly separated so text and physical interface sizing do not unintentionally scale together</li>
                   <li><strong>Settings typography</strong> — small print, helper text, status text, and related Settings copy now follow the UI font preference more consistently</li>
                 </ul>
                 <h3>🛠 Fixed</h3>
                 <ul>
                   <li><strong>Settings sidebar isolation</strong> — Settings navigation no longer appears inside Personas, Add-ons, Living Cast, or other pages that reuse shared panel styling</li>
                   <li><strong>Character identity isolation</strong> — character lookup paths use stable IDs instead of display names, preventing duplicate names from being treated as the same Contact</li>
                   <li><strong>Character card titles</strong> — long names no longer dominate the portrait card or break into unreadable fragments as easily</li>
                   <li><strong>Archive search</strong> — search no longer remains stuck in a permanent loading state after a request finishes</li>
                   <li><strong>Archive imports</strong> — importing from search results now fetches the complete published character instead of copying an incomplete summary</li>
                   <li><strong>Radio connection state</strong> — the player only reports a successful connection after playback actually starts</li>
                   <li><strong>Persona library copy</strong> — clarified local-storage wording and corrected persona memory-card typing around milestones</li>
                   <li><strong>Add-ons route typing</strong> — the Add-ons view is now represented in the application view type instead of existing outside it</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry featured">
               <span className="changelog-mark">◐</span>
               <div>
                 <span className="changelog-version">Version 0.9.1 · Community Opens</span>
                 <h2>Community Opens</h2>
                 <p>The project now has a dedicated community home, and Location sessions are more stable than ever.</p>
                 <h3>✨ Added</h3>
                 <ul>
                   <li><strong>Community Hub</strong> — a dedicated Discord community page with join link and server description</li>
                   <li><strong>Community navigation</strong> — Discord link from the login screen and community links in the site navigation</li>
                   <li><strong>Accessibility typography preferences</strong> — OpenDyslexic font support and configurable text sizing</li>
                 </ul>
                 <h3>🛠 Fixed</h3>
                 <ul>
                   <li><strong>Location isolation</strong> — hardened the boundary between Location sessions and Character fallback so Locations no longer silently fall back to Contacts</li>
                   <li><strong>Location fallback</strong> — added a graceful unavailable-Location state so the UI no longer breaks when a Location becomes inaccessible</li>
                   <li><strong>Legacy state migration</strong> — existing sessions that relied on the old fallback behavior now migrate cleanly to the new isolation model</li>
                 </ul>
               </div>
             </article>

             <article className="changelog-entry milestone">
              <span className="changelog-mark">🏆</span>
              <div>
                <span className="changelog-version">Version 0.9.0 · Worlds Take Shape</span>
                <div className="milestone-badge">🏆 MAJOR FEATURE RELEASE</div>
                <h2>Worlds Take Shape</h2>
                <blockquote className="milestone-quote">The roleplay library is no longer just a list of characters. It is becoming a world.</blockquote>

                <h3>✨ Added</h3>
                <h4>Roleplay Hub</h4>
                <ul>
                  <li>Roleplay now has three first-class content libraries: <strong>Contacts</strong>, <strong>Locations</strong>, and <strong>Scenarios</strong></li>
                  <li>The old character-only landing area has been expanded into a broader Roleplay workspace</li>
                  <li>Curated and Custom content are separated where applicable</li>
                  <li>Content-specific headings and controls now adapt to the selected Roleplay type</li>
                </ul>

                <h4>Character Factory</h4>
                <ul>
                  <li>Added a full Character Factory for creating and editing Custom Contacts</li>
                  <li>Expanded character data now supports appearance, personality, voice, background, relationships, RP behavior, world lore, context notes, and related author-facing data</li>
                  <li>Character import/export and backup formats preserve the expanded data</li>
                </ul>

                <h4>Character Traits</h4>
                <ul>
                  <li>Added a built-in library of <strong>111 character traits</strong></li>
                  <li>Traits can be assigned as Primary, Secondary, or Situational</li>
                  <li>Custom traits are supported</li>
                  <li>Trait data survives import/export, backups, canonical conversion, and context compilation</li>
                </ul>

                <h4>Locations</h4>
                <ul>
                  <li>Added a first-class Location domain</li>
                  <li>Added dedicated Location cards and Location Factory</li>
                  <li>Custom Locations can be created, edited, imported, exported, deleted, and persisted</li>
                  <li>Location data supports areas, atmosphere, features, activities, occupants, staff roles, accessibility features, tags, optional age ranges, and other generic setting information</li>
                  <li>Curated and Custom Locations are separated</li>
                  <li>Saved Locations remain library data and are not automatically injected into active RP context</li>
                </ul>

                <h4>Scenarios</h4>
                <ul>
                  <li>Added a first-class Scenario domain</li>
                  <li>Added dedicated Scenario cards and Scenario Factory</li>
                  <li>Custom Scenarios can be created, edited, imported, exported, deleted, and persisted</li>
                  <li>Scenarios support opening situations, starting conditions, active elements, possible hooks, atmosphere, linked Contacts, and linked Locations</li>
                  <li>Scenario links remain metadata only until explicit RP activation is implemented</li>
                  <li>Saved Scenarios are not automatically injected into active RP context</li>
                </ul>

                <h4>Central Prose Quality System</h4>
                <ul>
                  <li>Added a centralized server-side prose-quality policy</li>
                  <li>Roleplay and Autopilot now share one controlled prose-quality layer</li>
                  <li>Character voice remains authoritative over generic literary voice</li>
                  <li>The engine distinguishes overall writing craftsmanship from individual vocabulary, dialect, slang, rhythm, education, and personality</li>
                  <li>Added resistance to generic AI prose, repetitive emotional shorthand, social-media narration, journalistic narration, archetype clichés, forced slang, repetitive sentence structures, excessive summaries, stock AI phrasing, and thematic closing summaries</li>
                  <li>Impersonation uses a reduced player-voice policy that preserves the player&apos;s established writing style instead of applying a literary lift</li>
                  <li>Xialong-specific anti-slop guidance remains model-specific rather than being applied to every provider</li>
                  <li>Prose-policy token cost is accounted for in context budgeting</li>
                </ul>

                <h3>🔄 Changed</h3>
                <h4>Characters are now Contacts</h4>
                <ul>
                  <li>The visible Roleplay terminology now uses <strong>Contacts</strong></li>
                  <li>Internal <code>Character</code> domain names remain unchanged to avoid an unnecessary compatibility-breaking refactor</li>
                </ul>

                <h4>Roleplay Navigation</h4>
                <ul>
                  <li>The old character-only flow has been replaced with a broader <strong>Begin a roleplay</strong> experience</li>
                  <li>Welcome copy and section headings now support Contacts, Locations, and Scenarios equally</li>
                </ul>

                <h4>Roleplay Architecture</h4>
                <ul>
                  <li><code>CharacterArea</code> has been replaced by the broader <code>RoleplayArea</code></li>
                  <li>Location and Scenario editing now live in dedicated feature components rather than expanding the main Roleplay component indefinitely</li>
                </ul>

                <h4>Context UI</h4>
                <ul>
                  <li>Context creation controls now live in their appropriate tabs</li>
                  <li>Memory controls remain with Memory</li>
                  <li>Author&apos;s Note controls remain with Author&apos;s Notes</li>
                  <li>Lorebook creation/import remains inside Lorebooks</li>
                  <li>Context toggle interaction and keyboard handling were improved</li>
                </ul>

                <h4>Generation Pipeline</h4>
                <ul>
                  <li>Generic prose guidance is now rendered once centrally instead of being duplicated across Roleplay and Autopilot</li>
                  <li>Character canon, world/context state, prose policy, and conversation history now follow an explicit generation hierarchy</li>
                  <li>Prompt budgeting includes the new prose-quality block</li>
                </ul>

                <h3>🛠 Fixed</h3>
                <h4>Roleplay Black Screen</h4>
                <ul>
                  <li>Fixed a black-screen regression after leaving the welcome screen and entering Roleplay</li>
                  <li>Corrected incomplete Scenario prop wiring introduced during the Roleplay-area expansion</li>
                  <li>Prevented <code>undefined.filter()</code> crashes during Roleplay rendering</li>
                </ul>

                <h4>Location Creation</h4>
                <ul>
                  <li>Fixed the non-working <strong>Create a new Location</strong> action</li>
                  <li><code>isCreatingLocation</code> state is now correctly passed from the parent application into <code>RoleplayArea</code></li>
                  <li>Location Factory now opens properly in create mode</li>
                  <li>Saving creates a Custom Location</li>
                  <li>Cancel closes the factory without persisting anything</li>
                  <li>Location creation no longer interferes with Contacts or Scenarios</li>
                </ul>

                <h4>Location Integration</h4>
                <ul>
                  <li>Fixed Location import/module wiring issues encountered during the Location rollout</li>
                  <li>Corrected canonical source handling and related tests</li>
                </ul>

                <h4>Context Controls</h4>
                <ul>
                  <li>Fixed Context toolbar layout regressions</li>
                  <li>Fixed Context toggle presentation and interaction</li>
                  <li>Removed redundant Context-launch UI that caused unnecessary composer/layout conflicts</li>
                </ul>

                <h4>Generation Quality</h4>
                <ul>
                  <li>Removed duplicated prose-quality instructions from Roleplay and Autopilot</li>
                  <li>Kept general prose guidance separate from Xialong-specific correction rules</li>
                </ul>

                <h3>🗑 Removed</h3>
                <ul>
                  <li>Removed the old character-only <code>CharacterArea</code></li>
                  <li>Removed temporary prototype Location editing UI</li>
                  <li>Removed placeholder-only Location and Scenario experiences</li>
                  <li>Removed redundant Context launch controls</li>
                  <li>Removed duplicated generic prose guidance from multiple generation paths</li>
                </ul>

                <h3>🧱 Foundation</h3>
                <p>0.9.0 also prepares the architecture for future systems without activating them prematurely:</p>
                <ul>
                  <li>Location ↔ Contact relationships</li>
                  <li>Scenario activation</li>
                  <li>active Location and Scenario context</li>
                  <li>Sandbox environments</li>
                  <li>NPC schedules</li>
                  <li>world time</li>
                  <li>probabilistic presence</li>
                  <li>encounter simulation</li>
                  <li>future prose profiles such as Literary / Balanced / Direct</li>
                </ul>
                <p>These systems are not active yet.</p>
                <p>Saving a Location or Scenario does <strong>not</strong> silently alter the current RP prompt.</p>

                <div className="milestone-why">
                  <h3>Why this matters</h3>
                  <p>0.8.x gave Howling Whispers memory and context.</p>
                  <p><strong>0.9.0 gives that context somewhere to live.</strong></p>
                  <p>Contacts are the people.<br />Locations are the places.<br />Scenarios are the situations.<br />The writing engine decides how all of it should sound.</p>
                  <p><strong>The pieces are starting to become a world.</strong></p>
                </div>
                <h3>Quality</h3>
                <p>393/393 tests passed · lint clean · build validated.</p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <span className="changelog-mark">◐</span>
              <div>
                <span className="changelog-version">Version 0.8.1 · Scoped Author&apos;s Notes</span>
                <h2>Scoped Author&apos;s Notes</h2>
                <p>Author&apos;s Notes now support scoping so scene direction stays relevant to the right character and scene.</p>
                <ul>
                  <li><strong>Global</strong> — appears for every character and scene</li>
                  <li><strong>This Character</strong> — only appears for the selected character</li>
                  <li><strong>This Scene</strong> — only appears in the active scene</li>
                </ul>
                <p>New notes default to character-scoped with the active character pre-selected. Imported notes default to global. Existing notes without a scope are treated as global for backward compatibility.</p>
                <p>The Context workspace and compact panel now include a scope selector with auto-fill, and compilation filtering keeps the manifest count accurate.</p>
                <ul>
                  <li>Scope selector with auto-fill in Context workspace and compact panel</li>
                  <li>Character ID and scene ID passed through to context UI</li>
                  <li>Context compilation filters notes by scope before rendering</li>
                  <li>Author note type guards widened to allow scoping fields</li>
                  <li>Backup sanitization accepts scoped note fields</li>
                  <li>Import default scope set to global</li>
                  <li>Tests for character, scene, global, disabled, and legacy notes</li>
                </ul>
                <h3>Persistent Radio Player</h3>
                <ul>
                  <li>Live radio player with compact trigger and floating controls</li>
                  <li>Playback state persists across application views</li>
                  <li>Welcome-screen and active-RP controls</li>
                  <li>Play/pause and volume controls</li>
                  <li><code>/radio/</code> dev proxy support</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry milestone">
              <span className="changelog-mark">🏆</span>
              <div>
                <span className="changelog-version">Version 0.8.0 · Echoes Remembered</span>
                <div className="milestone-badge">MILESTONE · CONTEXT ENGINE</div>
                <h2>Echoes Remembered</h2>
                <blockquote className="milestone-quote">The story no longer has to forget what mattered.</blockquote>
                <p><strong>Howling Whispers gains a real Context Engine.</strong></p>
                <p>This release introduces the foundation for persistent narrative memory and direct model steering. For the first time, Howling Whispers can properly separate:</p>
                <p><strong>what happened</strong> from <strong>what the model should do now</strong> from <strong>what belongs to the world</strong></p>
                <p>That distinction is a major step toward longer, more consistent roleplay sessions and the systems still to come.</p>

                <h3>🧠 Memory Has a Home</h3>
                <p>Persistent story facts now have a dedicated place instead of being stuffed into personas or unrelated fields.</p>
                <p>Memory can hold:</p>
                <ul>
                  <li>important past events</li>
                  <li>injuries</li>
                  <li>relationship history</li>
                  <li>promises</li>
                  <li>secrets</li>
                  <li>boundaries</li>
                  <li>experience/history facts</li>
                  <li>persistent world state</li>
                </ul>
                <p>Memory is treated as long-term story truth, separate from temporary scene steering.</p>

                <h3>✒️ Author&apos;s Note / Scene Direction</h3>
                <p>Author&apos;s Note now provides strong short-range guidance for the current scene.</p>
                <p>Use it for:</p>
                <ul>
                  <li>scene tone</li>
                  <li>pacing</li>
                  <li>emotional atmosphere</li>
                  <li>behavioral emphasis</li>
                  <li>temporary writing direction</li>
                  <li>romance pacing</li>
                  <li>future generated scene-steering systems</li>
                </ul>
                <p>Temporary scene instructions no longer need to masquerade as permanent memory.</p>

                <h3>📚 NovelAI Lorebook Compatibility</h3>
                <p>Howling Whispers now uses the <strong>NovelAI <code>.lorebook</code> format directly</strong>.</p>
                <p>Lorebooks can be:</p>
                <ul>
                  <li>imported</li>
                  <li>created</li>
                  <li>enabled or disabled</li>
                  <li>used during context compilation</li>
                  <li>exported again as NovelAI-compatible lorebooks</li>
                </ul>
                <p>Preserve original lorebook structure wherever possible so imported books are not unnecessarily flattened or damaged.</p>

                <h3>🔮 Context Is Now Part of Generation</h3>
                <p>Memory, Author&apos;s Notes, and active Lorebook entries are wired into the actual generation pipeline.</p>
                <p>The context flow now supports:</p>
                <ol>
                  <li>System Instructions</li>
                  <li>Model Compatibility</li>
                  <li>Character</li>
                  <li>Persona</li>
                  <li>Memory</li>
                  <li>Author&apos;s Note</li>
                  <li>Lorebooks</li>
                  <li>Living Cast</li>
                  <li>Relationship / Story State</li>
                  <li>Recent Conversation</li>
                </ol>
                <p>This is not cosmetic metadata. It affects what the model actually receives.</p>

                <h3>👁️ Active Context & Debugging</h3>
                <p>The new Context system can track what was actually eligible or included in generation:</p>
                <ul>
                  <li>active Memory</li>
                  <li>active Author&apos;s Notes</li>
                  <li>active Lorebooks</li>
                  <li>triggered lore entries</li>
                  <li>omitted lore</li>
                  <li>token usage</li>
                  <li>context budget</li>
                  <li>included recent history</li>
                </ul>
                <p>This gives us a foundation for debugging model behavior instead of guessing.</p>

                <h3>💾 Context Survives</h3>
                <p>Context data is now persistent and integrated into backups.</p>
                <p>Memory, Author&apos;s Notes, and Lorebooks are treated as real user data rather than temporary UI state.</p>

                <h3>🐉 Built for What Comes Next</h3>
                <p>This milestone lays the foundation for future systems including:</p>
                <ul>
                  <li>automatic memory extraction</li>
                  <li>richer long-term relationship memory</li>
                  <li>generated scene direction</li>
                  <li>Adult Romance Engine context</li>
                  <li>more advanced model/debug inspection</li>
                </ul>
                <p>Hard invariant rules such as player-persona ownership and Xiaolong compatibility remain separate from temporary scene direction.</p>

                <h3>🛠 Under the Hood</h3>
                <p>This release introduced an entire Context subsystem, including:</p>
                <ul>
                  <li>context data model</li>
                  <li>storage</li>
                  <li>NovelAI lorebook parsing and serialization</li>
                  <li>import/export</li>
                  <li>compiler integration</li>
                  <li>NovelAI API wiring</li>
                  <li>backup integration</li>
                  <li>Context UI</li>
                  <li>dedicated context tests</li>
                </ul>

                <div className="milestone-why">
                  <h3>Why this matters</h3>
                  <p>Before 0.8.0, Howling Whispers had context scattered across several systems.</p>
                  <p>After 0.8.0, context becomes a first-class part of the engine.</p>
                  <p><strong>Memory remembers. Lore awakens. Context finally becomes something you can control.</strong></p>
                </div>
              </div>
            </article>
            <article className="changelog-entry featured">
              <span className="changelog-mark">◐</span>
              <div>
              <span className="changelog-version">Version 0.7.3 · The Living Stage: Second Act</span>
              <h2>The Living Stage: Second Act</h2>
              <p>
                Stabilization and completion pass for the Living Stage foundation.
              </p>
              <ul>
                <li>Round Robin cursor persistence and rotation fixes</li>
                <li>Smart Participation edge-case improvements</li>
                <li>Disabled Living Cast behavior verification</li>
                <li>Stable Character ID on generated Character messages</li>
                <li>Per-character relationship scoring for invited Characters</li>
                <li>Multi-character bubble handling improvements</li>
                <li>Narrator generation path for multi-character scenes</li>
                <li>Expanded integration test coverage</li>
              </ul>
              </div>
            </article>
            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.7.2 · The Living Stage</span>
                <h2>The Living Stage</h2>
                <p>
                  Living Cast foundation shipped as a configurable Add-on. Explicit Character invitation,
                  Round Robin and Smart Participation modes, panel layout controls, and the removal of
                  automatic random-word cast discovery.
                </p>
                <ul>
                  <li>Relationship score (-1000..10000) tracked per (character, persona), saved across sessions</li>
                  <li>A local, provider-neutral scorer evaluates each committed character reply for a relationship delta</li>
                  <li>Rerolls, edits, deletes, and rewinds preserve score consistency &mdash; never farmable</li>
                  <li>Relationship state is included in backups and restores, migrating legacy bond values</li>
                  <li>The relationship meter reflects accumulated history instead of a static bond</li>
                </ul>
                <h3>What changed</h3>
                <ul>
                  <li><strong>Relationship state</strong> &mdash; (characterId, personaId) records with event history in <code>lib/relationships/</code></li>
                  <li><strong>Generation context</strong> &mdash; only a non-commanding tier/label phrase feeds the prompt; deltas never enter the reply</li>
                  <li><strong>Reroll/edit/delete/rewind integrity</strong> &mdash; events keyed by a stable turn id, replaced not stacked</li>
                </ul>
              </div>
            </article>
            <article className="changelog-entry featured hotfix-card">
             <div className="changelog-mark">◐</div>
             <div>
               <span>Version 0.7.1 · The Black Memory</span>
               <h2>The Black Memory</h2>
               <p>
                  This release adds a data-only add-on system, reusable Common Scenes with runtime template variables, and fixes to reply-length enforcement, Living Cast initialization, pronoun handling, and navigation.
               </p>
               <ul>
                  <li>Howling Add-ons let you import, enable, disable, export, and uninstall JSON add-on packages</li>
                  <li>Add-ons can contribute Common Scenes with source attribution</li>
                  <li>Reusable Common Scenes work with any character via the normal scene pipeline</li>
                  <li><code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> resolve at runtime only</li>
                  <li>Reply-length ceilings are now enforced across all generation paths</li>
                  <li>Living Cast initializes from scene openings and seeds autonomy automatically</li>
                  <li>Story Pulse restored as a compact relationship meter</li>
                  <li>Character pronouns propagate authoritatively through the context compiler</li>
                   <li>Add-ons in main nav; What&apos;s New and Settings moved to account menu</li>
               </ul>
               <h3>What changed</h3>
               <ul>
                 <li><strong>Howling Add-ons</strong> — data-only JSON manifests for Common Scenes and character content. Install, enable/disable, export, and uninstall. Malformed packages are rejected during validation. No executable mod or plugin API yet.</li>
                 <li><strong>Add-on Common Scenes</strong> — add-ons contribute scenes separate from personal Common Scenes, show source attribution, and hide automatically when disabled.</li>
                 <li><strong>Common Scenes</strong> — reusable starter scenes that work with any character or persona through the normal <code>startCommonScene()</code> pipeline. Includes built-in starter scenes.</li>
                 <li><strong>Runtime template variables</strong> — <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> resolve only at runtime. Stored templates remain unchanged. Active persona has priority for <code>{'{{user}}'}</code>.</li>
                 <li><strong>Reply-length enforcement</strong> — Quick, Immersive, and Novel-like ceilings are hard-enforced via truncation, bounded local contracts, and continuation guards.</li>
                 <li><strong>Living Cast initialization</strong> — scene openings detect side characters and seed autonomy from the detected cast.</li>
                 <li><strong>Story Pulse UI</strong> — restored compact dynamic relationship meter between active persona and primary character.</li>
                 <li><strong>Pronoun propagation</strong> — authoritative character pronouns survive canonical conversion and context compilation. Built-in female characters carry <code>she/her</code>. They/them preserved per character.</li>
                 <li><strong>Navigation cleanup</strong> — Add-ons added to main navigation. What&apos;s New and Settings moved to account menu.</li>
               </ul>
             </div>
           </article>
          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.6.0.2 · Story pipeline hotfix</span>
              <h2>Impersonate is now an action</h2>
              <p>
                Use the ◐ button beside Send to generate the player&apos;s turn from whatever you already typed.
              </p>
              <ul>
                <li>Works on completely blank conversations</li>
                <li>No separate Impersonate composer mode</li>
                <li>Clears the composer after sending</li>
                <li>Character replies continue normally afterward</li>
                <li>Broken or empty story responses now show a useful error instead of a JSON parse failure</li>
                <li>Generated player turns are formatted deterministically: spoken dialogue in &quot;quotes&quot;, actions in *asterisks*, beats on their own lines, wrappers stripped — no prompt guesswork</li>
                <li>The edit window now looks and writes like the composer text field</li>
              </ul>
            </div>
          </article>
          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.6.0.2 · Drives that remember</span>
              <h2>Side-character inner state now persists across the whole conversation</h2>
              <p>
                Goals, wants, fears, concerns, and basic needs carry forward turn after turn —
                even after reloads — and evolve from what actually happens in the story.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Autonomous state is stored with each conversation, so a character&apos;s goal, intent, wants, fears, concerns, and needs survive turns, reloads, and speaker switches.</li>
                <li>Drives update deterministically from the recent story with no extra AI call: eating eases hunger, resting eases fatigue, discovery settles a concern, an unanswered question weighs on a character, and conflict seeds a fear.</li>
                <li>Only real cast members hold state — sentence-start ghosts (What, Why, Did, Tell, Both, Because, Got, Jail) and stale characters are pruned, never given drives.</li>
                <li>Replying as a specific side character updates that character&apos;s own state — never a guessed speaker.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.6.0.1 · The room listens back</span>
              <h2>Living Cast stops seeing ghosts, and side characters act on their own</h2>
              <p>
                Ordinary words like What, Why, Did, Tell, Both, Because, Got, and Jail are no
                longer mistaken for characters, and present side characters now carry a
                lightweight inner state that shapes how they behave.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Capitalization alone no longer creates a cast member — a name needs real evidence like an introduction, arrival, speech attribution, or repeated use.</li>
                <li>Stale false names from before this fix are cleaned up automatically.</li>
                <li>Each side character now has an autonomous state: a goal, immediate intent, wants, fears, unresolved concerns, and basic needs like hunger, fatigue, comfort, social, and curiosity.</li>
                <li>Drives influence an NPC without forcing them — they may disagree, hesitate, refuse, conceal something, or change their mind.</li>
                <li>NPCs can act on their own when their state gives them a reason, not only when asked.</li>
                <li>Private thoughts stay hidden behind the perception boundary; the story shows only what the player could see, like shorter answers or a glance toward the doorway.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.6.0 · Side characters speak for themselves</span>
              <h2>The Living Cast keeps track of who is in the room</h2>
              <p>
                The story now watches each turn for the characters that are present, and named
                side characters answer for themselves when the main character asks them a
                direct question.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Living Cast detection builds and persists a per-conversation cast from the characters the story introduces or lets leave.</li>
                <li>Automatic side-character replies answer as the named side character with no extra AI call — using the conversation&apos;s own cast.</li>
                <li>Replies carry the speaking side character&apos;s name across Character Response, Impersonate, and Reroll.</li>
                <li>The Living Cast panel in the chat context rail shows who is present and who is waiting to answer.</li>
                <li>Each cast survives reloads and backup/restore round trips with its conversation.</li>
                <li>Turn automatic side-character replies off in Settings if you prefer to steer every side character yourself.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.5.4 · Characters without borders</span>
              <h2>Character Card V2 is now the standard portable character format</h2>
              <p>
                Import V2 PNG or JSON cards from BotBooru and other compatible platforms, or
                download Howling Whispers characters as portable V2 cards with their structured
                definitions intact.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>One import control detects V2 PNG, V2 JSON, and existing Howling Whispers character or library backups.</li>
                <li>Imported PNG artwork persists as the character card and chat portrait without becoming scene background art.</li>
                <li>V2 description, personality, scenario, greetings, examples, creator metadata, extensions, and character-book lore survive round trips.</li>
                <li>Imported prompt-like fields remain untrusted character content beneath application safety and provider rules.</li>
                <li>V2 PNG is the primary download; V2 JSON and full-fidelity Howling backups remain available.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.5.3 · Clean scenes, tidy tags</span>
              <h2>AI replies no longer leak their thinking labels into your story</h2>
              <p>
                When the local model appends a <em>[Tags …; Mood …]</em> footnote to a reply,
                that note is now stripped from the visible text and captured as structured
                story metadata — ready to power scenes, moods, sagas, and memory later.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Emergent Tags/Mood footnotes are removed in every mode: Character Response, Impersonate, Skip Turn, Reroll, and Autopilot.</li>
                <li>Stage directions and inner voice like <em>[she hesitates]</em> stay in the story — only footer blocks at the end of a reply are treated as metadata.</li>
                <li>Each message now carries the parsed metadata in the background without ever cluttering the narration.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.5.2 · Your story belongs to you</span>
              <h2>Private data can now be backed up and restored</h2>
              <p>
                Sign in to your archive to keep a server-side backup of your characters,
                personas, messages, and settings — encrypted at rest — or download your
                entire private data as a single portable file and restore it later.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Export all private data as a local backup file, and restore it from the same panel.</li>
                <li>Create server-side backups with one click; download, restore, or delete any of them.</li>
                <li>Server backups are encrypted at rest and visible only to their own signed-in account.</li>
                <li>Backups protect your data without bundling the four curated characters&apos; protected canon.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.5.1.1 · Each turn has one speaker</span>
              <h2>Character Response and Impersonate now share one generation pipeline</h2>
              <p>
                Character Response writes only for the selected character, and Impersonate
                writes only for your persona. The provider always knows whose turn it is
                allowed to write, and Impersonate turns may be as short as a single action
                or line instead of being padded into a mini-novel.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Character Response never takes over your persona&apos;s dialogue, actions, thoughts, or decisions.</li>
                <li>Impersonate never continues or finishes the AI character&apos;s turn.</li>
                <li>Quick, Immersive, and Novel-like lengths now behave correctly for both targets.</li>
                <li>Response length, detail, POV, creativity, and roleplay controls feed one shared flow and respect who is being generated.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.5.1 · Personas step into their own space</span>
              <h2>Your identities now have a page of their own</h2>
              <p>
                The complete Persona Library now lives under the dedicated Personas tab,
                directly beside Characters. Your existing personas, active selection,
                imports, exports, and story snapshots continue working exactly as before.
              </p>
              <h3>What changed</h3>
              <ul>
                <li>Open Personas directly from the main navigation.</li>
                <li>Create, edit, duplicate, import, export, and select personas from one focused page.</li>
                <li>Settings remains focused on providers, connections, and appearance.</li>
                <li>No saved persona data or story identity snapshots were rewritten.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">✦</div>
            <div>
              <span>Version 0.5.0 · A full life for your characters</span>
              <h2>From your page to the Whispering Archive</h2>
              <p>
                Your characters are no longer fixed in place. Shape them, play them with a
                consistent identity, carry them between devices, and publish them into a
                public archive whenever you choose — while what you privately play stays
                yours and yours alone.
              </p>
              <h3>The Whispering Archive</h3>
              <ul>
                <li>Publish an explicit snapshot of a character; it stays link-only until you make it public.</li>
                <li>Browse and search shared characters by name, tag, age, and content rating.</li>
                <li>Open a readable share page for anything you have published.</li>
                <li>Import any archived character as an independent copy you are free to edit.</li>
                <li>Sign in to publish and report; keepers review everything that reaches Browse.</li>
              </ul>
              <h3>Player personas</h3>
              <ul>
                <li>Create, edit, duplicate, or delete personas from a single library in Settings.</li>
                <li>Choose which persona you play before every scene, sandbox, or Whisper Mode session.</li>
                <li>Each conversation records the persona you were, so old stories stay consistent.</li>
                <li>Continue without a persona any time you prefer to be simply yourself.</li>
              </ul>
              <h3>Characters you own</h3>
              <ul>
                <li>Edit any detail of a character you made or imported, from name to memories to portrait.</li>
                <li>Delete a character and everything tied to it in one clean sweep.</li>
                <li>The curated cast &mdash; Coda, Heather, Peony, and Senako &mdash; stays locked from editing and deletion.</li>
              </ul>
              <h3>Backups</h3>
              <ul>
                <li>Export your whole character library to a file and import it back anywhere.</li>
                <li>Back up and restore your persona library the same way in Settings.</li>
                <li>Re-imports stay conflict-free, so nothing is ever accidentally replaced or lost.</li>
              </ul>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.4.2.9 · Anchor the player identity</span>
              <h2>Impersonate knows who is speaking</h2>
              <p>
                Even without a display name or persona, the model now receives an explicit
                fallback player identity. Character-style drafts are rejected wherever they
                appear, not only when they start the message.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.4.2.7 · Make Impersonate directional</span>
              <h2>Your prompt becomes a road sign</h2>
              <p>
                Impersonate now keeps your direction private and turns its intent into a new
                player-side action or line of dialogue. Echoed directions and character-side
                drafts are rejected and retried instead of being posted in your bubble.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.4.2.6 · Send direct player turns correctly</span>
              <h2>Your first-person line stays yours</h2>
              <p>
                A complete line such as “I want…” is now sent directly as the player turn, so
                the character gets to respond in the character bubble instead of its reaction
                appearing as if the player said it.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◐</div>
            <div>
              <span>Version 0.4.2.5 · Keep impersonation in first person</span>
              <h2>Impersonate stays on your side</h2>
              <p>
                Impersonation drafts now use first-person player voice and are explicitly blocked
                from writing the character&apos;s voice, eyes, body, feelings, or reaction inside the
                player bubble.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">»</div>
            <div>
              <span>Version 0.4.2.4 · Keep Skip turn focused</span>
              <h2>Skip turn stays on one side</h2>
              <p>
                The normal roleplay skip action now produces one concise character-only beat,
                capped at 150 words, instead of using the full novel-length reply setting or
                letting the model write both sides of the conversation.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">🛑</div>
            <div>
              <span>Version 0.4.2.3 · Keep turns contained</span>
              <h2>Next is one beat, not a marathon</h2>
              <p>
                Manually advancing Whisper Mode now generates one character beat and pauses instead
                of leaving the automatic loop running. NovelAI and Ollama errors can be dismissed,
                and impersonation directions are treated as private control input rather than
                story text.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">🔍</div>
            <div>
              <span>Version 0.4.2.2 · Sharper shares</span>
              <h2>Zoom in and actually read it</h2>
              <p>
                Shared scenes now render at 50% higher resolution, so when you paste one into
                Discord and click to zoom, every line is crisp enough to read without
                downloading. Long conversations keep the highest safe resolution the browser
                can handle.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">🖼️</div>
            <div>
              <span>Version 0.4.2.1 · Share, redrawn</span>
              <h2>The image actually renders now</h2>
              <p>
                The first cut of the share feature relied on a page-to-picture technique that
                silently lost the theme colors and could capture a blank frame. The image is now
                painted directly with the same fonts, theme colors, bubbles, and portraits you
                see in the chat — so what lands in your clipboard is always the conversation,
                every time, on any browser.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">🖼️</div>
            <div>
              <span>Version 0.4.2 · Share the story</span>
              <h2>The story, ready to share</h2>
              <p>
                Every conversation can now become an image. The chat&apos;s ⇣ Share button
                opens a small config popup — how many messages to include, name captions on
                bubbles, and a scene header — then renders a crisp PNG you can paste straight
                into Discord. The entrance also picks a fresh featured character on every
                visit, Valerie Whiteclaw rotates in as a coming-soon teaser, and every curated
                character now credits its creator.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">🌕</div>
            <div>
              <span>Version 0.4.1 · Heather rebuilt</span>
              <h2>The ranger is back, exactly as written</h2>
              <p>
                Heather now runs on her official character card: the 42-year-old werewolf
                supremacist with a vanished mate and a grown daughter, plus all three of her
                real greetings — each given its own hand-crafted scene and custom art. The
                entrance also rotates a curation card inviting creators to the Howling
                Whispers Discord, and curated scenes are now locked from casual editing.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">✦</div>
            <div>
              <span>Version 0.4.0 · Whisper Mode</span>
              <h2>Read a living story like a book</h2>
              <p>
                Whisper Mode now writes short self-driven beats in a continuous reading view.
                Choose first person, third person, or an omniscient narrator when starting,
                adjust the background blur, and pause or stop without losing the story.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">⌁</div>
            <div>
              <span>Version 0.3.0 · Story intelligence</span>
              <h2>Every world sends only the details that matter</h2>
              <p>
                Every curated character now has selective world lore, while custom and imported
                characters receive a safe scene-based fallback. After a reply, open Peek Context
                to see active canon and lore, retained history, revisions, and estimated context.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◈</div>
            <div>
              <span>Version 0.3.0 · Coda&apos;s world</span>
              <h2>Eight mysteries now wait beyond the study</h2>
              <p>
                Coda now has a visible world guide, eight individually illustrated opening
                scenes, and selectable player roles. Choose a preset or write a custom role
                before beginning; its external context stays with that new story without
                deciding your character&apos;s personality or choices.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">✦</div>
            <div>
              <span>Version 0.3.0 · Character depth</span>
              <h2>Peony remembers who she is</h2>
              <p>
                Peony now uses her complete, carefully structured character canon in every
                story, including existing sessions. Her trust, voice, boundaries, interests,
                and relationship progress stay consistent as conversations grow, while private
                adult material remains separate from ordinary scenes.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◇</div>
            <div>
              <span>Version 0.3.0 · Sandbox</span>
              <h2>Start with a blank world</h2>
              <p>
                Every character now has an Open Sandbox. It keeps their core identity,
                but starts without a preset scene, memories, setting, or opening move.
                Your first message decides where the roleplay begins.
              </p>
            </div>
          </article>

          <article className="changelog-entry featured">
            <div className="changelog-mark">◉</div>
            <div>
              <span>Version 0.3.0 · Local generation</span>
              <h2>Roleplay without a cloud model</h2>
              <p>
                Settings now lets you switch between NovelAI and Mistral Nemo 12B
                running locally through Ollama. Local prompts and replies stay on the
                computer hosting The Howling Whispers. Structured formatting and selected
                reply-length minimums are enforced before local replies reach the chat.
              </p>
            </div>
          </article>

          <article className="changelog-entry">
            <div className="changelog-mark">↻</div>
            <div>
              <span>Stories</span>
              <h2>More control over each roleplay</h2>
              <p>
                Sessions are independent and can be resumed or deleted. Messages can be
                edited, rerolled, removed individually, or removed with everything after them.
                Custom opening scenes can also be deleted with their linked sessions.
              </p>
            </div>
          </article>

          <article className="changelog-entry">
            <div className="changelog-mark">Aa</div>
            <div>
              <span>Reading controls</span>
              <h2>Make the conversation yours</h2>
              <p>
                Chat font size now sits beside the text colors in Settings. The
                character and context panels can also be hidden independently while chatting.
              </p>
            </div>
          </article>

          <article className="changelog-entry">
            <div className="changelog-mark">◒</div>
            <div>
              <span>Entrance</span>
              <h2>Featured voices at the threshold</h2>
              <p>
                The entrance now rotates through curated character portraits. Choose
                Keep Coda for a static entrance that always returns to her.
              </p>
            </div>
          </article>

          <article className="changelog-entry">
            <div className="changelog-mark">▱</div>
            <div>
              <span>Storage</span>
              <h2>You choose how long the token stays</h2>
              <p>
                NovelAI tokens can last for one tab or this browser profile. Characters,
                sessions, and messages remain local to this browser; clearing its site data
                also clears those stories.
              </p>
            </div>
          </article>

          <article className="changelog-entry caution">
            <div className="changelog-mark">!</div>
            <div>
              <span>Need to know · Remote access</span>
              <h2>Hosted access is encrypted</h2>
              <p>
                This hosted site uses HTTPS, so NovelAI tokens and story traffic are encrypted
                in transit. If you intentionally run the app in direct HTTP remote test mode,
                that separate setup is not encrypted and should only be used temporarily.
              </p>
            </div>
          </article>
        </div>
      </section>
  );
}
