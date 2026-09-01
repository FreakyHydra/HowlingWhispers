"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_PERSONA_ID,
  RELATIONSHIP_DIMENSIONS,
  defaultRelationshipDimensions,
  getRelationshipsSnapshot,
  loadRelationships,
  relationshipKey,
  subscribeRelationshipUpdates,
  type RelationshipDimensions,
  type RelationshipRecord,
  type RelationshipState,
} from "../../lib/relationships/index.ts";

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
  if (preferred?.score === score) return preferred;

  const candidates = Object.values(state)
    .filter((record) => record.characterId === characterId)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  return candidates.find((record) => record.score === score) ?? preferred ?? candidates[0] ?? null;
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
  const storageSnapshot = useSyncExternalStore(
    subscribeRelationshipUpdates,
    getRelationshipsSnapshot,
    () => "",
  );
  const relationshipState = useMemo(() => {
    void storageSnapshot;
    return loadRelationships();
  }, [storageSnapshot]);
  const record = chooseRecord(relationshipState, characterId, personaId, relationshipScore);

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
      <style>{`
        .rs-v2-panel {
          border-top: 1px solid rgba(183, 101, 63, 0.22);
          margin-top: 14px;
          padding-top: 12px;
        }
        .rs-v2-panel > summary {
          align-items: center;
          cursor: pointer;
          display: flex;
          gap: 10px;
          justify-content: space-between;
          list-style: none;
          user-select: none;
        }
        .rs-v2-panel > summary::-webkit-details-marker { display: none; }
        .rs-v2-panel > summary > span:first-child {
          display: grid;
          gap: 1px;
        }
        .rs-v2-panel > summary strong {
          color: var(--cream);
          font-family: var(--serif);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: .04em;
        }
        .rs-v2-panel > summary small {
          color: var(--muted);
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .rs-v2-live {
          align-items: center;
          color: var(--rune);
          display: inline-flex;
          font-size: 9px;
          font-weight: 600;
          gap: 5px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .rs-v2-live i {
          background: currentColor;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
          height: 5px;
          width: 5px;
        }
        .rs-v2-empty {
          background: rgba(69, 184, 179, 0.055);
          border-left: 1px solid rgba(69, 184, 179, 0.42);
          color: var(--muted);
          font-size: 10px;
          line-height: 1.45;
          margin: 10px 0 4px;
          padding: 7px 8px;
        }
        .rs-v2-dimensions {
          display: grid;
          gap: 7px;
          margin-top: 11px;
        }
        .rs-v2-dimension-heading {
          align-items: center;
          color: var(--body);
          display: flex;
          font-size: 10px;
          justify-content: space-between;
          letter-spacing: .035em;
          margin-bottom: 3px;
        }
        .rs-v2-dimension-value {
          align-items: center;
          display: inline-flex;
          gap: 5px;
          min-width: 39px;
          justify-content: flex-end;
        }
        .rs-v2-dimension-value b {
          color: var(--cream);
          font-size: 9px;
          font-variant-numeric: tabular-nums;
          font-weight: 500;
        }
        .rs-v2-dimension-value i {
          font-style: normal;
          font-weight: 700;
          width: 8px;
        }
        .rs-v2-dimension-value i.rising { color: var(--copper-bright); }
        .rs-v2-dimension-value i.falling { color: var(--rune); }
        .rs-v2-dimension-value i.steady { color: var(--muted); }
        .rs-v2-meter {
          background:
            linear-gradient(90deg, transparent 49.7%, rgba(242, 222, 194, .28) 49.7% 50.3%, transparent 50.3%),
            rgba(255, 255, 255, .035);
          border: 1px solid rgba(183, 101, 63, .12);
          height: 7px;
          overflow: hidden;
          position: relative;
        }
        .rs-v2-fill {
          bottom: 0;
          position: absolute;
          top: 0;
          transition: left 260ms ease, width 260ms ease;
        }
        .rs-v2-fill.positive {
          background: linear-gradient(90deg, rgba(183, 101, 63, .34), rgba(215, 138, 94, .9));
        }
        .rs-v2-fill.negative {
          background: linear-gradient(90deg, rgba(69, 184, 179, .82), rgba(69, 184, 179, .28));
        }
        .rs-v2-center {
          background: rgba(242, 222, 194, .35);
          bottom: -1px;
          left: calc(50% - .5px);
          pointer-events: none;
          position: absolute;
          top: -1px;
          width: 1px;
          z-index: 2;
        }
        .rs-v2-legend {
          color: var(--muted);
          display: flex;
          font-size: 8px;
          justify-content: space-between;
          letter-spacing: .06em;
          margin: 5px 0 0;
          opacity: .72;
          text-transform: uppercase;
        }
      `}</style>
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
