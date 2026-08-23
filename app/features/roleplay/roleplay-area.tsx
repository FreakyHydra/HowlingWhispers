"use client";

import React, { type ComponentType, useState } from "react";
import type { Character, SceneDefinition, StoryEditor, CommonScene, Message } from "../dreambound-app";
import type { Location } from "../../lib/locations/types";
import type { Scenario } from "../../lib/scenarios/types";
import type { OllamaModelInfo } from "../../lib/ollama";
import { CharacterFactory } from "../characters/character-factory";
import { LocationCard } from "../locations/location-card";
import { LocationFactory } from "../locations/location-factory";
import { ScenarioCard } from "../scenarios/scenario-card";
import { ScenarioFactory } from "../scenarios/scenario-factory";

export interface RoleplayAreaProps {
  view: string;
  currentUser: { displayName: string } | null;
  setView: (view: string) => void;
  connected: boolean;
  providerState: string;
  configured: boolean;
  storyProvider: string;
  activeModel: OllamaModelInfo;
  characters: Character[];
  scenesFor: (character: Character) => SceneDefinition[];
  portraitUrl: (character: Character) => string;
  isUserOwnedCharacter: (character: Character) => boolean;
  openSceneLibrary: (id: string) => void;
  setCharacterDownloadError: (error: string) => void;
  setDownloadingCharacter: (character: Character | null) => void;
  setEditingCharacter: (character: Character | null) => void;
  setConfirmDeleteCharacter: (character: Character | null) => void;
  setIsCreating: (creating: boolean) => void;
  setIsCreatingLocation: (creating: boolean) => void;
  isCreatingLocation: boolean;
  characterBackupMsg: string;
  characterBackupError: string;
  importCharacterFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  exportCharacterLibrary: () => void;
  isCreating: boolean;
  importError: string;
  createCharacter: (event: React.FormEvent<HTMLFormElement>) => void;
  editingCharacter: Character | null;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  advancedEditingCharacter: Character | null;
  setAdvancedEditingCharacter: (character: Character | null) => void;
  onAdvancedCreate: () => void;
  uploadPortrait: (characterId: string, bytes: Uint8Array) => Promise<string>;
  uploadScene: (characterId: string, bytes: Uint8Array) => Promise<string>;
  removePortrait: (reference: string) => void;
  removeScene: (reference: string) => void;
  isStoredPortraitReference: (reference: string) => boolean;
  downloadingCharacter: Character | null;
  exportV2Png: (character: Character) => Promise<void> | void;
  exportV2Json: (character: Character) => void;
  exportNativeCharacter: (character: Character) => void;
  characterDownloadError: string;
  confirmDeleteCharacter: Character | null;
  deleteCharacter: (character: Character) => void;
  selected: Character;
  themeVariables: React.CSSProperties;
  codaWorldGuide: {
    title: string;
    summary: string;
    foundations: Array<{ mark: string; title: string; text: string }>;
    places: string[];
    roles: Array<{ name: string; context: string }>;
  };
  selectedCodaRole: string;
  setSelectedCodaRole: (role: string) => void;
  customCodaRole: string;
  setCustomCodaRole: (role: string) => void;
  storyEditor: StoryEditor | null;
  saveStory: (event: React.FormEvent<HTMLFormElement>) => void;
  commonSceneEditor: { mode: "create" | "edit"; scene: CommonScene } | null;
  setCommonSceneEditor: (editor: { mode: "create" | "edit"; scene: CommonScene } | null) => void;
  openStoryCreator: () => void;
  requestPersonaStart: (start: { kind: string; characterId?: string; location?: import("../../lib/locations/types").Location; scene?: import("../dreambound-app").SceneDefinition }) => void;
  selectedScenes: SceneDefinition[];
  commonScenes: CommonScene[];
  addonCommonScenes: Array<CommonScene & { sourceAddonId?: string; sourceAddonName?: string }>;
  starterCommonScenes: Array<{ id: string; title: string; subtitle: string; weather: string }>;
  startCommonScene: (scene: CommonScene) => void;
  deleteCustomScene: (scene: SceneDefinition) => void;
  selectedSessions: import("../dreambound-app").StorySession[];
  messages: Record<string, Message[]>;
  continueRoleplay: (session: import("../dreambound-app").StorySession) => void;
  deleteSession: (session: import("../dreambound-app").StorySession) => void;
  sandboxSceneFor: (character: Character) => SceneDefinition;
  relationshipScore: number;
  relationshipLabel: string;
  relationshipMeterPercent: number;
  isLocationSession: boolean;
  activePersonaName: string | null;
  memoryCardStatus: string;
  onResumeLatest: () => void;
  hasLatestSession: boolean;
  Portrait: ComponentType<{ character: Character; accent?: string; image?: string }>;
  locations: Location[];
  isUserOwnedLocation: (location: Location) => boolean;
  createLocation: (input: Partial<Location>) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (location: Location) => void;
  editingLocation: Location | null;
  setEditingLocation: (location: Location | null) => void;
  confirmDeleteLocation: Location | null;
  setConfirmDeleteLocation: (location: Location | null) => void;
  locationError: string;
  locationImportMsg: string;
  importLocationFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  exportLocation: (location: Location) => void;
  scenarios: Scenario[];
  isUserOwnedScenario: (scenario: Scenario) => boolean;
  createScenario: (input: Partial<Scenario>) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (scenario: Scenario) => void;
  isCreatingScenario: boolean;
  setIsCreatingScenario: (value: boolean) => void;
  editingScenario: Scenario | null;
  setEditingScenario: (scenario: Scenario | null) => void;
  confirmDeleteScenario: Scenario | null;
  setConfirmDeleteScenario: (scenario: Scenario | null) => void;
  scenarioError: string;
  scenarioImportMsg: string;
  importScenarioFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  exportScenario: (scenario: Scenario) => void;
}

export function RoleplayArea(props: RoleplayAreaProps) {
  const { Portrait } = props;
  const [roleplayType, setRoleplayType] = useState<"characters" | "locations" | "scenarios">("characters");
  const [characterTab, setCharacterTab] = useState<"curated" | "custom">("curated");
  const [locationTab, setLocationTab] = useState<"curated" | "custom">("curated");
  const [scenarioTab, setScenarioTab] = useState<"curated" | "custom">("curated");
  const curatedCharacters = (props.characters ?? []).filter((character) => !props.isUserOwnedCharacter(character));
  const customCharacters = (props.characters ?? []).filter((character) => props.isUserOwnedCharacter(character));
  const curatedLocations = (props.locations ?? []).filter((location) => !props.isUserOwnedLocation(location));
  const customLocations = (props.locations ?? []).filter((location) => props.isUserOwnedLocation(location));
  const curatedScenarios = (props.scenarios ?? []).filter((scenario) => !props.isUserOwnedScenario(scenario));
  const customScenarios = (props.scenarios ?? []).filter((scenario) => props.isUserOwnedScenario(scenario));

  const countLabel =
    roleplayType === "characters"
      ? characterTab === "curated"
        ? `${curatedCharacters.length} curated contacts`
        : `${customCharacters.length} custom contacts`
      : roleplayType === "locations"
        ? locationTab === "curated"
          ? `${curatedLocations.length} curated places`
          : `${customLocations.length} custom places`
        : scenarioTab === "curated"
          ? `${curatedScenarios.length} curated scenarios`
          : `${customScenarios.length} custom scenarios`;

  const createButtonLabel =
    roleplayType === "characters"
      ? "Create contact"
      : roleplayType === "locations"
        ? "Create location"
        : "Create scenario";

  const handleCreate = () => {
    if (roleplayType === "characters") {
      props.setIsCreating(true);
    } else if (roleplayType === "locations") {
      props.setIsCreatingLocation(true);
    } else if (roleplayType === "scenarios") {
      props.setIsCreatingScenario(true);
    }
  };

  const sectionEyebrow =
    roleplayType === "characters"
      ? "Contacts"
      : roleplayType === "locations"
        ? "Locations"
        : "Scenarios";

  const sectionHeading =
    roleplayType === "characters"
      ? "Choose someone to meet"
      : roleplayType === "locations"
        ? "Choose somewhere to begin"
        : "Choose a story to enter";

  const startScenario = (scenario: Scenario) => {
    const linkedCharacter = (scenario.linkedCharacterIds ?? [])
      .map((id) => props.characters.find((character) => character.id === id))
      .find((character): character is Character => Boolean(character));
    const character = linkedCharacter ?? props.selected ?? props.characters[0];
    if (!character) return;

    const fallbackTheme = {
      accent: "#b7653f",
      accentMuted: "#6f3b2b",
      glow: "#2a1715",
      surface: "#171012",
      wash: "#09090b",
      motif: "scenario",
    };
    const theme = props.scenesFor(character)[0]?.theme ?? fallbackTheme;
    const opening = [
      scenario.openingSituation?.trim()
        || scenario.description?.trim()
        || scenario.shortDescription?.trim()
        || `The scenario “${scenario.name}” begins.`,
      scenario.startingConditions?.length
        ? `Starting conditions: ${scenario.startingConditions.join("; ")}`
        : "",
      scenario.activeElements?.length
        ? `Already in motion: ${scenario.activeElements.join("; ")}`
        : "",
      scenario.possibleHooks?.length
        ? `Possible hooks: ${scenario.possibleHooks.join("; ")}`
        : "",
    ].filter(Boolean).join("\n\n");

    const scene: SceneDefinition = {
      id: `scenario:${scenario.id}`,
      title: scenario.name,
      subtitle: scenario.shortDescription?.trim() || scenario.description?.trim().slice(0, 180) || "Scenario",
      status: scenario.atmosphere?.trim() || "Scenario active",
      weather: scenario.atmosphere?.trim() || "",
      background: scenario.image?.trim() || "",
      backgroundFocalPoint: "center",
      opening,
      theme,
    };

    props.requestPersonaStart({ kind: "scene", characterId: character.id, scene });
  };

  return (
    <>
      {props.view === "roleplay" && (
        <section className="character-home">
          <div className="home-hero">
            <div>
              <p className="eyebrow">
                Welcome back{props.currentUser?.displayName.trim() ? `, ${props.currentUser.displayName}` : ""}
              </p>
              <h1>Where will the whisper take you?</h1>
              <p>
                Every whisper becomes a world. Choose how your story begins, then step into something new or return to one already unfolding.
              </p>
              <button className="home-changelog-link" onClick={() => props.setView("changelog")}>
                See what&apos;s new <span aria-hidden="true">→</span>
              </button>
            </div>
            <button
              className={`home-connection ${props.providerState}`}
              onClick={() => props.setView("settings")}
            >
              <span className="home-connection-icon" aria-hidden="true">
                {props.connected ? "✓" : props.configured ? "!" : "＋"}
              </span>
              <span>
                <small>Story engine</small>
                <strong>
                  {props.connected
                    ? `${props.activeModel.label} verified`
                    : props.providerState === "error"
                      ? "Connection failed · check settings"
                    : props.configured
                      ? props.storyProvider === "novelai"
                        ? "Token entered · test required"
                        : `${props.activeModel.label} · test required`
                      : "Choose an engine to begin"}
                </strong>
              </span>
              <i aria-hidden="true">›</i>
            </button>
          </div>

          <div className="character-tabs">
            <button
              className={roleplayType === "characters" ? "active" : ""}
              onClick={() => setRoleplayType("characters")}
            >
              Contacts
            </button>
            <button
              className={roleplayType === "locations" ? "active" : ""}
              onClick={() => setRoleplayType("locations")}
            >
              Locations
            </button>
            <button
              className={roleplayType === "scenarios" ? "active" : ""}
              onClick={() => setRoleplayType("scenarios")}
            >
              Scenarios
            </button>
          </div>

          {roleplayType === "characters" && (
            <>
              <div className="home-section-heading">
                <div>
                  <p className="eyebrow">{sectionEyebrow}</p>
                  <h2>{sectionHeading}</h2>
                </div>
                <div className="home-section-actions">
                  <span className="home-section-count">{countLabel}</span>
                  <button className="primary-button" onClick={handleCreate} disabled={roleplayType === "scenarios"}>
                    {createButtonLabel}
                  </button>
                </div>
              </div>

              <div className="character-tabs">
                <button
                  className={characterTab === "curated" ? "active" : ""}
                  onClick={() => setCharacterTab("curated")}
                >
                  Curated
                </button>
                <button
                  className={characterTab === "custom" ? "active" : ""}
                  onClick={() => setCharacterTab("custom")}
                >
                  Custom
                </button>
              </div>

              <div className="character-backup-bar">
                <label className="outline-button import-browse">
                  Import characters
                  <input
                    type="file"
                    accept=".png,.json,image/png,application/json"
                    onChange={props.importCharacterFile}
                  />
                </label>
                <button
                  className="outline-button"
                  onClick={props.exportCharacterLibrary}
                >
                  Howling library backup
                </button>
                {props.characterBackupMsg && <span className="backup-feedback ok">{props.characterBackupMsg}</span>}
                {props.characterBackupError && <span className="backup-feedback err">{props.characterBackupError}</span>}
              </div>

              <div className="character-gallery">
                {(characterTab === "curated" ? curatedCharacters : customCharacters).map((character) => {
                  const characterTheme = props.scenesFor(character)[0].theme;
                  return (
                    <article
                      className="home-character"
                      key={character.id}
                      onClick={() => props.openSceneLibrary(character.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          props.openSceneLibrary(character.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={
                        {
                          "--card-image": props.portraitUrl(character)
                            ? `url("${props.portraitUrl(character)}")`
                            : "linear-gradient(145deg, #2b1c1e, #0c0c0e)",
                          "--character-accent": characterTheme.accent,
                          "--card-position": character.portraitFocalPoint ?? "center",
                        } as React.CSSProperties
                      }
                    >
                      <div className="home-character-wash" />
                      <div className="home-character-copy">
                        <span className="home-character-status">
                          <i />
                          {character.status}
                        </span>
                        <h3>
                          {character.creditUrl ? (
                            <a
                              href={character.creditUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {character.name}
                            </a>
                          ) : (
                            character.name
                          )}
                        </h3>
                        <p>{character.role}</p>
                        <small>{character.scene}</small>
                        {character.credit && (
                          <small className="home-character-credit">{character.credit}</small>
                        )}
                        <button onClick={(event) => {
                          event.stopPropagation();
                          props.openSceneLibrary(character.id);
                        }}>
                          Open their stories <span aria-hidden="true">→</span>
                        </button>
                        <span className="home-character-actions">
                            <button
                              className="home-character-edit"
                              aria-label={`Download ${character.name}`}
                              title="Download character"
                              onClick={(event) => {
                                event.stopPropagation();
                                props.setCharacterDownloadError("");
                                props.setDownloadingCharacter(character);
                              }}
                            >
                              Download
                            </button>
                        {props.isUserOwnedCharacter(character) && (<>
                            <button
                              className="home-character-edit"
                              aria-label={`Edit ${character.name}`}
                              title="Edit character"
                              onClick={(event) => {
                                event.stopPropagation();
                                props.setEditingCharacter(character);
                              }}
                            >
                              ✎ Edit
                            </button>
                            <button
                              className="home-character-delete"
                              aria-label={`Delete ${character.name}`}
                              title="Delete character"
                              onClick={(event) => {
                                event.stopPropagation();
                                props.setConfirmDeleteCharacter(character);
                              }}
                            >
                              Delete
                            </button>
                        </>)}
                          </span>
                      </div>
                    </article>
                  );
                })}
                <button className="new-character-card" onClick={() => props.setIsCreating(true)}>
                  <span aria-hidden="true">＋</span>
                  <strong>Awaken someone new</strong>
                  <small>Create a character or import a V2 PNG/JSON card.</small>
                </button>
              </div>
            </>
          )}

          {roleplayType === "locations" && (
            <>
              <div className="character-tabs">
                <button
                  className={locationTab === "curated" ? "active" : ""}
                  onClick={() => setLocationTab("curated")}
                >
                  Curated
                </button>
                <button
                  className={locationTab === "custom" ? "active" : ""}
                  onClick={() => setLocationTab("custom")}
                >
                  Custom
                </button>
              </div>

              <div className="character-backup-bar">
                <label className="outline-button import-browse">
                  Import locations
                  <input
                    type="file"
                    accept=".json"
                    onChange={props.importLocationFile}
                  />
                </label>
                {props.locationImportMsg && <span className="backup-feedback ok">{props.locationImportMsg}</span>}
                {props.locationError && <span className="backup-feedback err">{props.locationError}</span>}
              </div>

              <div className="character-gallery">
                {(locationTab === "curated" ? curatedLocations : customLocations).map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onOpen={() => props.openSceneLibrary(location.id)}
                    onEdit={props.isUserOwnedLocation(location) ? (loc) => props.setEditingLocation(loc) : undefined}
                    onDelete={props.isUserOwnedLocation(location) ? (loc) => props.setConfirmDeleteLocation(loc) : undefined}
                    onExport={props.isUserOwnedLocation(location) ? (loc) => props.exportLocation(loc) : undefined}
                  />
                ))}
                <button className="new-character-card" onClick={() => props.setIsCreatingLocation(true)}>
                  <span aria-hidden="true">＋</span>
                  <strong>Awaken somewhere new</strong>
                  <small>Create a location or import a Howling Whispers location file.</small>
                </button>
              </div>
            </>
          )}

          {roleplayType === "scenarios" && (
            <>
              <div className="character-tabs">
                <button
                  className={scenarioTab === "curated" ? "active" : ""}
                  onClick={() => setScenarioTab("curated")}
                >
                  Curated
                </button>
                <button
                  className={scenarioTab === "custom" ? "active" : ""}
                  onClick={() => setScenarioTab("custom")}
                >
                  Custom
                </button>
              </div>

              <div className="character-backup-bar">
                <label className="outline-button import-browse">
                  Import scenarios
                  <input
                    type="file"
                    accept=".json"
                    onChange={props.importScenarioFile}
                  />
                </label>
                {props.scenarioImportMsg && <span className="backup-feedback ok">{props.scenarioImportMsg}</span>}
                {props.scenarioError && <span className="backup-feedback err">{props.scenarioError}</span>}
              </div>

              <div className="character-gallery">
                {(scenarioTab === "curated" ? curatedScenarios : customScenarios).map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onOpen={() => startScenario(scenario)}
                    onEdit={props.isUserOwnedScenario(scenario) ? (scenario) => props.setEditingScenario(scenario) : undefined}
                    onDelete={props.isUserOwnedScenario(scenario) ? (scenario) => props.setConfirmDeleteScenario(scenario) : undefined}
                    onExport={props.isUserOwnedScenario(scenario) ? (scenario) => props.exportScenario(scenario) : undefined}
                  />
                ))}
                <button className="new-character-card" onClick={() => props.setIsCreatingScenario(true)}>
                  <span aria-hidden="true">＋</span>
                  <strong>Shape a new situation</strong>
                  <small>Create a scenario or import a Howling Whispers scenario file.</small>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {props.isCreating && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => props.setIsCreating(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => props.setIsCreating(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Awaken someone new</p>
            <h2 id="create-title">Create a character</h2>
            <p className="modal-intro">
              Give them a name and a place in your world. You can deepen their lore as you talk.
            </p>
            <label className="import-card">
              <span>
                Already have a character?
                <small>Import a Character Card V2 PNG or JSON, or a Howling Whispers backup.</small>
              </span>
              <input type="file" accept=".png,.json,image/png,application/json" onChange={props.importCharacterFile} />
            </label>
            {props.importError && <p className="form-error">{props.importError}</p>}
            <div className="modal-divider">
              <span>or create one here</span>
            </div>
            <form onSubmit={props.createCharacter}>
              <label>
                Name
                <input name="name" required placeholder="Who are they?" autoFocus />
              </label>
              <label>
                Role in your story
                <input name="role" required placeholder="Girlfriend, rival, guardian…" />
              </label>
              <label>
                First spark
                <textarea
                  name="spark"
                  rows={3}
                  placeholder="A secret, a desire, or the moment you first meet…"
                />
              </label>
              <button className="primary-button" type="submit">
                Awaken character
              </button>
              <button type="button" className="outline-button create-advanced-button" onClick={props.onAdvancedCreate}>
                Advanced Create
              </button>
              <small className="create-advanced-hint">
                Skip the quick form and author the full HWCC v1 character up front.
              </small>
            </form>
          </section>
        </div>
      )}

      {props.editingCharacter && (
        <CharacterFactory
          character={props.editingCharacter}
          isCreating={false}
          onSave={(draft) => props.updateCharacter(props.editingCharacter.id, draft)}
          onCancel={() => props.setEditingCharacter(null)}
          createCharacter={() => {}}
          onOpenAdvanced={(draft) => {
            props.setAdvancedEditingCharacter(draft);
            props.setEditingCharacter(null);
          }}
        />
      )}

      {props.downloadingCharacter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => props.setDownloadingCharacter(null)}>
          <section
            className="modal character-download-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-download-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => props.setDownloadingCharacter(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Portable character</p>
            <h2 id="character-download-title">Download {props.downloadingCharacter.name}</h2>
            <p className="modal-intro">
              Character Card V2 is the standard portable format. Howling Whispers backups retain
              app-specific data that V2 does not represent.
            </p>
            <button
              className="primary-button"
              type="button"
              disabled={!props.portraitUrl(props.downloadingCharacter)}
              onClick={() => void props.exportV2Png(props.downloadingCharacter)}
            >
              Download V2 Card
            </button>
            <div className="character-download-options">
              <button className="outline-button" type="button" onClick={() => props.exportV2Json(props.downloadingCharacter)}>
                V2 JSON
              </button>
              {props.isUserOwnedCharacter(props.downloadingCharacter) && (
                <button className="outline-button" type="button" onClick={() => props.exportNativeCharacter(props.downloadingCharacter)}>
                  Howling Whispers Backup
                </button>
              )}
            </div>
            {!props.portraitUrl(props.downloadingCharacter) && (
              <small>V2 PNG needs portrait artwork. V2 JSON remains available without an image.</small>
            )}
            {props.characterDownloadError && <p className="form-error">{props.characterDownloadError}</p>}
          </section>
        </div>
      )}

      {props.confirmDeleteCharacter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setConfirmDeleteCharacter(null)}
        >
          <section
            className="modal character-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => props.setConfirmDeleteCharacter(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow">Remove them for good</p>
            <h2 id="character-delete-title">Delete {props.confirmDeleteCharacter.name}?</h2>
            <p className="modal-intro">
              This removes {props.confirmDeleteCharacter.name}, their stories, and their saved
              conversations from this browser. This cannot be undone.
            </p>
            <div className="character-edit-actions">
              <button className="outline-button" type="button" onClick={() => props.setConfirmDeleteCharacter(null)}>
                Cancel
              </button>
              <button
                className="primary-button character-delete"
                type="button"
                onClick={() => props.deleteCharacter(props.confirmDeleteCharacter)}
              >
                Delete character
              </button>
            </div>
          </section>
        </div>
      )}

      {props.isCreatingLocation && (
        <LocationFactory
          mode="create"
          location={null}
          onSave={(location) => {
            props.createLocation(location);
          }}
          onCancel={() => props.setIsCreatingLocation(false)}
        />
      )}

      {props.editingLocation && (
        <LocationFactory
          mode="edit"
          location={props.editingLocation}
          onSave={(location) => {
            props.updateLocation(location.id, location);
          }}
          onCancel={() => props.setEditingLocation(null)}
        />
      )}

      {props.confirmDeleteLocation && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setConfirmDeleteLocation(null)}
        >
          <section
            className="modal character-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => props.setConfirmDeleteLocation(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow">Remove place for good</p>
            <h2 id="location-delete-title">Delete {props.confirmDeleteLocation.name}?</h2>
            <p className="modal-intro">
              This removes {props.confirmDeleteLocation.name} from your library. This cannot be undone.
            </p>
            <div className="character-edit-actions">
              <button className="outline-button" type="button" onClick={() => props.setConfirmDeleteLocation(null)}>
                Cancel
              </button>
              <button
                className="primary-button character-delete"
                type="button"
                onClick={() => props.deleteLocation(props.confirmDeleteLocation)}
              >
                Delete location
              </button>
            </div>
          </section>
        </div>
      )}

      {props.isCreatingScenario && (
        <ScenarioFactory
          mode="create"
          scenario={null}
          onSave={(scenario) => {
            props.createScenario(scenario);
          }}
          onCancel={() => props.setIsCreatingScenario(false)}
        />
      )}

      {props.editingScenario && (
        <ScenarioFactory
          mode="edit"
          scenario={props.editingScenario}
          onSave={(scenario) => {
            props.updateScenario(scenario.id, scenario);
          }}
          onCancel={() => props.setEditingScenario(null)}
        />
      )}

      {props.confirmDeleteScenario && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setConfirmDeleteScenario(null)}
        >
          <section
            className="modal character-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scenario-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => props.setConfirmDeleteScenario(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow">Remove scenario for good</p>
            <h2 id="scenario-delete-title">Delete {props.confirmDeleteScenario.name}?</h2>
            <p className="modal-intro">
              This removes {props.confirmDeleteScenario.name} from your library. This cannot be undone.
            </p>
            <div className="character-edit-actions">
              <button className="outline-button" type="button" onClick={() => props.setConfirmDeleteScenario(null)}>
                Cancel
              </button>
              <button
                className="primary-button character-delete"
                type="button"
                onClick={() => props.deleteScenario(props.confirmDeleteScenario)}
              >
                Delete scenario
              </button>
            </div>
          </section>
        </div>
      )}

      {props.view === "scenes" && (
        <section className="scene-library" style={props.themeVariables}>
          <div
            className="scene-library-backdrop"
            style={{
              "--scene-library-image": props.portraitUrl(props.selected)
                ? `url("${props.portraitUrl(props.selected)}")`
                : "linear-gradient(145deg, #211416, #09090b)",
              "--scene-library-position": props.selected.portraitFocalPoint ?? "center",
            } as React.CSSProperties}
          />
          <div className="scene-library-content">
            <header className="scene-library-header">
              <button className="outline-button" onClick={() => props.setView("roleplay")}>
                ← Back to roleplay
              </button>
              {props.isUserOwnedCharacter(props.selected) && (
                <span className="scene-library-actions">
                  <button
                    className="outline-button"
                    aria-label={`Edit ${props.selected.name}`}
                    onClick={() => props.setEditingCharacter(props.selected)}
                  >
                    ✎ Edit</button>
                  <button
                    className="outline-button character-delete"
                    aria-label={`Delete ${props.selected.name}`}
                    onClick={() => props.setConfirmDeleteCharacter(props.selected)}
                  >
                    Delete
                  </button>
                </span>
              )}
              <div>
                <p className="eyebrow">Stories with {props.selected.name}</p>
                <h1>{props.selected.name}</h1>
                <p>{props.selected.role} · {props.selected.status}</p>
                {props.activePersonaName && (
                  <p className="scene-library-persona">Playing as {props.activePersonaName}</p>
                )}
                {!props.isLocationSession && (
                  <div className="relationship-meter-container">
                    <span className="relationship-label">Relationship with {props.selected.name}</span>
                    <strong className="relationship-score">{props.relationshipScore.toLocaleString()}</strong>
                    <span className="relationship-label">{props.relationshipLabel}</span>
                    <div className="bond-meter" aria-label={`Relationship meter at ${props.relationshipMeterPercent}%`}>
                      <span style={{ width: `${props.relationshipMeterPercent}%` }} />
                      <i style={{ left: `${props.relationshipMeterPercent}%` }}>♡</i>
                    </div>
                  </div>
                )}
              </div>
              <Portrait character={props.selected} image={props.portraitUrl(props.selected)} />
            </header>

            {props.selected.id === "coda" && (
              <section className="coda-world-draft" aria-labelledby="coda-world-title">
                <div className="coda-world-intro">
                  <div>
                    <p className="eyebrow">World draft · awaiting your approval</p>
                    <h2 id="coda-world-title">{props.codaWorldGuide.title}</h2>
                  </div>
                  <p>{props.codaWorldGuide.summary}</p>
                </div>
                <div className="coda-world-foundations">
                  {props.codaWorldGuide.foundations.map((foundation) => (
                    <article key={foundation.title}>
                      <span>{foundation.mark}</span>
                      <h3>{foundation.title}</h3>
                      <p>{foundation.text}</p>
                    </article>
                  ))}
                </div>
                <div className="coda-world-index">
                  <div>
                    <span>Places currently in the draft</span>
                    <div className="coda-world-tags">
                      {props.codaWorldGuide.places.map((place) => <i key={place}>{place}</i>)}
                    </div>
                  </div>
                  <div>
                    <span>Optional player roles</span>
                    <div className="coda-world-tags role-tags" role="group" aria-label="Choose your role">
                      {props.codaWorldGuide.roles.map((role) => (
                        <button
                          type="button"
                          className={props.selectedCodaRole === role.name ? "active" : ""}
                          key={role.name}
                          onClick={() => props.setSelectedCodaRole(role.name)}
                          aria-pressed={props.selectedCodaRole === role.name}
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                    <p className="coda-role-description">
                      {props.codaWorldGuide.roles.find((role) => role.name === props.selectedCodaRole)?.context}
                    </p>
                    {props.selectedCodaRole === "Custom Role" && (
                      <label className="coda-custom-role">
                        <span>Describe only your role, knowledge, and connection to Coda</span>
                        <textarea
                          value={props.customCodaRole}
                          onChange={(event) => props.setCustomCodaRole(event.target.value)}
                          maxLength={800}
                          rows={3}
                          placeholder="Example: I am a bookbinder from the court who met Coda for the first time this morning."
                        />
                      </label>
                    )}
                  </div>
                </div>
                <p className="coda-world-note">
                  The origin of Coda&apos;s collar, the purpose of its red pendant, and the names
                  of the world and city remain intentionally unresolved.
                </p>
            </section>
          )}

            {/* PRIMARY */}
            <section className="scene-library-section primary-actions">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">Primary</p>
                  <h2>Resume Latest</h2>
                </div>
              </div>
              {props.hasLatestSession && props.selectedSessions.length > 0 ? (
                <div className="resume-latest-card" style={{
                  "--session-accent": props.selectedScenes.find(s => s.id === props.selectedSessions[0].sceneId)?.theme.accent ?? props.selected.accent,
                  "--session-glow": props.selectedScenes.find(s => s.id === props.selectedSessions[0].sceneId)?.theme.glow ?? `${props.selected.accent}45`,
                } as React.CSSProperties}>
                  <button className="resume-latest-action" onClick={props.onResumeLatest}>
                    <span className="resume-latest-mark">
                      {(props.selectedScenes.find(s => s.id === props.selectedSessions[0].sceneId)?.theme.motif ?? "◆").slice(0, 2)}
                    </span>
                    <span className="resume-latest-copy">
                      <strong>Continue: {props.selectedSessions[0].title}</strong>
                      <span>{props.selectedSessions[0].messageKey === props.selected.id ? "Sandbox session" : (props.selectedScenes.find(s => s.id === props.selectedSessions[0].sceneId)?.title ?? "Unknown scene")}</span>
                    </span>
                    <span className="resume-latest-meta">
                      <small>{new Date(props.selectedSessions[0].updatedAt).toLocaleDateString()}</small>
                      <i aria-hidden="true">→</i>
                    </span>
                  </button>
                </div>
              ) : (
                <p className="scene-library-empty">No previous sessions with {props.selected.name} yet.</p>
              )}
            </section>

            <section className="scene-library-section">
              {props.storyEditor && (
                <form
                  className="story-editor"
                  key={`${props.storyEditor.mode}:${props.storyEditor.scene.id || "new"}`}
                  onSubmit={props.saveStory}
                >
                  <div className="story-editor-heading">
                    <div>
                      <p className="eyebrow">
                        {props.storyEditor.mode === "create" ? "New opening" : "Edit opening"}
                      </p>
                      <h3>
                        {props.storyEditor.mode === "create"
                          ? `Create a story with ${props.selected.name}`
                          : `Edit ${props.storyEditor.scene.title}`}
                      </h3>
                    </div>
                    <button type="button" className="editor-close" onClick={() => props.setStoryEditor(null)}>
                      Close
                    </button>
                  </div>
                  <div className="story-editor-grid">
                    <label>
                      <span>Story title</span>
                      <input name="title" defaultValue={props.storyEditor.scene.title} required />
                    </label>
                    <label>
                      <span>Short setup</span>
                      <input name="subtitle" defaultValue={props.storyEditor.scene.subtitle} required />
                    </label>
                    <label>
                      <span>Character status</span>
                      <input name="status" defaultValue={props.storyEditor.scene.status} />
                    </label>
                    <label>
                      <span>Atmosphere</span>
                      <input name="weather" defaultValue={props.storyEditor.scene.weather} />
                    </label>
                    <label className="story-opening-field">
                      <span>Opening message</span>
                      <textarea
                        name="opening"
                        defaultValue={props.storyEditor.scene.opening}
                        rows={7}
                        required
                      />
                      <small>Use *asterisks* for actions, [brackets] for inner voice, and **double asterisks** for shouts.</small>
                    </label>
                  </div>
                  <div className="story-editor-footer">
                    <button type="button" className="outline-button" onClick={() => props.setStoryEditor(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="story-save-button">
                      {props.storyEditor.mode === "create" ? "Create story" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
              {props.commonSceneEditor && (
                <form className="story-editor" key={`common:${props.commonSceneEditor.scene.id || "new"}`} onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.target as HTMLFormElement;
                  const title = String(form.elements.namedItem("title")?.value || "").trim();
                  const subtitle = String(form.elements.namedItem("subtitle")?.value || "").trim();
                  const weather = String(form.elements.namedItem("weather")?.value || "").trim();
                  const opening = String(form.elements.namedItem("opening")?.value || "").trim();
                  if (!title || !opening) return;
                  const now = Date.now();
                  const scene: CommonScene = {
                    id: props.commonSceneEditor.scene.id || `common-${now}-${Math.random().toString(36).slice(2, 7)}`,
                    title,
                    subtitle,
                    weather,
                    opening,
                    createdAt: props.commonSceneEditor.scene.createdAt || now,
                    updatedAt: now,
                  };
                  props.setCommonScenes((current) => {
                    const next = current.map((item) => item.id === scene.id ? scene : item);
                    return props.commonSceneEditor.mode === "create" ? [...next, scene] : next;
                  });
                  props.setCommonSceneEditor(null);
                }}>
                  <div className="story-editor-heading">
                    <div>
                      <p className="eyebrow">
                        {props.commonSceneEditor.mode === "create" ? "New Common Scene" : "Edit Common Scene"}
                      </p>
                      <h3>
                        {props.commonSceneEditor.mode === "create"
                          ? "Create a reusable scene"
                          : `Edit ${props.commonSceneEditor.scene.title}`}
                      </h3>
                    </div>
                    <button type="button" className="editor-close" onClick={() => props.setCommonSceneEditor(null)}>
                      Close
                    </button>
                  </div>
                  <div className="story-editor-grid">
                    <label>
                      <span>Story title</span>
                      <input name="title" defaultValue={props.commonSceneEditor.scene.title} required />
                    </label>
                    <label>
                      <span>Short setup</span>
                      <input name="subtitle" defaultValue={props.commonSceneEditor.scene.subtitle} />
                    </label>
                    <label>
                      <span>Atmosphere / weather</span>
                      <input name="weather" defaultValue={props.commonSceneEditor.scene.weather} />
                    </label>
                    <label className="story-opening-field">
                      <span>Opening message</span>
                      <textarea name="opening" defaultValue={props.commonSceneEditor.scene.opening} rows={7} required />
                      <small>
                        Use <code>{'{{char}}'}</code> for the active character and <code>{'{{user}}'}</code> for the active persona/player.
                      </small>
                    </label>
                  </div>
                  <div className="story-editor-footer">
                    <button type="button" className="outline-button" onClick={() => props.setCommonSceneEditor(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="story-save-button">
                      {props.commonSceneEditor.mode === "create" ? "Create scene" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
              {!props.isLocationSession && (
                <div className="scene-preset-grid">
                  <article
                    className="scene-preset-card sandbox-preset-card"
                    style={{
                      "--theme-accent": props.selected.accent,
                      "--theme-glow": `${props.selected.accent}45`,
                    } as React.CSSProperties}
                  >
                    <div className="sandbox-grid" aria-hidden="true" />
                    <span className="scene-motif">UNWRITTEN</span>
                    <div className="scene-preset-copy">
                      <span>Context-free roleplay</span>
                      <h3>Open Sandbox</h3>
                      <p>Start with nothing but {props.selected.name}&apos;s core identity.</p>
                      <small>No preset setting, memories, or opening move. Your first message defines what happens.</small>
                      <div className="scene-preset-actions">
                        <button onClick={() => props.requestPersonaStart({ kind: "sandbox", characterId: props.selected.id })}>
                          Enter sandbox <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                  <article
                    className="scene-preset-card autopilot-preset-card"
                    style={{
                      "--theme-accent": props.selected.accent,
                      "--theme-glow": `${props.selected.accent}45`,
                    } as React.CSSProperties}
                  >
                    <div className="autopilot-grid" aria-hidden="true" />
                    <span className="scene-motif">LIVE</span>
                    <div className="scene-preset-copy">
                      <span>Self-driven roleplay</span>
                      <h3>Whisper Mode</h3>
                      <p>Nothing but {props.selected.name}&apos;s core identity — and they act on their own.</p>
                      <small>No preset opening. {props.selected.name} writes the first beat and keeps living while you step in whenever you like.</small>
                      <div className="scene-preset-actions">
                        <button onClick={() => props.requestPersonaStart({ kind: "autopilot", characterId: props.selected.id })}>
                          Enter Whisper Mode <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              )}
            </section>

            {/* STORIES */}
            <section className="scene-library-section">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">Stories</p>
                  <h2>Curated Scenes</h2>
                </div>
              </div>
              <div className="scene-preset-grid">
                {props.selectedScenes.map((scene) => (
                  <article
                    className="scene-preset-card"
                    key={scene.id}
                    style={{
                      "--preset-image": scene.background
                        ? `url("${scene.background}")`
                        : "linear-gradient(145deg, #211416, #09090b)",
                      "--preset-position": scene.backgroundFocalPoint,
                      "--theme-accent": scene.theme.accent,
                      "--theme-glow": scene.theme.glow,
                      "--scene-wash": scene.theme.wash,
                    } as React.CSSProperties}
                  >
                    <div className="scene-preset-wash" />
                    <span className="scene-motif">{scene.theme.motif}</span>
                    <div className="scene-preset-copy">
                      <span>{scene.status}</span>
                      <h3>{scene.title}</h3>
                      <p>{scene.subtitle}</p>
                      <small>{scene.weather}</small>
                      <div className="scene-preset-actions">
                        <button onClick={() => props.requestPersonaStart({ kind: "scene", characterId: props.selected.id, scene })}>
                          Begin this scene <span aria-hidden="true">→</span>
                        </button>
                        {scene.id.startsWith("custom-") && (
                          <button
                            className="scene-edit-button"
                            onClick={() => props.setStoryEditor({ mode: "edit", scene })}
                          >
                            Edit story
                          </button>
                        )}
                        {scene.id.startsWith("custom-") && (
                          <button
                            className="scene-delete-button"
                            onClick={() => props.deleteCustomScene(scene)}
                          >
                            Delete story
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {!props.isLocationSession && (
            <section className="scene-library-section common-scenes">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">Stories</p>
                  <h2>Common Scenes</h2>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => props.setCommonSceneEditor({ mode: "create", scene: {
                    id: `common-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    title: "",
                    subtitle: "",
                    weather: "",
                    opening: "",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  } })}
                >
                  New Common Scene
                </button>
              </div>
              <div className="scene-subsection">
                <h3>Examples</h3>
                {props.starterCommonScenes.length === 0 ? (
                  <p className="scene-library-empty">No example scenes available.</p>
                ) : (
                  <div className="scene-preset-grid">
                    {props.starterCommonScenes.map((scene) => (
                      <article className="scene-preset-card starter-scene-card" key={scene.id}>
                        <div className="scene-preset-copy">
                          <h3>{scene.title}</h3>
                          <p>{scene.subtitle}</p>
                          <small>{scene.weather}</small>
                          <small className="scene-source-label">Example</small>
                          <div className="scene-preset-actions">
                            <button onClick={() => props.startCommonScene(scene)}>
                              Begin this scene <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div className="scene-subsection">
                <h3>Your Common Scenes</h3>
                {props.commonScenes.length === 0 ? (
                  <p className="scene-library-empty">No personal Common Scenes yet. Create one to use with any character.</p>
                ) : (
                  <div className="scene-preset-grid">
                    {props.commonScenes.map((scene) => (
                      <article className="scene-preset-card" key={`personal-${scene.id}`}>
                        <div className="scene-preset-copy">
                          <h3>{scene.title || "Untitled scene"}</h3>
                          <p>{scene.subtitle}</p>
                          <small>{scene.weather}</small>
                          <div className="scene-preset-actions">
                            <button onClick={() => props.startCommonScene(scene)}>
                              Begin this scene <span aria-hidden="true">→</span>
                            </button>
                            <button className="scene-edit-button" onClick={() => props.setCommonSceneEditor({ mode: "edit", scene })}>
                              Edit
                            </button>
                            <button className="scene-delete-button" onClick={() => props.setCommonScenes((current) => current.filter((item) => item.id !== scene.id))}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {props.addonCommonScenes.length > 0 && (
                <div className="scene-subsection">
                  <h3>From Add-ons</h3>
                  <div className="scene-preset-grid">
                    {props.addonCommonScenes.map((scene) => (
                      <article className="scene-preset-card addon-scene-card" key={`addon-${scene.sourceAddonId}-${scene.id}`}>
                        <div className="scene-preset-copy">
                          <h3>{scene.title || "Untitled scene"}</h3>
                          <p>{scene.subtitle}</p>
                          <small>{scene.weather}</small>
                          <small className="addon-source">From: {scene.sourceAddonName}</small>
                          <div className="scene-preset-actions">
                            <button onClick={() => props.startCommonScene(scene)}>
                              Begin this scene <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
            )}

            {/* HISTORY */}
            <section className="scene-library-section existing-scenes">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">History</p>
                  <h2>Older Chats</h2>
                </div>
                <span>{props.selectedSessions.length} saved locally</span>
              </div>
              {props.selectedSessions.length > 0 ? (
                <div className="session-list">
                  {props.selectedSessions.map((session) => {
                    const scene = session.sandbox
                      ? props.sandboxSceneFor(props.selected)
                      : props.selectedScenes.find((candidate) => candidate.id === session.sceneId)
                        ?? props.selectedScenes[0];
                    const sessionMessages = props.messages[session.messageKey] ?? [];
                    const preview = sessionMessages.at(-1)?.text
                      .replace(/\*|\[|\]/g, "")
                      .replace(/\s+/g, " ")
                      .trim() || scene.subtitle;
                    return (
                      <div
                        className="session-card"
                        key={session.id}
                        style={{
                          "--session-accent": scene.theme.accent,
                          "--session-glow": scene.theme.glow,
                        } as React.CSSProperties}
                      >
                        <button className="session-resume" onClick={() => props.continueRoleplay(session)}>
                          <span className="session-mark">{scene.theme.motif.slice(0, 2)}</span>
                          <span className="session-copy">
                            <small>{scene.title}</small>
                            <strong>{session.title}</strong>
                            <span>{preview.slice(0, 150)}</span>
                          </span>
                          <span className="session-meta">
                            <small>{new Date(session.updatedAt).toLocaleDateString()}</small>
                            <i aria-hidden="true">→</i>
                          </span>
                        </button>
                        <button
                          className="session-delete"
                          onClick={() => props.deleteSession(session)}
                          aria-label={`Delete ${session.title}`}
                          title="Delete session"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-sessions">
                  <span aria-hidden="true">◇</span>
                  <p>No saved sessions with {props.selected.name} yet.</p>
                </div>
              )}
            </section>

          </div>
        </section>
      )}
    </>
  );
}
