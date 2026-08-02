import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Two Eras of The Howling Whispers",
  description:
    "A side-by-side look at the original glassmorphic social platform and the new private Patina Works storytelling application.",
};

const comparisons = [
  ["Visual language", "Velvet Game Console", "Patina Works"],
  ["Surface", "Frosted translucent glass", "Opaque charcoal and etched metal"],
  ["Color", "Neon violet, pink and blue", "Copper, cream and oxidized teal"],
  ["Frontend", "HTML and vanilla JavaScript", "React 19 and TypeScript"],
  ["Application model", "Separate pages", "Component-driven application"],
  ["Identity", "Server accounts and cookies", "No account required for local use"],
  ["Persistence", "Central SQLite database", "Private browser-local stories"],
  ["Conversation", "Shared multiplayer rooms", "Personal character sessions"],
  ["Character access", "Public character lobby", "Personal character collection"],
  ["Story systems", "XP, reputation and expansions", "Scenes, memories and sandbox mode"],
  ["AI", "Server-routed provider fallbacks", "NovelAI or local Mistral Nemo"],
  ["Purpose", "Social roleplay ecosystem", "Private storytelling workspace"],
] as const;

export default function ComparisonPage() {
  return (
    <main className="comparison-page">
      <div className="comparison-aurora comparison-aurora-old" aria-hidden="true" />
      <div className="comparison-aurora comparison-aurora-new" aria-hidden="true" />

      <header className="comparison-masthead">
        <Link href="/" className="comparison-brand" aria-label="Open The Howling Whispers">
          <span aria-hidden="true">◒</span>
          The Howling Whispers
        </Link>
        <p>Two eras. One whisper.</p>
        <h1>From a shared world<br />to a private one.</h1>
        <p className="comparison-intro">
          The name remains, but the new application has a different visual language,
          architecture and purpose.
        </p>
      </header>

      <section className="comparison-era-headings" aria-label="Compared versions">
        <article className="comparison-era comparison-era-old">
          <span>Original platform</span>
          <h2>Velvet Game Console</h2>
          <p>Glass, neon and a social roleplay ecosystem built around shared rooms.</p>
        </article>
        <div className="comparison-versus" aria-hidden="true">VS</div>
        <article className="comparison-era comparison-era-new">
          <span>Current application</span>
          <h2>Patina Works</h2>
          <p>Copper, cinematic worlds and private character-driven storytelling.</p>
        </article>
      </section>

      <section className="comparison-table" aria-label="Side-by-side system comparison">
        {comparisons.map(([label, oldValue, newValue], index) => (
          <div className="comparison-row" key={label}>
            <div className="comparison-value comparison-value-old">
              <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
              <strong>{oldValue}</strong>
            </div>
            <div className="comparison-label">{label}</div>
            <div className="comparison-value comparison-value-new">
              <strong>{newValue}</strong>
              <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
            </div>
          </div>
        ))}
      </section>

      <footer className="comparison-footer">
        <div>
          <p>The fundamental change</p>
          <h2>Less social machinery.<br />More room for the story.</h2>
        </div>
        <p>
          The original was a multi-user platform and game ecosystem. The current
          project is a focused, local-first space for characters, scenes and stories
          that belong to the person creating them.
        </p>
        <Link href="/">Enter the current application <span aria-hidden="true">-&gt;</span></Link>
      </footer>
    </main>
  );
}
