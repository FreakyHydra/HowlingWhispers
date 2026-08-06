"use client";

import { useState } from "react";
import type { PlayerPersona } from "../../lib/personas/schema";
import { compilePlayerPersona } from "../../lib/personas/compile";
import { PersonaEditor } from "../personas/persona-editor";

type PersonaPickerProps = {
  personas: PlayerPersona[];
  activePersonaId: string | null;
  onAddPersona: (persona: PlayerPersona) => void;
  onPick: (persona: PlayerPersona | null) => void;
  onCancel: () => void;
};

export function PersonaPicker({
  personas,
  activePersonaId,
  onAddPersona,
  onPick,
  onCancel,
}: PersonaPickerProps) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
        <section
          className="modal persona-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="persona-pick-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
          <p className="eyebrow">Choose who you will play</p>
          <h2 id="persona-pick-title">New persona</h2>
          <p className="modal-intro">
            Create an identity for this story. It is saved to your library for reuse.
          </p>
          <PersonaEditor
            onSave={(persona) => {
              onAddPersona(persona);
              onPick(persona);
            }}
            onCancel={() => setCreating(false)}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal persona-modal persona-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="persona-pick-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">Choose who you will play</p>
        <h2 id="persona-pick-title">Choose your identity</h2>
        <p className="modal-intro">
          Pick a saved persona for this story. This story keeps its own copy, so
          editing the library later will not change it.
        </p>

        {personas.length === 0 && (
          <p className="persona-library-empty">
            You have no saved personas yet.
          </p>
        )}

        <ul className="persona-list persona-picker-list">
          {personas.map((persona) => (
            <li key={persona.id}>
              <button
                className="persona-pick-option"
                onClick={() => onPick(persona)}
              >
                <span className="persona-avatar" aria-hidden="true">
                  {persona.name.trim().charAt(0).toUpperCase() || "P"}
                </span>
                <span className="persona-pick-copy">
                  <strong>
                    {persona.name}
                    {persona.id === activePersonaId && (
                      <span className="persona-active-badge">Default</span>
                    )}
                  </strong>
                  <small>{persona.pronouns ?? "no pronouns set"}</small>
                  <p>{persona.description || "No description yet."}</p>
                  <pre className="persona-compiled-preview">
                    {compilePlayerPersona(persona)}
                  </pre>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="persona-pick-actions">
          <button className="outline-button" type="button" onClick={() => setCreating(true)}>
            ＋ Create persona
          </button>
          <button className="text-button" type="button" onClick={() => onPick(null)}>
            Continue without a persona
          </button>
        </div>
      </section>
    </div>
  );
}