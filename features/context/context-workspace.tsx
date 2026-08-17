"use client";

import React, { useRef, useState } from "react";
import type { ContextLibrary, MemoryEntry, AuthorNoteEntry, LorebookRecord, LorebookParsedEntry } from "../../lib/context/types.ts";
import { selectHWLorebooks, renderMemoryBlock, renderAuthorNoteBlock, renderHWLorebookBlock } from "../../lib/context/compile.ts";
import { estimateTokens } from "../../lib/generation/compile-context.ts";

export interface ContextWorkspaceProps {
  contextLibrary: ContextLibrary;
  setContextLibrary: (value: ContextLibrary) => void;
  createContextEntry: (kind: "memory" | "author-note") => void;
  updateContextEntry: (kind: "memory" | "author-note", id: string, patch: Partial<MemoryEntry | AuthorNoteEntry>) => void;
  deleteContextEntry: (kind: "memory" | "author-note", id: string) => void;
  addLorebook: (record: LorebookRecord) => void;
  removeLorebook: (id: string) => void;
  updateLorebook: (id: string, patch: Partial<LorebookRecord>) => void;
  onImportFile: (file: File, kind: "memory" | "author-note" | "lorebook") => void;
  onClose: () => void;
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

type Tab = "memory" | "author-note" | "lorebooks" | "active" | "debug";

export function ContextWorkspace(props: ContextWorkspaceProps) {
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
    onClose,
    activeContextManifest,
  } = props;

  const [tab, setTab] = useState<Tab>("memory");
  const [expandedLorebook, setExpandedLorebook] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ bookId: string; entry: LorebookParsedEntry } | null>(null);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "memory", label: "Memory" },
    { id: "author-note", label: "Author's Note" },
    { id: "lorebooks", label: "Lorebooks" },
    { id: "active", label: "Active Context" },
    { id: "debug", label: "Debug" },
  ];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal context-workspace" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close context">×</button>

        <div className="context-workspace-header">
          <p className="eyebrow">Context</p>
          <div className="context-workspace-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`context-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="context-workspace-toolbar">
            <button className="outline-button" onClick={exportAll}>Export All</button>
          </div>
        </div>

        <div className="context-workspace-body">
          {tab === "memory" && (
            <div className="context-tab-panel">
              <input ref={memoryInputRef} type="file" accept=".json,.txt" style={{ display: "none" }} onChange={handleFileChange("memory")} />
              {contextLibrary.memories.map((entry) => (
                <div key={entry.id} className="context-entry-card">
                  <div className="context-entry-header">
                    <label className="toggle-row">
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(e) => updateContextEntry("memory", entry.id, { enabled: e.target.checked })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.target.click();
                            }
                          }}
                        />
                        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                      </span>
                    </label>
                    <span className={`context-source-badge ${entry.source}`}>{entry.source === "auto-generated" ? "Auto-generated" : "Manual"}</span>
                    <span className="context-token-count">{estimateTokens(entry.text)} tokens</span>
                    <button className="context-delete-btn" onClick={() => deleteContextEntry("memory", entry.id)}>Delete</button>
                  </div>
                  <textarea
                    value={entry.text}
                    onChange={(e) => updateContextEntry("memory", entry.id, { text: e.target.value })}
                    rows={4}
                    className="context-textarea"
                    placeholder="Write a memory..."
                  />
                </div>
              ))}
              <button className="context-add-btn" onClick={() => createContextEntry("memory")}>+ Add Memory</button>
            </div>
          )}

          {tab === "author-note" && (
            <div className="context-tab-panel">
              <input ref={noteInputRef} type="file" accept=".json,.txt" style={{ display: "none" }} onChange={handleFileChange("author-note")} />
              {contextLibrary.authorNotes.map((entry) => (
                <div key={entry.id} className="context-entry-card">
                  <div className="context-entry-header">
                    <label className="toggle-row">
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(e) => updateContextEntry("author-note", entry.id, { enabled: e.target.checked })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.target.click();
                            }
                          }}
                        />
                        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                      </span>
                    </label>
                    <span className="context-token-count">{estimateTokens(entry.text)} tokens</span>
                    <button className="context-delete-btn" onClick={() => deleteContextEntry("author-note", entry.id)}>Delete</button>
                  </div>
                  <textarea
                    value={entry.text}
                    onChange={(e) => updateContextEntry("author-note", entry.id, { text: e.target.value })}
                    rows={6}
                    className="context-textarea"
                    placeholder="Write scene direction or author's note..."
                  />
                  <input
                    type="text"
                    placeholder="Preset name (optional)"
                    value={entry.preset ?? ""}
                    onChange={(e) => updateContextEntry("author-note", entry.id, { preset: e.target.value })}
                    className="context-preset-input"
                  />
                </div>
              ))}
              <button className="context-add-btn" onClick={() => createContextEntry("author-note")}>+ Add Note</button>
            </div>
          )}

          {tab === "lorebooks" && (
            <div className="context-tab-panel">
              <input ref={lorebookInputRef} type="file" accept=".lorebook,.json" style={{ display: "none" }} onChange={handleFileChange("lorebook")} />
                <div className="context-workspace-toolbar">
                  <button className="outline-button" onClick={() => addLorebook({
                    id: `lorebook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                    name: "New Lorebook",
                    enabled: true,
                    raw: { lorebookVersion: 3, entries: [] },
                    parsed: { lorebookVersion: 3, entries: [] },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  })}>+ Lorebook</button>
                  <button className="outline-button" onClick={() => handleImport("lorebook")}>Import Lorebook</button>
                </div>
                {contextLibrary.lorebooks.map((book) => (
                <div key={book.id} className="context-lorebook-card">
                  <div className="context-entry-header">
                    <label className="toggle-row">
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={book.enabled}
                          onChange={(e) => updateLorebook(book.id, { enabled: e.target.checked })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.target.click();
                            }
                          }}
                        />
                        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                      </span>
                    </label>
                    <strong>{book.name}</strong>
                    <span className="context-token-count">{(book.parsed?.entries?.length ?? 0)} entries</span>
                    <button className="context-delete-btn" onClick={() => removeLorebook(book.id)}>Delete</button>
                  </div>
                  <div className="context-lorebook-actions">
                    <button className="context-expand-btn" onClick={() => setExpandedLorebook(expandedLorebook === book.id ? null : book.id)}>
                      {expandedLorebook === book.id ? "Hide entries" : "Show entries"}
                    </button>
                    <button className="context-expand-btn" onClick={() => {
                      const newEntries = [...(book.parsed?.entries ?? []), {
                        text: "",
                        keys: [],
                        enabled: true,
                        displayName: `Entry ${(book.parsed?.entries?.length ?? 0) + 1}`,
                      }];
                      updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                    }}>+ Add Entry</button>
                  </div>
                  {expandedLorebook === book.id && (
                    <div className="context-lorebook-entries">
                      {(book.parsed?.entries ?? []).map((entry, idx) => (
                        <div key={String(entry.id ?? idx)} className="context-entry-card">
                          <div className="context-entry-header">
                            <label className="toggle-row">
                              <span className="switch">
                                <input
                                  type="checkbox"
                                  checked={entry.enabled}
                                  onChange={(e) => {
                                    const newEntries = [...(book.parsed?.entries ?? [])];
                                    newEntries[idx] = { ...newEntries[idx], enabled: e.target.checked };
                                    updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.target.click();
                                    }
                                  }}
                                />
                                <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                              </span>
                            </label>
                            <input
                              type="text"
                              value={entry.displayName ?? ""}
                              onChange={(e) => {
                                const newEntries = [...(book.parsed?.entries ?? [])];
                                newEntries[idx] = { ...newEntries[idx], displayName: e.target.value };
                                updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                              }}
                              className="context-entry-name-input"
                            />
                            <button className="context-delete-btn" onClick={() => {
                              const newEntries = (book.parsed?.entries ?? []).filter((_, i) => i !== idx);
                              updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                            }}>×</button>
                          </div>
                          <textarea
                            value={entry.text}
                            onChange={(e) => {
                              const newEntries = [...(book.parsed?.entries ?? [])];
                              newEntries[idx] = { ...newEntries[idx], text: e.target.value };
                              updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                            }}
                            rows={3}
                            className="context-textarea"
                            placeholder="Entry text..."
                          />
                          <input
                            type="text"
                            value={entry.keys.join(", ")}
                            onChange={(e) => {
                              const newEntries = [...(book.parsed?.entries ?? [])];
                              newEntries[idx] = { ...newEntries[idx], keys: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) };
                              updateLorebook(book.id, { parsed: { ...book.parsed, entries: newEntries } });
                            }}
                            className="context-preset-input"
                            placeholder="Keys (comma separated)"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "active" && (
            <div className="context-tab-panel">
              <div className="context-active-grid">
                <div className="context-active-card">
                  <h3>Memory</h3>
                  <p className="context-active-count">{enabledMemories.length} active</p>
                  <p className="context-active-tokens">{contextLibrary.memories.reduce((sum, m) => sum + estimateTokens(m.text), 0)} tokens</p>
                </div>
                <div className="context-active-card">
                  <h3>Author&apos;s Note</h3>
                  <p className="context-active-count">{enabledNotes.length} active</p>
                  <p className="context-active-tokens">{contextLibrary.authorNotes.reduce((sum, n) => sum + estimateTokens(n.text), 0)} tokens</p>
                </div>
                <div className="context-active-card">
                  <h3>Lorebooks</h3>
                  <p className="context-active-count">{enabledLorebooks.length} active</p>
                  <p className="context-active-tokens">
                    {enabledLorebooks.reduce((sum, book) => sum + (book.parsed?.entries?.filter((e) => e.enabled).length ?? 0), 0)} entries
                  </p>
                </div>
                {activeContextManifest && (
                  <div className="context-active-card">
                    <h3>Compiled</h3>
                    <p className="context-active-count">{activeContextManifest.estimatedInputTokens.toLocaleString()} / {activeContextManifest.contextWindow.toLocaleString()} tokens</p>
                    <p className="context-active-tokens">{activeContextManifest.inputBudget.toLocaleString()} budget</p>
                  </div>
                )}
              </div>
              <div className="context-active-details">
                <h3>What gets sent to the model</h3>
                <ol>
                  <li>System instructions + compatibility layer</li>
                  <li>Character canon</li>
                  <li>Player persona</li>
                  <li>Memory ({enabledMemories.length} entries)</li>
                  <li>Author&apos;s Note ({enabledNotes.length} entries)</li>
                  <li>Lorebooks ({enabledLorebooks.reduce((sum, b) => sum + (b.parsed?.entries?.filter((e) => e.enabled).length ?? 0), 0)} entries)</li>
                  <li>Living Cast</li>
                  <li>Relationship / state</li>
                  <li>Recent chat history</li>
                </ol>
              </div>
            </div>
          )}

          {tab === "debug" && (
            <div className="context-tab-panel">
              {activeContextManifest ? (
                <div className="context-debug-panel">
                  <div className="context-debug-section">
                    <h3>Budget</h3>
                    <p>{activeContextManifest.estimatedInputTokens.toLocaleString()} / {activeContextManifest.contextWindow.toLocaleString()} tokens</p>
                    <p>Input budget: {activeContextManifest.inputBudget.toLocaleString()}</p>
                  </div>
                  <div className="context-debug-section">
                    <h3>History</h3>
                    <p>{activeContextManifest.includedMessages} kept · {activeContextManifest.omittedMessages} omitted</p>
                  </div>
                  <div className="context-debug-section">
                    <h3>Revisions</h3>
                    <p>Character: {activeContextManifest.characterRevision}</p>
                    <p>World: {activeContextManifest.worldRevision ?? "None"}</p>
                  </div>
                  <div className="context-debug-section">
                    <h3>Active canon sections</h3>
                    <div className="context-receipts">
                      {activeContextManifest.includedSections.map((id) => <span key={id}>{id}</span>)}
                    </div>
                  </div>
                  <div className="context-debug-section">
                    <h3>Active world lore</h3>
                    {activeContextManifest.includedLore.length > 0 ? (
                      <ul>
                        {activeContextManifest.includedLore.map((entry) => (
                          <li key={entry.id}><span>{entry.title}</span><small>{entry.reason}</small></li>
                        ))}
                      </ul>
                    ) : <p>No world lore included.</p>}
                  </div>
                  {activeContextManifest.includedHWLore != null && activeContextManifest.includedHWLore.length > 0 && (
                    <div className="context-debug-section">
                      <h3>Active HW lorebooks</h3>
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
                </div>
              ) : (
                <p className="context-inspector-empty">Generate a reply to see the compiled context.</p>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .context-workspace {
            width: 90vw;
            max-width: 900px;
            height: 85vh;
            display: flex;
            flex-direction: column;
            background: var(--theme-surface, #1a1a1a);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            overflow: hidden;
          }
          .context-workspace-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .context-workspace-tabs {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }
          .context-tab {
            background: none;
            border: 1px solid rgba(255,255,255,0.15);
            color: inherit;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
          }
          .context-tab.active {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.3);
          }
          .context-workspace-toolbar {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .context-workspace-body {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }
          .context-tab-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .context-entry-card {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
          }
          .context-entry-header {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .context-source-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
            text-transform: uppercase;
          }
          .context-source-badge.auto-generated {
            background: rgba(255,255,255,0.05);
            opacity: 0.7;
          }
          .context-token-count {
            font-size: 11px;
            opacity: 0.7;
            margin-left: auto;
          }
          .context-delete-btn {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.6;
            padding: 4px 8px;
          }
          .context-delete-btn:hover {
            opacity: 1;
          }
          .context-textarea {
            width: 100%;
            min-height: 80px;
            padding: 8px;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: inherit;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
          }
          .context-preset-input {
            width: 100%;
            padding: 6px 8px;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: inherit;
            font-size: 12px;
          }
          .context-entry-name-input {
            flex: 1;
            min-width: 120px;
            padding: 4px 8px;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: inherit;
            font-size: 13px;
          }
          .context-add-btn {
            background: none;
            border: 1px dashed rgba(255,255,255,0.2);
            color: inherit;
            cursor: pointer;
            padding: 12px;
            font-size: 13px;
            border-radius: 8px;
          }
          .context-add-btn:hover {
            border-color: rgba(255,255,255,0.4);
          }
          .context-expand-btn {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.7;
            text-decoration: underline;
            padding: 4px 0;
          }
          .context-lorebook-card {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
          }
          .context-lorebook-actions {
            display: flex;
            gap: 8px;
          }
          .context-lorebook-entries {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
            padding-left: 16px;
            border-left: 1px solid rgba(255,255,255,0.1);
          }
          .context-active-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
          }
          .context-active-card {
            padding: 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
          }
          .context-active-card h3 {
            margin: 0 0 8px;
            font-size: 14px;
            font-weight: 600;
          }
          .context-active-count {
            margin: 0 0 4px;
            font-size: 18px;
            font-weight: 700;
          }
          .context-active-tokens {
            margin: 0;
            font-size: 12px;
            opacity: 0.7;
          }
          .context-active-details {
            margin-top: 16px;
            padding: 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
          }
          .context-active-details h3 {
            margin: 0 0 8px;
            font-size: 14px;
          }
          .context-active-details ol {
            margin: 0;
            padding-left: 20px;
          }
          .context-active-details li {
            margin-bottom: 4px;
            font-size: 13px;
          }
          .context-debug-panel {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .context-debug-section h3 {
            margin: 0 0 8px;
            font-size: 13px;
            font-weight: 600;
          }
          .context-debug-section p {
            margin: 0 0 4px;
            font-size: 13px;
          }
          .context-receipts {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
          }
          .context-receipts span {
            font-size: 11px;
            padding: 2px 6px;
            background: rgba(255,255,255,0.08);
            border-radius: 4px;
          }
          .context-omission-note {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 8px;
          }
          .context-inspector-empty {
            font-size: 13px;
            opacity: 0.7;
          }
        `}</style>
      </section>
    </div>
  );
}
