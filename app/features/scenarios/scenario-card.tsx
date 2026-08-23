"use client";

import React from "react";
import type { Scenario } from "../../lib/scenarios/types";

export interface ScenarioCardProps {
  scenario: Scenario;
  onOpen?: (scenario: Scenario) => void;
  onEdit?: (scenario: Scenario) => void;
  onDelete?: (scenario: Scenario) => void;
  onExport?: (scenario: Scenario) => void;
}

export function ScenarioCard({ scenario, onOpen, onEdit, onDelete, onExport }: ScenarioCardProps) {
  const hasActions = onEdit || onDelete || onExport;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(scenario);
    }
  };

  return (
    <article
      className="home-character library-card library-card--scenario"
      onClick={() => onOpen?.(scenario)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={
        {
          "--card-image": scenario.image
            ? `url("${scenario.image}")`
            : "linear-gradient(145deg, #1c2b1e, #0c0e0c)",
          "--character-accent": "#d78a5e",
        } as React.CSSProperties
      }
    >
      <div className="home-character-wash" />
      <div className="home-character-copy">
        <span className="home-character-status">
          <i /> Scenario
        </span>
        <h3>{scenario.name}</h3>
        {scenario.shortDescription && <p>{scenario.shortDescription}</p>}
        {scenario.atmosphere && <small>{scenario.atmosphere}</small>}
        {scenario.tags && scenario.tags.length > 0 && (
          <div className="location-card-tags">
            {scenario.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.(scenario);
          }}
        >
          Begin scenario <span aria-hidden="true">→</span>
        </button>
        {hasActions && (
          <span className="home-character-actions">
            {onExport && (
              <button
                className="home-character-edit"
                aria-label={`Export ${scenario.name}`}
                title="Export scenario"
                onClick={(event) => {
                  event.stopPropagation();
                  onExport(scenario);
                }}
              >
                Export
              </button>
            )}
            {onEdit && (
              <button
                className="home-character-edit"
                aria-label={`Edit ${scenario.name}`}
                title="Edit scenario"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(scenario);
                }}
              >
                ✎ Edit
              </button>
            )}
            {onDelete && (
              <button
                className="home-character-delete"
                aria-label={`Delete ${scenario.name}`}
                title="Delete scenario"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(scenario);
                }}
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
