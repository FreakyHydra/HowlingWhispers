"use client";

import React, { useState, useCallback } from "react";
import type { Character, AgeCategory } from "../dreambound-app";
import { EMPTY_CHARACTER_TRAITS } from "@/lib/characters/traits";
import { getTraitById } from "@/lib/characters/trait-library";
import { TraitSelector } from "./trait-selector";

const DEFAULT_DRAFT: Character = {
  id: "",
  name: "",
  role: "",
  status: "Just awakened",
  image: "",
  sceneImage: "",
  scene: "An Unwritten Place",
  weather: "The air holds its breath",
  bond: 8,
  memories: ["This is where your story begins"],
  reply: "I was wondering when you would find me.",
  profile: "",
  accent: "#d78a5e",
  traits: { primary: [], secondary: [], situational: [], custom: [] },
};

type TabId =
  | "identity"
  | "appearance"
  | "personality"
  | "voice"
  | "background"
  | "relationships"
  | "rp-behavior"
  | "world"
  | "advanced"
  | "preview";

const TABS: { id: TabId; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "appearance", label: "Appearance" },
  { id: "personality", label: "Personality" },
  { id: "voice", label: "Voice" },
  { id: "background", label: "Background" },
  { id: "relationships", label: "Relationships" },
  { id: "rp-behavior", label: "RP Behavior" },
  { id: "world", label: "World" },
  { id: "advanced", label: "Advanced" },
  { id: "preview", label: "Preview" },
];

export function CharacterFactory({
  character,
  isCreating,
  onSave,
  onCancel,
  createCharacter,
}: {
  character: Character | null;
  isCreating: boolean;
  onSave: (character: Character) => void;
  onCancel: () => void;
  createCharacter: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [draft, setDraft] = useState<Character>(() => {
    if (character) return { ...character, traits: character.traits ?? { primary: [], secondary: [], situational: [], custom: [] } };
    return { ...DEFAULT_DRAFT };
  });
  const [activeTab, setActiveTab] = useState<TabId>("identity");

  const update = useCallback((patch: Partial<Character>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handleSave = useCallback(() => {
    if (isCreating) {
      const form = new Event("submit", { bubbles: true, cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>;
      Object.defineProperty(form, "currentTarget", {
        value: {
          elements: {
            namedItem: (name: string) => {
              if (name === "name") return { value: draft.name };
              if (name === "role") return { value: draft.role };
              if (name === "spark") return { value: draft.profile };
              return null;
            },
          },
        },
      });
      createCharacter(form);
      return;
    }
    onSave(draft);
  }, [draft, isCreating, onSave, createCharacter]);

  const isDirty = character
    ? draft.name !== character.name
      || draft.role !== character.role
      || draft.status !== character.status
      || draft.scene !== character.scene
      || draft.weather !== character.weather
      || draft.profile !== character.profile
      || draft.reply !== character.reply
      || draft.accent !== character.accent
      || draft.image !== character.image
      || draft.sceneImage !== character.sceneImage
      || draft.portraitFocalPoint !== character.portraitFocalPoint
      || draft.backgroundFocalPoint !== character.backgroundFocalPoint
      || draft.relationship !== character.relationship
      || draft.ageCategory !== character.ageCategory
      || draft.isMinor !== character.isMinor
      || draft.allowedRelationshipTypes?.join(",") !== character.allowedRelationshipTypes?.join(",")
      || draft.disallowedContent?.join(",") !== character.disallowedContent?.join(",")
      || draft.credit !== character.credit
      || draft.pronouns !== character.pronouns
      || draft.cardV2?.creatorNotes !== character.cardV2?.creatorNotes
      || draft.cardV2?.characterVersion !== character.cardV2?.characterVersion
      || JSON.stringify(draft.traits) !== JSON.stringify(character.traits)
    : draft.name.trim().length > 0;

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        if (isDirty) {
          const ok = window.confirm("You have unsaved changes. Discard them?");
          if (!ok) return;
        }
        onCancel();
      }
    },
    [isDirty, onCancel],
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        className="modal character-factory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="factory-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{isCreating ? "Awaken someone new" : "Shape them further"}</p>
        <h2 id="factory-title">{isCreating ? "Create a character" : `Edit ${draft.name || "character"}`}</h2>

        <div className="factory-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="factory-content">
          {activeTab === "identity" && (
            <div className="factory-tab factory-tab-identity">
              <label>
                <span>Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  required
                  placeholder="Who are they?"
                />
              </label>
              <label>
                <span>Role in your story</span>
                <input
                  value={draft.role}
                  onChange={(e) => update({ role: e.target.value })}
                  required
                  placeholder="Girlfriend, rival, guardian…"
                />
              </label>
              <label>
                <span>Pronouns</span>
                <input
                  value={draft.pronouns ?? ""}
                  onChange={(e) => update({ pronouns: e.target.value })}
                  placeholder="she/her, he/him, they/them…"
                />
              </label>
              <label>
                <span>Species</span>
                <input
                  value={draft.identity?.species ?? ""}
                  onChange={(e) => update({ identity: { ...draft.identity, species: e.target.value } })}
                  placeholder="Free text"
                />
              </label>
              <label>
                <span>Age category</span>
                <select
                  value={draft.ageCategory ?? ""}
                  onChange={(e) => update({ ageCategory: (e.target.value || undefined) as AgeCategory | undefined })}
                >
                  <option value="">Unspecified</option>
                  <option value="adult">Adult</option>
                  <option value="minor">Minor</option>
                </select>
              </label>
              <label>
                <span>Portrait image URL</span>
                <input
                  value={draft.image}
                  onChange={(e) => update({ image: e.target.value })}
                  placeholder="https://…/portrait.png"
                />
              </label>
              <label>
                <span>Scene image URL</span>
                <input
                  value={draft.sceneImage}
                  onChange={(e) => update({ sceneImage: e.target.value })}
                  placeholder="https://…/scene.png"
                />
              </label>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="factory-tab factory-tab-appearance">
              <TextArea label="Height" value={draft.appearance?.height ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, height: v } })} />
              <TextArea label="Build" value={draft.appearance?.build ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, build: v } })} />
              <TextArea label="Hair" value={draft.appearance?.hair ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, hair: v } })} />
              <TextArea label="Eyes" value={draft.appearance?.eyes ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, eyes: v } })} />
              <TextArea label="Skin" value={draft.appearance?.skin ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, skin: v } })} />
              <TextArea label="Distinguishing features" value={draft.appearance?.distinguishingFeatures ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, distinguishingFeatures: v } })} />
              <TextArea label="Clothing / style" value={draft.appearance?.clothing ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, clothing: v } })} />
              <TextArea label="General description" value={draft.appearance?.generalDescription ?? ""} onChange={(v) => update({ appearance: { ...draft.appearance, generalDescription: v } })} />
            </div>
          )}

          {activeTab === "personality" && (
            <div className="factory-tab factory-tab-personality">
              <label>
                <span>Profile &amp; personality</span>
                <textarea
                  value={draft.profile}
                  onChange={(e) => update({ profile: e.target.value })}
                  rows={6}
                  placeholder="Who they are, how they look, what they care about…"
                />
              </label>
              <TraitSelector
                value={draft.traits ?? EMPTY_CHARACTER_TRAITS}
                onChange={(traits) => update({ traits })}
              />
              <TextInput label="Likes" value={draft.personality?.likes ?? ""} onChange={(v) => update({ personality: { ...draft.personality, likes: v } })} placeholder="Comma-separated" />
              <TextInput label="Dislikes" value={draft.personality?.dislikes ?? ""} onChange={(v) => update({ personality: { ...draft.personality, dislikes: v } })} placeholder="Comma-separated" />
              <TextInput label="Habits" value={draft.personality?.habits ?? ""} onChange={(v) => update({ personality: { ...draft.personality, habits: v } })} placeholder="Comma-separated" />
              <TextInput label="Strengths" value={draft.personality?.strengths ?? ""} onChange={(v) => update({ personality: { ...draft.personality, strengths: v } })} placeholder="Comma-separated" />
              <TextInput label="Weaknesses" value={draft.personality?.weaknesses ?? ""} onChange={(v) => update({ personality: { ...draft.personality, weaknesses: v } })} placeholder="Comma-separated" />
              <TextInput label="Fears" value={draft.personality?.fears ?? ""} onChange={(v) => update({ personality: { ...draft.personality, fears: v } })} placeholder="Comma-separated" />
              <TextInput label="Values / principles" value={draft.personality?.values ?? ""} onChange={(v) => update({ personality: { ...draft.personality, values: v } })} placeholder="Comma-separated" />
            </div>
          )}

          {activeTab === "voice" && (
            <div className="factory-tab factory-tab-voice">
              <TextArea label="Speech style" value={draft.voice?.speechStyle ?? ""} onChange={(v) => update({ voice: { ...draft.voice, speechStyle: v } })} />
              <TextArea label="Vocabulary level" value={draft.voice?.vocabularyLevel ?? ""} onChange={(v) => update({ voice: { ...draft.voice, vocabularyLevel: v } })} />
              <TextArea label="Accent / dialect" value={draft.voice?.accentDialect ?? ""} onChange={(v) => update({ voice: { ...draft.voice, accentDialect: v } })} />
              <TextArea label="Typical sentence length" value={draft.voice?.sentenceLength ?? ""} onChange={(v) => update({ voice: { ...draft.voice, sentenceLength: v } })} />
              <TextArea label="Humor style" value={draft.voice?.humorStyle ?? ""} onChange={(v) => update({ voice: { ...draft.voice, humorStyle: v } })} />
              <TextArea label="Swearing level" value={draft.voice?.swearingLevel ?? ""} onChange={(v) => update({ voice: { ...draft.voice, swearingLevel: v } })} />
              <TextArea label="Emotional expressiveness" value={draft.voice?.emotionalExpressiveness ?? ""} onChange={(v) => update({ voice: { ...draft.voice, emotionalExpressiveness: v } })} />
              <TextArea label="Body-language tendencies" value={draft.voice?.bodyLanguage ?? ""} onChange={(v) => update({ voice: { ...draft.voice, bodyLanguage: v } })} />
              <TextArea label="Common mannerisms" value={draft.voice?.mannerisms ?? ""} onChange={(v) => update({ voice: { ...draft.voice, mannerisms: v } })} />
              <TextArea label="Things they would rarely say/do" value={draft.voice?.rarePhrases ?? ""} onChange={(v) => update({ voice: { ...draft.voice, rarePhrases: v } })} />
              <TextArea label="Example dialogue" value={draft.voice?.exampleDialogue ?? ""} onChange={(v) => update({ voice: { ...draft.voice, exampleDialogue: v } })} />
            </div>
          )}

          {activeTab === "background" && (
            <div className="factory-tab factory-tab-background">
              <TextArea label="Short biography" value={draft.background?.biography ?? ""} onChange={(v) => update({ background: { ...draft.background, biography: v } })} />
              <TextArea label="Childhood / upbringing" value={draft.background?.childhood ?? ""} onChange={(v) => update({ background: { ...draft.background, childhood: v } })} />
              <TextArea label="Important past events" value={draft.background?.importantEvents ?? ""} onChange={(v) => update({ background: { ...draft.background, importantEvents: v } })} />
              <TextArea label="Family" value={draft.background?.family ?? ""} onChange={(v) => update({ background: { ...draft.background, family: v } })} />
              <TextArea label="Education" value={draft.background?.education ?? ""} onChange={(v) => update({ background: { ...draft.background, education: v } })} />
              <TextArea label="Occupation / history" value={draft.background?.occupation ?? ""} onChange={(v) => update({ background: { ...draft.background, occupation: v } })} />
              <TextArea label="Skills" value={draft.background?.skills ?? ""} onChange={(v) => update({ background: { ...draft.background, skills: v } })} />
              <TextArea label="Secrets" value={draft.background?.secrets ?? ""} onChange={(v) => update({ background: { ...draft.background, secrets: v } })} />
              <TextArea label="Trauma / major formative events" value={draft.background?.trauma ?? ""} onChange={(v) => update({ background: { ...draft.background, trauma: v } })} />
              <TextArea label="Current situation" value={draft.background?.currentSituation ?? ""} onChange={(v) => update({ background: { ...draft.background, currentSituation: v } })} />
            </div>
          )}

          {activeTab === "relationships" && (
            <div className="factory-tab factory-tab-relationships">
              <p className="factory-hint">Relationships to other Howling Whispers characters.</p>
              {(draft.relationships ?? []).length === 0 && <p className="trait-empty">No relationships defined yet.</p>}
              {(draft.relationships ?? []).map((rel, index) => (
                <div className="relationship-entry" key={index}>
                  <TextInput label="Character ID" value={rel.characterId} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], characterId: v };
                    update({ relationships: next });
                  }} />
                  <TextInput label="Relationship type" value={rel.type} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], type: v };
                    update({ relationships: next });
                  }} />
                  <TextArea label="Description" value={rel.description} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], description: v };
                    update({ relationships: next });
                  }} />
                  <TextInput label="Trust" value={rel.trust} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], trust: v };
                    update({ relationships: next });
                  }} />
                  <TextInput label="Affection" value={rel.affection} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], affection: v };
                    update({ relationships: next });
                  }} />
                  <TextInput label="Familiarity" value={rel.familiarity} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], familiarity: v };
                    update({ relationships: next });
                  }} />
                  <TextArea label="Custom notes" value={rel.notes} onChange={(v) => {
                    const next = [...(draft.relationships ?? [])];
                    next[index] = { ...next[index], notes: v };
                    update({ relationships: next });
                  }} />
                  <button type="button" className="text-button" onClick={() => {
                    const next = (draft.relationships ?? []).filter((_, i) => i !== index);
                    update({ relationships: next });
                  }}>
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  const next = [...(draft.relationships ?? []), { characterId: "", type: "", description: "", trust: "", affection: "", familiarity: "", notes: "" }];
                  update({ relationships: next });
                }}
              >
                Add relationship
              </button>
            </div>
          )}

          {activeTab === "rp-behavior" && (
            <div className="factory-tab factory-tab-rp-behavior">
              <TextArea label="Character goals" value={draft.rpBehavior?.goals ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, goals: v } })} />
              <TextArea label="Motivations" value={draft.rpBehavior?.motivations ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, motivations: v } })} />
              <TextArea label="Personal boundaries" value={draft.rpBehavior?.boundaries ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, boundaries: v } })} />
              <TextArea label="Things they avoid" value={draft.rpBehavior?.avoids ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, avoids: v } })} />
              <TextArea label="Things they pursue" value={draft.rpBehavior?.pursues ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, pursues: v } })} />
              <TextArea label="Conflict behavior" value={draft.rpBehavior?.conflictBehavior ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, conflictBehavior: v } })} />
              <TextArea label="Response to danger" value={draft.rpBehavior?.responseToDanger ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, responseToDanger: v } })} />
              <TextArea label="Response to affection" value={draft.rpBehavior?.responseToAffection ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, responseToAffection: v } })} />
              <TextArea label="Response to strangers" value={draft.rpBehavior?.responseToStrangers ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, responseToStrangers: v } })} />
              <TextArea label="Response to authority" value={draft.rpBehavior?.responseToAuthority ?? ""} onChange={(v) => update({ rpBehavior: { ...draft.rpBehavior, responseToAuthority: v } })} />
            </div>
          )}

          {activeTab === "world" && (
            <div className="factory-tab factory-tab-world">
              <TextInput label="World association" value={draft.worldLore?.worldId ?? ""} onChange={(v) => update({ worldLore: { ...draft.worldLore, worldId: v } })} />
              <TextArea label="Setting" value={draft.worldLore?.setting ?? ""} onChange={(v) => update({ worldLore: { ...draft.worldLore, setting: v } })} />
              <TextInput label="Faction" value={draft.worldLore?.faction ?? ""} onChange={(v) => update({ worldLore: { ...draft.worldLore, faction: v } })} />
              <TextArea label="Home / location" value={draft.worldLore?.home ?? ""} onChange={(v) => update({ worldLore: { ...draft.worldLore, home: v } })} />
              <TextArea label="Default scenario" value={draft.worldLore?.defaultScenario ?? ""} onChange={(v) => update({ worldLore: { ...draft.worldLore, defaultScenario: v } })} />
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="factory-tab factory-tab-advanced">
              <TextArea label="Context notes" value={draft.contextNotes ?? ""} onChange={(v) => update({ contextNotes: v })} />
              <TextArea label="Author note" value={draft.authorNote ?? ""} onChange={(v) => update({ authorNote: v })} />
              <TextInput label="Allowed relationship types (comma-separated)" value={draft.allowedRelationshipTypes?.join(", ") ?? ""} onChange={(v) => update({ allowedRelationshipTypes: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <TextArea label="Disallowed content (semicolon-separated)" value={draft.disallowedContent?.join("; ") ?? ""} onChange={(v) => update({ disallowedContent: v.split(";").map((s) => s.trim()).filter(Boolean) })} />
              <TextInput label="V2 creator notes" value={draft.cardV2?.creatorNotes ?? ""} onChange={(v) => update({ cardV2: { ...draft.cardV2, creatorNotes: v } })} />
              <TextInput label="V2 character version" value={draft.cardV2?.characterVersion ?? ""} onChange={(v) => update({ cardV2: { ...draft.cardV2, characterVersion: v } })} />
              <div className="factory-advanced-session">
                <h4>Current session state</h4>
                <TextInput label="Status" value={draft.status} onChange={(v) => update({ status: v })} />
                <TextInput label="Scene" value={draft.scene} onChange={(v) => update({ scene: v })} />
                <TextInput label="Weather" value={draft.weather} onChange={(v) => update({ weather: v })} />
                <TextInput label="Relationship to you" value={draft.relationship ?? ""} onChange={(v) => update({ relationship: v })} />
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="factory-tab factory-tab-preview">
              <div className="factory-preview">
                <h3>Identity</h3>
                <p>{draft.name || "Unnamed"} — {draft.role || "No role"}</p>
                {draft.pronouns && <p>Pronouns: {draft.pronouns}</p>}
                <h3>Appearance</h3>
                <p>{draft.appearance?.generalDescription || "No description yet."}</p>
                <h3>Personality</h3>
                <p>{draft.profile || "No profile yet."}</p>
                {draft.traits && (draft.traits.primary.length > 0 || draft.traits.secondary.length > 0 || draft.traits.situational.length > 0 || (draft.traits.custom?.length ?? 0) > 0) && (
                  <div>
                    <p><strong>Traits:</strong></p>
                    {draft.traits.primary.length > 0 && <p>Core: {draft.traits.primary.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.secondary.length > 0 && <p>Secondary: {draft.traits.secondary.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.situational.length > 0 && <p> Situational: {draft.traits.situational.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.custom && draft.traits.custom.length > 0 && <p>Custom: {draft.traits.custom.map(t => t.name).join(", ")}</p>}
                  </div>
                )}
                <h3>Voice</h3>
                <p>{draft.voice?.speechStyle || "No voice notes yet."}</p>
                <h3>Background</h3>
                <p>{draft.background?.biography || "No background yet."}</p>
                <h3>Relationships</h3>
                <p>{(draft.relationships ?? []).length === 0 ? "No relationships defined." : `${(draft.relationships ?? []).length} defined.`}</p>
                <h3>RP Behavior</h3>
                <p>{draft.rpBehavior?.goals || "No RP behavior notes yet."}</p>
                <h3>World</h3>
                <p>{draft.worldLore?.setting || "No world association yet."}</p>
                <h3>Advanced / Safety</h3>
                <p>Allowed relationships: {draft.allowedRelationshipTypes?.join(", ") || "None"}</p>
                <p>Disallowed: {draft.disallowedContent?.join("; ") || "None"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="factory-footer">
          <button type="button" className="outline-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={!isDirty}>
            {isCreating ? "Awaken character" : "Save changes"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
