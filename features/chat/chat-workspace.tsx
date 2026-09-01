"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChatWorkspace as LegacyChatWorkspace } from "./chat-workspace-legacy.tsx";
import type { ChatWorkspaceProps } from "./chat-workspace-legacy.tsx";
import { RelationshipV2Panel } from "./relationship-v2-panel.tsx";

export type { ChatWorkspaceProps } from "./chat-workspace-legacy.tsx";

/**
 * Thin RS V2 presentation layer around the existing chat workspace.
 *
 * Keeping the established workspace byte-for-byte intact makes this first
 * frontend slice low-risk: the wrapper only mounts the relationship-state
 * panel immediately after the existing overall bond meter. Once the panel has
 * settled, it can be folded into the workspace during a later component split.
 */
export function ChatWorkspace(props: ChatWorkspaceProps) {
  const [relationshipHost, setRelationshipHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!props.showContextRail || !props.activeSession || props.activeSession.locationId) {
      setRelationshipHost(null);
      return;
    }

    let mountedHost: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

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
      setRelationshipHost(host);
      return true;
    };

    if (!mount()) {
      observer = new MutationObserver(() => {
        if (mount()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      mountedHost?.remove();
      setRelationshipHost(null);
    };
  }, [
    props.showContextRail,
    props.activeSession?.id,
    props.activeSession?.locationId,
    props.selected.id,
  ]);

  return (
    <>
      <LegacyChatWorkspace {...props} />
      {relationshipHost && props.activeSession && !props.activeSession.locationId && createPortal(
        <RelationshipV2Panel
          characterId={props.selected.id}
          characterName={props.selected.name}
          personaId={props.activeSession.playerPersonaId}
          relationshipScore={props.relationshipScore}
          fallbackDimensions={props.activeContextManifest?.simulation?.relationshipDimensions}
          fallbackMomentum={props.activeContextManifest?.simulation?.relationshipMomentum}
        />,
        relationshipHost,
      )}
    </>
  );
}
