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
        <button className="outline-button" onClick={() => props.setView("home")}>← Back to characters</button>
      </header>

          <div className="changelog-list">
            <article className="changelog-entry featured latest hotfix-card">
             <div className="changelog-mark">◐</div>
             <div>
               <span>Version 0.6.1 · Howling Add-ons, Common Scenes &amp; Story Improvements</span>
               <h2>Howling Add-ons, Common Scenes &amp; story improvements</h2>
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
