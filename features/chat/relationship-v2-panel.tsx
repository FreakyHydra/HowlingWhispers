"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PERSONA_ID,
  RELATIONSHIP_DIMENSIONS,
  defaultRelationshipDimensions,
  loadRelationships,
  relationshipKey,
  type RelationshipDimensions,
  type RelationshipRecord,
  type RelationshipState,
} from "../../lib/relationships/index.ts";
import { RELATIONSHIPS_UPDATED_EVENT } from "../../lib/relationships/storage.ts";

type RelationshipV2PanelProps = {
  characterId: string;
  characterName: string;
  personaId?: string | null;
  relationshipScore: number;
  fallbackDimensions?: Partial<RelationshipDimensions>;
  fallbackMomentum?: Partial<RelationshipDimensions>;
};

const LABELS: Record<(typeof RELATIONSHIP_DIMENSIONS)[number], string> = {
  trust: "Trust",
  affection: "Affection",
  respect: "Respect",
  fear: "Fear",
  comfort: "Comfort",
  suspicion: "Suspicion",
  attachment: "Attachment",
  protectiveness: "Protectiveness",
  resentment: "Resentment",
  loyalty: "Loyalty",
  familiarity: "Familiarity",
  authority: "Authority",
};

function chooseRecord(
  state: RelationshipState,
  characterId: string,
  personaId: string | null | undefined,
  score: number,
): RelationshipRecord | null {
  const preferredPersonaId = personaId?.trim() || DEFAULT_PERSONA_ID;
  const preferred = state[relationshipKey(characterId, preferredPersonaId)];
  if (preferred) return preferred;

  const candidates = Object.values(state)
    .filter((record) => record.characterId === characterId)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  return candidates.find((record) => record.score === score) ?? candidates[0] ?? null;
}

function mergeDimensions(
  values: Partial<RelationshipDimensions> | undefined,
): RelationshipDimensions {
  return { ...defaultRelationshipDimensions(), ...(values ?? {}) };
}

function meterGeometry(value: number) {
  const normalized = Math.max(-100, Math.min(100, Number.isFinite(value) ? value : 0));
  const width = Math.abs(normalized) / 2;
  return {
    left: normalized < 0 ? 50 - width : 50,
    width,
  };
}

function momentumGlyph(value: number) {
  if (value >= 0.25) return "↑";
  if (value <= -0.25) return "↓";
  return "·";
}

export function RelationshipV2Panel({
  characterId,
  characterName,
  personaId,
  relationshipScore,
  fallbackDimensions,
  fallbackMomentum,
}: RelationshipV2PanelProps) {
  const [record, setRecord] = useState<RelationshipRecord | null>(null);

  const refresh = useCallback(() => {
    setRecord(chooseRecord(loadRelationships(), characterId, personaId, relationshipScore));
  }, [characterId, personaId, relationshipScore]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener(RELATIONSHIPS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(RELATIONSHIPS_UPDATED_EVENT, refresh);
  }, [refresh]);

  const dimensions = useMemo(
    () => mergeDimensions(record?.dimensions ?? fallbackDimensions),
    [record?.dimensions, fallbackDimensions],
  );
  const momentum = record?.momentum ?? fallbackMomentum ?? {};
  const hasV2History = Boolean(
    record?.events.some((event) => Object.keys(event.dimensionDeltas ?? {}).length > 0)
      || Object.values(fallbackDimensions ?? {}).some((value) => typeof value === "number" && value !== 0),
  );

  return (
    <details className="rs-v2-panel" open>
      <summary>
        <span>
          <strong>RS V2 state</strong>
          <small>{characterName}</small>
        </span>
        <span className="rs-v2-live" title="Updates from the persistent relationship record">
          <i aria-hidden="true" /> live
        </span>
      </summary>

      {!hasV2History && (
        <p className="rs-v2-empty">
          Existing story detected. New character replies will begin building the multidimensional state without resetting this playthrough.
        </p>
      )}

      <div className="rs-v2-dimensions" aria-label={`Relationship dimensions for ${characterName}`}>
        {RELATIONSHIP_DIMENSIONS.map((dimension) => {
          const value = dimensions[dimension] ?? 0;
          const motion = momentum[dimension] ?? 0;
          const geometry = meterGeometry(value);
          return (
            <div className="rs-v2-dimension" key={dimension}>
              <div className="rs-v2-dimension-heading">
                <span>{LABELS[dimension]}</span>
                <span className="rs-v2-dimension-value">
                  <b>{value > 0 ? `+${Math.round(value)}` : Math.round(value)}</b>
                  <i
                    className={motion > 0.24 ? "rising" : motion < -0.24 ? "falling" : "steady"}
                    title={`Momentum ${motion > 0 ? "+" : ""}${motion.toFixed(2)}`}
                    aria-label={`Momentum ${momentumGlyph(motion)}`}
                  >
                    {momentumGlyph(motion)}
                  </i>
                </span>
              </div>
              <div
                className="rs-v2-meter"
                role="meter"
                aria-label={`${LABELS[dimension]} ${Math.round(value)} out of 100`}
                aria-valuemin={-100}
                aria-valuemax={100}
                aria-valuenow={Math.round(value)}
              >
                <span className="rs-v2-center" aria-hidden="true" />
                <span
                  className={`rs-v2-fill ${value < 0 ? "negative" : "positive"}`}
                  style={{ left: `${geometry.left}%`, width: `${geometry.width}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="rs-v2-legend"><span>-100</span><span>neutral</span><span>+100</span></p>
    </details>
  );
}
