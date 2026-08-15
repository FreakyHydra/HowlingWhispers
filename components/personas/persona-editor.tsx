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

type IdentityFields = {
  gender: string;
  genderIdentity: string;
  pronouns: string;
  presentation: string;
  sex: string;
  notes: string;
};

type StructuredFields = {
  personalityTraits: string;
  likes: string;
  dislikes: string;
  interests: string;
  habits: string;
  boundaries: string;
  roleplayGuidance: string;
  memoryPriorities: string;
};

export function PersonaEditor({ initial, onSave, onCancel }: PersonaEditorProps) {
  const [draft, setDraft] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    appearance: initial?.appearance ?? "",
    background: initial?.background ?? "",
    avatar: initial?.avatar ?? "",
  });

  const [identity, setIdentity] = useState<IdentityFields>({
    gender: initial?.identity?.gender ?? "",
    genderIdentity: initial?.identity?.genderIdentity ?? "",
    pronouns: initial?.identity?.pronouns ?? initial?.pronouns ?? "",
    presentation: initial?.identity?.presentation ?? "",
    sex: initial?.identity?.sex ?? "",
    notes: initial?.identity?.notes ?? "",
  });

  const [structured, setStructured] = useState<StructuredFields>({
    personalityTraits: (initial?.personalityTraits ?? []).join(", "),
    likes: (initial?.likes ?? []).join(", "),
    dislikes: (initial?.dislikes ?? []).join(", "),
    interests: (initial?.interests ?? []).join(", "),
    habits: (initial?.habits ?? []).join(", "),
    boundaries: (initial?.boundaries ?? []).join(", "),
    roleplayGuidance: (initial?.roleplayGuidance ?? []).join(", "),
    memoryPriorities: (initial?.memoryPriorities ?? []).join(", "),
  });

  const [showIdentity, setShowIdentity] = useState(false);
  const [showStructured, setShowStructured] = useState(false);

  const set = (field: keyof typeof draft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const setId = (field: keyof IdentityFields) => (value: string) =>
    setIdentity((current) => ({ ...current, [field]: value }));

  const setStruct = (field: keyof StructuredFields) => (value: string) =>
    setStructured((current) => ({ ...current, [field]: value }));

  const splitList = (value: string): string[] =>
    value.split(",").map((s) => s.trim()).filter(Boolean);

  const preview = compilePlayerPersona({
    id: initial?.id ?? "preview",
    name: draft.name,
    description: draft.description,
    appearance: draft.appearance,
    background: draft.background,
    avatar: draft.avatar,
    createdAt: 0,
    updatedAt: 0,
    identity: Object.fromEntries(
      Object.entries(identity).filter(([, v]) => v.trim()),
    ) as IdentityFields,
    personalityTraits: splitList(structured.personalityTraits),
    likes: splitList(structured.likes),
    dislikes: splitList(structured.dislikes),
    interests: splitList(structured.interests),
    habits: splitList(structured.habits),
    boundaries: splitList(structured.boundaries),
    roleplayGuidance: splitList(structured.roleplayGuidance),
    memoryPriorities: splitList(structured.memoryPriorities),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanIdentity = Object.fromEntries(
      Object.entries(identity).map(([k, v]) => [k, v.trim() || undefined]),
    ) as IdentityFields;

    const structuredData = {
      personalityTraits: splitList(structured.personalityTraits),
      likes: splitList(structured.likes),
      dislikes: splitList(structured.dislikes),
      interests: splitList(structured.interests),
      habits: splitList(structured.habits),
      boundaries: splitList(structured.boundaries),
      roleplayGuidance: splitList(structured.roleplayGuidance),
      memoryPriorities: splitList(structured.memoryPriorities),
    };

    const persona = initial
      ? {
          ...initial,
          name: draft.name.trim() || "Unnamed persona",
          description: draft.description.trim(),
          appearance: draft.appearance.trim() || undefined,
          background: draft.background.trim() || undefined,
          avatar: draft.avatar.trim() || undefined,
          identity: Object.keys(cleanIdentity).some((k) => cleanIdentity[k as keyof IdentityFields]) ? cleanIdentity : undefined,
          personalityTraits: structuredData.personalityTraits.length ? structuredData.personalityTraits : undefined,
          likes: structuredData.likes.length ? structuredData.likes : undefined,
          dislikes: structuredData.dislikes.length ? structuredData.dislikes : undefined,
          interests: structuredData.interests.length ? structuredData.interests : undefined,
          habits: structuredData.habits.length ? structuredData.habits : undefined,
          boundaries: structuredData.boundaries.length ? structuredData.boundaries : undefined,
          roleplayGuidance: structuredData.roleplayGuidance.length ? structuredData.roleplayGuidance : undefined,
          memoryPriorities: structuredData.memoryPriorities.length ? structuredData.memoryPriorities : undefined,
          updatedAt: Date.now(),
        }
      : createPersona({
          name: draft.name,
          description: draft.description,
          appearance: draft.appearance,
          background: draft.background,
          avatar: draft.avatar,
        });

    if (!initial) {
      (persona as Record<string, unknown>).identity = Object.keys(cleanIdentity).some((k) => cleanIdentity[k as keyof IdentityFields]) ? cleanIdentity : undefined;
      (persona as Record<string, unknown>).personalityTraits = structuredData.personalityTraits.length ? structuredData.personalityTraits : undefined;
      (persona as Record<string, unknown>).likes = structuredData.likes.length ? structuredData.likes : undefined;
      (persona as Record<string, unknown>).dislikes = structuredData.dislikes.length ? structuredData.dislikes : undefined;
      (persona as Record<string, unknown>).interests = structuredData.interests.length ? structuredData.interests : undefined;
      (persona as Record<string, unknown>).habits = structuredData.habits.length ? structuredData.habits : undefined;
      (persona as Record<string, unknown>).boundaries = structuredData.boundaries.length ? structuredData.boundaries : undefined;
      (persona as Record<string, unknown>).roleplayGuidance = structuredData.roleplayGuidance.length ? structuredData.roleplayGuidance : undefined;
      (persona as Record<string, unknown>).memoryPriorities = structuredData.memoryPriorities.length ? structuredData.memoryPriorities : undefined;
    }

    onSave(persona as PlayerPersona);
  }

  return (
    <form className="persona-editor" onSubmit={submit}>
      <label>
        Name
        <input value={draft.name} onChange={(e) => set("name")(e.target.value)} placeholder="Who you play as" maxLength={100} required />
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
        Background / history
        <textarea value={draft.background} onChange={(e) => set("background")(e.target.value)} rows={3} maxLength={2000} placeholder="Where you come from" />
      </label>
      <label>
        Avatar URL (optional)
        <input value={draft.avatar} onChange={(e) => set("avatar")(e.target.value)} placeholder="https://…/avatar.png" maxLength={1000} />
      </label>

      <div className="persona-advanced-section">
        <button
          type="button"
          className="persona-section-toggle"
          onClick={() => setShowIdentity((v) => !v)}
          aria-expanded={showIdentity}
        >
          {showIdentity ? "▾" : "▸"} Identity
        </button>
        {showIdentity && (
          <div className="persona-section-body">
            <div className="persona-identity-grid">
              <label>
                Gender
                <input value={identity.gender} onChange={(e) => setId("gender")(e.target.value)} placeholder="e.g. Intersex" maxLength={60} />
              </label>
              <label>
                Gender identity
                <input value={identity.genderIdentity} onChange={(e) => setId("genderIdentity")(e.target.value)} placeholder="e.g. Boy-aligned" maxLength={120} />
              </label>
              <label>
                Pronouns
                <input value={identity.pronouns} onChange={(e) => setId("pronouns")(e.target.value)} placeholder="she/her, he/him, they/them…" maxLength={60} />
              </label>
              <label>
                Presentation
                <input value={identity.presentation} onChange={(e) => setId("presentation")(e.target.value)} placeholder="e.g. Mostly masculine / boyish" maxLength={120} />
              </label>
              <label>
                Sex / intersex status
                <input value={identity.sex} onChange={(e) => setId("sex")(e.target.value)} placeholder="e.g. Intersex" maxLength={60} />
              </label>
              <label className="persona-full-width">
                Identity notes
                <textarea value={identity.notes} onChange={(e) => setId("notes")(e.target.value)} rows={2} maxLength={500} placeholder="Anything else about how this persona wants to be seen or addressed" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="persona-advanced-section">
        <button
          type="button"
          className="persona-section-toggle"
          onClick={() => setShowStructured((v) => !v)}
          aria-expanded={showStructured}
        >
          {showStructured ? "▾" : "▸"} Personality & behavior
        </button>
        {showStructured && (
          <div className="persona-section-body">
            <label>
              Personality traits (comma-separated)
              <input value={structured.personalityTraits} onChange={(e) => setStruct("personalityTraits")(e.target.value)} placeholder="e.g. loyal, impulsive, curious" maxLength={1000} />
            </label>
            <label>
              Likes (comma-separated)
              <input value={structured.likes} onChange={(e) => setStruct("likes")(e.target.value)} placeholder="e.g. rain, old books, quiet nights" maxLength={1000} />
            </label>
            <label>
              Dislikes (comma-separated)
              <input value={structured.dislikes} onChange={(e) => setStruct("dislikes")(e.target.value)} placeholder="e.g. loud crowds, dishonesty" maxLength={1000} />
            </label>
            <label>
              Interests (comma-separated)
              <input value={structured.interests} onChange={(e) => setStruct("interests")(e.target.value)} placeholder="e.g. astronomy, swordplay, baking" maxLength={1000} />
            </label>
            <label>
              Habits (comma-separated)
              <input value={structured.habits} onChange={(e) => setStruct("habits")(e.target.value)} placeholder="e.g. collects sea glass, hums while working" maxLength={1000} />
            </label>
            <label>
              Boundaries (comma-separated)
              <input value={structured.boundaries} onChange={(e) => setStruct("boundaries")(e.target.value)} placeholder="e.g. no non-con, no graphic violence" maxLength={1000} />
            </label>
            <label>
              Roleplay guidance (comma-separated)
              <input value={structured.roleplayGuidance} onChange={(e) => setStruct("roleplayGuidance")(e.target.value)} placeholder="e.g. keep dialogue snappy, avoid melodrama" maxLength={1000} />
            </label>
            <label>
              Memory priorities (comma-separated)
              <input value={structured.memoryPriorities} onChange={(e) => setStruct("memoryPriorities")(e.target.value)} placeholder="e.g. names, promises, shared secrets" maxLength={1000} />
            </label>
          </div>
        )}
      </div>

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