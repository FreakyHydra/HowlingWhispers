"use client";

/* eslint-disable @next/next/no-img-element */
import type React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { archive, ArchivePublication, archiveMediaUrl } from "@/lib/archive/client";

const AGE_LABEL: Record<string, string> = {
  minor: "Minor",
  adult: "Adult",
  unspecified: "Age unspecified",
};
const RATING_LABEL: Record<string, string> = {
  general: "General",
  mature: "Mature",
};

export default function ArchiveSharePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [pub, setPub] = useState<ArchivePublication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    archive
      .get(id)
      .then(({ publication }) => {
        if (active) setPub(publication);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="share-page">
      <div className="share-masthead">
        <Link href="/" className="share-brand" aria-label="Back to The Howling Whispers">
          <span aria-hidden="true">◒</span>
          <span>
            <small>The Howling Whispers</small>
            <br />
            The Whispering Archive
          </span>
        </Link>
        <Link href="/" className="outline-button">
          Open the app
        </Link>
      </div>

      {error && (
        <section className="share-state">
          <p className="eyebrow">Gone quiet</p>
          <h1>This whisper cannot be found</h1>
          <p>{error}</p>
          <Link href="/" className="primary-button">
            Return to the app
          </Link>
        </section>
      )}

      {!error && !pub && (
        <section className="share-state">
          <p className="eyebrow">Listening…</p>
          <h1>Reaching through the fog</h1>
        </section>
      )}

      {pub && (
        <article className="share-card">
          <span className="share-frame">
            {pub.avatar_url ? (
              <img src={archiveMediaUrl(pub.avatar_url) ?? ""} alt={`${pub.name} portrait`} />
            ) : (
              <span className="share-placeholder" aria-hidden="true">
                {pub.name.charAt(0)}
              </span>
            )}
          </span>
          <header className="share-head">
            <p className="eyebrow">Shared by {pub.owner ?? "a wanderer"}</p>
            <h1>{pub.name}</h1>
            {pub.role ? <p className="share-role">{pub.role}</p> : null}
            <div className="share-badges">
              <span>v{pub.version}</span>
              <span>{AGE_LABEL[pub.age_category] ?? "Age unspecified"}</span>
              <span>{RATING_LABEL[pub.content_rating] ?? "General"}</span>
              {pub.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </header>
          <section className="share-body">
            {pub.profile && (
              <>
                <h2>Who they are</h2>
                <p className="share-text">{pub.profile}</p>
              </>
            )}
            {pub.opening_message && (
              <>
                <h2>Opening message</h2>
                <blockquote className="share-quote">{pub.opening_message}</blockquote>
              </>
            )}
            {pub.creator_credit && <p className="share-credit">Credit: {pub.creator_credit}</p>}
            {pub.license && <p className="share-license">License: {pub.license}</p>}
          </section>
          <footer className="share-foot">
            <p>
              This is a snapshot. To make &quot; {pub.name}&quot; your own — as an independent copy you
              can edit — open the app and import it from the archive.
            </p>
            <Link href="/" className="share-brand-foot" aria-label="Open The Howling Whispers">
              <span aria-hidden="true">◒</span> Enter the app
            </Link>
          </footer>
        </article>
      )}
    </main>
  );
}