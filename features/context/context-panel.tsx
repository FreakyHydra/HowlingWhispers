"use client";

import React, { useRef, useState } from "react";
import type { ContextLibrary, MemoryEntry, AuthorNoteEntry, LorebookRecord } from "../../lib/context/types.ts";

export interface ContextPanelProps {
  contextLibrary: ContextLibrary;
  setContextLibrary: (value: ContextLibrary) => void;
  createContextEntry: (kind: "memory" | "author-note") => void;
  updateContextEntry: (kind: "memory" | "author-note", id: string, patch: Partial<MemoryEntry | AuthorNoteEntry>) => void;
  deleteContextEntry: (kind: "memory" | "author-note", id: string) => void;
  addLorebook: (record: LorebookRecord) => void;
  removeLorebook: (id: string) => void;
  updateLorebook: (id: string, patch: Partial<LorebookRecord>) => void;
  onImportFile: (file: File, kind: "memory" | "author-note" | "lorebook") => void;
  activeContextManifest?: {
    estimatedInputTokens: number;
    includedLore: Array<{ id: string; title: string; reason: string }>;
    contextWindow: number;
    inputBudget: number;
    includedMessages: number;
    omittedMessages: number;
    characterRevision: string;
    worldRevision: string | null;
    includedSections: string[];
    omittedLore: Array<{ id: string; title: string; reason: string }>;
    includedMemories?: number;
    includedAuthorNotes?: number;
    includedHWLore?: Array<{ id: string; title: string; reason: string }>;
    omittedHWLore?: Array<{ id: string; title: string; reason: string }>;
  } | undefined;
}

export function ContextPanel(props: ContextPanelProps) {
  const {
    contextLibrary,
    setContextLibrary,
    createContextEntry,
    updateContextEntry,
    deleteContextEntry,
    addLorebook,
    removeLorebook,
    updateLorebook,
    onImportFile,
    activeContextManifest,
  } = props;

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [expandedLorebook, setExpandedLorebook] = useState<string | null>(null);
  const memoryInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const lorebookInputRef = useRef<HTMLInputElement>(null);

  const enabledMemories = contextLibrary.memories.filter((m) => m.enabled);
  const enabledNotes = contextLibrary.authorNotes.filter((n) => n.enabled);
  const enabledLorebooks = contextLibrary.lorebooks.filter((l) => l.enabled);

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  function handleImport(kind: "memory" | "author-note" | "lorebook") {
    const refs = { memory: memoryInputRef, "author-note": noteInputRef, lorebook: lorebookInputRef };
    refs[kind].current?.click();
  }

  function handleFileChange(kind: "memory" | "author-note" | "lorebook") {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onImportFile(file, kind);
      event.target.value = "";
    };
  }

  function exportAll() {
    const payload = {
      memories: enabledMemories.map((m) => m.text),
      authorNotes: enabledNotes.map((n) => n.text),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `context-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="context-panel">
      <div className="card-title">
        <p className="eyebrow">Context</p>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="context-panel-btn" onClick={() => setShowCreateMenu((v) => !v)} title="Create">＋</button>
          <button className="context-panel-btn" onClick={() => handleImport("memory")} title="Import">📥</button>
          <button className="context-panel-btn" onClick={exportAll} title="Export">📤</button>
          {showCreateMenu && (
            <div className="context-create-menu">
              <button onClick={() => { createContextEntry("memory"); setShowCreateMenu(false); }}>Memory</button>
              <button onClick={() => { createContextEntry("author-note"); setShowCreateMenu(false); }}>Author&apos;s Note</button>
              <button onClick={() => { addLorebook({
                id: `lorebook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                name: "New Lorebook",
                enabled: true,
                raw: { lorebookVersion: 3, entries: [] },
                parsed: { lorebookVersion: 3, entries: [] },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }); setShowCreateMenu(false); }}>Lorebook</button>
            </div>
          )}
        </div>
      </div>

      <input ref={memoryInputRef} type="file" accept=".json,.txt" style={{ display: "none" }} onChange={handleFileChange("memory")} />
      <input ref={noteInputRef} type="file" accept=".json,.txt" style={{ display: "none" }} onChange={handleFileChange("author-note")} />
      <input ref={lorebookInputRef} type="file" accept=".lorebook,.json" style={{ display: "none" }} onChange={handleFileChange("lorebook")} />

      <details open>
        <summary>Active Context</summary>
        <div className="context-active-list">
          <p>Memory: {enabledMemories.length} enabled</p>
          <p>Author&apos;s Note: {enabledNotes.length} enabled</p>
          <p>Lorebooks: {enabledLorebooks.length} active</p>
          {activeContextManifest && (
            <>
              <p>Tokens: {activeContextManifest.estimatedInputTokens.toLocaleString()} / {activeContextManifest.contextWindow.toLocaleString()}</p>
              <p>Lore entries: {activeContextManifest.includedLore.length} active</p>
              {activeContextManifest.includedMemories != null && <p>Memories: {activeContextManifest.includedMemories} included</p>}
              {activeContextManifest.includedAuthorNotes != null && <p>Notes: {activeContextManifest.includedAuthorNotes} included</p>}
              {activeContextManifest.includedHWLore != null && <p>HW Lore: {activeContextManifest.includedHWLore.length} included</p>}
            </>
          )}
        </div>
      </details>

      <details>
        <summary>Memory ({enabledMemories.length})</summary>
        <div className="context-section">
          {contextLibrary.memories.map((entry) => (
            <div key={entry.id} className="context-entry">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => updateContextEntry("memory", entry.id, { enabled: e.target.checked })}
                />
                <span className="context-badge">{entry.source === "auto-generated" ? "Auto" : "Manual"}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>{estimateTokens(entry.text)} tok</span>
                <button className="context-delete-btn" onClick={() => deleteContextEntry("memory", entry.id)}>×</button>
              </div>
              <textarea
                value={entry.text}
                onChange={(e) => updateContextEntry("memory", entry.id, { text: e.target.value })}
                rows={2}
                style={{ width: "100%", fontSize: 12 }}
              />
            </div>
          ))}
          <button className="context-add-btn" onClick={() => createContextEntry("memory")}>＋ Add Memory</button>
        </div>
      </details>

      <details>
        <summary>Author&apos;s Note ({enabledNotes.length})</summary>
        <div className="context-section">
          {contextLibrary.authorNotes.map((entry) => (
            <div key={entry.id} className="context-entry">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => updateContextEntry("author-note", entry.id, { enabled: e.target.checked })}
                />
                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>{estimateTokens(entry.text)} tok</span>
                <button className="context-delete-btn" onClick={() => deleteContextEntry("author-note", entry.id)}>×</button>
              </div>
              <textarea
                value={entry.text}
                onChange={(e) => updateContextEntry("author-note", entry.id, { text: e.target.value })}
                rows={2}
                style={{ width: "100%", fontSize: 12 }}
              />
              <input
                type="text"
                placeholder="Preset name (optional)"
                value={entry.preset ?? ""}
                onChange={(e) => updateContextEntry("author-note", entry.id, { preset: e.target.value })}
                style={{ width: "100%", fontSize: 11, marginTop: 4 }}
              />
            </div>
          ))}
          <button className="context-add-btn" onClick={() => createContextEntry("author-note")}>＋ Add Note</button>
        </div>
      </details>

      <details>
        <summary>Lorebooks ({contextLibrary.lorebooks.length})</summary>
        <div className="context-section">
          {contextLibrary.lorebooks.map((book) => (
            <div key={book.id} className="context-entry">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={book.enabled}
                  onChange={(e) => updateLorebook(book.id, { enabled: e.target.checked })}
                />
                <strong style={{ fontSize: 12 }}>{book.name}</strong>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {(book.parsed?.entries?.length ?? 0)} entries
                </span>
                <button className="context-delete-btn" onClick={() => removeLorebook(book.id)}>×</button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                {(book.parsed?.entries ?? []).filter((e) => e.enabled).length} enabled
              </div>
              <button
                className="context-expand-btn"
                onClick={() => setExpandedLorebook(expandedLorebook === book.id ? null : book.id)}
              >
                {expandedLorebook === book.id ? "Hide entries" : "Show entries"}
              </button>
              {expandedLorebook === book.id && (
                <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                  {(book.parsed?.entries ?? []).map((entry, idx) => (
                    <div key={entry.id ?? idx} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(e) => {
                            const newEntries = [...(book.parsed?.entries ?? [])];
                            newEntries[idx] = { ...newEntries[idx], enabled: e.target.checked };
                            updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                          }}
                        />
                        <span style={{ fontSize: 11 }}>{entry.displayName ?? `Entry ${idx + 1}`}</span>
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                        Keys: {(entry.keys ?? []).slice(0, 3).join(", ")}{(entry.keys?.length ?? 0) > 3 ? "..." : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button className="context-add-btn" onClick={() => handleImport("lorebook")}>＋ Import Lorebook</button>
        </div>
      </details>

      <details open={showDebug} onToggle={(e) => setShowDebug((e.target as HTMLDetailsElement).open)}>
        <summary>View Compiled Context</summary>
        <div className="context-debug">
          {activeContextManifest ? (
            <>
              <p><strong>Tokens:</strong> {activeContextManifest.estimatedInputTokens.toLocaleString()} / {activeContextManifest.contextWindow.toLocaleString()}</p>
              <p><strong>Budget:</strong> {activeContextManifest.inputBudget.toLocaleString()}</p>
              <p><strong>Messages:</strong> {activeContextManifest.includedMessages} kept · {activeContextManifest.omittedMessages} omitted</p>
              <p><strong>Character:</strong> {activeContextManifest.characterRevision}</p>
              <p><strong>World:</strong> {activeContextManifest.worldRevision ?? "None"}</p>
              <div>
                <strong>Active canon sections:</strong>
                <div className="context-receipts">
                  {activeContextManifest.includedSections.map((id) => <span key={id}>{id}</span>)}
                </div>
              </div>
              <div>
                <strong>Active world lore:</strong>
                {activeContextManifest.includedLore.length > 0 ? (
                  <ul>
                    {activeContextManifest.includedLore.map((entry) => (
                      <li key={entry.id}><span>{entry.title}</span><small>{entry.reason}</small></li>
                    ))}
                  </ul>
                ) : <p>No world lore included.</p>}
              </div>
              {activeContextManifest.includedHWLore != null && activeContextManifest.includedHWLore.length > 0 && (
                <div>
                  <strong>Active HW lorebooks:</strong>
                  <ul>
                    {activeContextManifest.includedHWLore.map((entry) => (
                      <li key={entry.id}><span>{entry.title}</span><small>{entry.reason}</small></li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="context-omission-note">
                {activeContextManifest.omittedLore.filter((e) => e.reason === "inactive").length} inactive, {activeContextManifest.omittedLore.filter((e) => e.reason === "budget").length} budget-limited lore entries stayed out.
                {activeContextManifest.omittedHWLore != null && ` ${activeContextManifest.omittedHWLore.filter((e) => e.reason === "inactive").length} inactive, ${activeContextManifest.omittedHWLore.filter((e) => e.reason === "budget").length} budget-limited HW lore entries stayed out.`}
              </p>
            </>
          ) : (
            <p className="context-inspector-empty">Generate a reply to see the compiled context.</p>
          )}
        </div>
      </details>

      <style jsx>{`
        .context-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
        }
        .context-panel-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 2px 6px;
          fontSize: 14px;
          opacity: 0.7;
        }
        .context-panel-btn:hover {
          opacity: 1;
        }
        .context-create-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: var(--theme-surface, #1a1a1a);
          border: 1px solid rgba(255,255,255,0.1);
          borderRadius: 6px;
          padding: 4px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .context-create-menu button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 6px 10px;
          text-align: left;
          fontSize: 12px;
          white-space: nowrap;
        }
        .context-create-menu button:hover {
          background: rgba(255,255,255,0.05);
        }
        .context-active-list p {
          margin: 2px 0;
          fontSize: 11px;
        }
        .context-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .context-entry {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px;
          background: rgba(255,255,255,0.02);
          borderRadius: 4px;
        }
        .context-badge {
          fontSize: 9px;
          padding: 1px 4px;
          borderRadius: 3px;
          background: rgba(255,255,255,0.1);
          textTransform: uppercase;
        }
        .context-delete-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          fontSize: 14px;
          opacity: 0.6;
          padding: 0 4px;
        }
        .context-delete-btn:hover {
          opacity: 1;
        }
        .context-add-btn {
          background: none;
          border: 1px dashed rgba(255,255,255,0.2);
          color: inherit;
          cursor: pointer;
          padding: 4px;
          fontSize: 11px;
          borderRadius: 4px;
        }
        .context-add-btn:hover {
          border-color: rgba(255,255,255,0.4);
        }
        .context-expand-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          fontSize: 10px;
          opacity: 0.7;
          textDecoration: underline;
          padding: 2px 0;
        }
        .context-debug {
          display: flex;
          flex-direction: column;
          gap: 4px;
          fontSize: 11px;
        }
        .context-debug strong {
          fontSize: 11px;
        }
        .context-receipts {
          display: flex;
          flexWrap: wrap;
          gap: 4px;
          marginTop: 4px;
        }
        .context-receipts span {
          fontSize: 10px;
          padding: 1px 4px;
          background: rgba(255,255,255,0.08);
          borderRadius: 3px;
        }
        .context-omission-note {
          fontSize: 10px;
          opacity: 0.7;
          marginTop: 4px;
        }
        .context-inspector-empty {
          fontSize: 11px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
