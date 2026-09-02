"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChatWorkspace as LegacyChatWorkspace } from "./chat-workspace-legacy.tsx";
import type { ChatWorkspaceProps } from "./chat-workspace-legacy.tsx";
import { RelationshipV2Panel } from "./relationship-v2-panel.tsx";
import { SlashCommandLayer } from "./slash-command-layer.tsx";

export type { ChatWorkspaceProps } from "./chat-workspace-legacy.tsx";

type RelationshipHost = {
  key: string;
  node: HTMLElement;
};

/**
 * Thin RS V2 presentation layer around the existing chat workspace.
 *
 * Keeping the established workspace intact makes the frontend slice low-risk:
 * the wrapper mounts focused additions without pushing them back into the
 * orchestration core or message-persistence path.
 */
export function ChatWorkspace(props: ChatWorkspaceProps) {
  const [relationshipHost, setRelationshipHost] = useState<RelationshipHost | null>(null);
  const activeSessionId = props.activeSession?.id ?? "";
  const activeLocationId = props.activeSession?.locationId ?? "";
  const selectedId = props.selected.id;
  const shouldMountRelationshipPanel = Boolean(
    props.showContextRail && activeSessionId && !activeLocationId,
  );
  const hostKey = `${activeSessionId}:${selectedId}`;

  useEffect(() => {
    if (!shouldMountRelationshipPanel) return;

    let mountedHost: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let frame = 0;

    const mount = () => {
      const bondMeter = document.querySelector<HTMLElement>(
        ".context-rail .connection-card .bond-meter",
      );
      if (!bondMeter?.parentElement) return false;

      const existing = bondMeter.parentElement.querySelector<HTMLElement>(
        ":scope > .rs-v2-host",
      );
      const host = existing ?? document.createElement("div");
      if (!existing) {
        host.className = "rs-v2-host";
        host.setAttribute("data-rs-version", "2");
        bondMeter.insertAdjacentElement("afterend", host);
      }
      mountedHost = host;
      setRelationshipHost({ key: hostKey, node: host });
      return true;
    };

    observer = new MutationObserver(() => {
      if (mount()) observer?.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    frame = window.requestAnimationFrame(() => {
      if (mount()) observer?.disconnect();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      mountedHost?.remove();
    };
  }, [hostKey, shouldMountRelationshipPanel]);

  const liveHost = relationshipHost?.key === hostKey && relationshipHost.node.isConnected
    ? relationshipHost.node
    : null;

  return (
    <>
      <LegacyChatWorkspace {...props} />
      <SlashCommandLayer
        activeContextManifest={props.activeContextManifest}
        activeMessages={props.activeMessages}
        activeScene={props.activeScene}
        activeSession={props.activeSession}
        contextLibrary={props.contextLibrary}
        deriveRelationshipLabel={props.deriveRelationshipLabel}
        draft={props.draft}
        relationshipScore={props.relationshipScore}
        rerollMessage={props.rerollMessage}
        selected={props.selected}
        sessionPersonaName={props.sessionPersonaName}
        sessionUsesDefaultPersona={props.sessionUsesDefaultPersona}
        setContextLibrary={props.setContextLibrary}
        setDraft={props.setDraft}
      />
      {shouldMountRelationshipPanel && liveHost && props.activeSession && !props.activeSession.locationId && createPortal(
        <RelationshipV2Panel
          characterId={props.selected.id}
          characterName={props.selected.name}
          personaId={props.activeSession.playerPersonaId}
          relationshipScore={props.relationshipScore}
          fallbackDimensions={props.activeContextManifest?.simulation?.relationshipDimensions}
          fallbackMomentum={props.activeContextManifest?.simulation?.relationshipMomentum}
        />,
        liveHost,
      )}
    </>
  );
}
