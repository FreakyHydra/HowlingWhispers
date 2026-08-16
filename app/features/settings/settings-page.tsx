"use client";

import type React from "react";
import type { ArchiveUser } from "../../lib/archive/client";
import type { OllamaModelInfo } from "../../lib/ollama";
import { InfoTip } from "../../components/info-tip";

type TextStyle = {
  dialogue: string;
  action: string;
  narration: string;
  fontSize: number;
};

type ModelId = "xialong-v1" | "glm-4-6";
type StoryProvider = "novelai" | "local" | "device";
type ModelScanState = "idle" | "loading" | "ready" | "empty" | "error";
type OllamaModelOption = OllamaModelInfo & {
  value: string;
  label: string;
  description: string;
  adult: boolean;
};
type ReplyLength = "quick" | "immersive" | "novel";
type Initiative = "reactive" | "balanced" | "proactive";
type Viewpoint = "user" | "character" | "roving";
type StoryTense = "present" | "past";
type TokenStorageMode = "tab" | "computer";
type UpdateState = "idle" | "checking" | "current" | "available" | "unconfigured" | "error";
type ProviderState =
  | "disconnected"
  | "ready"
  | "testing"
  | "connected"
  | "error";

export interface SettingsPageProps {
  providerLabel: string;
  providerState: ProviderState;
  verifiedAt: string;
  configured: boolean;
  storyProvider: StoryProvider;
  connectionError: string;
  connectionFeedback: string;
  activeModel: OllamaModelOption;
  testProgress: {
    phase: "connecting" | "loading" | "generating";
    elapsedSec: number;
    tokens: number;
    maxTokens: number;
  } | null;
  selectedLocalModel: string;
  serverModelScan: ModelScanState;
  serverModels: OllamaModelOption[];
  deviceModels: OllamaModelOption[];
  deviceModelScan: ModelScanState;
  deviceModel: string;
  selectedModel: ModelId;
  novelAiModels: { value: ModelId; label: string; description: string; adult: boolean }[];
  apiToken: string;
  showToken: boolean;
  tokenStorageMode: TokenStorageMode;
  creativity: number;
  replyLengths: { value: ReplyLength; label: string; description: string }[];
  replyLength: ReplyLength;
  initiative: Initiative;
  viewpoint: Viewpoint;
  storyTense: StoryTense;
  savedAt: string;
  hasNovelAiToken: boolean;
  playerProfile: { name: string };
  textStyle: TextStyle;
  defaultTextStyle: TextStyle;
  archiveUser: ArchiveUser | null;
  localBackupMsg: string;
  localRestoreMsg: string;
  localBackupError: string;
  serverBackupBusy: boolean;
  serverBackupMsg: string;
  serverBackupsError: string;
  serverBackups:
    | {
        id: string;
        created_at: string;
        size_bytes: number;
        format: string;
        version: number;
        device: string;
        source: string;
      }[]
    | null;
  packageInfo: { version: string };
  updateState: UpdateState;
  updateMessage: string;
  releaseUrl: string;
  isDevelopmentDeployment: boolean;
  ollamaOriginSetting: string;
  saveSettings: (storageMode?: TokenStorageMode) => void;
  setStoryProvider: (provider: StoryProvider) => void;
  setProviderState: (state: ProviderState) => void;
  setVerifiedAt: (value: string) => void;
  setConnectionError: (value: string) => void;
  setConnectionFeedback: (value: string) => void;
  setServerModelScan: (state: ModelScanState) => void;
  setServerModelRefresh: (updater: (value: number) => number) => void;
  setDeviceModelScan: (state: ModelScanState) => void;
  setDeviceModelRefresh: (updater: (value: number) => number) => void;
  setServerModelError: (value: string) => void;
  setDeviceModelError: (value: string) => void;
  testConnection: () => void;
  formatTestElapsed: (totalSeconds: number) => string;
  setSelectedLocalModel: (value: string) => void;
  setDeviceModel: (value: string) => void;
  setSelectedModel: (value: ModelId) => void;
  setShowToken: (updater: (current: boolean) => boolean) => void;
  setApiToken: (value: string) => void;
  setTokenStorageMode: (mode: TokenStorageMode) => void;
  setCreativity: (value: number) => void;
  setReplyLength: (value: ReplyLength) => void;
  setInitiative: (value: Initiative) => void;
  setViewpoint: (value: Viewpoint) => void;
  setStoryTense: (value: StoryTense) => void;
  setSavedAt: (value: string) => void;
  setTextStyle: (updater: (style: TextStyle) => TextStyle) => void;
  updatePlayerProfile: (patch: { name?: string; persona?: string }) => void;
  handleSignOut: () => void;
  setView: (view: string) => void;
  exportAllPrivateData: () => void;
  handleLocalBackupImport: (file: File) => void;
  createServerBackupNow: () => void;
  archive: {
    logout: () => Promise<void>;
  };
  handleArchiveUserChange: (next: ArchiveUser | null) => void;
  formatBackupDate: (iso: string) => string;
  formatBackupSize: (bytes: number) => string;
  downloadServerBackup: (id: string) => void;
  restoreServerBackup: (id: string) => void;
  deleteServerBackup: (id: string) => void;
  checkForUpdates: () => void;
}

export function SettingsPage(props: SettingsPageProps) {
  const {
    providerLabel,
    providerState,
    verifiedAt,
    configured,
    storyProvider,
    connectionError,
    connectionFeedback,
    activeModel,
    testProgress,
    selectedLocalModel,
    serverModelScan,
    serverModels,
    deviceModels,
    deviceModelScan,
    deviceModel,
    selectedModel,
    novelAiModels,
    apiToken,
    showToken,
    tokenStorageMode,
    creativity,
    replyLengths,
    replyLength,
    initiative,
    viewpoint,
    storyTense,
    savedAt,
    hasNovelAiToken,
    playerProfile,
    textStyle,
    defaultTextStyle,
    archiveUser,
    localBackupMsg,
    localRestoreMsg,
    localBackupError,
    serverBackupBusy,
    serverBackupMsg,
    serverBackupsError,
    serverBackups,
    packageInfo,
    updateState,
    updateMessage,
    releaseUrl,
    isDevelopmentDeployment,
    ollamaOriginSetting,
    saveSettings,
    setStoryProvider,
    setProviderState,
    setVerifiedAt,
    setConnectionError,
    setConnectionFeedback,
    setServerModelScan,
    setServerModelRefresh,
    setDeviceModelScan,
    setDeviceModelRefresh,
    setServerModelError,
    setDeviceModelError,
    testConnection,
    formatTestElapsed,
    setSelectedLocalModel,
    setDeviceModel,
    setSelectedModel,
    setShowToken,
    setApiToken,
    setTokenStorageMode,
    setCreativity,
    setReplyLength,
    setInitiative,
    setViewpoint,
    setStoryTense,
    setSavedAt,
    setTextStyle,
    updatePlayerProfile,
    handleSignOut,
    setView,
    exportAllPrivateData,
    handleLocalBackupImport,
    createServerBackupNow,
    archive,
    handleArchiveUserChange,
    formatBackupDate,
    formatBackupSize,
    downloadServerBackup,
    restoreServerBackup,
    deleteServerBackup,
    checkForUpdates,
  } = props;

  return (
        <section className="settings-page">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Your account</p>
              <h1>Settings</h1>
              <p>
                Manage your story engine, verify the connection, and see exactly
                what The Howling Whispers remembers in this browser.
              </p>
            </div>
            <button className="outline-button" onClick={() => setView("home")}>
              ← Back to characters
            </button>
          </div>

          <div className="settings-grid">
            <section className="settings-panel engine-settings">
              <div className="settings-panel-title">
                <div>
                  <p className="eyebrow">Story engine</p>
                  <h2>{providerLabel} connection</h2>
                </div>
                <span className={`settings-status ${providerState}`}>
                  <i />
                  {providerState === "connected"
                    ? verifiedAt
                      ? `Verified ${verifiedAt}`
                      : "Verified working"
                    : providerState === "testing"
                      ? "Testing now"
                      : providerState === "error"
                        ? "Test failed"
                        : configured
                          ? storyProvider === "novelai" ? "Token entered" : "Ready to test"
                          : "Not configured"}
                </span>
              </div>

              <div className={`connection-feedback ${providerState}`} role="status">
                <span aria-hidden="true">
                  {providerState === "connected"
                    ? "✓"
                    : providerState === "testing"
                      ? "…"
                      : providerState === "error"
                        ? "!"
                        : configured
                          ? "◆"
                          : "○"}
                </span>
                <div>
                  <strong>
                    {providerState === "connected"
                      ? storyProvider === "novelai" ? "Your NovelAI token works" : "Your Ollama model is available"
                      : providerState === "testing"
                        ? storyProvider === "novelai" ? "Contacting NovelAI" : "Checking Ollama"
                        : providerState === "error"
                          ? "Connection could not be verified"
                          : configured
                            ? storyProvider === "novelai" ? "Token entered, not tested" : "Ollama model selected, not tested"
                            : storyProvider === "novelai" ? "No NovelAI token entered" : "No Ollama model entered"}
                  </strong>
                  <p>
                    {connectionError ||
                      connectionFeedback ||
                      (storyProvider === "local"
                        ? `Run the test to confirm Ollama and ${activeModel.label} are available on this server.`
                        : storyProvider === "device"
                          ? "Run Ollama on this computer, allow this website origin, then test the selected model."
                          : "Enter a token below, then run the test. A successful test means the selected model returned a real response.")}
                  </p>
                </div>
              </div>

              <form
                className="settings-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveSettings();
                }}
              >
                <fieldset className="reply-style-fieldset provider-choice-fieldset">
                  <legend>Generation provider</legend>
                  <div className="reply-style-options provider-choice-options">
                    <button
                      className={storyProvider === "novelai" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("novelai");
                        setProviderState(hasNovelAiToken ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("");
                      }}
                      aria-pressed={storyProvider === "novelai"}
                    >
                      <strong>NovelAI</strong>
                      <small>Cloud generation with Xialong or GLM 4.6</small>
                    </button>
                    <button
                      className={storyProvider === "local" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("local");
                        setServerModelScan("loading");
                        setServerModelError("");
                        setServerModelRefresh((value) => value + 1);
                        setProviderState("ready");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("Local generation stays on the website server. Run the test before chatting.");
                      }}
                      aria-pressed={storyProvider === "local"}
                    >
                      <strong>Local server</strong>
                      <small>Generation through server-local Ollama</small>
                    </button>
                    <button
                      className={storyProvider === "device" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("device");
                        setDeviceModelScan("loading");
                        setDeviceModelError("");
                        setDeviceModelRefresh((value) => value + 1);
                        setProviderState(deviceModel.trim() ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("Generation runs in Ollama on this computer, not on the website server.");
                      }}
                      aria-pressed={storyProvider === "device"}
                    >
                      <strong>This computer</strong>
                      <small>Use Ollama installed on the browser’s computer</small>
                    </button>
                  </div>
                </fieldset>

                <div className="settings-field-grid">
                  <div className="connection-target-setting">
                    <label>
                      Connection target
                      <input
                        value={storyProvider === "local"
                          ? "Ollama on this website server"
                          : storyProvider === "device"
                            ? "Ollama on this computer (127.0.0.1:11434)"
                            : "https://text.novelai.net/oa/v1"}
                        readOnly
                        aria-readonly="true"
                      />
                      <small>{storyProvider === "local"
                        ? "The app server contacts its own localhost; your browser does not connect to your computer."
                        : storyProvider === "device"
                          ? `Your browser contacts Ollama directly. Ollama must allow ${ollamaOriginSetting}.`
                          : "Fixed to NovelAI’s OpenAI-compatible text endpoint."}</small>
                    </label>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={testConnection}
                      disabled={providerState === "testing"}
                    >
                      {providerState === "testing"
                        ? storyProvider === "novelai" ? "Testing NovelAI…" : "Checking Ollama…"
                        : "Test connection"}
                    </button>
                    {storyProvider === "local" && testProgress && (
                      <div
                        className="test-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={testProgress.maxTokens}
                        aria-valuenow={testProgress.phase === "generating"
                          ? testProgress.tokens
                          : undefined}
                        aria-label="Connection test progress"
                      >
                        <div className="test-progress-label">
                          <span>
                            {testProgress.phase === "connecting"
                              ? "Contacting the server…"
                              : testProgress.phase === "loading"
                                ? "Loading the model on the server…"
                                : `Generating ${testProgress.tokens}/${testProgress.maxTokens} tokens…`}
                          </span>
                          <span className="test-progress-elapsed">
                            {formatTestElapsed(testProgress.elapsedSec)}
                          </span>
                        </div>
                        <div className="test-progress-track">
                          <div
                            className={testProgress.phase === "generating"
                              ? "test-progress-fill"
                              : "test-progress-fill indeterminate"}
                            style={testProgress.phase === "generating"
                              ? { width: `${Math.min(100, (testProgress.tokens / testProgress.maxTokens) * 100)}%` }
                              : undefined}
                          />
                        </div>
                        {testProgress.phase === "loading" && (
                          <small>
                            The first test loads the model and can take a few minutes; the model
                            stays loaded afterward, so later tests are fast.
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                  <label>
                    Model
                    {storyProvider === "local" ? (
                      <select
                        value={selectedLocalModel}
                        disabled={serverModelScan !== "ready"}
                        onChange={(event) => {
                          setSelectedLocalModel(event.target.value);
                          setProviderState("ready");
                          setVerifiedAt("");
                          setConnectionError("");
                          setConnectionFeedback("Local model changed. Test the connection again.");
                        }}
                      >
                        {serverModelScan !== "ready" && (
                          <option value={selectedLocalModel}>
                            {serverModelScan === "loading" ? "Scanning server models…" : "No server models available"}
                          </option>
                        )}
                        {serverModels.map((model) => (
                          <option value={model.value} key={model.value}>
                            {model.adult ? `${model.label} · Adult` : model.label}
                          </option>
                        ))}
                      </select>
                    ) : storyProvider === "device" ? (
                      deviceModelScan === "ready" ? (
                        <select
                          value={deviceModel}
                          onChange={(event) => {
                            setDeviceModel(event.target.value);
                            setProviderState("ready");
                            setVerifiedAt("");
                            setConnectionError("");
                            setConnectionFeedback("Model changed. Test this computer's Ollama connection again.");
                          }}
                        >
                          {deviceModels.map((model) => (
                            <option value={model.value} key={model.value}>{model.label}</option>
                          ))}
                        </select>
                      ) : deviceModelScan === "error" || deviceModelScan === "empty" ? (
                        <input
                          value={deviceModel}
                          onChange={(event) => {
                            setDeviceModel(event.target.value);
                            setProviderState(event.target.value.trim() ? "ready" : "disconnected");
                            setVerifiedAt("");
                            setConnectionError("");
                            setConnectionFeedback("Model changed. Test this computer's Ollama connection again.");
                          }}
                          placeholder="mistral-nemo:12b"
                          spellCheck={false}
                        />
                      ) : (
                        <select disabled><option>Scanning this computer…</option></select>
                      )
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(event) => {
                          setSelectedModel(event.target.value as ModelId);
                          setProviderState(apiToken.trim() ? "ready" : "disconnected");
                          setVerifiedAt("");
                          setConnectionError("");
                          setConnectionFeedback(
                            apiToken.trim()
                              ? "Model changed. Test the connection again."
                              : "",
                          );
                        }}
                      >
                        {novelAiModels.map((model) => (
                          <option value={model.value} key={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <small>{activeModel.description}</small>
                  </label>
                </div>

                {storyProvider === "local" && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setServerModelScan("loading");
                      setServerModelError("");
                      setServerModelRefresh((value) => value + 1);
                    }}
                    disabled={serverModelScan === "loading"}
                  >
                    {serverModelScan === "loading" ? "Scanning server models…" : "Refresh server models"}
                  </button>
                )}
                {storyProvider === "device" && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setDeviceModelScan("loading");
                      setDeviceModelError("");
                      setDeviceModelRefresh((value) => value + 1);
                    }}
                    disabled={deviceModelScan === "loading"}
                  >
                    {deviceModelScan === "loading" ? "Scanning this computer…" : "Refresh this computer's models"}
                  </button>
                )}

                {storyProvider === "novelai" && <label>
                  NovelAI access token
                  <div className="token-input">
                    <input
                      type={showToken ? "text" : "password"}
                      value={apiToken}
                      onChange={(event) => {
                        const value = event.target.value;
                        setApiToken(value);
                        setProviderState(value.trim() ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback(
                          value.trim()
                            ? "Token entered. Run the test to verify it."
                            : "",
                        );
                      }}
                      placeholder="Paste your NovelAI token"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="button" onClick={() => setShowToken((current) => !current)}>
                      {showToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <small>
                    Currently saved for {tokenStorageMode === "computer"
                      ? "this computer's browser profile"
                      : "this browser tab"}. The Howling Whispers never writes it to
                    the site database or logs.
                  </small>
                </label>}

                <label>
                  Creativity
                  <div className="creativity-row">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={creativity}
                      onChange={(event) => setCreativity(Number(event.target.value))}
                    />
                    <strong>{creativity}/10</strong>
                  </div>
                </label>

                <fieldset className="reply-style-fieldset">
                  <legend>Reply length</legend>
                  <div className="reply-style-options">
                    {replyLengths.map((length) => (
                      <button
                        className={replyLength === length.value ? "active" : ""}
                        type="button"
                        key={length.value}
                        onClick={() => setReplyLength(length.value)}
                        aria-pressed={replyLength === length.value}
                      >
                        <strong>{length.label}</strong>
                        <small>{length.description}</small>
                      </button>
                    ))}
                  </div>
                  <p>
                    Immersive is the recommended roleplay setting. Novel-like
                    uses more generation tokens and may take a little longer.
                  </p>
                </fieldset>

                <fieldset className="story-control-fieldset">
                  <legend>Roleplay direction</legend>
                  <p>
                    Adapted for both story engines from the Living World preset principles.
                    These settings apply to new replies and rerolls.
                  </p>
                  <div className="settings-field-grid">
                    <label>
                      <span className="setting-name-row">
                        World initiative
                        <InfoTip label="World initiative">
                          <p className="help-popover__intro">
                            How readily characters and events move the story forward.
                          </p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Reactive</strong>
                              <p className="help-popover__option-description">
                                The world mostly waits for your actions before events advance.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Balanced</strong>
                              <p className="help-popover__option-description">
                                You and the world share control of the story&apos;s momentum.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Proactive</strong>
                              <p className="help-popover__option-description">
                                Characters pursue their own goals, and events may progress even
                                when you remain quiet.
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
                      <select
                        value={initiative}
                        onChange={(event) => setInitiative(event.target.value as Initiative)}
                      >
                        <option value="reactive">Reactive</option>
                        <option value="balanced">Balanced</option>
                        <option value="proactive">Proactive</option>
                      </select>
                      <small>How readily characters and events move the story forward.</small>
                    </label>
                    <label>
                      <span className="setting-name-row">
                        Viewpoint
                        <InfoTip label="Viewpoint">
                          <p className="help-popover__intro">
                            Whose observable experience frames the narration.
                          </p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Player limited</strong>
                              <p className="help-popover__option-description">
                                The story stays centered on you and what your character can perceive.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Character limited</strong>
                              <p className="help-popover__option-description">
                                The story follows the other character and what they can perceive.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Roving limited</strong>
                              <p className="help-popover__option-description">
                                The narration may move between characters and scenes.
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
                      <select
                        value={viewpoint}
                        onChange={(event) => setViewpoint(event.target.value as Viewpoint)}
                      >
                        <option value="user">Player limited</option>
                        <option value="character">Character limited</option>
                        <option value="roving">Roving limited</option>
                      </select>
                      <small>Controls whose observable experience frames narration.</small>
                    </label>
                    <label>
                      <span className="setting-name-row">
                        Tense
                        <InfoTip label="Tense">
                          <p className="help-popover__intro">Sets the requested narrative tense.</p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Present</strong>
                              <p className="help-popover__option-description">
                                The narration unfolds as events happen: &ldquo;She opens the door.&rdquo;
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Past</strong>
                              <p className="help-popover__option-description">
                                The narration recounts events: &ldquo;She opened the door.&rdquo;
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
                      <select
                        value={storyTense}
                        onChange={(event) => setStoryTense(event.target.value as StoryTense)}
                      >
                        <option value="present">Present</option>
                        <option value="past">Past</option>
                      </select>
                      <small>Sets the requested narrative tense.</small>
                    </label>
                  </div>
                </fieldset>


                <div className="settings-actions">
                  {storyProvider === "novelai" && <button
                    className="outline-button"
                    type="button"
                    onClick={() => saveSettings("tab")}
                  >
                    Save for this tab
                  </button>}
                  {storyProvider === "novelai" && <button
                    className="outline-button"
                    type="button"
                    onClick={() => saveSettings("computer")}
                  >
                    Save for this computer
                  </button>}
                  {storyProvider === "novelai" && savedAt && <span>Saved at {savedAt}</span>}
                  {storyProvider === "novelai" && hasNovelAiToken && (
                    <button
                      className="text-button disconnect-button"
                      type="button"
                      onClick={() => {
                        setApiToken("");
                        localStorage.removeItem("dreambound_naiToken");
                        sessionStorage.removeItem("dreambound_naiToken");
                        setTokenStorageMode("tab");
                        setProviderState("disconnected");
                        setConnectionError("");
                        setConnectionFeedback("");
                        setSavedAt("");
                        setVerifiedAt("");
                      }}
                    >
                      Remove token
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="settings-panel account-settings">
              <p className="eyebrow">Your player</p>
              <div className="settings-avatar" aria-hidden="true">
                {playerProfile.name.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <h2>{playerProfile.name.trim() || "Local player"}</h2>
              <label>
                Player name
                <input
                  value={playerProfile.name}
                  onChange={(event) => updatePlayerProfile({ name: event.target.value })}
                  placeholder="Leave blank to stay unnamed in the story"
                  maxLength={100}
                />
              </label>
              <p>
                This is your local display name. For story identities, create personas
                in the library — each story can play as its own persona.
              </p>
              <p>Everything is saved in this browser. Nothing is uploaded.</p>
              <span className="chatgpt-badge">✓ Private local story space</span>
              <button className="outline-button settings-signout" onClick={handleSignOut}>
                Return to entrance
              </button>
            </section>


            <section className="settings-panel style-settings">
              <p className="eyebrow">Appearance</p>
              <h2>Text colors</h2>
              <p>Customize how dialogue, actions, and narration appear in the chat.</p>
              <div className="style-grid">
                <label className="font-size-setting">
                  <span>Chat font size</span>
                  <input
                    type="range"
                    min="15"
                    max="26"
                    step="1"
                    value={textStyle.fontSize}
                    onChange={(event) => setTextStyle((style) => ({
                      ...style,
                      fontSize: Number(event.target.value),
                    }))}
                  />
                  <output>{textStyle.fontSize}px</output>
                </label>
                <label>
                  Dialogue
                  <input type="color" value={textStyle.dialogue} onChange={(e) => setTextStyle(s => ({ ...s, dialogue: e.target.value }))} />
                </label>
                <label>
                  Action <small>*text*</small>
                  <input type="color" value={textStyle.action} onChange={(e) => setTextStyle(s => ({ ...s, action: e.target.value }))} />
                </label>
                <label>
                  Narration <small>[text]</small>
                  <input type="color" value={textStyle.narration} onChange={(e) => setTextStyle(s => ({ ...s, narration: e.target.value }))} />
                </label>
              </div>
              <button className="text-button" onClick={() => setTextStyle(defaultTextStyle)}>
                Reset to defaults
              </button>
            </section>

            <section className="settings-panel privacy-settings">
              <p className="eyebrow">Privacy</p>
              <h2>What is remembered?</h2>
              <ul>
                <li>
                  <span>Story engine</span>
                  <strong>{storyProvider === "novelai"
                    ? "NovelAI"
                    : storyProvider === "local" ? "Local server" : "This computer"}</strong>
                </li>
                <li>
                  <span>NovelAI token</span>
                  <strong>{hasNovelAiToken
                    ? tokenStorageMode === "computer" ? "This computer" : "Current tab"
                    : "Not stored"}</strong>
                </li>
                  <li>
                    <span>Selected model</span>
                    <strong>This browser</strong>
                  </li>
                  <li>
                    <span>Conversations</span>
                    <strong>This browser</strong>
                  </li>
              </ul>
              <p>
                Characters, scenes, and conversations survive reloads in this
                browser. Tab-only NovelAI tokens clear when the tab closes. Local model
                prompts are processed by the selected server-local or computer-local Ollama.
              </p>
            </section>

            <section className="settings-panel backup-settings">
              <p className="eyebrow">Your data</p>
              <h2>Backup &amp; restore</h2>
              <p>
                Your stories live in this browser. Download a portable backup anytime as a
                single <code>.hwb</code> file, and restore it here on this computer or on a
                new one. If you&apos;re signed into your account, backups can also be saved on
                the server so a new device can pull them back in.
              </p>

              <div className="backup-local-actions">
                <button
                  className="primary-button"
                  onClick={() => void exportAllPrivateData()}
                  disabled={serverBackupBusy}
                >
                  Export all private data
                </button>
                <label className="outline-button import-browse">
                  Restore from backup
                  <input
                    type="file"
                    accept=".hwb,application/json,.json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleLocalBackupImport(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {localBackupMsg && <span className="backup-feedback ok">{localBackupMsg}</span>}
              {localRestoreMsg && <span className="backup-feedback ok">{localRestoreMsg}</span>}
              {localBackupError && <span className="backup-feedback err">{localBackupError}</span>}
              <p className="backup-help">
                &ldquo;Export all private data&rdquo; always downloads a local file. If your
                server backup cannot be saved, the local download still happens.
              </p>

              <h3 className="backup-server-heading">Saved to your account</h3>
              {!archiveUser ? (
                <p className="backup-help">
                  Server backups need a signed-in account.{" "}
                  <button
                    className="text-button"
                    onClick={() => setView("archive")}
                  >
                    Sign in or create an account
                  </button>{" "}
                  to keep rolling snapshots on the server.
                </p>
              ) : (
                <div className="backup-server">
                  <div className="backup-server-tools">
                    <span className="backup-server-account">
                      {archiveUser.username}
                    </span>
                    <button
                      className="outline-button"
                      onClick={createServerBackupNow}
                      disabled={serverBackupBusy}
                    >
                      {serverBackupBusy ? "Saving…" : "Create backup now"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        archive.logout().catch(() => undefined);
                        handleArchiveUserChange(null);
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                  {serverBackupMsg && <span className="backup-feedback ok">{serverBackupMsg}</span>}
                  {serverBackupsError && <span className="backup-feedback err">{serverBackupsError}</span>}
                  {serverBackups !== null && serverBackups.length === 0 && (
                    <p className="backup-help">
                      No server backups yet. Your newest backup plus several older
                      snapshots are kept automatically.
                    </p>
                  )}
                  {serverBackups !== null && serverBackups.length > 0 && (
                    <ul className="backup-server-list">
                      {serverBackups.map((snapshot) => (
                        <li key={snapshot.id} className="backup-server-item">
                          <div className="backup-server-main">
                            <strong>
                              {formatBackupDate(snapshot.created_at)}
                            </strong>
                            <span className="backup-server-meta">
                              {formatBackupSize(snapshot.size_bytes)}
                              {snapshot.device ? ` · ${snapshot.device}` : ""}
                              {snapshot.source ? ` · ${snapshot.source}` : ""}
                              {snapshot.format && snapshot.version
                                ? ` · format v${snapshot.version}`
                                : ""}
                            </span>
                          </div>
                          <div className="backup-server-actions">
                            <button
                              className="link-button"
                              onClick={() => void downloadServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Download
                            </button>
                            <button
                              className="link-button"
                              onClick={() => void restoreServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Restore
                            </button>
                            <button
                              className="link-button archive-danger"
                              onClick={() => void deleteServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="backup-help">
                    Server backups are private to your account and only ever include your
                    own content — never the curated Howling Whispers character packages,
                    and never passwords, keys, or other credentials.
                  </p>
                </div>
              )}
            </section>

            <section className="settings-panel update-settings">
              <p className="eyebrow">Release channel</p>
              <h2>Application updates</h2>
              <div className="version-row">
                <span>Application version</span>
                <strong>v{packageInfo.version}</strong>
              </div>
              <p className={`update-message ${updateState}`}>{updateMessage}</p>
              <div className="update-actions">
                <button
                  className="outline-button"
                  onClick={checkForUpdates}
                  disabled={updateState === "checking"}
                >
                  {updateState === "checking" ? "Checking..." : "Check for updates"}
                </button>
                {releaseUrl && (
                  <a href={releaseUrl} target="_blank" rel="noreferrer">View release</a>
                )}
              </div>
              <small>
                 Hosted installations are updated by their server administrator.
                 Stories and preferences remain in this browser profile.
              </small>
            </section>

            {isDevelopmentDeployment && (
              <section className="settings-panel update-settings">
                <p className="eyebrow">Development environment</p>
                <h2>Promote a verified release</h2>
                <p>
                  Production deploys only the latest commit already merged into the central
                  <code> main </code>branch. Development files are never copied directly.
                </p>
                <div className="update-actions">
                  <a className="primary-button" href="/__deploy/">Open deployment panel</a>
                  <a
                    className="outline-button"
                    href="https://github.com/FreakyHydra/HowlingWhispers/compare/main...dev?expand=1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Review dev → main
                  </a>
                </div>
              </section>
            )}
          </div>
        </section>
  );
}
