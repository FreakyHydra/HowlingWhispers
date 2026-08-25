"use client";

import { useEffect, useMemo, useState } from "react";

const APP_VERSION = "0.10.3.0";
const MAX_SIGNALS = 30;

type RuntimeSignal = {
  kind: string;
  message: string;
  stack?: string;
  timestamp: string;
};

type FailedRequest = {
  method: string;
  path: string;
  status: number;
  timestamp: string;
};

const runtimeSignals: RuntimeSignal[] = [];
const failedRequests: FailedRequest[] = [];
let captureInstalled = false;

function pushBounded<T>(items: T[], item: T) {
  items.push(item);
  if (items.length > MAX_SIGNALS) items.splice(0, items.length - MAX_SIGNALS);
}

function safePath(value: string) {
  try {
    return new URL(value, window.location.origin).pathname.slice(0, 240);
  } catch {
    return String(value || "").split(/[?#]/, 1)[0].slice(0, 240);
  }
}

function safeStack(value: unknown) {
  return String(value || "")
    .split("\n")
    .filter((line) => /^\s*at\s|https?:\/\//i.test(line))
    .map((line) => line.replace(/https?:\/\/[^/\s]+/gi, "").split(/[?#]/, 1)[0])
    .slice(0, 12)
    .join("\n")
    .slice(0, 3000);
}

function installCapture() {
  if (captureInstalled || typeof window === "undefined") return;
  captureInstalled = true;

  window.addEventListener("error", (event) => {
    pushBounded(runtimeSignals, {
      kind: "runtime-error",
      message: event.error instanceof Error ? event.error.name : "Browser error",
      stack: safeStack(event.error instanceof Error ? event.error.stack : event.filename),
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    pushBounded(runtimeSignals, {
      kind: "unhandled-rejection",
      message: reason instanceof Error ? reason.name : "Promise rejection",
      stack: safeStack(reason instanceof Error ? reason.stack : ""),
      timestamp: new Date().toISOString(),
    });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const path = safePath(input instanceof Request ? input.url : String(input));
    try {
      const response = await originalFetch(input, init);
      if (!response.ok) {
        pushBounded(failedRequests, {
          method,
          path,
          status: response.status,
          timestamp: new Date().toISOString(),
        });
      }
      return response;
    } catch (error) {
      pushBounded(failedRequests, {
        method,
        path,
        status: 0,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
}

function buildReport(notes: string) {
  const assets = Array.from(
    document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[rel='stylesheet'][href]"),
  ).map((element) => safePath(element instanceof HTMLScriptElement ? element.src : element.href));

  return {
    appVersion: APP_VERSION,
    page: window.location.pathname,
    notes: notes.slice(0, 2000),
    errors: runtimeSignals.slice(-MAX_SIGNALS),
    failedRequests: failedRequests.slice(-MAX_SIGNALS),
    environment: {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      userAgent: navigator.userAgent.slice(0, 500),
      language: navigator.language.slice(0, 40),
      assets: Array.from(new Set(assets)).slice(0, 40),
    },
  };
}

export default function DiagnosticsReporter() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => installCapture(), []);

  const report = useMemo(
    () => (typeof window === "undefined" ? null : buildReport(notes)),
    [notes, reviewing, open],
  );

  function close() {
    setOpen(false);
    setReviewing(false);
    setResult("");
  }

  async function send() {
    if (!report || sending) return;
    setSending(true);
    setResult("");
    try {
      const response = await fetch("/api/curator/diagnostics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(report),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The report could not be sent.");
      setResult(`Report #${data.reportId} was sent. Thank you.`);
      setNotes("");
      setReviewing(false);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "The report could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button className="diagnostics-trigger" type="button" onClick={() => setOpen(true)}>
        Report a problem
      </button>
      {open ? (
        <div className="diagnostics-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <section className="diagnostics-dialog" role="dialog" aria-modal="true" aria-labelledby="diagnostics-title">
            <div className="diagnostics-heading">
              <div>
                <p className="eyebrow">Sandbox diagnostics</p>
                <h2 id="diagnostics-title">Report a problem</h2>
              </div>
              <button className="diagnostics-close" type="button" onClick={close} aria-label="Close">×</button>
            </div>

            {!reviewing ? (
              <>
                <p>Tell us what went wrong. Your note is the only content you choose to share.</p>
                <textarea
                  className="diagnostics-notes"
                  value={notes}
                  maxLength={2000}
                  rows={6}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What did you do, and what did you expect to happen?"
                />
                <div className="diagnostics-privacy">
                  <strong>Automatically included:</strong> app version, page path, viewport, loaded asset paths,
                  browser type, runtime error locations, and failed request paths/statuses.
                  <strong> Never included:</strong> cookies, tokens, Discord IDs, local storage, prompts, or story text.
                </div>
                <button className="primary-button" type="button" onClick={() => setReviewing(true)}>
                  Review report
                </button>
              </>
            ) : (
              <>
                <p>Review the exact summary before it is sent.</p>
                <div className="diagnostics-preview">
                  <div><span>Version</span><strong>{report?.appVersion}</strong></div>
                  <div><span>Page</span><strong>{report?.page}</strong></div>
                  <div><span>Runtime errors</span><strong>{report?.errors.length || 0}</strong></div>
                  <div><span>Failed requests</span><strong>{report?.failedRequests.length || 0}</strong></div>
                  <div><span>Loaded assets</span><strong>{report?.environment.assets.length || 0}</strong></div>
                </div>
                {notes ? <div className="diagnostics-note-preview">{notes}</div> : null}
                <div className="diagnostics-actions">
                  <button className="outline-button" type="button" onClick={() => setReviewing(false)}>Back</button>
                  <button className="primary-button" type="button" disabled={sending} onClick={send}>
                    {sending ? "Sending…" : "Send diagnostic report"}
                  </button>
                </div>
              </>
            )}
            {result ? <p className="diagnostics-result" role="status">{result}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
