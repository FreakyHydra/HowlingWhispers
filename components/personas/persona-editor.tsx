"use client";

import { useState } from "react";
import type { PlayerPersona } from "../../lib/personas/schema";
import { createPersona } from "../../lib/personas/schema";
import { compilePlayerPersona } from "../../lib/personas/compile";

type PersonaEditorProps = {
  initial?: PlayerPersona;
  onSave: (persona: PlayerPersona) => void;
  onCancel: () => void;
};

export function PersonaEditor({ initial, onSave, onCancel }: PersonaEditorProps) {
  const [draft, setDraft] = useState({
    name: initial?.name ?? "",
    pronouns: initial?.pronouns ?? "",
    description: initial?.description ?? "",
    appearance: initial?.appearance ?? "",
    personality: initial?.personality ?? "",
    background: initial?.background ?? "",
    avatar: initial?.avatar ?? "",
  });

  const set = (field: keyof typeof draft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const preview = compilePlayerPersona({
    id: initial?.id ?? "preview",
    name: draft.name,
    pronouns: draft.pronouns,
    description: draft.description,
    appearance: draft.appearance,
    personality: draft.personality,
    background: draft.background,
    avatar: draft.avatar,
    createdAt: 0,
    updatedAt: 0,
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const persona = initial
      ? {
          ...initial,
          name: draft.name.trim() || "Unnamed persona",
          pronouns: draft.pronouns.trim() || undefined,
          description: draft.description.trim(),
          appearance: draft.appearance.trim() || undefined,
          personality: draft.personality.trim() || undefined,
          background: draft.background.trim() || undefined,
          avatar: draft.avatar.trim() || undefined,
          updatedAt: Date.now(),
        }
      : createPersona({
          name: draft.name,
          pronouns: draft.pronouns,
          description: draft.description,
          appearance: draft.appearance,
          personality: draft.personality,
          background: draft.background,
          avatar: draft.avatar,
        });
    onSave(persona);
  }

  return (
    <form className="persona-editor" onSubmit={submit}>
      <label>
        Name
        <input value={draft.name} onChange={(e) => set("name")(e.target.value)} placeholder="Who you play as" maxLength={100} required />
      </label>
      <label>
        Pronouns
        <input value={draft.pronouns} onChange={(e) => set("pronouns")(e.target.value)} placeholder="she/her, he/him, they/them…" maxLength={60} />
      </label>
      <label>
        Short description
        <textarea value={draft.description} onChange={(e) => set("description")(e.target.value)} rows={2} maxLength={1000} placeholder="A one-line sense of who you are in the story" />
      </label>
      <label>
        Appearance
        <textarea value={draft.appearance} onChange={(e) => set("appearance")(e.target.value)} rows={3} maxLength={2000} placeholder="How you look" />
      </label>
      <label>
        Personality
        <textarea value={draft.personality} onChange={(e) => set("personality")(e.target.value)} rows={3} maxLength={2000} placeholder="Your temperament, habits, voice" />
      </label>
      <label>
        Background / history
        <textarea value={draft.background} onChange={(e) => set("background")(e.target.value)} rows={3} maxLength={2000} placeholder="Where you come from" />
      </label>
      <label>
        Avatar URL (optional)
        <input value={draft.avatar} onChange={(e) => set("avatar")(e.target.value)} placeholder="https://…/avatar.png" maxLength={1000} />
      </label>

      <div className="persona-preview">
        <strong>Compiled (sent to the story engine) </strong>
        <pre>{preview || "Nothing to send yet — fill in a few fields."}</pre>
      </div>

      <div className="share-actions">
        <button className="outline-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? "Save persona" : "Create persona"}
        </button>
      </div>
    </form>
  );
}