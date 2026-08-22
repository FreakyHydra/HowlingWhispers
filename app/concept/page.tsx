import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sagas — Into the Wild. A New Kind of Story.",
  description:
    "Sagas are authored worlds with AI-powered moment-to-moment roleplay. The author owns the story. The AI performs it. You live inside it.",
};

const tiers = [
  {
    num: "01",
    title: "No destination",
    copy: "A free AI chat can create great scenes but may never reach the story the author wanted to tell.",
  },
  {
    num: "02",
    title: "Fragile memory",
    copy: "As conversations grow, old promises, injuries, discoveries and relationships are easily lost to the context window.",
  },
  {
    num: "03",
    title: "Canon drift",
    copy: "The AI may reveal future secrets, change history, or let characters know things they never learned.",
  },
] as const;

const authors = [
  {
    mark: "✦",
    label: "The Creator",
    copy: "Defines the story's truth: canon, major events, characters, emotional arcs, locations, secrets, chapter boundaries and what must never change.",
  },
  {
    mark: "◌",
    label: "The AI",
    copy: "Becomes the cast and narrator. It performs characters, reacts to unexpected player input, and finds believable paths between authored beats.",
  },
  {
    mark: "⌁",
    label: "The Player",
    copy: "Lives inside the story. They choose what to say, how to behave, who to trust, what to investigate, and what kind of relationship they build.",
  },
] as const;

const systemLayers = [
  {
    kind: "Foreground",
    label: "The Roleplay Model",
    copy: "Writes character dialogue, reactions, actions and narration. Its only job is to make the current scene feel alive.",
  },
  {
    kind: "Background",
    label: "The Archivist",
    copy: "Compacts long conversations into structured memories that survive across chapters without re-sending the entire transcript.",
  },
  {
    kind: "Background",
    label: "Continuity Watch",
    copy: "Checks who knows what, which promises exist, which injuries remain, and whether generation contradicts established canon.",
  },
  {
    kind: "Game Code",
    label: "Progression",
    copy: "Applies deterministic relationship scores, unlocks chapters and characters, and tracks hard story flags.",
  },
] as const;

const flow = [
  "Player writes freely",
  "Story state + canon",
  "Roleplay generation",
  "Archivist extracts state",
  "Next scene remembers",
] as const;

const memoryCards = [
  {
    mark: "◈",
    label: "Character knowledge",
    copy: "Arrax may know what Finn's wooden wolf means. Maya may know only that it matters to him. Luna knows nothing until someone tells her.",
  },
  {
    mark: "⌁",
    label: "Relationship state",
    copy: "Trust, bond, affection, conflict and vulnerability persist across chapters without inventing arbitrary numbers.",
  },
  {
    mark: "✧",
    label: "Persistent consequences",
    copy: "Promises, wounds, possessions, discoveries, secrets and unresolved threads carry into the next chapter.",
  },
  {
    mark: "↺",
    label: "Long-form continuity",
    copy: "A chapter can be thousands of messages long, then compact into durable memory for Chapter 2, Chapter 3 and beyond.",
  },
] as const;

const sagaBeats = [
  {
    step: "01",
    title: "The Forge of Innocence Lost",
    copy: "Artha, the kennel-born wolfhound, and Finn, the boy who found him — the making of the protector he becomes.",
  },
  {
    step: "02",
    title: "The Orphans' Flight",
    copy: "A fixed escape with free dialogue, tactical choices and emotional variation.",
  },
  {
    step: "03",
    title: "Echoes of Hope",
    copy: "A looser survival chapter where Artha and Maya recover, trust, and learn to lean on each other.",
  },
  {
    step: "04",
    title: "The Tides of Howling Hills",
    copy: "Mara receives her own playable journey rather than entering only as a supporting figure.",
  },
  {
    step: "05",
    title: "Silver Moonlight",
    copy: "Two histories collide, with remembered player behavior shaping how that connection grows.",
  },
  {
    step: "+",
    title: "Unlockable perspectives",
    copy: "Bones and Rue can reveal the same canon from places the main party never saw.",
  },
] as const;

export default function ConceptPage() {
  return (
    <main className="concept-page">
      <div className="concept-aurora concept-aurora-copper" aria-hidden="true" />
      <div className="concept-aurora concept-aurora-rune" aria-hidden="true" />

      <header className="concept-nav">
        <div className="concept-shell concept-shell-row">
          <Link href="/" className="concept-brand" aria-label="Open The Howling Whispers">
            <span className="concept-brand-mark" aria-hidden="true">◒</span>
            <span>
              <small>Patina Works</small>
              The Howling Whispers
            </span>
          </Link>
          <nav className="concept-nav-links" aria-label="Dev site sections">
            <a href="#idea">The Idea</a>
            <a href="#experience">Experience</a>
            <a href="#system">System</a>
            <a href="#bitterroot">Bitterroot</a>
            <a href="#worlds">Sagas</a>
            <Link href="/community">Community</Link>
          </nav>
          <Link href="/" className="concept-nav-cta">
            Open the app
          </Link>
        </div>
      </header>

      <section className="concept-hero">
        <svg className="concept-hero-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="concept-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a0b0e" />
              <stop offset="0.6" stopColor="#0b0a0d" />
              <stop offset="1" stopColor="#080709" />
            </linearGradient>
            <radialGradient id="concept-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(199,176,109,0.5)" stopOpacity="0.5" />
              <stop offset="1" stopColor="#0b0a0d" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="concept-ridge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#14181c" />
              <stop offset="1" stopColor="#0b0a0d" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#concept-sky)" />
          <circle cx="1240" cy="360" r="330" fill="url(#concept-glow)" opacity="0.35" />
          <circle cx="1240" cy="360" r="120" fill="#d8d0c0" opacity="0.5" />
          <circle cx="1210" cy="338" r="120" fill="#0b0a0d" />
          <path
            d="M0 640 190 470 330 600 520 400 700 610 900 430 1080 600 1270 500 1450 600 1600 540 V900 H0Z"
            fill="url(#concept-ridge)"
          />
          <path
            d="M0 720 260 560 460 720 660 600 900 730 1120 620 1360 730 1600 640 V900 H0Z"
            fill="#0d0f13"
          />
          <circle cx="1240" cy="360" r="180" fill="none" stroke="rgba(215,138,94,0.35)" strokeWidth="1" />
        </svg>
        <div className="concept-shell concept-hero-inner">
          <p className="concept-kicker">Into the Wild — a The Howling Whispers saga</p>
          <h1 className="concept-title">
            More than conversation.
            <em>Into the Wild is a world you can live inside.</em>
          </h1>
          <p className="concept-lede">
            Sagas pair handcrafted stories with moment-to-moment AI roleplay. Author owns the
            world, characters, canon and major events. The AI performs everything else. You speak,
            act and live inside it naturally.
          </p>
          <p className="concept-tagline">
            A linear story sturdy enough to mean something — and free enough to feel alive.
          </p>
          <div className="concept-hero-actions">
            <a href="#idea" className="concept-btn concept-btn-primary">See the concept</a>
            <a href="#bitterroot" className="concept-btn concept-btn-ghost">Meet Bitterroot</a>
          </div>
        </div>
      </section>

      <section className="concept-section" id="idea">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">The core idea</p>
              <h2 className="concept-head-title">Authored stories.<br />Living performances.</h2>
            </div>
            <p className="concept-head-copy">
              Most AI roleplay hands the model nearly total control and hopes it remembers where the
              story was going. Sagas reverses that. The story has a spine — AI gives that spine
              movement, voice, emotion and improvisation.
            </p>
          </div>

          <div className="concept-pitch">
            <blockquote className="concept-quote">
              <p>
                “A visual novel without the dialogue buttons. Say anything — but the world still has
                a real plot, real canon and real consequences.”
              </p>
              <footer>The Sagas pitch</footer>
            </blockquote>
            <div className="concept-stack">
              <article className="concept-mini">
                <b>The author writes what matters.</b>
                <span>Major events, lore, characters, locations, endings, secrets and hard canon remain authored.</span>
              </article>
              <article className="concept-mini">
                <b>The AI handles the performance.</b>
                <span>Dialogue, reactions, descriptions, emotion and small improvisations happen naturally in the moment.</span>
              </article>
              <article className="concept-mini">
                <b>The player gets natural-language freedom.</b>
                <span>No dialogue wheel required. The player writes what they say and do in their own words.</span>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="concept-section concept-section-issue">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">The problem</p>
              <h2 className="concept-head-title">Free is good.<br />Too free is a dead end.</h2>
            </div>
            <p className="concept-head-copy">
              Pure roleplay is exciting, but long stories drift. Important characters change
              personality. Facts vanish. Dead people return. The plot loses traction because nothing
              outside the prompt is truly sacred.
            </p>
          </div>

          <div className="concept-tiers">
            {tiers.map((tier) => (
              <article className="concept-tier" key={tier.title}>
                <span className="concept-tier-num">{tier.num}</span>
                <h3>{tier.title}</h3>
                <p>{tier.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="concept-section" id="experience">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">The player experience</p>
              <h2 className="concept-head-title">Freedom inside<br />chosen tracks.</h2>
            </div>
            <p className="concept-head-copy">
              The player should rarely feel a wall. When a choice simply cannot happen in this
              story, the world redirects through character behavior and logic — not a blunt “you
              cannot do that”.
            </p>
          </div>

          <div className="concept-experience">
            <article className="concept-scene concept-panel">
              <p className="concept-eyebrow concept-eyebrow-teal">A peek</p>
              <h3>“The road north is closed.”</h3>
              <p className="concept-scene-copy">There is no menu that says “north unavailable”. The player simply writes what they want.</p>
              <p className="concept-snippet">“I slip past the guard and head north.”</p>
              <p className="concept-reply">
                <strong>Mara catches your sleeve before you have crossed the lamplight.</strong>
                <span>“Not that way yet,” she whispers. “Trust me.”</span>
              </p>
              <p className="concept-scene-foot">
                The authored story stays intact while the boundary lives inside the fiction.
              </p>
            </article>
            <div className="concept-rules">
              <article className="concept-rule">
                <span className="concept-dot" />
                <div><b>Hard Canon</b><span>Events that must happen or remain true. The AI cannot rewrite them.</span></div>
              </article>
              <article className="concept-rule">
                <span className="concept-dot concept-dot-rune" />
                <div><b>Soft Canon</b><span>An outcome must occur, but the AI adapts how the player gets there.</span></div>
              </article>
              <article className="concept-rule">
                <span className="concept-dot concept-dot-rune" />
                <div><b>Free Space</b><span>Dialogue, small decisions, bonding, exploration — room to take a breath.</span></div>
              </article>
              <article className="concept-rule">
                <span className="concept-dot" />
                <div><b>A Deliberate Director</b><span>The story tracks which beats are pending and keeps the world breathing toward them.</span></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="concept-section concept-section-authors">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">Three authors of every run</p>
              <h2 className="concept-head-title">Author. AI. Player.</h2>
            </div>
            <p className="concept-head-copy">
              No single participant owns everything. Each has a clearly different job.
            </p>
          </div>
          <div className="concept-authors">
            {authors.map((author) => (
              <article className="concept-author concept-panel" key={author.label}>
                <span className="concept-glyph" aria-hidden="true">{author.mark}</span>
                <h3>{author.label}</h3>
                <p>{author.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="concept-section" id="system">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">The intelligence behind it</p>
              <h2 className="concept-head-title">The storyteller plays.<br />The Archivist remembers.</h2>
            </div>
            <p className="concept-head-copy">
              One model performs the scene. A quieter, often local companion keeps the boring
              bookkeeping: memory, continuity, progression and story-state extraction.
            </p>
          </div>

          <div className="concept-layers">
            {systemLayers.map((layer) => (
              <article className="concept-layer" key={layer.label}>
                <span className="concept-layer-kind">{layer.kind}</span>
                <h3>{layer.label}</h3>
                <p>{layer.copy}</p>
              </article>
            ))}
          </div>

          <div className="concept-flow">
            {flow.map((step, index) => (
              <span className="concept-flow-step" key={step}>
                {step}
                {index < flow.length - 1 && <i aria-hidden="true">›</i>}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="concept-section concept-section-memory">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">Memory that acts like game state</p>
              <h2 className="concept-head-title">Not just a summary.</h2>
            </div>
            <p className="concept-head-copy">
              The important idea is that memory becomes structured. It survives chapters without the
              transcript being replayed forever.
            </p>
          </div>
          <div className="concept-value-grid">
            {memoryCards.map((card) => (
              <article className="concept-card concept-value" key={card.label}>
                <span className="concept-glyph" aria-hidden="true">{card.mark}</span>
                <h3>{card.label}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="concept-section concept-section-saga" id="bitterroot">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">The first saga</p>
              <h2 className="concept-head-title">Into the Wild.<br />The Bitterroot Saga.</h2>
            </div>
            <p className="concept-head-copy">
              Bitterroot already carries every structure this system needs: established characters,
              fixed history, alternating perspectives, canonical endings and the mystery that becomes
              the deep dream.
            </p>
          </div>

          <div className="concept-saga-layout">
            <figure className="concept-panel concept-art">
              <svg viewBox="0 0 700 650" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                  <linearGradient id="concept-art-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#16221e" />
                    <stop offset="1" stopColor="#090b0c" />
                  </linearGradient>
                </defs>
                <rect width="700" height="650" fill="url(#concept-art-bg)" />
                <ellipse cx="520" cy="150" rx="120" ry="120" fill="#d8d0c0" opacity="0.2" />
                <path d="M0 430 120 250 210 350 330 190 430 370 520 285 700 440 V650 H0Z" fill="#0b0e10" />
                <path d="M0 500 150 400 280 500 400 360 560 500 700 400 V650 H0Z" fill="#101517" />
                <circle cx="520" cy="150" r="130" fill="none" stroke="rgba(215,138,94,0.3)" strokeWidth="1" />
                <circle cx="330" cy="470" r="6" fill="#d78a5e" />
                <path d="M270 520q0-120 62-210M400 520q22-70 8-150" stroke="#1c2426" strokeWidth="22" strokeLinecap="round" fill="none" />
                <circle cx="332" cy="468" r="4" fill="#d78a5e" />
              </svg>
              <figcaption>
                <h3>Where canon becomes playable.</h3>
                <p>Escape Bitterroot. Survive the wild. Carry memories forward. Unlock new perspectives.</p>
              </figcaption>
            </figure>

            <div className="concept-beats">
              {sagaBeats.map((beat) => (
                <article className="concept-beat" key={beat.title}>
                  <span className="concept-beat-step">{beat.step}</span>
                  <div>
                    <b>{beat.title}</b>
                    <span>{beat.copy}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="concept-section" id="worlds">
        <div className="concept-shell">
          <div className="concept-head">
            <div>
              <p className="concept-eyebrow">More than one world</p>
              <h2 className="concept-head-title">Canon runs,<br />and wilder &ldquo;what ifs&rdquo;.</h2>
            </div>
            <p className="concept-head-copy">
              A saga can be played on canonical rails. For groups that want to stretch, the same
              world, characters and beats can open into non-canon branches and alternate what-ifs.
            </p>
          </div>

          <div className="concept-compare">
            <article className="concept-card concept-compare-card">
              <p className="concept-eyebrow">Aspect</p>
              <ul className="concept-compare-list">
                <li>How the world is built</li>
                <li>Who writes the plot</li>
                <li>What the archive remembers</li>
                <li>Where freedom lives</li>
                <li>What is protected</li>
              </ul>
            </article>
            <div className="concept-compare-col">
              <article className="concept-card concept-compare-card">
                <p className="concept-eyebrow">Free Roleplay</p>
                <h3>Go anywhere.</h3>
                <ul className="concept-compare-list">
                  <li>Pick a character and begin.</li>
                  <li>The relationship grows organically.</li>
                  <li>Dynamic chapters can emerge from play.</li>
                  <li>The AI has broad narrative freedom.</li>
                  <li>Nothing outside your chat is sacred.</li>
                </ul>
              </article>
              <article className="concept-card concept-compare-card concept-compare-fav">
                <p className="concept-eyebrow concept-eyebrow-teal">A Saga</p>
                <h3>Live a story that matters.</h3>
                <ul className="concept-compare-list">
                  <li>Enter an authored world with canonical history.</li>
                  <li>Play within a plot someone designed on purpose.</li>
                  <li>Play chapters, characters and alternate viewpoints.</li>
                  <li>The AI improvises without killing the story&rsquo;s spine.</li>
                  <li>The destination survives every run.</li>
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="concept-section concept-section-close">
        <div className="concept-shell">
          <div className="concept-seal" aria-hidden="true">◒</div>
          <h2 className="concept-final-title">The story survives.<br />The run makes it ours.</h2>
          <p className="concept-final-copy">
            Sagas keeps the writer&rsquo;s world whole, gives the player total freedom inside it, and asks
            the AI to perform rather than to invent the plot. The result is a story you remember being
            inside — not just words on a screen.
          </p>
          <Link href="/" className="concept-btn concept-btn-primary">
            Open the app
          </Link>
        </div>
      </section>

      <footer className="concept-footer">
        <div className="concept-shell concept-footer-row">
          <div>
            <strong>The Howling Whispers</strong>
            <span>Into the Wild — a Sagas concept</span>
          </div>
          <Link href="/comparison" className="concept-meta-link">See the world so far</Link>
          <Link href="/community" className="concept-meta-link">Community</Link>
        </div>
      </footer>
    </main>
  );
}