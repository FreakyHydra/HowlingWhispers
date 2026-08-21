import type { Metadata } from "next";
import Link from "next/link";
import { COMMUNITY_DISCORD_URL } from "../../lib/site";

export const metadata: Metadata = {
  title: "Howling Whispers Community",
  description:
    "Join the official Howling Whispers community to talk about the project, share characters and roleplay ideas, follow development, report issues, give feedback, and hang out with other users.",
};

export default function CommunityPage() {
  return (
    <main className="community-page">
      <div className="community-aurora community-aurora-copper" aria-hidden="true" />
      <div className="community-aurora community-aurora-rune" aria-hidden="true" />

      <header className="community-nav">
        <div className="community-shell community-shell-row">
          <Link href="/" className="community-brand" aria-label="Open The Howling Whispers">
            <span className="community-brand-mark" aria-hidden="true">◒</span>
            <span>
              <small>Patina Works</small>
              The Howling Whispers
            </span>
          </Link>
          <nav className="community-nav-links" aria-label="Dev site sections">
            <Link href="/concept">Concept</Link>
            <Link href="/comparison">Comparison</Link>
            <Link href="/community" aria-current="page">Community</Link>
          </nav>
          <Link href="/" className="community-nav-cta">
            Open the app
          </Link>
        </div>
      </header>

      <section className="community-hero">
        <div className="community-shell community-hero-inner">
          <p className="community-kicker">Official community</p>
          <h1 className="community-title">
            Howling Whispers<br />Community
          </h1>
          <p className="community-lede">
            Join the community to talk about Howling Whispers, share characters and
            roleplay ideas, follow development, report issues, give feedback, and hang
            out with other users.
          </p>
          <div className="community-hero-actions">
            <a
              href={COMMUNITY_DISCORD_URL}
              className="community-btn community-btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Discord
            </a>
            <Link href="/concept" className="community-btn community-btn-ghost">
              Learn about the project
            </Link>
          </div>
          <p className="community-invite">{COMMUNITY_DISCORD_URL}</p>
        </div>
      </section>

      <section className="community-section">
        <div className="community-shell">
          <div className="community-head">
            <div>
              <p className="community-eyebrow">What you will find</p>
              <h2 className="community-head-title">A place for every whisper.</h2>
            </div>
            <p className="community-head-copy">
              Whether you are here for the characters, the stories, or the tools behind
              them, there is a corner of the server for you.
            </p>
          </div>

          <div className="community-grid">
            <article className="community-card">
              <h3>Share characters</h3>
              <p>
                Import your own character cards, show off your portraits, and trade
                scene ideas with other creators.
              </p>
            </article>
            <article className="community-card">
              <h3>Roleplay ideas</h3>
              <p>
                Brainstorm scenarios, world lore, and character dynamics. The best
                concepts often start as a throwaway message.
              </p>
            </article>
            <article className="community-card">
              <h3>Follow development</h3>
              <p>
                Get early looks at upcoming features, test builds, and changelogs
                before they reach the main release.
              </p>
            </article>
            <article className="community-card">
              <h3>Report issues</h3>
              <p>
                Found a bug, a model quirk, or a UI glitch? The community is the
                fastest route to get it fixed.
              </p>
            </article>
            <article className="community-card">
              <h3>Give feedback</h3>
              <p>
                Shape the future of the project by telling the developers what works,
                what does not, and what you want next.
              </p>
            </article>
            <article className="community-card">
              <h3>Hang out</h3>
              <p>
                Chat about the project, voice calls, off-topic threads, and the
                occasional late-night writing sprint.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="community-section community-section-close">
        <div className="community-shell">
          <div className="community-seal" aria-hidden="true">◒</div>
          <h2 className="community-final-title">
            The story does not end<br />at the edge of the screen.
          </h2>
          <p className="community-final-copy">
            The best moments in Howling Whispers happen when players share what they
            built, compare notes, and push the story forward together.
          </p>
          <a
            href={COMMUNITY_DISCORD_URL}
            className="community-btn community-btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Discord
          </a>
        </div>
      </section>

      <footer className="community-footer">
        <div className="community-shell community-footer-row">
          <div>
            <strong>The Howling Whispers</strong>
            <span>Official community</span>
          </div>
          <div className="community-footer-links">
            <Link href="/concept" className="community-meta-link">Concept</Link>
            <Link href="/comparison" className="community-meta-link">Comparison</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
