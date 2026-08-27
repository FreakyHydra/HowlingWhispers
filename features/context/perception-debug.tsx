"use client";

import React from "react";
import type { ContextManifest } from "../../lib/generation/compile-context.ts";

type PerceptionManifest = NonNullable<ContextManifest["perception"]>;

export function PerceptionDebug(props: {
  perception: PerceptionManifest;
}) {
  const debug = props.perception.debug;
  if (!debug) return null;

  return (
    <section className="perception-debug" aria-label="Sensory POV debug view">
      <div className="perception-debug__heading">
        <div>
          <strong>Sensory POV</strong>
          <small>Development-only world truth and perception receipts</small>
        </div>
        <span>{props.perception.includedFacts} seen · {props.perception.filteredFacts} filtered</span>
      </div>

      <div className="perception-debug__channels" aria-label="Active sensory channels">
        {props.perception.channels.length > 0
          ? props.perception.channels.map((channel) => <span key={channel}>{channel}</span>)
          : <span>no direct channels</span>}
      </div>

      <div className="perception-debug__columns">
        <div>
          <h4>World truth</h4>
          {debug.worldTruth.length > 0 ? (
            <ul>
              {debug.worldTruth.map((fact) => (
                <li key={fact.id} data-status={fact.status}>
                  <span>{fact.text}</span>
                  <small>{fact.channel} · {fact.relation} · {fact.status}</small>
                </li>
              ))}
            </ul>
          ) : <p>No structured world facts were available.</p>}
        </div>

        <div>
          <h4>Persona perception</h4>
          {debug.personaPerception.length > 0 ? (
            <ul>
              {debug.personaPerception.map((fact) => (
                <li key={fact.id} data-status="included">
                  <span>{fact.text}</span>
                  <small>{fact.channel} · {fact.relation} · {fact.certainty}</small>
                </li>
              ))}
            </ul>
          ) : <p>The persona received no direct sensory facts.</p>}
        </div>
      </div>

      <div className="perception-debug__filtered">
        <h4>Filtered from narration</h4>
        {debug.filteredFacts.length > 0 ? (
          <ul>
            {debug.filteredFacts.map((fact) => (
              <li key={fact.id}>
                <span>{fact.text}</span>
                <small>{fact.reason} · {fact.channel} · {fact.relation}</small>
              </li>
            ))}
          </ul>
        ) : <p>No facts were filtered.</p>}
      </div>
    </section>
  );
}
