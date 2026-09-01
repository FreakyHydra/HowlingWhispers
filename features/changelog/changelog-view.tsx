import { ChangelogView as ChangelogHistory } from "./changelog-history";

export interface ChangelogViewProps {
  packageInfo: { version: string };
  setView: (view: string) => void;
}

export function ChangelogView(props: ChangelogViewProps) {
  return (
    <main className="changelog-stack">
      <style>{`
        .changelog-stack {
          background: #0b090c;
          min-height: 0;
          overflow-y: auto;
        }

        .changelog-stack > .changelog-page,
        .changelog-stack .changelog-history .changelog-page {
          min-height: 0;
          overflow: visible;
        }

        .changelog-current {
          padding-bottom: 12px;
        }

        .changelog-history .changelog-heading {
          display: none;
        }

        .changelog-history .changelog-page {
          padding-top: 0;
        }

        .changelog-history .changelog-entry.latest {
          box-shadow: none;
        }
      `}</style>

      <section className="changelog-page changelog-current">
        <header className="changelog-heading">
          <div>
            <p className="eyebrow">Version {props.packageInfo.version}</p>
            <h1>What&apos;s new</h1>
            <p>Only the changes that affect how you use The Howling Whispers.</p>
          </div>
          <button className="outline-button" onClick={() => props.setView("roleplay")}>← Back to roleplay</button>
        </header>

        <div className="changelog-list">
          <article className="changelog-entry milestone latest">
            <span className="changelog-mark">🧠</span>
            <div>
              <span className="changelog-version">Version 0.11.2.0 · RS V2: The World Remembers</span>
              <div className="milestone-badge">🏆 MAJOR SYSTEM RELEASE</div>
              <h2>RS V2: The World Remembers</h2>
              <blockquote className="milestone-quote">Characters now react from who they are, what happened, and what the world still knows.</blockquote>
              <p>Relationship Engine V2 and World Engine V2 begin replacing flat relationship reactions with persistent, explainable character and scene state.</p>

              <h3>🧠 Relationship Engine V2</h3>
              <ul>
                <li><strong>Multidimensional relationships</strong> - trust, affection, respect, fear, comfort, attachment, suspicion, protectiveness, resentment, and related state can change independently.</li>
                <li><strong>Causal interpretation</strong> - events are appraised by meaning and context rather than simple positive or negative sentiment.</li>
                <li><strong>Momentum and aftereffects</strong> - relationship changes can carry velocity, stability, and emotional residue between turns.</li>
              </ul>

              <h3>👁 Live Relationship State</h3>
              <ul>
                <li><strong>Twelve visible dimensions</strong> - the Roleplay context rail now exposes Trust, Affection, Respect, Fear, Comfort, Suspicion, Attachment, Protectiveness, Resentment, Loyalty, Familiarity, and Authority beneath the overall bond meter.</li>
                <li><strong>Center-zero meters</strong> - every dimension runs from -100 through neutral to +100 so negative and positive state are shown without pretending every relationship signal is simply good or bad progress.</li>
                <li><strong>Live momentum</strong> - rising, falling, and steady indicators show the direction of each relationship dimension as new turns are interpreted.</li>
                <li><strong>Existing stories continue</strong> - old playthroughs are not reset. New RS V2-capable turns begin enriching their multidimensional state from the current point forward.</li>
              </ul>

              <h3>🌍 World Engine V2</h3>
              <ul>
                <li><strong>Persistent scene state</strong> - world and body-state facts survive across turns and backup/restore.</li>
                <li><strong>Character identity integrity</strong> - when a known character participates, generation resolves their real card, relationships, memories, and current state instead of inventing a stand-in.</li>
                <li><strong>Living Cast resolution</strong> - side characters are resolved through the real character registry before they are allowed to speak.</li>
              </ul>

              <h3>🛠 Reliability</h3>
              <ul>
                <li><strong>No fabricated temporary speakers</strong> - unresolved speakers now fail safely instead of borrowing the selected primary character&apos;s identity.</li>
                <li><strong>Pip and Ragna regression coverage</strong> - known family relationships and side-character participation are protected by dedicated tests.</li>
                <li><strong>Impersonate isolation</strong> - player-turn generation keeps continuity and safety context without inheriting character-side RS V2 behavior pressure.</li>
                <li><strong>Portable state</strong> - RS V2 relationship dimensions, causal state, activation provenance, and World Engine state are included in persistence and backup paths.</li>
              </ul>

              <p><strong>This is the first production RS V2 / World Engine V2 slice.</strong> The authoritative state and identity foundation is now visible through the live relationship panel, while diagnostics, branching, and deeper simulation remain available for later expansion.</p>
            </div>
          </article>
        </div>
      </section>

      <div className="changelog-history">
        <ChangelogHistory {...props} />
      </div>
    </main>
  );
}
