"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_PERSONA_ID,
  loadRelationships,
  relationshipKey,
  saveRelationships,
} from "../../lib/relationships/index.ts";
import {
  addCodaDirective,
  clearCodaDirectives,
  createCodaDirective,
  listCodaDirectives,
  parseCodaSlashCommand,
} from "../../lib/coda/directives.ts";
import type { ChatWorkspaceProps } from "./chat-workspace-legacy.tsx";

type CommandCard = {
  id: number;
  title: string;
  body: string;
  tone?: "normal" | "warning" | "success";
  confirmReset?: boolean;
};

type SlashCommandLayerProps = Pick<
  ChatWorkspaceProps,
  | "activeContextManifest"
  | "activeMessages"
  | "activeScene"
  | "activeSession"
  | "contextLibrary"
  | "deriveRelationshipLabel"
  | "draft"
  | "relationshipScore"
  | "rerollMessage"
  | "selected"
  | "sessionPersonaName"
  | "sessionUsesDefaultPersona"
  | "setContextLibrary"
  | "setDraft"
>;

const COMMANDS = [
  { command: "/help", description: "Show available slash commands" },
  { command: "/coda", description: "Add a local scene directive (default)" },
  { command: "/coda l", description: "Add a local scene-only Coda directive" },
  { command: "/coda g", description: "Add persistent guidance for this character" },
  { command: "/coda show", description: "Show active Coda directives" },
  { command: "/coda clear l", description: "Clear this scene's local Coda directives" },
  { command: "/coda clear g", description: "Clear this character's global Coda directives" },
  { command: "/rs", description: "Show this character + persona relationship" },
  { command: "/rs reset", description: "Reset only this character + persona relationship" },
  { command: "/persona", description: "Show the active persona" },
  { command: "/scene", description: "Show the active scene" },
  { command: "/context", description: "Show current context/token summary" },
  { command: "/reroll", description: "Reroll the latest character reply" },
] as const;

export function SlashCommandLayer(props: SlashCommandLayerProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [cards, setCards] = useState<CommandCard[]>([]);
  const [cardCounter, setCardCounter] = useState(0);

  const commandInput = props.draft.trimStart();
  const commandMode = commandInput.startsWith("/");
  const suggestions = useMemo(() => {
    if (!commandMode) return [];
    const normalized = commandInput.toLowerCase();
    return COMMANDS.filter((entry) => entry.command.startsWith(normalized)).slice(0, 7);
  }, [commandInput, commandMode]);

  useEffect(() => {
    const composer = document.querySelector<HTMLElement>(".story-stage .composer-wrap");
    if (!composer?.parentElement) return;

    const existing = composer.parentElement.querySelector<HTMLElement>(":scope > .slash-command-host");
    const node = existing ?? document.createElement("div");
    if (!existing) {
      node.className = "slash-command-host";
      node.setAttribute("aria-live", "polite");
      composer.insertAdjacentElement("beforebegin", node);
    }
    setHost(node);

    return () => {
      if (!existing) node.remove();
    };
  }, [props.activeSession?.id]);

  function addCard(card: Omit<CommandCard, "id">) {
    const id = cardCounter + 1;
    setCardCounter(id);
    setCards((current) => [...current, { ...card, id }]);
  }

  function dismissCard(id: number) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  function relationshipPersonaId() {
    return props.activeSession?.playerPersonaId || DEFAULT_PERSONA_ID;
  }

  function executeCoda(raw: string): boolean {
    if (!raw.trimStart().toLowerCase().startsWith("/coda")) return false;
    props.setDraft("");
    const parsed = parseCodaSlashCommand(raw);
    if (!parsed) {
      addCard({
        title: "Coda",
        body: "Use /coda <instruction>, /coda l <instruction>, /coda g <instruction>, /coda show, or /coda clear l|g.",
        tone: "warning",
      });
      return true;
    }

    if (parsed.kind === "directive") {
      try {
        const directive = createCodaDirective({
          scope: parsed.scope,
          instruction: parsed.instruction,
          sceneId: props.activeScene.id,
          characterId: props.selected.id,
        });
        props.setContextLibrary(addCodaDirective(props.contextLibrary, directive));
        addCard({
          title: parsed.scope === "local" ? "Coda · Local" : "Coda · Global",
          body: parsed.scope === "local"
            ? `Scene-only directive added:\n${parsed.instruction}`
            : `Persistent guidance added for ${props.selected.name}:\n${parsed.instruction}`,
          tone: "success",
        });
      } catch (error) {
        addCard({
          title: "Coda",
          body: error instanceof Error ? error.message : "Coda could not add that directive.",
          tone: "warning",
        });
      }
      return true;
    }

    if (parsed.kind === "show") {
      const notes = listCodaDirectives(props.contextLibrary, {
        sceneId: props.activeScene.id,
        characterId: props.selected.id,
      }).filter((note) =>
        (note.scope === "scene" && note.sceneId === props.activeScene.id)
        || (note.scope === "character" && note.characterId === props.selected.id)
      );
      addCard({
        title: "Active Coda directives",
        body: notes.length
          ? notes.map((note) => `${note.scope === "scene" ? "LOCAL" : "GLOBAL"} · ${note.text.replace(/^\[Coda (?:scene|character) directive\]\s*/i, "")}`).join("\n\n")
          : "No Coda directives are active for this scene or character.",
      });
      return true;
    }

    const filter = {
      sceneId: props.activeScene.id,
      characterId: props.selected.id,
    };
    props.setContextLibrary(clearCodaDirectives(props.contextLibrary, parsed.scope, filter));
    addCard({
      title: "Coda directives cleared",
      body: parsed.scope === "local"
        ? `Cleared Coda's local directives for ${props.activeScene.title}.`
        : `Cleared Coda's persistent guidance for ${props.selected.name}.`,
      tone: "success",
    });
    return true;
  }

  function execute(raw: string) {
    if (executeCoda(raw)) return;

    const command = raw.trim().replace(/\s+/g, " ").toLowerCase();
    props.setDraft("");

    if (command === "/help") {
      addCard({
        title: "Slash commands",
        body: COMMANDS.map((entry) => `${entry.command}  ${entry.description}`).join("\n"),
      });
      return;
    }

    if (command === "/rs") {
      const persona = props.sessionUsesDefaultPersona
        ? "Default persona"
        : props.sessionPersonaName || "Current persona";
      addCard({
        title: "Relationship Status",
        body: `${props.selected.name} + ${persona}\n${props.deriveRelationshipLabel(props.relationshipScore)} · score ${props.relationshipScore}`,
      });
      return;
    }

    if (command === "/rs reset") {
      const persona = props.sessionUsesDefaultPersona
        ? "Default persona"
        : props.sessionPersonaName || "Current persona";
      addCard({
        title: "Reset relationship?",
        body: `Reset ${props.selected.name} + ${persona} to a fresh relationship? Chat history will stay intact.`,
        tone: "warning",
        confirmReset: true,
      });
      return;
    }

    if (command === "/persona") {
      addCard({
        title: "Active Persona",
        body: props.sessionUsesDefaultPersona
          ? "Using the default persona for this session."
          : props.sessionPersonaName || "No named persona is active.",
      });
      return;
    }

    if (command === "/scene") {
      addCard({
        title: "Current Scene",
        body: `${props.activeScene.title}\n${props.activeScene.weather} · ${props.activeScene.status}`,
      });
      return;
    }

    if (command === "/context") {
      const manifest = props.activeContextManifest;
      addCard({
        title: "Context",
        body: manifest
          ? `${manifest.estimatedInputTokens.toLocaleString()} estimated tokens\n${manifest.includedMessages} recent messages kept · ${manifest.omittedMessages} omitted\n${manifest.includedLore.length} lore entries active`
          : "No compiled context yet. Generate a reply first.",
      });
      return;
    }

    if (command === "/reroll") {
      const latestCharacter = [...props.activeMessages].reverse().find((message) => message.sender === "character");
      if (!latestCharacter) {
        addCard({ title: "Reroll", body: "There is no character reply to reroll yet.", tone: "warning" });
        return;
      }
      props.rerollMessage(latestCharacter);
      addCard({ title: "Reroll", body: "Rerolling the latest character reply.", tone: "success" });
      return;
    }

    addCard({
      title: "Unknown command",
      body: `${raw.trim()} is not a recognized slash command. Try /help.`,
      tone: "warning",
    });
  }

  function resetRelationship(cardId: number) {
    const state = loadRelationships();
    const key = relationshipKey(props.selected.id, relationshipPersonaId());
    if (state[key]) {
      const next = { ...state };
      delete next[key];
      saveRelationships(next);
    }
    setCards((current) => current.map((card) => card.id === cardId
      ? {
          ...card,
          title: "Relationship reset",
          body: `${props.selected.name}'s relationship with this persona was reset. Chat history was not deleted.`,
          tone: "success",
          confirmReset: false,
        }
      : card));

    window.setTimeout(() => window.location.reload(), 450);
  }

  useEffect(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#story-input");
    const sendButton = document.querySelector<HTMLButtonElement>(".story-stage .send-button");
    if (!textarea) return;

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (!textarea.value.trimStart().startsWith("/")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      execute(textarea.value);
    };

    const click = (event: MouseEvent) => {
      if (!textarea.value.trimStart().startsWith("/")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      execute(textarea.value);
    };

    textarea.addEventListener("keydown", keydown, true);
    sendButton?.addEventListener("click", click, true);
    return () => {
      textarea.removeEventListener("keydown", keydown, true);
      sendButton?.removeEventListener("click", click, true);
    };
  });

  if (!host) return null;

  return createPortal(
    <div className="slash-command-layer">
      {commandMode && suggestions.length > 0 && (
        <div className="slash-command-suggestions" role="listbox" aria-label="Slash commands">
          {suggestions.map((entry) => (
            <button
              type="button"
              key={entry.command}
              onClick={() => props.setDraft(`${entry.command} `)}
            >
              <strong>{entry.command}</strong>
              <span>{entry.description}</span>
            </button>
          ))}
        </div>
      )}
      {cards.map((card) => (
        <section key={card.id} className={`slash-command-card ${card.tone ?? "normal"}`}>
          <div>
            <strong>{card.title}</strong>
            <button type="button" className="slash-card-close" onClick={() => dismissCard(card.id)} aria-label="Dismiss command result">×</button>
          </div>
          <p>{card.body}</p>
          {card.confirmReset && (
            <div className="slash-command-actions">
              <button type="button" className="danger" onClick={() => resetRelationship(card.id)}>Reset</button>
              <button type="button" onClick={() => dismissCard(card.id)}>Cancel</button>
            </div>
          )}
        </section>
      ))}
      <style>{`
        .slash-command-host { position: relative; z-index: 18; padding: 0 18px; }
        .slash-command-layer { display: grid; gap: 8px; width: min(760px, 100%); margin: 0 auto 8px; }
        .slash-command-card, .slash-command-suggestions { border: 1px solid rgba(255,255,255,.13); background: rgba(13,13,16,.94); box-shadow: 0 10px 30px rgba(0,0,0,.28); backdrop-filter: blur(12px); }
        .slash-command-card { padding: 10px 12px; border-radius: 12px; }
        .slash-command-card.warning { border-color: rgba(218,162,91,.5); }
        .slash-command-card.success { border-color: rgba(126,190,143,.45); }
        .slash-command-card > div:first-child { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .slash-command-card strong { font-size: .82rem; letter-spacing: .04em; }
        .slash-command-card p { margin: 5px 0 0; white-space: pre-line; font-size: .82rem; opacity: .82; line-height: 1.35; }
        .slash-card-close { border: 0; background: transparent; color: inherit; opacity: .68; font-size: 1.15rem; cursor: pointer; }
        .slash-command-actions { display: flex; gap: 8px; margin-top: 9px; }
        .slash-command-actions button { border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.06); color: inherit; border-radius: 8px; padding: 5px 10px; cursor: pointer; }
        .slash-command-actions .danger { border-color: rgba(218,102,91,.55); }
        .slash-command-suggestions { border-radius: 12px; overflow: hidden; }
        .slash-command-suggestions button { width: 100%; border: 0; border-bottom: 1px solid rgba(255,255,255,.08); background: transparent; color: inherit; display: grid; grid-template-columns: minmax(90px, 150px) 1fr; gap: 12px; text-align: left; padding: 8px 11px; cursor: pointer; }
        .slash-command-suggestions button:last-child { border-bottom: 0; }
        .slash-command-suggestions button:hover, .slash-command-suggestions button:focus-visible { background: rgba(255,255,255,.07); outline: none; }
        .slash-command-suggestions span { opacity: .66; font-size: .78rem; }
        @media (max-width: 720px) { .slash-command-host { padding: 0 8px; } .slash-command-suggestions button { grid-template-columns: 110px 1fr; } }
      `}</style>
    </div>,
    host,
  );
}
