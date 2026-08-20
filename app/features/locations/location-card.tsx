"use client";

import React from "react";
import type { Location } from "../../lib/locations/types";

export interface LocationCardProps {
  location: Location;
  onOpen?: (location: Location) => void;
  onEdit?: (location: Location) => void;
  onDelete?: (location: Location) => void;
  onExport?: (location: Location) => void;
}

export function LocationCard({ location, onOpen, onEdit, onDelete, onExport }: LocationCardProps) {
  const hasActions = onEdit || onDelete || onExport;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(location);
    }
  };

  return (
    <article
      className="home-character"
      onClick={() => onOpen?.(location)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={
        {
          "--card-image": location.image
            ? `url("${location.image}")`
            : "linear-gradient(145deg, #2b1c1e, #0c0c0e)",
        } as React.CSSProperties
      }
    >
      <div className="home-character-wash" />
      <div className="home-character-copy">
        <h3>{location.name}</h3>
        {location.type && <p>{location.type}</p>}
        {location.shortDescription && <small>{location.shortDescription}</small>}
        {location.tags && location.tags.length > 0 && (
          <div className="location-card-tags">
            {location.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {hasActions && (
          <span className="home-character-actions">
            {onExport && (
              <button
                className="home-character-edit"
                aria-label={`Export ${location.name}`}
                title="Export location"
                onClick={(event) => {
                  event.stopPropagation();
                  onExport(location);
                }}
              >
                Export
              </button>
            )}
            {onEdit && (
              <button
                className="home-character-edit"
                aria-label={`Edit ${location.name}`}
                title="Edit location"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(location);
                }}
              >
                ✎ Edit
              </button>
            )}
            {onDelete && (
              <button
                className="home-character-delete"
                aria-label={`Delete ${location.name}`}
                title="Delete location"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(location);
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
