import { ChangelogView as ChangelogHistory } from "./changelog-history";

export interface ChangelogViewProps {
  packageInfo: { version: string };
  setView: (view: string) => void;
}

export function ChangelogView(props: ChangelogViewProps) {
  return (
    <>
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
                <li><strong>Portable state</strong> - RS V2 relationship dimensions, causal state, activation provenance, and World Engine state are included in persistence and backup paths.</li>
              </ul>

              <p><strong>This is the first production RS V2 / World Engine V2 slice.</strong> It establishes the authoritative state and identity foundation that later UI, diagnostics, branching, and deeper simulation features can build on.</p>
            </div>
          </article>
        </div>
      </section>

      <div className="changelog-history">
        <style>{`
          .changelog-history .changelog-heading { display: none; }
          .changelog-history .changelog-page { padding-top: 0; }
          .changelog-history .changelog-entry.latest { box-shadow: none; }
        `}</style>
        <ChangelogHistory {...props} />
      </div>
    </>
  );
}
