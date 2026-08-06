"use client";

/* eslint-disable @next/next/no-img-element */
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  archive,
  archiveMediaUrl,
  ArchivePublication,
  ArchiveUser,
  PublishInput,
  SearchResult,
} from "@/lib/archive/client";

export type ArchiveCharacter = {
  id: string;
  name: string;
  role?: string;
  profile?: string;
  reply?: string;
  image?: string;
  sceneImage?: string;
  ageCategory?: "adult" | "minor" | "unknown";
  isMinor?: boolean | null;
};

type Props = {
  characters: ArchiveCharacter[];
  onImport: (publication: ArchivePublication) => void;
};

const REPORT_CATEGORIES = [
  "Copyright",
  "Impersonation",
  "Inappropriate minor content",
  "Harassment",
  "Spam",
  "Incorrect content rating",
  "Other",
];

const AGE_LABEL: Record<string, string> = {
  minor: "Minor",
  adult: "Adult",
  unspecified: "Age unspecified",
};

const RATING_LABEL: Record<string, string> = {
  general: "General",
  mature: "Mature",
};

type Toast = { kind: "ok" | "err"; text: string } | null;

export default function ArchiveView({ characters, onImport }: Props) {
  const [tab, setTab] = useState<"browse" | "mine" | "account" | "review">("browse");
  const [user, setUser] = useState<ArchiveUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    let active = true;
    archive
      .me()
      .then(({ user }) => {
        if (active) {
          setUser(user);
          setUserLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setUserLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="archive-page" aria-label="The Whispering Archive">
      <header className="archive-header">
        <div>
          <p className="eyebrow">The Whispering Archive</p>
          <h1>Characters shared into the fog</h1>
          <p className="archive-intro">
            Publish a snapshot of one of your characters for others to find, or browse
            what wanderers have left behind. Sharing is always an explicit choice.
          </p>
        </div>
        {userLoading ? null : user ? (
          <button
            className="outline-button archive-account-chip"
            onClick={() => setTab("account")}
            title={`Signed in as ${user.username}`}
          >
            {user.username}
          </button>
        ) : (
          <button className="primary-button archive-account-chip" onClick={() => setTab("account")}>
            Sign in to share
          </button>
        )}
      </header>

      <nav className="archive-tabs" aria-label="Archive sections">
        <button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>
          Browse
        </button>
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>
          My shared characters
        </button>
        <button className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}>
          Account
        </button>
        {user?.role === "moderator" && (
          <button className={tab === "review" ? "active" : ""} onClick={() => setTab("review")}>
            Review
          </button>
        )}
      </nav>

      {toast && (
        <div role="status" className={`archive-toast archive-toast-${toast.kind}`}>
          {toast.text}
        </div>
      )}

      {tab === "browse" && (
        <BrowsePanel
          user={user}
          onImport={onImport}
          onReport={showToast}
          onError={showToast}
        />
      )}
      {tab === "mine" && (
        <MinePanel
          user={user}
          characters={characters}
          onError={showToast}
          onOk={showToast}
        />
      )}
      {tab === "account" && (
        <AccountPanel
          user={user}
          setUser={setUser}
          onError={showToast}
          onOk={showToast}
        />
      )}
    {tab === "review" && user?.role === "moderator" && (
        <ReviewPanel onError={showToast} onOk={showToast} />
      )}
    </section>
  );
}

function BrowsePanel({
  user,
  onImport,
  onReport,
  onError,
}: {
  user: ArchiveUser | null;
  onImport: (p: ArchivePublication) => void;
  onReport: (kind: "ok" | "err", text: string) => void;
  onError: (kind: "ok" | "err", text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [age, setAge] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [working, setWorking] = useState(false);
  const [reportTarget, setReportTarget] = useState<SearchResult | null>(null);

  const runSearch = useCallback(
    (pageNumber = 1) =>
      archive
        .search({
          q: query,
          tags: tag ? [tag] : undefined,
          age: age || undefined,
          rating: rating || undefined,
          page: pageNumber,
        })
        .then((res) => {
          setResults(res.publications);
          setTotalPages(res.totalPages);
          setPage(res.page);
        })
        .catch((e) => onError("err", e.message)),
    [query, tag, age, rating, onError],
  );

  useEffect(() => {
    runSearch(1);
  }, [runSearch]);

  const busy = working || results === null;

  const submitted = (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    runSearch(1);
  };

  return (
    <div className="archive-browse">
      <form className="archive-search" onSubmit={submitted}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shared characters…"
          aria-label="Search the archive"
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag, e.g. fantasy"
          aria-label="Filter by tag"
        />
        <select value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age category">
          <option value="">Any age</option>
          <option value="adult">Adult</option>
          <option value="minor">Minor</option>
          <option value="unspecified">Unspecified</option>
        </select>
        <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Content rating">
          <option value="">Any rating</option>
          <option value="general">General</option>
          <option value="mature">Mature</option>
        </select>
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>

      <div className="archive-results" aria-live="polite">
        {busy && <p className="archive-empty">Listening for echoes…</p>}
        {!busy && results && results.length === 0 && (
          <p className="archive-empty">Nothing here yet. Be the first to share a character.</p>
        )}
        {!busy &&
          results?.map((pub) => (
            <article className="archive-card" key={pub.id}>
              <a className="archive-card-link" href={`/archive/${pub.id}`} onClick={(e) => e.preventDefault()}>
                <span className="archive-card-frame">
                  {pub.avatar_url ? (
                    <img src={archiveMediaUrl(pub.avatar_url) ?? ""} alt="" />
                  ) : (
                    <span className="archive-card-placeholder" aria-hidden="true">
                      {pub.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="archive-card-body">
                  <strong>{pub.name}</strong>
                  <small>by {pub.owner ?? "unknown"}</small>
                  {pub.role ? <span className="archive-card-role">{pub.role}</span> : null}
                  <span className="archive-card-tags">
                    {pub.tags.slice(0, 4).map((t) => (
                      <i key={t}>{t}</i>
                    ))}
                  </span>
                </span>
              </a>
              <div className="archive-card-actions">
                <span
                  className={`archive-badge archive-badge-${pub.age_category}`}
                  title={`${AGE_LABEL[pub.age_category] ?? "Age unspecified"} / ${RATING_LABEL[pub.content_rating] ?? "General"}`}
                >
                  {pub.age_category === "adult" ? "18+" : AGE_LABEL[pub.age_category] ?? "Ages"}
                </span>
                <button
                  className="link-button"
                  onClick={() => onImport(pub as unknown as ArchivePublication)}
                >
                  Import as copy
                </button>
                <button className="link-button" onClick={() => setReportTarget(pub)}>
                  Report
                </button>
              </div>
            </article>
          ))}
      </div>

      {!busy && results && results.length > 0 && totalPages > 1 && (
        <div className="archive-pager">
          <button
            className="outline-button"
            disabled={page <= 1}
            onClick={() => runSearch(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="outline-button"
            disabled={page >= totalPages}
            onClick={() => runSearch(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          publication={reportTarget}
          user={user}
          onClose={() => setReportTarget(null)}
          onDone={(ok, text) => {
            onReport(ok, text);
            setReportTarget(null);
          }}
        />
      )}
    </div>
  );
}

function ReportModal({
  publication,
  user,
  onClose,
  onDone,
}: {
  publication: SearchResult;
  user: ArchiveUser | null;
  onClose: () => void;
  onDone: (kind: "ok" | "err", text: string) => void;
}) {
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onDone("err", "You must be signed in to report a character.");
      return;
    }
    setBusy(true);
    try {
      await archive.report(publication.id, category, details.trim());
      onDone("ok", "Thanks — a keeper of the archive has been told.");
    } catch (err) {
      onDone("err", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal persona-modal archive-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">Report</p>
        <h2 id="report-title">Report &quot;{publication.name}&quot;</h2>
        <p className="modal-intro">
          Telling the keepers about a problem keeps the archive safe. Reports are reviewed
          by a moderator.
        </p>
        <form onSubmit={submit} className="archive-report-form">
          <label>
            Reason
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Details
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything the keepers should know…"
              maxLength={2000}
              rows={4}
            />
          </label>
          <div className="archive-modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MinePanel({
  user,
  characters,
  onError,
  onOk,
}: {
  user: ArchiveUser | null;
  characters: ArchiveCharacter[];
  onError: (kind: "ok" | "err", text: string) => void;
  onOk: (kind: "ok" | "err", text: string) => void;
}) {
  const [mine, setMine] = useState<ArchivePublication[] | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [editing, setEditing] = useState<ArchivePublication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArchivePublication | null>(null);

  const refresh = useCallback(() => {
    archive
      .mine()
      .then((res) => setMine(res.publications))
      .catch((e) => onError("err", e.message));
  }, [onError]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (!user) {
    return (
      <div className="archive-empty">
        <p>You need an account to share characters into the archive.</p>
        <p>Switch to the Account tab to sign in or create one.</p>
      </div>
    );
  }

  return (
    <div className="archive-mine">
      <div className="archive-mine-tools">
        <button className="primary-button" onClick={() => setPublishOpen(true)}>
          Share a character
        </button>
      </div>

      <div className="archive-mine-list">
        {mine && mine.length === 0 && (
          <p className="archive-empty">
            You have not shared anything yet. Pick a character and publish a snapshot.
          </p>
        )}
        {mine?.map((pub) => (
          <article className="archive-mine-item" key={`${pub.id}-${pub.version}`}>
            <div className="archive-mine-main">
              <strong>{pub.name}</strong>
              <span className="archive-mine-meta">
                v{pub.version} · {pub.visibility} · {pub.moderation_status}
              </span>
              {pub.tags.length ? (
                <span className="archive-card-tags">
                  {pub.tags.slice(0, 4).map((t) => (
                    <i key={t}>{t}</i>
                  ))}
                </span>
              ) : null}
            </div>
            <div className="archive-mine-actions">
              <button
                className="link-button"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/archive/${pub.id}`);
                  onOk("ok", "Share link copied.");
                }}
              >
                Copy link
              </button>
              <button
                className="link-button"
                onClick={() => {
                  archive
                    .setVisibility(pub.id, pub.visibility === "public" ? "unlisted" : "public")
                    .then(refresh)
                    .catch((e) => onError("err", e.message));
                }}
              >
                {pub.visibility === "public" ? "Make unlisted" : "Make public"}
              </button>
              <button className="link-button" onClick={() => setEditing(pub)}>
                Update
              </button>
              <button className="link-button archive-danger" onClick={() => setDeleteTarget(pub)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {(publishOpen || editing) && (
        <PublishModal
          characters={characters}
          initial={editing ?? null}
          onClose={() => {
            setPublishOpen(false);
            setEditing(null);
          }}
          onDone={(ok, text) => {
            onOk(ok, text);
            setPublishOpen(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section
            className="modal persona-modal archive-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Delete</p>
            <h2 id="delete-title">Remove &quot;{deleteTarget.name}&quot;?</h2>
            <p className="modal-intro">
              This deletes the shared snapshot. Copies others have already imported stay
              theirs — you can never take those back.
            </p>
            <div className="archive-modal-actions">
              <button className="outline-button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="archive-danger-button"
                onClick={() => {
                  archive
                    .remove(deleteTarget.id)
                    .then(() => {
                      onOk("ok", "Removed from the archive.");
                      setDeleteTarget(null);
                      refresh();
                    })
                    .catch((e) => onError("err", e.message));
                }}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PublishModal({
  characters,
  initial,
  onClose,
  onDone,
}: {
  characters: ArchiveCharacter[];
  initial: ArchivePublication | null;
  onClose: () => void;
  onDone: (kind: "ok" | "err", text: string) => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [profile, setProfile] = useState(initial?.profile ?? "");
  const [openingMessage, setOpeningMessage] = useState(initial?.opening_message ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [ageCategory, setAgeCategory] = useState<ArchivePublication["age_category"]>(
    initial?.age_category ?? "unspecified",
  );
  const [contentRating, setContentRating] = useState<ArchivePublication["content_rating"]>(
    initial?.content_rating ?? "general",
  );
  const [creatorCredit, setCreatorCredit] = useState(initial?.creator_credit ?? "");
  const [license, setLicense] = useState(initial?.license ?? "");
  const [busy, setBusy] = useState(false);

  const applySource = (id: string) => {
    setSourceId(id);
    const c = characters.find((ch) => ch.id === id);
    if (!c || initial) return;
    setName(c.name ?? "");
    setRole(c.role ?? "");
    setProfile(c.profile ?? "");
    setOpeningMessage(c.reply ?? "");
    const isMinor = c.ageCategory === "minor" || c.isMinor === true;
    const isAdult = c.ageCategory === "adult";
    setAgeCategory(isMinor ? "minor" : isAdult ? "adult" : "unspecified");
    setContentRating(isMinor ? "general" : isAdult ? "mature" : "general");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onDone("err", "A name is required.");
      return;
    }
    setBusy(true);
    try {
      const input: PublishInput = {
        name: name.trim(),
        role: role.trim(),
        profile: profile.trim(),
        openingMessage: openingMessage.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        age_category: ageCategory,
        content_rating: contentRating,
        creator_credit: creatorCredit.trim() || null,
        license: license.trim() || null,
      };
      const source = characters.find((ch) => ch.id === sourceId);
      if (source) {
        input.source_character_id = source.id;
        if (source.image && /^(https?:)?\/\//.test(source.image)) {
          input.avatar_url = source.image;
        }
        if (source.sceneImage && /^(https?:)?\/\//.test(source.sceneImage)) {
          input.scene_image_url = source.sceneImage;
        }
      }
      if (initial) {
        await archive.update(initial.id, input);
        onDone("ok", "A new version was published for review.");
      } else {
        const res = await archive.publish(input);
        onDone(
          "ok",
          `"${res.publication.name}" is now a link-only draft. Make it public and wait for review to appear in Browse.`,
        );
      }
    } catch (err) {
      onDone("err", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal persona-modal archive-modal archive-publish-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{initial ? "Update snapshot" : "Share a snapshot"}</p>
        <h2 id="publish-title">{initial ? `New version of "${initial.name}"` : "Publish a character"}</h2>
        <p className="modal-intro">
          This shares a point-in-time snapshot, never your live character. Others get an
          independent copy; your original stays private.
        </p>
        <form onSubmit={submit} className="archive-publish-form">
          {!initial && characters.length > 0 && (
            <label>
              Start from a local character
              <select value={sourceId} onChange={(e) => applySource(e.target.value)}>
                <option value="">Blank snapshot…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Name *
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </label>
          <label>
            Role
            <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={1200} />
          </label>
          <label>
            Profile
            <textarea value={profile} onChange={(e) => setProfile(e.target.value)} rows={4} maxLength={20000} />
          </label>
          <label>
            Opening message *
            <textarea
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              required
            />
          </label>
          <label>
            Tags
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="fantasy, western, mystery"
              maxLength={400}
            />
          </label>
          <div className="archive-publish-row">
            <label>
              Age category
              <select
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value as ArchivePublication["age_category"])}
              >
                <option value="unspecified">Unspecified</option>
                <option value="adult">Adult</option>
                <option value="minor">Minor</option>
              </select>
            </label>
            <label>
              Content rating
              <select
                value={contentRating}
                onChange={(e) => setContentRating(e.target.value as ArchivePublication["content_rating"])}
              >
                <option value="general">General</option>
                <option value="mature">Mature</option>
              </select>
            </label>
          </div>
          <label>
            Creator credit
            <input value={creatorCredit} onChange={(e) => setCreatorCredit(e.target.value)} maxLength={300} />
          </label>
          <label>
            License
            <input value={license} onChange={(e) => setLicense(e.target.value)} maxLength={80} />
          </label>
          <div className="archive-modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Publishing…" : initial ? "Create new version" : "Publish snapshot"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AccountPanel({
  user,
  setUser,
  onError,
  onOk,
}: {
  user: ArchiveUser | null;
  setUser: (u: ArchiveUser | null) => void;
  onError: (kind: "ok" | "err", text: string) => void;
  onOk: (kind: "ok" | "err", text: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (mode: "login" | "register", e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await archive.login(username.trim(), password)
          : await archive.register(username.trim(), password);
      setUser(res.user);
      setPassword("");
      onOk("ok", mode === "login" ? "Welcome back." : "Your archive account is ready.");
    } catch (err) {
      onError("err", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await archive.logout();
      setUser(null);
      onOk("ok", "Signed out of the archive.");
    } catch (err) {
      onError("err", (err as Error).message);
    }
  };

  if (user) {
    return (
      <div className="archive-account">
        <section className="archive-account-card">
          <p className="eyebrow">Signed in</p>
          <h2>{user.username}</h2>
          <p className="archive-intro">
            Your archive account is only used to publish, manage, and report characters.
            It never touches your stories, personas, or conversations — those stay on this
            device.
          </p>
          <div className="archive-modal-actions">
            <button className="outline-button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="archive-account">
      <div className="archive-account-grid">
        <section className="archive-account-card">
          <p className="eyebrow">Sign in</p>
          <h2>Already a keeper?</h2>
          <form
            className="archive-auth-form"
            onSubmit={(e) => {
              void submit("login", e);
            }}
          >
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
        <section className="archive-account-card">
          <p className="eyebrow">Create an account</p>
          <h2>Become a keeper</h2>
          <p className="archive-intro">
            Accounts are local to this archive. Pick a username (3-32 characters) and a
            password of at least 8 characters.
          </p>
          <form
            className="archive-auth-form"
            onSubmit={(e) => {
              void submit("register", e);
            }}
          >
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
function ReviewPanel({
  onError,
  onOk,
}: {
  onError: (kind: "ok" | "err", text: string) => void;
  onOk: (kind: "ok" | "err", text: string) => void;
}) {
  const [pending, setPending] = useState<
    { id: string; name: string; moderation_status: string; created_at: string }[]
  >([]);
  const [reports, setReports] = useState<
    { id: string; publication_id: string; category: string; details: string | null; status: string }[]
  >([]);

  const refresh = useCallback(() => {
    archive
      .moderation()
      .then((res) => {
        setPending(res.pending);
        setReports(res.reports);
      })
      .catch((e) => onError("err", e.message));
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const decide = (id: string, action: "approve" | "reject") => {
    archive
      .decide(id, action)
      .then(() => {
        onOk("ok", action === "approve" ? "Published to Browse." : "Rejected and hidden.");
        refresh();
      })
      .catch((e) => onError("err", e.message));
  };

  return (
    <div className="archive-review">
      <section className="archive-review-block">
        <h2>Awaiting review</h2>
        {pending.length === 0 && <p className="archive-empty">Nothing waiting.</p>}
        {pending.map((p) => (
          <article className="archive-mine-item" key={p.id}>
            <div className="archive-mine-main">
              <strong>{p.name}</strong>
              <span className="archive-mine-meta">{new Date(p.created_at).toLocaleString()}</span>
            </div>
            <div className="archive-mine-actions">
              <a className="link-button" href={`/archive/${p.id}`} target="_blank" rel="noreferrer">
                View
              </a>
              <button className="link-button" onClick={() => decide(p.id, "approve")}>
                Approve
              </button>
              <button className="link-button archive-danger" onClick={() => decide(p.id, "reject")}>
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="archive-review-block">
        <h2>Open reports</h2>
        {reports.length === 0 && <p className="archive-empty">No open reports.</p>}
        {reports.map((r) => (
          <article className="archive-mine-item" key={r.id}>
            <div className="archive-mine-main">
              <strong>{r.category}</strong>
              <span className="archive-mine-meta">
                on {r.publication_id} · {r.details || "No details"}
              </span>
            </div>
            <div className="archive-mine-actions">
              <a className="link-button" href={`/archive/${r.publication_id}`} target="_blank" rel="noreferrer">
                View
              </a>
              <button className="link-button" onClick={() => decide(r.publication_id, "reject")}>
                Take down
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
