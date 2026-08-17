"use client";

import React from "react";
import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Character, Message, SceneDefinition, StorySession } from "../app/dreambound-app";
import type { LivingCastEntry, PlayerPersona } from "../../lib/generation/living-cast";
import type { LivingCastConfig } from "../../lib/living-cast/config.ts";
import { createCast, detectPendingInteraction } from "../../lib/generation/living-cast";
import { relationshipMeterPercent } from "../../lib/relationships/index.ts";
import { ContextWorkspace } from "../context/context-workspace.tsx";
import type { ContextLibrary } from "../../lib/context/types.ts";

export interface ChatWorkspaceProps {
  showCharacterRail: boolean;
  showContextRail: boolean;
  themeVariables: React.CSSProperties;
  characters: Character[];
  selected: Character;
  portraitUrl: (character: Character) => string;
  openSceneLibrary: (characterId: string) => void;
  Portrait: React.ComponentType<{ character: Character; accent?: string; image?: string }>;
  activeScene: SceneDefinition;
  activeSession: StorySession | null;
  storyBackgroundBlur: number;
  setShowCharacterRail: (visible: boolean) => void;
  setShowContextRail: (visible: boolean) => void;
  toggleAutopilot: () => void;
  setStoryBackgroundBlur: (value: number) => void;
  setShowPersonaModal: (visible: boolean) => void;
  sessionPersonaName: string | null;
  sessionUsesDefaultPersona: boolean;
  setShowShare: (visible: boolean) => void;
  activeMessages: Message[];
  shareCount: number;
  setShareCount: (value: number) => void;
  shareCaptions: boolean;
  setShareCaptions: (value: boolean) => void;
  shareHeader: boolean;
  setShareHeader: (value: boolean) => void;
  shareBusy: boolean;
  setShareBusy: (value: boolean) => void;
  shareFeedback: string;
  setShareFeedback: (value: string) => void;
  shareError: string;
  setShareError: (value: string) => void;
  copyChatImage: () => void;
  downloadChatImageFromButton: () => void;
  isReplying: boolean;
  chatError: string;
  configured: boolean;
  setView: (view: "home" | "scenes" | "chat" | "changelog" | "settings" | "archive" | "personas" | "living-cast") => void;
  setChatError: (error: string) => void;
  autopilotControlsCollapsed: boolean;
  setAutopilotControlsCollapsed: (collapsed: boolean) => void;
  autopilotBusy: boolean;
  toggleAutopilotPause: () => void;
  requestNextAutopilotBeat: () => void;
  stopAutopilot: () => void;
  draft: string;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  mode: string;
  setMode: (value: string) => void;
  impersonatePlayer: () => void;
  skipTurn: () => void;
  stopGeneration: () => void;
  isImpersonating: boolean;
  activePlayerName: string;
  activeContextManifest: {
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
  } | undefined;
  livingCastEnabled: boolean;
  livingCastConfig: LivingCastConfig;
  panelOrder: string[];
  panelVisibility: Record<string, boolean>;
  onPanelOrderChange: (order: string[]) => void;
  onPanelVisibilityChange: (visibility: Record<string, boolean>) => void;
  onInviteCharacter: () => void;
  onRemoveCharacter: (characterId: string) => void;
  onConfigureLivingCast: () => void;
  connected: boolean;
  providerState: "disconnected" | "ready" | "testing" | "connected" | "error";
  providerLabel: string;
  storyProvider: "novelai" | "local" | "device";
  activeModel: { label: string };
  activeReplyLength: { label: string };
  deriveRelationshipLabel: (relationshipScore: number) => string;
  relationshipScore: number;
  relationshipDelta: number | null;
  relationshipContextEnabled: boolean;
  setRelationshipContextEnabled: (value: boolean) => void;
  relationshipNote: string;
  setRelationshipNote: (value: string) => void;
  autopilotError: string;
  textStyle: { dialogue: string; action: string; narration: string; fontSize: number };
  editingId: number | null;
  editDraft: string;
  setEditDraft: (value: string) => void;
  saveEditMessage: (id: number) => void;
  cancelEditMessage: () => void;
  messageVersions: (message: Message) => { versions: string[]; activeIndex: number };
  activeMessageKey: string;
  seenMessageIds: Set<string>;
  setMessageActivePage: (id: number, index: number) => void;
  copyFeedbackId: number | null;
  setCopyFeedbackId: (id: number | null) => void;
  startEditMessage: (id: number, text: string) => void;
  setPendingDeleteMessage: (message: Message | null) => void;
  directionEditor: { id: number; text: string } | null;
  setDirectionEditor: (value: { id: number; text: string } | null) => void;
  rerollMessage: (message: Message) => void;
  clearMessageDirection: (id: number) => void;
  rerunImpersonation: (id: number, directionText: string) => void;
  activeTheme: { accent: string; motif: string };
  pendingDeleteMessage: Message | null;
  deleteMessage: (action: "single" | "following") => void;
  showAutopilotStart: boolean;
  setShowAutopilotStart: (visible: boolean) => void;
  autopilotPov: "first" | "third" | "narrator";
  setAutopilotPov: (pov: "first" | "third" | "narrator") => void;
  autopilotSeed: string;
  setAutopilotSeed: (seed: string) => void;
  beginAutopilot: () => void;
  showPersonaModal: boolean;
  personas: PlayerPersona[];
  applySessionPersona: (persona: PlayerPersona) => void;
  sessionPersonaSnapshot: string;
  updateActiveSessionPersona: (patch: Partial<{ playerName: string; playerPersona: string }>) => void;
  playerProfile: { name: string; persona: string };
  clearActiveSessionPersona: () => void;
  contextLibrary: ContextLibrary;
  setContextLibrary: (value: ContextLibrary) => void;
  createContextEntry: (kind: "memory" | "author-note") => void;
  updateContextEntry: (kind: "memory" | "author-note", id: string, patch: Record<string, unknown>) => void;
  deleteContextEntry: (kind: "memory" | "author-note", id: string) => void;
  addLorebook: (record: import("../../lib/context/types.ts").LorebookRecord) => void;
  removeLorebook: (id: string) => void;
  updateLorebook: (id: string, patch: Record<string, unknown>) => void;
  importContextFile: (file: File, kind: "memory" | "author-note" | "lorebook") => void;
  showContextWorkspace: boolean;
  setShowContextWorkspace: (visible: boolean) => void;
}

export function ChatWorkspace(props: ChatWorkspaceProps) {
  const {
    showCharacterRail,
    showContextRail,
    themeVariables,
    characters,
    selected,
    portraitUrl,
    openSceneLibrary,
    Portrait,
    activeScene,
    activeSession,
    storyBackgroundBlur,
    setShowCharacterRail,
    setShowContextRail,
    toggleAutopilot,
    setStoryBackgroundBlur,
    setShowPersonaModal,
    sessionPersonaName,
    sessionUsesDefaultPersona,
    setShowShare,
    activeMessages,
    isReplying,
    chatError,
    configured,
    setView,
    setChatError,
    autopilotControlsCollapsed,
    setAutopilotControlsCollapsed,
    autopilotBusy,
    toggleAutopilotPause,
    requestNextAutopilotBeat,
    stopAutopilot,
    draft,
    setDraft,
    sendMessage,
    mode,
    setMode,
    impersonatePlayer,
    skipTurn,
    stopGeneration,
    isImpersonating,
    activePlayerName,
    activeContextManifest,
    connected,
    providerState,
    providerLabel,
    storyProvider,
    activeModel,
    activeReplyLength,
    deriveRelationshipLabel,
    relationshipScore,
    relationshipDelta,
    relationshipContextEnabled,
    setRelationshipContextEnabled,
    relationshipNote,
    setRelationshipNote,
    autopilotError,
    textStyle,
    editingId,
    editDraft,
    setEditDraft,
    saveEditMessage,
    cancelEditMessage,
    messageVersions,
    activeMessageKey,
    seenMessageIds,
    setMessageActivePage,
    copyFeedbackId,
    setCopyFeedbackId,
    startEditMessage,
    setPendingDeleteMessage,
    directionEditor,
    setDirectionEditor,
    rerollMessage,
    clearMessageDirection,
    rerunImpersonation,
    activeTheme,
    pendingDeleteMessage,
    deleteMessage,
    showAutopilotStart,
    setShowAutopilotStart,
    autopilotPov,
    setAutopilotPov,
    autopilotSeed,
    setAutopilotSeed,
    beginAutopilot,
    livingCastEnabled,
    livingCastConfig,
    panelOrder,
    panelVisibility,
    onPanelOrderChange,
    onPanelVisibilityChange,
    onInviteCharacter,
    onRemoveCharacter,
    onConfigureLivingCast,
    contextLibrary,
    setContextLibrary,
    createContextEntry,
    updateContextEntry,
    deleteContextEntry,
    addLorebook,
    removeLorebook,
    updateLorebook,
    importContextFile,
    showContextWorkspace,
    setShowContextWorkspace,
  } = props;

  const [showPanelControls, setShowPanelControls] = useState(false);
  const [showRsSettings, setShowRsSettings] = useState(false);
  const [rsPos, setRsPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rsCogRef = useRef<HTMLButtonElement>(null);
  const rsPopRef = useRef<HTMLDivElement>(null);

  const placeRsPopover = useCallback(() => {
    const trigger = rsCogRef.current;
    const pop = rsPopRef.current;
    if (!trigger || !pop) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 8;
    pop.style.width = "auto";
    pop.style.maxWidth = "none";
    const naturalWidth = pop.offsetWidth;
    const width = Math.min(naturalWidth, viewportWidth - margin * 2);
    pop.style.width = `${width}px`;
    const height = pop.offsetHeight;

    let left: number;
    if (rect.right + gap + width <= viewportWidth - margin) {
      left = rect.right + gap;
    } else {
      left = rect.left - gap - width;
      if (left < margin) left = margin;
    }

    let top = rect.top;
    if (top + height > viewportHeight - margin) {
      top = viewportHeight - margin - height;
    }
    if (top < margin) top = margin;

    setRsPos({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!showRsSettings) return;
    placeRsPopover();
    const reposition = () => placeRsPopover();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [showRsSettings, placeRsPopover]);

  useEffect(() => {
    if (!showRsSettings) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rsCogRef.current?.contains(target)) return;
      if (rsPopRef.current?.contains(target)) return;
      setShowRsSettings(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showRsSettings]);

  const PANEL_LABELS: Record<string, string> = {
    scene: "Scene",
    connection: "Connection",
    memory: "Memory",
    "context-inspector": "Context Inspector",
    "living-cast": "Living Cast",
    context: "Context",
  };

  function renderText(text: string, forceAction = false) {
    if (forceAction) {
      return <span style={{ color: textStyle.action, fontStyle: "italic" }}>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    const regex = /(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex} style={{ color: textStyle.dialogue }}>{text.slice(lastIndex, match.index)}</span>);
      }
      const inner = match[0];
      if (inner.startsWith("**")) {
        parts.push(<span key={match.index} style={{ color: textStyle.dialogue, fontWeight: 700 }}>{inner.slice(2, -2)}</span>);
      } else if (inner.startsWith("*")) {
        parts.push(<span key={match.index} style={{ color: textStyle.action, fontStyle: "italic" }}>{inner.slice(1, -1)}</span>);
      } else {
        parts.push(<span key={match.index} style={{ color: textStyle.narration }}>{inner.slice(1, -1)}</span>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex} style={{ color: textStyle.dialogue }}>{text.slice(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : <span style={{ color: textStyle.dialogue }}>{text}</span>;
  }

  function renderMessageText(text: string, sender: Message["sender"], speakerName?: string) {
    const formattedText = text
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const paragraphs = formattedText
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <div className="message-copy-text">
        {(paragraphs.length > 0 ? paragraphs : [formattedText]).map((paragraph, index) => {
          const isSpeakerLabel = /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2}(?:\s*\(as\))?:$/.test(paragraph);
          const escapedName = (speakerName ?? selected.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const isUnmarkedAction = sender === "character"
            && !paragraph.startsWith("*")
            && new RegExp(`^(?:${escapedName}|she|he|they)\\b`, "i").test(paragraph);
          return (
            <p
              className={isSpeakerLabel ? "speaker-label" : undefined}
              key={`${index}:${paragraph.slice(0, 24)}`}
            >
              {renderText(paragraph, isUnmarkedAction)}
            </p>
          );
        })}
      </div>
    );
  }

  function renderMessageBubble(
    message: Message,
    isLastCharacter: boolean,
    options: { live: boolean; showCaption: boolean },
  ) {
    const isEditing = options.live && editingId === message.id;
    const caption =
      options.showCaption && message.sender !== "narrator"
        ? message.sender === "character"
          ? message.speaker ?? selected.name
          : activePlayerName || "You"
        : "";
    const { versions: pageVersions, activeIndex: activePage } = messageVersions(message);
    const showPageControl =
      message.sender === "character" && isLastCharacter && pageVersions.length > 1;
    return (
      <article
        className={`message ${message.sender}${options.live && editingId === message.id ? " editing" : ""}${options.live && !seenMessageIds.has(`${activeMessageKey}:${message.id}`) ? " message-new" : ""}`}
        key={message.id}
      >
        {message.sender === "character" && !message.speaker && <Portrait character={selected} accent={activeTheme.accent} image={portraitUrl(selected)} />}
        <div className="message-body">
          {caption && <span className="message-name">{caption}</span>}
          {isEditing ? (
            <div className="message-edit">
              <textarea
                className="message-edit-textarea"
                value={editDraft}
                onChange={(event) => {
                  setEditDraft(event.target.value);
                  const el = event.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    saveEditMessage(message.id);
                  }
                  if (event.key === "Escape") cancelEditMessage();
                }}
                autoFocus
                rows={3}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
              />
              <div className="message-edit-actions">
                <button onClick={() => saveEditMessage(message.id)}>Save</button>
                <button onClick={cancelEditMessage}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {renderMessageText(message.text, message.sender, message.sender === "character" ? message.speaker : undefined)}
              {options.live && (
                <div className="message-controls-bar">
                  <div className="message-controls-left">
                    {showPageControl && (
                      <div className="page-control">
                        <button
                          onClick={() => setMessageActivePage(message.id, activePage - 1)}
                          aria-label="Previous version"
                          title="Previous version"
                          disabled={isReplying || activePage === 0}
                        >
                          ‹
                        </button>
                        <span className="page-badge" aria-label={`Version ${activePage + 1} of ${pageVersions.length}`}>
                          &lt;{activePage + 1}/{pageVersions.length}&gt;
                        </span>
                        <button
                          onClick={() => setMessageActivePage(message.id, activePage + 1)}
                          aria-label="Next version"
                          title="Next version"
                          disabled={isReplying || activePage === pageVersions.length - 1}
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="message-actions">
                    <button
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(message.text);
                          setCopyFeedbackId(message.id);
                          setTimeout(() => setCopyFeedbackId(null), 1500);
                        }
                      }}
                      aria-label="Copy message text"
                      title={copyFeedbackId === message.id ? "Copied!" : "Copy text"}
                    >
                      {copyFeedbackId === message.id ? "✓" : "📋"}
                    </button>
                    <button
                      onClick={() => startEditMessage(message.id, message.text)}
                      aria-label="Edit message"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setPendingDeleteMessage(message)}
                      aria-label="Delete message"
                      title="Delete"
                    >
                      ✕
                    </button>
                    {message.direction && (
                      <button
                        onClick={() => setDirectionEditor({ id: message.id, text: message.direction ?? "" })}
                        aria-label="View or edit impersonation direction"
                        title="Impersonation direction"
                      >
                        ◉
                      </button>
                    )}
                    {isLastCharacter && (
                      <button
                        onClick={() => rerollMessage(message)}
                        aria-label="Re-roll reply"
                        title="Re-roll reply"
                        disabled={isReplying}
                      >
                        ↻
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </article>
    );
  }

  return (
    <section
      className={`workspace${showCharacterRail ? "" : " hide-character-rail"}${showContextRail ? "" : " hide-context-rail"}`}
      style={themeVariables}
    >
      {showCharacterRail && <aside className="character-rail" aria-label="Characters">
        <div className="rail-heading">
          <p className="eyebrow">Characters</p>
          <span>{characters.length}</span>
        </div>

        <div className="character-list">
          {characters.map((character) => (
            <button
              className={`character-card ${selected.id === character.id ? "selected" : ""}`}
              key={character.id}
              onClick={() => openSceneLibrary(character.id)}
              aria-pressed={selected.id === character.id}
            >
              <Portrait character={character} image={portraitUrl(character)} />
              <span className="character-copy">
                <strong>{character.name}</strong>
                <small>{character.role}</small>
                <span className="status-line">
                  <i style={{ background: character.accent }} />
                  {character.status}
                </span>
              </span>
              <span className="favorite" aria-hidden="true">
                ☆
              </span>
            </button>
          ))}
        </div>

        <div className="rail-footer">
          <span aria-hidden="true">♧</span>
          <span>{characters.length} souls</span>
        </div>
      </aside>}

      <section
        className={`story-stage ${activeScene.background ? "has-image" : "no-image"}`}
        style={
          {
            "--scene-image": activeScene.background
              ? `url("${activeScene.background}")`
              : "linear-gradient(145deg, #211416, #09090b)",
            "--scene-position": activeScene.backgroundFocalPoint,
            "--scene-blur": `${activeSession?.autopilot ? storyBackgroundBlur : 0}px`,
          } as React.CSSProperties
        }
        aria-label={`Conversation with ${selected.name}`}
      >
        <div className="stage-wash" />
        <div className="chat-view-controls" aria-label="Chat layout">
          <button
            className={showCharacterRail ? "active" : ""}
            onClick={() => setShowCharacterRail((visible) => !visible)}
            aria-pressed={showCharacterRail}
            title={`${showCharacterRail ? "Hide" : "Show"} character panel`}
          >
            <span aria-hidden="true">☷</span> Characters
          </button>
          <button
            className={`context-toggle ${showContextRail ? "active" : ""}`}
            onClick={() => setShowContextRail((visible) => !visible)}
            aria-pressed={showContextRail}
            title={`${showContextRail ? "Hide" : "Show"} context panel`}
          >
            Context <span aria-hidden="true">☰</span>
          </button>
          {activeSession && !activeSession.autopilot && (
            <button
              className="autopilot-toolbar-button"
              onClick={toggleAutopilot}
              aria-pressed={false}
              title="Let this character live on their own (Whisper Mode)"
            >
              <span className="auto-dot" aria-hidden="true" /> Whisper Mode
            </button>
          )}
          {activeSession?.autopilot && (
            <label className="story-blur-control">
              <span>Blur</span>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={storyBackgroundBlur}
                onChange={(event) => setStoryBackgroundBlur(Number(event.target.value))}
                aria-label="Story background blur"
              />
              <output>{storyBackgroundBlur}px</output>
            </label>
          )}
          {activeSession && (
            <button
              className={`persona-button${sessionUsesDefaultPersona ? "" : " active"}`}
              onClick={() => setShowPersonaModal(true)}
              title={
                sessionPersonaName
                  ? `Playing as ${sessionPersonaName}`
                  : "Choose who you play as in this story"
              }
            >
              <span aria-hidden="true">♜</span>
              {sessionPersonaName ? `Playing as ${sessionPersonaName}` : "Persona"}
            </button>
          )}
          <button
            className="share-button"
            onClick={() => setShowShare(true)}
            disabled={activeMessages.length === 0}
            title={activeMessages.length === 0 ? "Nothing to share yet" : "Share this conversation as an image"}
          >
            <span aria-hidden="true">⇣</span> Share
          </button>
        </div>
        <div className="scene-title">
          <h1>{selected.name}</h1>
          <p>
            <span className="presence-dot" style={{ background: activeTheme.accent }} />
            {activeScene.status} <i>·</i> {activeTheme.motif}
          </p>
          {autopilotError && <p className="auto-error">{autopilotError}</p>}
        </div>

        <div className={`messages${activeSession?.autopilot ? " storytelling" : ""}`} aria-live="polite">
          {activeMessages.length === 0 && activeSession?.autopilot && (
            <div className="sandbox-empty-state">
              <span aria-hidden="true">◉</span>
              <p className="eyebrow">Whisper Mode</p>
              <h2>{selected.name} is stirring awake.</h2>
              <p>
                Nothing has been written yet. {selected.name} will write the first
                beat on their own in a moment — step in whenever you like.
              </p>
            </div>
          )}
          {activeMessages.length === 0 && activeSession?.sandbox && (
            <div className="sandbox-empty-state">
              <span aria-hidden="true">◇</span>
              <p className="eyebrow">Open Sandbox</p>
              <h2>Nothing has happened yet.</h2>
              <p>
                Write the first line, action, or piece of narration. There is no preset
                setting or history; {selected.name} will respond from there.
              </p>
            </div>
          )}
          {activeMessages.map((message, index) => {
            const isLastCharacter =
              message.sender === "character" &&
              activeMessages.slice(index + 1).every((m) => m.sender !== "character");
            return renderMessageBubble(message, isLastCharacter, { live: true, showCaption: false });
          })}
          {isReplying && (
            <article className="message character typing" aria-label={`${selected.name} is replying`}>
              <Portrait character={selected} image={portraitUrl(selected)} />
              <p>
                <span />
                <span />
                <span />
              </p>
            </article>
          )}
        </div>

        <div className="composer-wrap">
          {chatError && (
            <div className="chat-error" role="alert">
              <span aria-hidden="true">!</span>
              <p>{chatError}</p>
              {!configured && (
                <button onClick={() => setView("settings")}>Connect NovelAI</button>
              )}
              <button
                className="chat-error-close"
                onClick={() => setChatError("")}
                aria-label="Dismiss error"
                title="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          {activeSession?.autopilot && (
            autopilotControlsCollapsed && activeSession.autopilotPaused ? (
              <div
                className="autopilot-controls is-collapsed is-paused"
                aria-label="Whisper Mode controls (minimized)"
              >
                <button
                  className="autopilot-collapse-toggle"
                  onClick={() => setAutopilotControlsCollapsed(false)}
                  aria-label="Expand whisper mode controls"
                >
                  <span aria-hidden="true" className="auto-dot is-running" />
                  <span className="autopilot-status">Paused — minimized</span>
                  <span aria-hidden="true" className="autopilot-collapse-icon">▲</span>
                </button>
              </div>
            ) : (
              <div
                className={`autopilot-controls${activeSession.autopilotPaused ? " is-paused" : ""}`}
                aria-label="Whisper Mode controls"
              >
                <span aria-hidden="true" className="auto-dot is-running" />
                <p className="autopilot-status">
                  {activeSession.autopilotStopped
                    ? "Stopped — story preserved"
                    : activeSession.autopilotPaused
                    ? "Paused — write whenever you like"
                    : autopilotBusy
                      ? `${selected.name} is living on their own…`
                      : selected.name}
                </p>
                <div className="autopilot-control-buttons">
                  {activeSession.autopilotPaused && (
                    <button
                      onClick={() => setAutopilotControlsCollapsed(true)}
                      className="autopilot-collapse"
                      aria-label="Minimize whisper mode controls"
                    >
                      Minimize
                    </button>
                  )}
                  <button onClick={toggleAutopilotPause} disabled={autopilotBusy}>
                    {activeSession.autopilotPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                      onClick={requestNextAutopilotBeat}
                      disabled={autopilotBusy}
                    >
                    Next
                  </button>
                  <button onClick={stopAutopilot} className="autopilot-stop">
                    Stop
                  </button>
                </div>
              </div>
              )
          )}
          {(!activeSession?.autopilot || activeSession?.autopilotPaused) && !autopilotControlsCollapsed && (
            <div className="composer">
              <>
                <label htmlFor="story-input" className="sr-only">
                  Message {selected.name}
                </label>
                <textarea
                  id="story-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Speak, act, or shape the scene…"
                  rows={2}
                />
              </>
              <div className="composer-actions">
                <select
                  aria-label="Message mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option>Dialogue</option>
                  <option>Action</option>
                  <option>Narration</option>
                </select>
                <div className="action-cluster">
                  <button
                    className="icon-button"
                    aria-label="Impersonate player"
                    title="Impersonate: write the player's turn for you"
                    onClick={impersonatePlayer}
                    disabled={isReplying || isImpersonating}
                  >
                    ◐
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Skip turn"
                    title="Skip turn: let the character continue"
                    onClick={skipTurn}
                    disabled={isReplying || isImpersonating || activeMessages.length === 0}
                  >
                    »
                  </button>
                  {(isReplying || isImpersonating) && (
                    <button
                      className="icon-button stop-button"
                      onClick={stopGeneration}
                      aria-label="Stop generating"
                      title="Stop generating"
                    >
                      ■
                    </button>
                  )}
                  <button
                    className="send-button"
                    onClick={sendMessage}
                    disabled={!draft.trim() || isReplying || isImpersonating}
                    aria-label="Send message"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showContextRail && <aside className="context-rail" aria-label="Story context">
        <div className="context-rail-controls">
          <button
            className="context-rail-cog"
            type="button"
            onClick={() => setShowPanelControls((v) => !v)}
            aria-label="Panel layout"
            title="Panel layout"
          >
            ⚙
          </button>
          {showPanelControls && (
            <div className="panel-controls-dropdown">
              <p className="eyebrow">Panels</p>
              {panelOrder.map((panelId, index) => (
                <div key={panelId} className="panel-control-item">
                  <label className="toggle-row">
                    <span className="setting-name-row">{PANEL_LABELS[panelId] ?? panelId}</span>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={panelVisibility[panelId] !== false}
                        onChange={(e) => {
                          const next = { ...panelVisibility, [panelId]: e.target.checked };
                          onPanelVisibilityChange(next);
                        }}
                      />
                      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                    </span>
                  </label>
                  <div className="panel-reorder-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        if (index === 0) return;
                        const next = [...panelOrder];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        onPanelOrderChange(next);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index === panelOrder.length - 1) return;
                        const next = [...panelOrder];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        onPanelOrderChange(next);
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {panelOrder.map((panelId) => {
          if (panelVisibility[panelId] === false) return null;
          switch (panelId) {
            case "scene":
              return (
                <section key={panelId} className="context-rail-card context-card">
                  <div className="card-title">
                    <p className="eyebrow">Scene</p>
                    <button aria-label="Choose another scene" onClick={() => setView("scenes")}>✎</button>
                  </div>
                  <div className="scene-summary">
                    <div
                      className="scene-orb"
                      style={
                        {
                          "--thumb": activeScene.background
                            ? `url("${activeScene.background}")`
                            : "linear-gradient(145deg, #2b1c1e, #0c0c0e)",
                        } as React.CSSProperties
                      }
                    />
                    <div>
                      <h2>{activeScene.title}</h2>
                      <p>☁ {activeScene.weather}</p>
                    </div>
                  </div>
                </section>
              );
            case "memory":
              return (
                <section key={panelId} className="context-rail-card context-card memory-card">
                  <div className="card-title">
                    <p className="eyebrow">{activeSession?.sandbox ? "Sandbox" : "Memory"}</p>
                    {!activeSession?.sandbox && <button aria-label="Add memory">＋</button>}
                  </div>
                  {activeSession?.sandbox ? (
                    <div className="sandbox-context-note">
                      <span aria-hidden="true">◇</span>
                      <p>Preset memories are off. Only this conversation becomes context.</p>
                    </div>
                  ) : (
                    <ul>
                      {selected.memories.map((memory, index) => (
                        <li key={memory}>
                          <span aria-hidden="true">{index === 0 ? "◉" : "▱"}</span>
                          <p>{memory}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            case "living-cast":
              return (
                <section key={panelId} className="context-rail-card context-card living-cast-card">
                  <div className="card-title">
                    <p className="eyebrow">Living Cast</p>
                    <span aria-hidden="true">◈</span>
                  </div>
                  {(() => {
                    const castMembers = activeSession?.livingCast?.length
                      ? activeSession.livingCast
                      : createCast({ id: selected.id, name: selected.name });
                    const pending = activeMessages.length > 0
                      ? detectPendingInteraction(activeMessages, castMembers, selected.name, activePlayerName)
                      : null;
                    return (
                      <details open={castMembers.length > 1}>
                        <summary>
                          <span>{castMembers.length} {castMembers.length === 1 ? "member" : "members"} in the scene</span>
                          {pending?.kind === "cast" && pending.targetName
                            ? <small>Pending: {pending.targetName} was asked</small>
                            : <small>No open direct question</small>}
                        </summary>
                        <ul className="living-cast-list">
                          {castMembers.map((member) => (
                            <li key={member.id} className={`cast-entry cast-${member.presence}`}>
                              <div className="cast-entry-line">
                                <span className="cast-name">{member.name}</span>
                                <span className="cast-tags">
                                  {member.primary && <span className="cast-tag cast-tag-primary">Primary</span>}
                                  <span className="cast-tag">{member.origin}</span>
                                  <span className="cast-tag cast-tag-presence">{member.presence}</span>
                                </span>
                              </div>
                              {member.notes.slice(0, 2).map((note, noteIndex) => (
                                <p className="cast-note" key={noteIndex}>{note}</p>
                              ))}
                            </li>
                          ))}
                        </ul>
                        {pending?.kind === "cast" && pending.targetName && (
                          <p className="cast-pending-note">
                            {pending.asker} asked {pending.targetName} a question. {pending.targetName} has not responded yet.
                          </p>
                        )}
                      </details>
                    );
                  })()}
                </section>
              );
            case "context-inspector":
              return (
                <section key={panelId} className="context-rail-card context-card context-inspector-card">
                  <div className="card-title">
                    <p className="eyebrow">Peek Context</p>
                    <span aria-hidden="true">⌁</span>
                  </div>
                  {activeContextManifest ? (
                    <details>
                      <summary>
                        <span>{activeContextManifest.estimatedInputTokens.toLocaleString()} estimated tokens</span>
                        <small>{activeContextManifest.includedLore.length} lore entries active</small>
                      </summary>
                      <div className="context-inspector-body">
                        <dl>
                          <div><dt>Context window</dt><dd>{activeContextManifest.contextWindow.toLocaleString()}</dd></div>
                          <div><dt>Input budget</dt><dd>{activeContextManifest.inputBudget.toLocaleString()}</dd></div>
                          <div><dt>Recent messages</dt><dd>{activeContextManifest.includedMessages} kept · {activeContextManifest.omittedMessages} omitted</dd></div>
                          <div><dt>Character revision</dt><dd>{activeContextManifest.characterRevision}</dd></div>
                          <div><dt>World revision</dt><dd>{activeContextManifest.worldRevision ?? "None"}</dd></div>
                        </dl>
                        <div className="context-inspector-group">
                          <strong>Active character canon</strong>
                          <div className="context-receipts">
                            {activeContextManifest.includedSections.map((id) => <span key={id}>{id}</span>)}
                          </div>
                        </div>
                        <div className="context-inspector-group">
                          <strong>Active world lore</strong>
                          {activeContextManifest.includedLore.length > 0 ? (
                            <ul>
                              {activeContextManifest.includedLore.map((entry) => (
                                <li key={entry.id}><span>{entry.title}</span><small>{entry.reason}</small></li>
                              ))}
                            </ul>
                          ) : <p>No world lore was included in this reply.</p>}
                        </div>
                        <p className="context-omission-note">
                          {activeContextManifest.omittedLore.filter((entry) => entry.reason === "inactive").length} inactive lore entries and {activeContextManifest.omittedLore.filter((entry) => entry.reason === "budget").length} budget-limited entries stayed out.
                        </p>
                      </div>
                    </details>
                  ) : (
                    <p className="context-inspector-empty">Generate a reply to see exactly which canon, lore, and recent history reached the model.</p>
                  )}
                </section>
              );
            case "context":
               return (
                 <section key={panelId} className="context-rail-card context-card">
                   <div className="card-title">
                     <p className="eyebrow">Context</p>
                     <span aria-hidden="true">📖</span>
                   </div>
                   <div className="context-summary">
                     <p>Memory: {contextLibrary.memories.filter((m) => m.enabled).length} active</p>
                     <p>Notes: {contextLibrary.authorNotes.filter((n) => n.enabled).length} active</p>
                     <p>Lorebooks: {contextLibrary.lorebooks.filter((l) => l.enabled).length}</p>
                     <p className="context-summary-tokens">
                       {contextLibrary.memories.reduce((s, m) => s + (m.enabled ? Math.ceil(m.text.length / 4) : 0), 0) +
                        contextLibrary.authorNotes.reduce((s, n) => s + (n.enabled ? Math.ceil(n.text.length / 4) : 0), 0)} tokens
                     </p>
                     <button className="context-open-btn" onClick={() => setShowContextWorkspace(true)}>Open Context</button>
                   </div>
                 </section>
               );
            case "connection":
              return (
                <section key={panelId} className="context-rail-card context-card connection-card">
                  <div className="card-title">
                    <p className="eyebrow">Connection</p>
                    <span aria-hidden="true">♡</span>
                  </div>
                  <div className="provider-status">
                    <span
                      className={
                        connected
                          ? "online"
                          : providerState === "testing"
                            ? "testing"
                          : providerState === "ready"
                            ? "ready"
                            : providerState === "error"
                              ? "error"
                              : "offline"
                      }
                    />
                    <div>
                      <p>
                        {providerLabel}{" "}
                        {connected
                          ? "verified working"
                          : providerState === "testing"
                            ? "testing"
                          : providerState === "ready"
                            ? storyProvider === "novelai" ? "token entered" : "ready to test"
                            : providerState === "error"
                              ? "needs attention"
                              : "not connected"}
                      </p>
                      <button onClick={() => setView("settings")}>Open settings</button>
                    </div>
                  </div>
                  <p className="model-note">
                    {configured
                      ? `${activeModel.label} · ${activeReplyLength.label}`
                      : `No model selected · ${activeReplyLength.label}`}
                  </p>
                  <div className="pulse-heading rs-bar-wrapper">
                    <span>Relationship</span>
                    <strong>{deriveRelationshipLabel(relationshipScore)}</strong>
                    {relationshipDelta !== null && relationshipDelta !== 0 && (
                      <span
                        className={`relationship-tick ${relationshipDelta > 0 ? "positive" : "negative"}`}
                        aria-label={relationshipDelta > 0 ? `Gained ${relationshipDelta}` : `Lost ${-relationshipDelta}`}
                      >
                        {relationshipDelta > 0 ? `+${relationshipDelta}` : `${relationshipDelta}`}
                      </span>
                    )}
                    <button
                      className="rs-bar-cog"
                      type="button"
                      ref={rsCogRef}
                      onClick={() => setShowRsSettings((v) => !v)}
                      aria-label="Relationship Settings"
                      title="Relationship Settings"
                    >
                      ⚙
                    </button>
                    {showRsSettings &&
                      createPortal(
                        <div
                          ref={rsPopRef}
                          className="rs-settings-popover"
                          role="dialog"
                          aria-label="Relationship Settings"
                          style={
                            rsPos
                              ? { position: "fixed", top: rsPos.top, left: rsPos.left, width: rsPos.width }
                              : undefined
                          }
                        >
                          <p className="eyebrow">Relationship Settings</p>
                          <p className="setting-name-row" style={{ marginBottom: 8 }}>
                            Relationship Status:
                            <strong style={{ marginLeft: 6 }}>{deriveRelationshipLabel(relationshipScore)}</strong>
                          </p>
                          <label className="toggle-row">
                            <span className="setting-name-row">Relationship Status influences character behavior</span>
                            <span className="switch">
                              <input
                                type="checkbox"
                                checked={relationshipContextEnabled}
                                onChange={(e) => setRelationshipContextEnabled(e.target.checked)}
                              />
                              <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                            </span>
                          </label>
                          <label className="setting-name-row" style={{ marginTop: 12, display: "block" }}>
                            Custom relationship note
                          </label>
                          <textarea
                            className="rs-note-textarea"
                            value={relationshipNote}
                            onChange={(e) => setRelationshipNote(e.target.value)}
                            placeholder="e.g. She trusts him deeply but is still angry about what happened yesterday."
                            rows={3}
                          />
                        </div>,
                        document.body,
                      )}
                  </div>
                  <div
                    className="bond-meter"
                    aria-label={`Relationship meter at ${relationshipMeterPercent(relationshipScore)}%`}
                  >
                    <span style={{ width: `${relationshipMeterPercent(relationshipScore)}%` }} />
                    <i style={{ left: `${relationshipMeterPercent(relationshipScore)}%` }}>♡</i>
                  </div>
                </section>
              );
            default:
              return null;
          }
        })}
      </aside>}
      {props.pendingDeleteMessage && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setPendingDeleteMessage(null)}
        >
          <section
            className="modal delete-message-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => props.setPendingDeleteMessage(null)}
              aria-label="Cancel deletion"
            >
              ×
            </button>
            <p className="eyebrow">Edit conversation</p>
            <h2 id="delete-message-title">How much should be deleted?</h2>
            <p className="modal-intro" id="delete-message-description">
              You can remove only this message, or rewind the story by removing it and
              every message that follows.
            </p>
            <blockquote>
              {props.pendingDeleteMessage.text.replace(/\s+/g, " ").slice(0, 180)}
            </blockquote>
            <div className="delete-message-actions">
              <button className="delete-single-button" onClick={() => props.deleteMessage("single")}>
                Delete only this message
              </button>
              <button className="delete-following-button" onClick={() => props.deleteMessage("following")}>
                Delete this and later messages
              </button>
              <button className="outline-button" onClick={() => props.setPendingDeleteMessage(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
      {props.directionEditor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setDirectionEditor(null)}
        >
          <section
            className="modal direction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direction-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => props.setDirectionEditor(null)}
              aria-label="Close direction editor"
            >
              ×
            </button>
            <p className="eyebrow">Player&apos;s turn</p>
            <h2 id="direction-title">Impersonation direction</h2>
            <p className="modal-intro">
              The direction remembered for this turn. Edit it and re-run to regenerate the
              player&apos;s draft from that prompt — or clear it to keep only the text.
            </p>
            <textarea
              className="direction-editor-textarea"
              value={props.directionEditor.text}
              onChange={(event) =>
                props.setDirectionEditor((current) =>
                  current ? { ...current, text: event.target.value } : current,
                )
              }
              rows={5}
              autoFocus
              placeholder="The prompt used to guide the impersonation…"
            />
            <div className="direction-actions">
              <button
                className="outline-button"
                onClick={() => props.setDirectionEditor(null)}
                disabled={props.isReplying || props.isImpersonating}
              >
                Cancel
              </button>
              <button
                className="outline-button"
                onClick={() => props.clearMessageDirection(props.directionEditor.id)}
                disabled={props.isReplying || props.isImpersonating}
              >
                Clear direction
              </button>
              <button
                className="primary-button"
                onClick={() => props.rerunImpersonation(props.directionEditor.id, props.directionEditor.text)}
                disabled={props.isReplying || props.isImpersonating}
              >
                {props.isImpersonating ? "Generating…" : "Save & re-run"}
              </button>
            </div>
          </section>
        </div>
      )}
      {props.showAutopilotStart && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => props.setShowAutopilotStart(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="autopilot-start-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => props.setShowAutopilotStart(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Whisper Mode</p>
            <h2 id="autopilot-start-title">Where does the story begin?</h2>
            <p className="modal-intro">
              Set the opening for {props.selected.name}&apos;s own story — where they are, what is
              happening, who you are to them. They will take it from there, living beat by beat.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                props.beginAutopilot();
              }}
            >
              <fieldset className="autopilot-pov">
                <legend>Mode</legend>
                <div className="autopilot-pov-options">
                  <button
                    type="button"
                    className={props.autopilotPov === "first" ? "active" : ""}
                    onClick={() => props.setAutopilotPov("first")}
                  >
                    First person
                  </button>
                  <button
                    type="button"
                    className={props.autopilotPov === "third" ? "active" : ""}
                    onClick={() => props.setAutopilotPov("third")}
                  >
                    Third person
                  </button>
                  <button
                    type="button"
                    className={props.autopilotPov === "narrator" ? "active" : ""}
                    onClick={() => props.setAutopilotPov("narrator")}
                  >
                    Narrative telling
                  </button>
                </div>
                <small>
                  {props.autopilotPov === "first" && "Written from the character's own voice using I/my."}
                  {props.autopilotPov === "third" && "Close third-person limited to the character (she/he)."}
                  {props.autopilotPov === "narrator" && "A storytelling voice free to move between characters and scenes."}
                </small>
              </fieldset>
              <label>
                Opening prompt <small>Optional</small>
                <textarea
                  value={props.autopilotSeed}
                  onChange={(event) => props.setAutopilotSeed(event.target.value)}
                  rows={5}
                  placeholder={`For example: It is past midnight and ${props.selected.name} is alone in the greenhouse while rain taps the glass.`}
                  autoFocus
                />
              </label>
              <p className="modal-intro">
                Leave it blank and {props.selected.name} will open the story on their own.
              </p>
              <div className="impersonate-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => props.setShowAutopilotStart(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Begin Whisper Mode
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {props.showShare && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => props.setShowShare(false)}>
          <section
            className="modal share-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => props.setShowShare(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Share the story</p>
            <h2 id="share-title">Save a scene as an image</h2>
            <p className="modal-intro">
              Render the latest moments into a crisp image you can paste straight into Discord.
              Open the image to zoom in and read every line.
            </p>
            <div className="share-options">
              <label>
                Messages to include
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, props.activeMessages.length)}
                  value={props.shareCount}
                  onChange={(event) =>
                    props.setShareCount(Math.max(1, Math.min(Number(event.target.value) || 1, Math.max(1, props.activeMessages.length))))
                  }
                />
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={props.shareCaptions}
                  onChange={(event) => props.setShareCaptions(event.target.checked)}
                />
                <span>Name captions on bubbles</span>
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={props.shareHeader}
                  onChange={(event) => props.setShareHeader(event.target.checked)}
                />
                <span>Scene header</span>
              </label>
            </div>
            {props.shareError && <p className="share-error">{props.shareError}</p>}
            <div className="share-actions">
              <button
                className="primary-button"
                onClick={props.copyChatImage}
                disabled={props.shareBusy || props.activeMessages.length === 0}
              >
                {props.shareBusy ? "Rendering…" : props.shareFeedback || "Copy image"}
              </button>
              <button
                className="outline-button"
                onClick={props.downloadChatImageFromButton}
                disabled={props.shareBusy || props.activeMessages.length === 0}
              >
                Download PNG
              </button>
            </div>
          </section>
        </div>
      )}
       {showContextWorkspace && (
         <ContextWorkspace
           contextLibrary={contextLibrary}
           setContextLibrary={setContextLibrary}
           createContextEntry={createContextEntry}
           updateContextEntry={updateContextEntry}
           deleteContextEntry={deleteContextEntry}
           addLorebook={addLorebook}
           removeLorebook={removeLorebook}
           updateLorebook={updateLorebook}
           onImportFile={importContextFile}
           onClose={() => setShowContextWorkspace(false)}
           activeContextManifest={activeContextManifest}
         />
       )}
      {props.showPersonaModal && props.activeSession && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => props.setShowPersonaModal(false)}
        >
          <section
            className="modal persona-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => props.setShowPersonaModal(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">This conversation&apos;s persona</p>
            <h2 id="persona-title">How do you appear here?</h2>
            <p className="modal-intro">
              These fields apply only to this conversation with {props.selected.name}. You can pick from
              your saved personas — this story keeps its own snapshot, so changing the library later
              will not rewrite who you are here.
            </p>

            <div className="persona-session-picker">
              {props.personas.length === 0 ? (
                <p className="persona-library-empty">
                  No saved personas yet. Add some in Settings, or write a custom one below.
                </p>
              ) : (
                <ul className="persona-list">
                  {props.personas.map((persona) => {
                    const inUse = props.activeSession.playerPersonaId === persona.id;
                    return (
                      <li className="persona-card" key={persona.id}>
                        <span className="persona-avatar" aria-hidden="true">
                          {persona.name.trim().charAt(0).toUpperCase() || "P"}
                        </span>
                        <div className="persona-card-copy">
                          <strong>{persona.name}</strong>
                          <small>{persona.pronouns ?? "no pronouns set"}</small>
                          <p>{persona.description || "No description yet."}</p>
                        </div>
                        <div className="persona-card-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => props.applySessionPersona(persona)}
                          >
                            {inUse ? "In use" : "Use for this story"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {props.activeSession && (
              <div className="persona-active-preview">
                <strong>Snapshot used by this story</strong>
                <pre>{props.sessionPersonaSnapshot || "No persona set — using your default."}</pre>
              </div>
            )}

            {(!props.sessionUsesDefaultPersona) && (
              <p className="persona-change-warning">
                Changing persona during an existing story may make earlier messages inconsistent.
              </p>
            )}

            <div className="persona-fields">
              <label>
                Player name
                <input
                  value={props.activeSession.playerName ?? ""}
                  onChange={(event) => props.updateActiveSessionPersona({ playerName: event.target.value })}
                  placeholder={
                    props.playerProfile.name.trim()
                      ? `Blank = default (${props.playerProfile.name.trim()})`
                      : "Leave blank to stay unnamed in the story"
                  }
                  maxLength={100}
                />
              </label>
              <label>
                Persona
                <textarea
                  value={props.activeSession.playerPersona ?? ""}
                  onChange={(event) => props.updateActiveSessionPersona({ playerPersona: event.target.value })}
                  placeholder={
                    props.playerProfile.persona.trim()
                      ? "Blank = your default persona"
                      : "Describe how you want to be seen in this story—appearance, nature, history. Leave blank if you prefer to improvise."
                  }
                  rows={4}
                  maxLength={2000}
                />
              </label>
            </div>
            <p className="persona-default-note">
              Default persona for all chats: <strong>{props.playerProfile.name.trim() || "No name"}</strong>
              {props.playerProfile.persona.trim() ? " — " + props.playerProfile.persona.trim() : " — no persona set"}
            </p>
            <div className="share-actions">
              <button
                className="outline-button"
                onClick={props.clearActiveSessionPersona}
                disabled={props.sessionUsesDefaultPersona}
              >
                Use default persona
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
