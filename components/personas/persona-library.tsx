"use client";

import { useRef, useState } from "react";
import type { PlayerPersona } from "../../lib/personas/schema";
import { clonePersona } from "../../lib/personas/schema";
import { compilePlayerPersona } from "../../lib/personas/compile";
import {
  ensureUniquePersonaIds,
  parsePersonaImport,
  serializePersona,
  serializePersonaLibrary,
} from "../../lib/personas/import-export";
import { PersonaEditor } from "./persona-editor";

type PersonaLibraryProps = {
  personas: PlayerPersona[];
  activePersonaId: string | null;
  memoryCards: Record<string, {
    memoryRefs: Array<{ id: string }>;
    relationships: Record<string, unknown>;
    milestones?: Record<string, unknown>;
  }>;
  onChange: (personas: PlayerPersona[]) => void;
  onSelectActive: (id: string | null) => void;
};

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; persona: PlayerPersona }
  | null;

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PersonaLibrary({
  personas,
  activePersonaId,
  memoryCards,
  onChange,
  onSelectActive,
}: PersonaLibraryProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayerPersona | null>(null);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const activePersona = personas.find((persona) => persona.id === activePersonaId) ?? null;
  const memoryTotal = Object.values(memoryCards)
    .reduce((total, card) => total + (card.memoryRefs?.length ?? 0), 0);
  const relationshipTotal = Object.values(memoryCards)
    .reduce((total, card) => total + Object.keys(card.relationships ?? {}).length, 0);

  function handleImportFile(file: File) {
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = parsePersonaImport(String(reader.result ?? ""));
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      const unique = ensureUniquePersonaIds(result.personas, personas);
      onChange([...personas, ...unique]);
    };
    reader.onerror = () => setImportError("The persona file could not be read.");
    reader.readAsText(file);
  }

  function savePersona(persona: PlayerPersona) {
    const existing = personas.find((p) => p.id === persona.id);
    const next = existing
      ? personas.map((p) => (p.id === persona.id ? persona : p))
      : [...personas, persona];
    onChange(next);
    setEditor(null);
  }

  function duplicate(persona: PlayerPersona) {
    onChange([...personas, clonePersona(persona)]);
  }

  function remove(persona: PlayerPersona) {
    onChange(personas.filter((p) => p.id !== persona.id));
    if (activePersonaId === persona.id) onSelectActive(null);
    setDeleteTarget(null);
  }

  return (
    <section className="settings-panel persona-library">
      <p className="eyebrow">Your persona library</p>
      <h2>Who you play as</h2>
      <p>
        Save multiple identities locally in this browser. Each story can use its own persona.
        When you use one in roleplay, a compiled profile is sent to your selected story engine.
      </p>

      <div className="persona-command-deck">
        <section className="persona-default-identity">
          <span className="persona-avatar persona-hero-avatar" aria-hidden="true">
            {activePersona?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activePersona.avatar} alt="" />
            ) : (
              activePersona?.name.trim().charAt(0).toUpperCase() || "◇"
            )}
          </span>
          <div>
            <span className="persona-command-label">Default identity</span>
            <h3>{activePersona?.name || "No default persona"}</h3>
            <p>
              {activePersona
                ? activePersona.description || "This identity is ready for new stories."
                : "Choose a persona below. Individual stories can still use their own identity."}
            </p>
            <div className="persona-identity-status">
              <span className={activePersona ? "locked" : ""}>
                {activePersona ? "◆ Identity anchor active" : "◇ Identity anchor waiting"}
              </span>
              {activePersona?.identity?.pronouns && <span>{activePersona.identity.pronouns}</span>}
            </div>
          </div>
        </section>

        <section className="persona-library-vitals" aria-label="Persona library summary">
          <div><strong>{personas.length}</strong><span>Identities</span></div>
          <div><strong>{memoryTotal}</strong><span>Memories</span></div>
          <div><strong>{relationshipTotal}</strong><span>Relationships</span></div>
          <details className="persona-anchor-preview">
            <summary>What the story engine receives</summary>
            <pre>
              {activePersona
                ? compilePlayerPersona(activePersona)
                : "No default persona selected. A story-specific persona can still be chosen when starting a scene."}
            </pre>
          </details>
        </section>
      </div>

      <div className="persona-library-tools">
        <button className="outline-button" type="button" onClick={() => setEditor({ mode: "create" })}>
          ＋ New persona
        </button>
        <label className="outline-button import-browse">
          Import JSON
          <input
            type="file"
            accept=".json,application/json"
            ref={importInputRef}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImportFile(file);
              event.target.value = "";
            }}
          />
        </label>
        <button
          className="outline-button"
          type="button"
          onClick={() => downloadText("howling-whispers-personas.json", serializePersonaLibrary(personas))}
          disabled={personas.length === 0}
        >
          Export library
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => onSelectActive(null)}
        >
          Continue without a persona
        </button>
      </div>
      {importError && <p className="form-error">{importError}</p>}

      {personas.length === 0 ? (
        <p className="persona-library-empty">
          No saved personas yet. Create one, or continue with just a name.
        </p>
      ) : (
        <ul className="persona-list persona-library-grid">
          {personas.map((persona) => {
            const active = persona.id === activePersonaId;
            return (
              <li className={`persona-card${active ? " active" : ""}`} key={persona.id}>
                <span className="persona-avatar" aria-hidden="true">
                  {persona.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={persona.avatar} alt="" loading="lazy" />
                  ) : (
                    persona.name.trim().charAt(0).toUpperCase() || "P"
                  )}
                </span>
                <div className="persona-card-copy">
                  <strong>
                    {persona.name}
                    {active && <span className="persona-active-badge">Default</span>}
                  </strong>
                  <small>{persona.pronouns ?? "no pronouns set"}</small>
                  <p>{persona.description || "No description yet."}</p>
                  <div className="persona-memory-card">
                    <span className="persona-memory-card-label">Memory Card</span>
                    <span className="persona-memory-card-status">● Inserted</span>
                    <div className="persona-memory-card-stats">
                      <span>{memoryCards[persona.id]?.memoryRefs.length ?? 0} memories</span>
                      <span>{Object.keys(memoryCards[persona.id]?.relationships ?? {}).length} relationships</span>
                      <span>{Object.keys(memoryCards[persona.id]?.milestones ?? {}).length} milestones</span>
                    </div>
                  </div>
                </div>
                <div className="persona-card-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectActive(persona.id)}
                  >
                    {active ? "In use" : "Set default"}
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Edit ${persona.name}`}
                    onClick={() => setEditor({ mode: "edit", persona })}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Duplicate ${persona.name}`}
                    onClick={() => duplicate(persona)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Export ${persona.name}`}
                    onClick={() =>
                      downloadText(
                        `howling-whispers-persona-${persona.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
                        serializePersona(persona),
                      )
                    }
                  >
                    Export
                  </button>
                  <button
                    className="text-button persona-delete"
                    type="button"
                    aria-label={`Delete ${persona.name}`}
                    onClick={() => setDeleteTarget(persona)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editor && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditor(null)}>
          <section
            className="modal persona-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-editor-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setEditor(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Persona library</p>
            <h2 id="persona-editor-title">
              {editor.mode === "create" ? "New persona" : `Edit ${editor.persona.name}`}
            </h2>
            <p className="modal-intro">
              This identity is compiled and sent to the story engine when you play
              as it. Leave fields blank to skip them.
            </p>
            <PersonaEditor
              initial={editor.mode === "edit" ? editor.persona : undefined}
              onSave={savePersona}
              onCancel={() => setEditor(null)}
            />
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section
            className="modal persona-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Persona library</p>
            <h2 id="persona-delete-title">Delete {deleteTarget.name}?</h2>
            <p className="modal-intro">
              This removes the saved persona from this browser. Stories already
              using it keep their snapshot.
            </p>
            <div className="share-actions">
              <button className="outline-button" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="primary-button persona-delete"
                type="button"
                onClick={() => remove(deleteTarget)}
              >
                Delete persona
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}