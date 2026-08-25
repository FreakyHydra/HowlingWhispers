"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character, AgeCategory } from "../../dreambound-app";
import { getTraitById } from "@/lib/characters/trait-library";
import { compileCharacterProfile } from "@/lib/characters/compile";
import type { CharacterBookV2 } from "@/lib/characters/character-card-v2";
import { isStoredPortraitReference, loadCharacterPortrait } from "@/lib/characters/portrait-storage";

export type AdvancedCharacterEditorProps = {
  character: Character;
  onSave: (character: Character) => void;
  onCancel: () => void;
  mode?: "create" | "edit";
  saving?: boolean;
  saveError?: string;
  contextLabel?: string;
  onUploadPortrait?: (bytes: Uint8Array) => Promise<string>;
  onUploadScene?: (bytes: Uint8Array) => Promise<string>;
  onRemovePortrait?: (reference: string) => void;
  onRemoveScene?: (reference: string) => void;
};

type SectionId =
  | "identity"
  | "appearance"
  | "personality"
  | "voice"
  | "background"
  | "relationships"
  | "interests"
  | "knowledge"
  | "rp-behavior"
  | "world"
  | "greetings"
  | "images"
  | "advanced"
  | "preview";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "appearance", label: "Appearance" },
  { id: "personality", label: "Personality" },
  { id: "voice", label: "Voice & Speech" },
  { id: "background", label: "Background" },
  { id: "relationships", label: "Relationships" },
  { id: "interests", label: "Interests & Skills" },
  { id: "knowledge", label: "Knowledge & Limitations" },
  { id: "rp-behavior", label: "RP Behavior" },
  { id: "world", label: "World / Lore" },
  { id: "greetings", label: "Greetings & Examples" },
  { id: "images", label: "Images" },
  { id: "advanced", label: "CCV2 Compatibility" },
  { id: "preview", label: "Preview" },
];

export function AdvancedCharacterEditor(props: AdvancedCharacterEditorProps) {
  const { character, onSave, onCancel, onUploadPortrait, onUploadScene, onRemovePortrait, onRemoveScene } = props;
  const [draft, setDraft] = useState<Character>(() => ({
    ...character,
    traits: character.traits ?? { primary: [], secondary: [], situational: [], custom: [] },
  }));
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const [showRawJson, setShowRawJson] = useState(false);
  const [busy, setBusy] = useState(false);
  const portraitInput = useRef<HTMLInputElement>(null);
  const sceneInput = useRef<HTMLInputElement>(null);

  const update = useCallback((patch: Partial<Character>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updateGroup = useCallback(<K extends keyof Character>(key: K, patch: Record<string, unknown>) => {
    setDraft((current) => {
      const existing = (current[key] as Record<string, unknown> | undefined) ?? {};
      return { ...current, [key]: { ...existing, ...patch } } as Character;
    });
  }, []);

  const updateCardV2 = useCallback((patch: Record<string, unknown>) => {
    setDraft((current) => ({
      ...current,
      cardV2: { ...current.cardV2, ...patch } as Character["cardV2"],
    }));
  }, []);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(character), [draft, character]);
  const isCreate = props.mode === "create";
  const canSave = isCreate ? Boolean(draft.name.trim()) : isDirty;
  const saveLabel = props.saving
    ? "Saving…"
    : isCreate ? "Create character" : "Save changes";

  const handleSave = useCallback(() => {
    onSave(draft);
  }, [draft, onSave]);

  const compiledPreview = useMemo(() => compileCharacterProfile(draft), [draft]);

  const handlePortraitFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadPortrait) return;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const reference = await onUploadPortrait(bytes);
      update({ image: reference });
    } finally {
      setBusy(false);
    }
  }, [onUploadPortrait, update]);

  const handleSceneFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadScene) return;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const reference = await onUploadScene(bytes);
      update({ sceneImage: reference });
    } finally {
      setBusy(false);
    }
  }, [onUploadScene, update]);

  const portraitSrc = useResolvedImage(draft.image);
  const sceneSrc = useResolvedImage(draft.sceneImage);

  return (
    <div className="advanced-character-editor" role="dialog" aria-modal="true" aria-label={`Advanced editor for ${character.name || "character"}`}>
      <header className="ace-header">
        <div>
          <p className="eyebrow">{props.contextLabel ?? "Advanced Character Editor"} · HWCC v1</p>
          <h2>{draft.name || "Unnamed character"}</h2>
        </div>
        <div className="ace-header-actions">
          <button type="button" className="outline-button" onClick={onCancel}>
            Close
          </button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={!canSave || props.saving}>
            {saveLabel}
          </button>
        </div>
      </header>

      {props.saveError && <p className="form-error" role="alert">{props.saveError}</p>}
      <div className="ace-body">
        <nav className="ace-sidebar" aria-label="Character sections">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "active" : ""}
              aria-current={activeSection === section.id ? "true" : undefined}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <main className="ace-content">
          {activeSection === "identity" && (
            <Section title="Identity">
              <TextInput label="Name" value={draft.name} onChange={(v) => update({ name: v })} required placeholder="Who are they?" />
              <TextInput label="Role in your story" value={draft.role} onChange={(v) => update({ role: v })} placeholder="Girlfriend, rival, guardian…" />
              <TextInput label="Pronouns" value={draft.pronouns ?? ""} onChange={(v) => update({ pronouns: v })} placeholder="she/her, he/him, they/them…" />
              <TextInput label="Species" value={draft.identity?.species ?? ""} onChange={(v) => updateGroup("identity", { species: v })} placeholder="Free text" />
              <label className="ace-field">
                <span>Age category</span>
                <select
                  value={draft.ageCategory ?? ""}
                  onChange={(event) => update({ ageCategory: (event.target.value || undefined) as AgeCategory | undefined })}
                >
                  <option value="">Unspecified</option>
                  <option value="adult">Adult</option>
                  <option value="minor">Minor</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <SubHeading>Age behavior</SubHeading>
              <p className="ace-help">
                Explicit age rules let the AI understand a character can be intelligent while still
                having age-appropriate gaps in knowledge and judgment.
              </p>
              <TextInput label="Actual age" value={draft.ageBehavior?.actualAge ?? ""} onChange={(v) => updateGroup("ageBehavior", { actualAge: v })} placeholder="12" />
              <TextInput label="Maturity level" value={draft.ageBehavior?.maturityLevel ?? ""} onChange={(v) => updateGroup("ageBehavior", { maturityLevel: v })} placeholder="Acts and reasons like a pre-teen" />
              <TextInput label="Speech age" value={draft.ageBehavior?.speechAge ?? ""} onChange={(v) => updateGroup("ageBehavior", { speechAge: v })} placeholder="Speaks like a 12-year-old" />
              <TextInput label="Emotional maturity" value={draft.ageBehavior?.emotionalMaturity ?? ""} onChange={(v) => updateGroup("ageBehavior", { emotionalMaturity: v })} placeholder="How they handle big feelings" />
              <TextInput label="Independence level" value={draft.ageBehavior?.independenceLevel ?? ""} onChange={(v) => updateGroup("ageBehavior", { independenceLevel: v })} placeholder="Needs an adult for some decisions" />
              <TextArea label="Areas of expertise" value={draft.ageBehavior?.areasOfExpertise ?? ""} onChange={(v) => updateGroup("ageBehavior", { areasOfExpertise: v })} placeholder="What they genuinely know a lot about" />
              <TextArea label="Areas where the character should lack knowledge" value={draft.ageBehavior?.areasOfKnowledgeGaps ?? ""} onChange={(v) => updateGroup("ageBehavior", { areasOfKnowledgeGaps: v })} placeholder="Topics a child this age would not realistically know" />
              <TextArea label="Knowledge boundaries" value={draft.ageBehavior?.knowledgeBoundaries ?? ""} onChange={(v) => updateGroup("ageBehavior", { knowledgeBoundaries: v })} placeholder="Subjects that are off-limits or beyond their experience" />
              <TextArea label="Age-consistency instructions" value={draft.ageBehavior?.ageConsistencyInstructions ?? ""} onChange={(v) => updateGroup("ageBehavior", { ageConsistencyInstructions: v })} placeholder="Keep their reasoning, vocabulary, and choices consistent with their age" />
            </Section>
          )}

          {activeSection === "appearance" && (
            <Section title="Appearance">
              <TextArea label="Height" value={draft.appearance?.height ?? ""} onChange={(v) => updateGroup("appearance", { height: v })} />
              <TextArea label="Build" value={draft.appearance?.build ?? ""} onChange={(v) => updateGroup("appearance", { build: v })} />
              <TextArea label="Hair" value={draft.appearance?.hair ?? ""} onChange={(v) => updateGroup("appearance", { hair: v })} />
              <TextArea label="Eyes" value={draft.appearance?.eyes ?? ""} onChange={(v) => updateGroup("appearance", { eyes: v })} />
              <TextArea label="Skin" value={draft.appearance?.skin ?? ""} onChange={(v) => updateGroup("appearance", { skin: v })} />
              <TextArea label="Distinguishing features" value={draft.appearance?.distinguishingFeatures ?? ""} onChange={(v) => updateGroup("appearance", { distinguishingFeatures: v })} />
              <TextArea label="Clothing / style" value={draft.appearance?.clothing ?? ""} onChange={(v) => updateGroup("appearance", { clothing: v })} />
              <TextArea label="General description" value={draft.appearance?.generalDescription ?? ""} onChange={(v) => updateGroup("appearance", { generalDescription: v })} />
            </Section>
          )}

          {activeSection === "personality" && (
            <Section title="Personality">
              <TextArea label="Profile & personality (freeform)" value={draft.profile} onChange={(v) => update({ profile: v })} rows={6} placeholder="Who they are, how they look, what they care about…" />
              <TextInput label="Core traits" value={draft.personality?.coreTraits ?? ""} onChange={(v) => updateGroup("personality", { coreTraits: v })} placeholder="Comma-separated" />
              <TextInput label="Strengths" value={draft.personality?.strengths ?? ""} onChange={(v) => updateGroup("personality", { strengths: v })} placeholder="Comma-separated" />
              <TextInput label="Flaws" value={draft.personality?.flaws ?? ""} onChange={(v) => updateGroup("personality", { flaws: v })} placeholder="Comma-separated" />
              <TextInput label="Weaknesses" value={draft.personality?.weaknesses ?? ""} onChange={(v) => updateGroup("personality", { weaknesses: v })} placeholder="Comma-separated" />
              <TextInput label="Fears" value={draft.personality?.fears ?? ""} onChange={(v) => updateGroup("personality", { fears: v })} placeholder="Comma-separated" />
              <TextInput label="Habits" value={draft.personality?.habits ?? ""} onChange={(v) => updateGroup("personality", { habits: v })} placeholder="Comma-separated" />
              <TextInput label="Quirks" value={draft.personality?.quirks ?? ""} onChange={(v) => updateGroup("personality", { quirks: v })} placeholder="Comma-separated" />
              <TextInput label="Likes" value={draft.personality?.likes ?? ""} onChange={(v) => updateGroup("personality", { likes: v })} placeholder="Comma-separated" />
              <TextInput label="Dislikes" value={draft.personality?.dislikes ?? ""} onChange={(v) => updateGroup("personality", { dislikes: v })} placeholder="Comma-separated" />
              <TextInput label="Temperament" value={draft.personality?.temperament ?? ""} onChange={(v) => updateGroup("personality", { temperament: v })} placeholder="Even-keeled, volatile, anxious…" />
              <TextInput label="Confidence" value={draft.personality?.confidence ?? ""} onChange={(v) => updateGroup("personality", { confidence: v })} placeholder="Shy, bold, unsure…" />
              <TextInput label="Curiosity" value={draft.personality?.curiosity ?? ""} onChange={(v) => updateGroup("personality", { curiosity: v })} placeholder="Ravenous, cautious, indifferent…" />
              <TextInput label="Impulsiveness" value={draft.personality?.impulsiveness ?? ""} onChange={(v) => updateGroup("personality", { impulsiveness: v })} placeholder="Reckless, measured, calculating…" />
              <TextInput label="Social behavior" value={draft.personality?.socialBehavior ?? ""} onChange={(v) => updateGroup("personality", { socialBehavior: v })} placeholder="Outgoing, guarded, clingy…" />
              <TextInput label="Values / principles" value={draft.personality?.values ?? ""} onChange={(v) => updateGroup("personality", { values: v })} placeholder="Comma-separated" />
            </Section>
          )}

          {activeSection === "voice" && (
            <Section title="Voice & Speech">
              <TextArea label="Speech style" value={draft.voice?.speechStyle ?? ""} onChange={(v) => updateGroup("voice", { speechStyle: v })} />
              <TextArea label="Vocabulary" value={draft.voice?.vocabulary ?? ""} onChange={(v) => updateGroup("voice", { vocabulary: v })} />
              <TextArea label="Vocabulary level" value={draft.voice?.vocabularyLevel ?? ""} onChange={(v) => updateGroup("voice", { vocabularyLevel: v })} />
              <TextArea label="Accent / dialect" value={draft.voice?.accentDialect ?? ""} onChange={(v) => updateGroup("voice", { accentDialect: v })} />
              <TextArea label="Sentence length" value={draft.voice?.sentenceLength ?? ""} onChange={(v) => updateGroup("voice", { sentenceLength: v })} />
              <TextArea label="Slang" value={draft.voice?.slang ?? ""} onChange={(v) => updateGroup("voice", { slang: v })} />
              <TextArea label="Verbal habits" value={draft.voice?.verbalHabits ?? ""} onChange={(v) => updateGroup("voice", { verbalHabits: v })} />
              <TextArea label="Emotional speech changes" value={draft.voice?.emotionalSpeechChanges ?? ""} onChange={(v) => updateGroup("voice", { emotionalSpeechChanges: v })} />
              <TextArea label="Phrases to avoid" value={draft.voice?.phrasesToAvoid ?? ""} onChange={(v) => updateGroup("voice", { phrasesToAvoid: v })} />
              <TextArea label="Humor style" value={draft.voice?.humorStyle ?? ""} onChange={(v) => updateGroup("voice", { humorStyle: v })} />
              <TextArea label="Swearing level" value={draft.voice?.swearingLevel ?? ""} onChange={(v) => updateGroup("voice", { swearingLevel: v })} />
              <TextArea label="Emotional expressiveness" value={draft.voice?.emotionalExpressiveness ?? ""} onChange={(v) => updateGroup("voice", { emotionalExpressiveness: v })} />
              <TextArea label="Body-language tendencies" value={draft.voice?.bodyLanguage ?? ""} onChange={(v) => updateGroup("voice", { bodyLanguage: v })} />
              <TextArea label="Mannerisms" value={draft.voice?.mannerisms ?? ""} onChange={(v) => updateGroup("voice", { mannerisms: v })} />
              <TextArea label="Things they would rarely say/do" value={draft.voice?.rarePhrases ?? ""} onChange={(v) => updateGroup("voice", { rarePhrases: v })} />
              <TextArea label="Example dialogue" value={draft.voice?.exampleDialogue ?? ""} onChange={(v) => updateGroup("voice", { exampleDialogue: v })} rows={6} />
            </Section>
          )}

          {activeSection === "background" && (
            <Section title="Background">
              <TextArea label="Short biography" value={draft.background?.biography ?? ""} onChange={(v) => updateGroup("background", { biography: v })} />
              <TextArea label="Childhood / upbringing" value={draft.background?.childhood ?? ""} onChange={(v) => updateGroup("background", { childhood: v })} />
              <TextArea label="Important past events" value={draft.background?.importantEvents ?? ""} onChange={(v) => updateGroup("background", { importantEvents: v })} />
              <TextArea label="Family" value={draft.background?.family ?? ""} onChange={(v) => updateGroup("background", { family: v })} />
              <TextArea label="Education" value={draft.background?.education ?? ""} onChange={(v) => updateGroup("background", { education: v })} />
              <TextArea label="Occupation / history" value={draft.background?.occupation ?? ""} onChange={(v) => updateGroup("background", { occupation: v })} />
              <TextArea label="Skills" value={draft.background?.skills ?? ""} onChange={(v) => updateGroup("background", { skills: v })} />
              <TextArea label="Secrets" value={draft.background?.secrets ?? ""} onChange={(v) => updateGroup("background", { secrets: v })} />
              <TextArea label="Trauma / major formative events" value={draft.background?.trauma ?? ""} onChange={(v) => updateGroup("background", { trauma: v })} />
              <TextArea label="Current situation" value={draft.background?.currentSituation ?? ""} onChange={(v) => updateGroup("background", { currentSituation: v })} />
            </Section>
          )}

          {activeSection === "relationships" && (
            <Section title="Relationships">
              <p className="ace-help">Relationships to other Howling Whispers characters.</p>
              {(draft.relationships ?? []).length === 0 && <p className="trait-empty">No relationships defined yet.</p>}
              {(draft.relationships ?? []).map((rel, index) => (
                <div className="relationship-entry" key={index}>
                  <TextInput label="Character ID" value={rel.characterId} onChange={(v) => updateRelationship(draft, index, "characterId", v, update)} />
                  <TextInput label="Relationship type" value={rel.type} onChange={(v) => updateRelationship(draft, index, "type", v, update)} />
                  <TextArea label="Description" value={rel.description} onChange={(v) => updateRelationship(draft, index, "description", v, update)} />
                  <TextInput label="Trust" value={rel.trust ?? ""} onChange={(v) => updateRelationship(draft, index, "trust", v, update)} />
                  <TextInput label="Affection" value={rel.affection ?? ""} onChange={(v) => updateRelationship(draft, index, "affection", v, update)} />
                  <TextInput label="Familiarity" value={rel.familiarity ?? ""} onChange={(v) => updateRelationship(draft, index, "familiarity", v, update)} />
                  <TextArea label="Custom notes" value={rel.notes ?? ""} onChange={(v) => updateRelationship(draft, index, "notes", v, update)} />
                  <button type="button" className="text-button" onClick={() => update({ relationships: (draft.relationships ?? []).filter((_, i) => i !== index) })}>
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline-button"
                onClick={() => update({ relationships: [...(draft.relationships ?? []), { characterId: "", type: "", description: "", trust: "", affection: "", familiarity: "", notes: "" }] })}
              >
                + Add relationship
              </button>
            </Section>
          )}

          {activeSection === "interests" && (
            <Section title="Interests & Skills">
              <TextArea label="Interests" value={draft.interests?.interests ?? ""} onChange={(v) => updateGroup("interests", { interests: v })} placeholder="Hobbies, passions, things they follow" />
              <TextArea label="Skills" value={draft.interests?.skills ?? ""} onChange={(v) => updateGroup("interests", { skills: v })} placeholder="Things they are good at doing" />
            </Section>
          )}

          {activeSection === "knowledge" && (
            <Section title="Knowledge & Limitations">
              <TextArea label="Things they know well" value={draft.knowledge?.knowsWell ?? ""} onChange={(v) => updateGroup("knowledge", { knowsWell: v })} placeholder="Comma-separated" />
              <TextArea label="Things they know somewhat" value={draft.knowledge?.knowsSomewhat ?? ""} onChange={(v) => updateGroup("knowledge", { knowsSomewhat: v })} placeholder="Comma-separated" />
              <TextArea label="Things they do not know" value={draft.knowledge?.doesNotKnow ?? ""} onChange={(v) => updateGroup("knowledge", { doesNotKnow: v })} placeholder="Comma-separated" />
              <TextArea label="Hobbies" value={draft.knowledge?.hobbies ?? ""} onChange={(v) => updateGroup("knowledge", { hobbies: v })} placeholder="Comma-separated" />
              <TextArea label="Practical skills" value={draft.knowledge?.practicalSkills ?? ""} onChange={(v) => updateGroup("knowledge", { practicalSkills: v })} placeholder="Comma-separated" />
              <TextArea label="Academic knowledge" value={draft.knowledge?.academicKnowledge ?? ""} onChange={(v) => updateGroup("knowledge", { academicKnowledge: v })} placeholder="Comma-separated" />
              <TextArea label="Professional knowledge" value={draft.knowledge?.professionalKnowledge ?? ""} onChange={(v) => updateGroup("knowledge", { professionalKnowledge: v })} placeholder="Comma-separated" />
              <TextArea label="Misconceptions" value={draft.knowledge?.misconceptions ?? ""} onChange={(v) => updateGroup("knowledge", { misconceptions: v })} placeholder="Incorrect beliefs they hold" />
              <TextArea label="Knowledge limits" value={draft.knowledge?.knowledgeLimits ?? ""} onChange={(v) => updateGroup("knowledge", { knowledgeLimits: v })} placeholder="Hard boundaries on what they understand" />
            </Section>
          )}

          {activeSection === "rp-behavior" && (
            <Section title="RP Behavior">
              <TextArea label="Character goals" value={draft.rpBehavior?.goals ?? ""} onChange={(v) => updateGroup("rpBehavior", { goals: v })} />
              <TextArea label="Motivations" value={draft.rpBehavior?.motivations ?? ""} onChange={(v) => updateGroup("rpBehavior", { motivations: v })} />
              <TextArea label="Personal boundaries" value={draft.rpBehavior?.boundaries ?? ""} onChange={(v) => updateGroup("rpBehavior", { boundaries: v })} />
              <TextArea label="Things they avoid" value={draft.rpBehavior?.avoids ?? ""} onChange={(v) => updateGroup("rpBehavior", { avoids: v })} />
              <TextArea label="Things they pursue" value={draft.rpBehavior?.pursues ?? ""} onChange={(v) => updateGroup("rpBehavior", { pursues: v })} />
              <TextArea label="Conflict behavior" value={draft.rpBehavior?.conflictBehavior ?? ""} onChange={(v) => updateGroup("rpBehavior", { conflictBehavior: v })} />
              <TextArea label="Response to danger" value={draft.rpBehavior?.responseToDanger ?? ""} onChange={(v) => updateGroup("rpBehavior", { responseToDanger: v })} />
              <TextArea label="Response to affection" value={draft.rpBehavior?.responseToAffection ?? ""} onChange={(v) => updateGroup("rpBehavior", { responseToAffection: v })} />
              <TextArea label="Response to strangers" value={draft.rpBehavior?.responseToStrangers ?? ""} onChange={(v) => updateGroup("rpBehavior", { responseToStrangers: v })} />
              <TextArea label="Response to authority" value={draft.rpBehavior?.responseToAuthority ?? ""} onChange={(v) => updateGroup("rpBehavior", { responseToAuthority: v })} />
            </Section>
          )}

          {activeSection === "world" && (
            <Section title="World / Lore">
              <TextInput label="World association" value={draft.worldLore?.worldId ?? ""} onChange={(v) => updateGroup("worldLore", { worldId: v })} />
              <TextArea label="Setting" value={draft.worldLore?.setting ?? ""} onChange={(v) => updateGroup("worldLore", { setting: v })} />
              <TextInput label="Faction" value={draft.worldLore?.faction ?? ""} onChange={(v) => updateGroup("worldLore", { faction: v })} />
              <TextArea label="Home / location" value={draft.worldLore?.home ?? ""} onChange={(v) => updateGroup("worldLore", { home: v })} />
              <TextArea label="Default scenario" value={draft.worldLore?.defaultScenario ?? ""} onChange={(v) => updateGroup("worldLore", { defaultScenario: v })} />
            </Section>
          )}

          {activeSection === "greetings" && (
            <Section title="Greetings & Examples">
              <p className="ace-help">Authored greetings and example messages for this character.</p>
              <StringListEditor
                items={draft.greetings?.alternateGreetings ?? []}
                onChange={(items) => updateGroup("greetings", { alternateGreetings: items })}
                placeholder="Add an alternate greeting…"
                label="Alternate greetings"
              />
              <TextArea label="Example messages" value={draft.greetings?.exampleMessages ?? ""} onChange={(v) => updateGroup("greetings", { exampleMessages: v })} rows={6} placeholder="Sample messages showing how they talk and act" />
            </Section>
          )}

          {activeSection === "images" && (
            <Section title="Images">
              <ImageField
                label="Portrait"
                src={portraitSrc}
                reference={draft.image}
                busy={busy}
                onPick={() => portraitInput.current?.click()}
                onRemove={() => {
                  if (draft.image && onRemovePortrait) onRemovePortrait(draft.image);
                  update({ image: "" });
                }}
                canRemove={Boolean(draft.image)}
              />
              <input ref={portraitInput} type="file" accept="image/*" hidden onChange={handlePortraitFile} />

              <ImageField
                label="Scene image"
                src={sceneSrc}
                reference={draft.sceneImage}
                busy={busy}
                onPick={() => sceneInput.current?.click()}
                onRemove={() => {
                  if (draft.sceneImage && onRemoveScene) onRemoveScene(draft.sceneImage);
                  update({ sceneImage: "" });
                }}
                canRemove={Boolean(draft.sceneImage)}
              />
              <input ref={sceneInput} type="file" accept="image/*" hidden onChange={handleSceneFile} />

              {!onUploadPortrait && (
                <p className="ace-help">Upload needs a host that supports durable image storage. The underlying URL is also visible in CCV2 Compatibility.</p>
              )}
            </Section>
          )}

          {activeSection === "advanced" && (
            <Section title="CCV2 Compatibility">
              <p className="ace-help">
                The sections above author the <strong>HWCC v1</strong> extension (the authoritative
                Howling model). The fields below are the standard Character Card V2 representation that
                other tools understand. They are a compatibility projection; you normally do not need
                to edit them by hand. Unknown imported CCV2 fields and other extension namespaces are
                preserved when the character is saved.
              </p>
              <TextArea label="System prompt (imported)" value={draft.cardV2?.importedSystemPrompt ?? ""} onChange={(v) => updateCardV2({ importedSystemPrompt: v })} rows={4} />
              <TextArea label="Post-history instructions (imported)" value={draft.cardV2?.importedPostHistoryInstructions ?? ""} onChange={(v) => updateCardV2({ importedPostHistoryInstructions: v })} rows={3} />
              <TextArea label="Creator notes" value={draft.cardV2?.creatorNotes ?? ""} onChange={(v) => updateCardV2({ creatorNotes: v })} />
              <TextInput label="Character version" value={draft.cardV2?.characterVersion ?? ""} onChange={(v) => updateCardV2({ characterVersion: v })} />
              <StringListEditor
                items={draft.cardV2?.tags ?? []}
                onChange={(items) => updateCardV2({ tags: items })}
                placeholder="Add a tag…"
                label="Tags"
              />
              <StringListEditor
                items={draft.cardV2?.alternateGreetings ?? []}
                onChange={(items) => updateCardV2({ alternateGreetings: items })}
                placeholder="Add an imported alternate greeting…"
                label="Alternate greetings (V2)"
              />
              <CharacterBookEditor
                book={draft.cardV2?.characterBook}
                onChange={(book) => updateCardV2({ characterBook: book })}
              />

              <SubHeading>Howling generation instructions</SubHeading>
              <p className="ace-help">
                These are Howling-specific safety and authoring instructions. They live in the HWCC
                extension rather than standard CCV2.
              </p>
              <TextInput label="Allowed relationship types" value={draft.allowedRelationshipTypes?.join(", ") ?? ""} onChange={(v) => update({ allowedRelationshipTypes: v.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
              <TextArea label="Disallowed content" value={draft.disallowedContent?.join("; ") ?? ""} onChange={(v) => update({ disallowedContent: v.split(";").map((s) => s.trim()).filter(Boolean) })} placeholder="Semicolon-separated" />
              <TextArea label="Context notes" value={draft.contextNotes ?? ""} onChange={(v) => update({ contextNotes: v })} />
              <TextArea label="Author note" value={draft.authorNote ?? ""} onChange={(v) => update({ authorNote: v })} />

              <SubHeading>Raw imported metadata</SubHeading>
              <button type="button" className="outline-button" onClick={() => setShowRawJson((value) => !value)}>
                {showRawJson ? "Hide raw JSON" : "Show raw JSON"}
              </button>
              {showRawJson && (
                <pre className="ace-raw-json">{draft.cardV2?.original ? JSON.stringify(draft.cardV2.original, null, 2) : "// No imported Character Card V2 metadata"}</pre>
              )}
            </Section>
          )}

          {activeSection === "preview" && (
            <Section title="Preview">
              <div className="factory-preview">
                <h3>Compiled profile</h3>
                <p className="ace-help">This is how the structured fields combine into the character description fed to the story.</p>
                <pre className="ace-raw-json">{compiledPreview || "Nothing authored yet."}</pre>

                <h3>Identity</h3>
                <p>{draft.name || "Unnamed"} — {draft.role || "No role"}</p>
                {draft.pronouns && <p>Pronouns: {draft.pronouns}</p>}
                {draft.ageCategory && <p>Age category: {draft.ageCategory}</p>}
                {draft.ageBehavior?.actualAge && <p>Age: {draft.ageBehavior.actualAge}</p>}

                <h3>Personality</h3>
                {(draft.traits && (draft.traits.primary.length > 0 || draft.traits.secondary.length > 0 || draft.traits.situational.length > 0 || (draft.traits.custom?.length ?? 0) > 0)) && (
                  <div>
                    <p><strong>Traits:</strong></p>
                    {draft.traits.primary.length > 0 && <p>Core: {draft.traits.primary.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.secondary.length > 0 && <p>Secondary: {draft.traits.secondary.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.situational.length > 0 && <p>Situational: {draft.traits.situational.map(id => getTraitById(id)?.name || id).join(", ")}</p>}
                    {draft.traits.custom && draft.traits.custom.length > 0 && <p>Custom: {draft.traits.custom.map(t => t.name).join(", ")}</p>}
                  </div>
                )}

                <h3>Knowledge</h3>
                <p>{draft.knowledge?.knowsWell || "No knowledge notes yet."}</p>

                <h3>Voice</h3>
                <p>{draft.voice?.speechStyle || "No voice notes yet."}</p>

                <h3>Relationships</h3>
                <p>{(draft.relationships ?? []).length === 0 ? "No relationships defined." : `${(draft.relationships ?? []).length} defined.`}</p>

                {draft.cardV2?.tags && draft.cardV2.tags.length > 0 && (
                  <>
                    <h3>Tags</h3>
                    <p>{draft.cardV2.tags.join(", ")}</p>
                  </>
                )}
              </div>
            </Section>
          )}
        </main>
      </div>
    </div>
  );
}

function updateRelationship(
  draft: Character,
  index: number,
  key: keyof NonNullable<Character["relationships"]>[number],
  value: string,
  update: (patch: Partial<Character>) => void,
) {
  const next = [...(draft.relationships ?? [])];
  next[index] = { ...next[index], [key]: value };
  update({ relationships: next });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ace-section">
      <h3 className="ace-section-title">{title}</h3>
      <div className="ace-section-body">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="ace-subheading">{children}</h4>;
}

function TextInput({ label, value, onChange, placeholder, required }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="ace-field">
      <span>{label}{required ? " *" : ""}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="ace-field">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function StringListEditor({ items, onChange, placeholder, label }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  return (
    <div className="ace-field">
      <span>{label}</span>
      <div className="factory-list-editor">
        <div className="factory-list-items">
          {items.map((item, index) => (
            <span key={index} className="factory-list-chip">
              {item}
              <button type="button" onClick={() => remove(index)} aria-label={`Remove ${item}`}>×</button>
            </span>
          ))}
        </div>
        <div className="factory-list-input">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <button type="button" onClick={add}>Add</button>
        </div>
      </div>
    </div>
  );
}

function CharacterBookEditor({ book, onChange }: {
  book: CharacterBookV2 | undefined;
  onChange: (book: CharacterBookV2 | undefined) => void;
}) {
  const [text, setText] = useState(() => (book ? JSON.stringify(book, null, 2) : ""));
  const [error, setError] = useState<string | null>(null);

  const apply = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      setError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CharacterBookV2;
      setError(null);
      onChange(parsed);
    } catch {
      setError("Character Book is not valid JSON.");
    }
  };

  return (
    <div className="ace-field">
      <span>Character Book</span>
      <textarea value={text} rows={6} placeholder="Character Book JSON (optional)" onChange={(e) => apply(e.target.value)} />
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}

function ImageField({ label, src, reference, busy, onPick, onRemove, canRemove }: {
  label: string;
  src: string;
  reference: string;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="ace-image-field">
      <span className="ace-image-label">{label}</span>
      <div className="ace-image-preview">
        {src ? <img src={src} alt={`${label} preview`} /> : <div className="ace-image-placeholder">No image</div>}
      </div>
      <div className="ace-image-actions">
        <button type="button" className="outline-button" onClick={onPick} disabled={busy}>
          {busy ? "Uploading…" : "Upload / replace"}
        </button>
        {canRemove && (
          <button type="button" className="text-button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      {reference && <small className="ace-image-reference">{reference}</small>}
    </div>
  );
}

function useResolvedImage(reference: string | undefined): string {
  const [objectUrl, setObjectUrl] = useState("");
  const isStored = Boolean(reference) && isStoredPortraitReference(reference);
  useEffect(() => {
    if (!reference || !isStoredPortraitReference(reference)) return;
    let url = "";
    let active = true;
    loadCharacterPortrait(reference)
      .then((bytes) => {
        if (!bytes || !active) return;
        url = URL.createObjectURL(new Blob([bytes]));
        setObjectUrl(url);
      })
      .catch(() => { if (active) setObjectUrl(""); });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reference]);
  return isStored ? objectUrl : (reference ?? "");
}
