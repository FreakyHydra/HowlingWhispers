"use client";

import React, { useState, useCallback } from "react";
import type { Location, LocationArea } from "../../lib/locations/types";

export type LocationFactoryMode = "create" | "edit";

export interface LocationFactoryProps {
  mode: LocationFactoryMode;
  location: Location | null;
  onSave: (location: Location) => void;
  onCancel: () => void;
}

type TabId =
  | "identity"
  | "description"
  | "areas"
  | "features"
  | "advanced";

const TABS: { id: TabId; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "description", label: "Description" },
  { id: "areas", label: "Areas" },
  { id: "features", label: "Features" },
  { id: "advanced", label: "Advanced" },
];

const EMPTY_AREA: LocationArea = {
  id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  description: "",
  image: "",
  tags: [],
};

function emptyLocation(): Location {
  return {
    id: `location-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    type: "",
    shortDescription: "",
    description: "",
    image: "",
    areas: [],
    features: [],
    activities: [],
    atmosphere: [],
    occupants: [],
    staffRoles: [],
    accessibilityFeatures: [],
    ageRange: undefined,
    tags: [],
    source: "custom",
    linkedWorldId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="factory-list-editor">
      <div className="factory-list-items">
        {items.map((item, index) => (
          <span key={index} className="factory-list-chip">
            {item}
            <button type="button" onClick={() => remove(index)} aria-label={`Remove ${item}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="factory-list-input">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>
    </div>
  );
}

export function LocationFactory({ mode, location, onSave, onCancel }: LocationFactoryProps) {
  const [draft, setDraft] = useState<Location>(() => {
    if (location) return { ...location };
    return emptyLocation();
  });
  const [activeTab, setActiveTab] = useState<TabId>("identity");

  const update = useCallback((patch: Partial<Location>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const saved = {
      ...draft,
      updatedAt: now,
      createdAt: location?.createdAt || draft.createdAt || now,
    };
    onSave(saved);
  }, [draft, location, onSave]);

  const isDirty = location
    ? draft.name !== location.name
      || draft.type !== location.type
      || draft.shortDescription !== location.shortDescription
      || draft.description !== location.description
      || draft.image !== location.image
      || JSON.stringify(draft.areas) !== JSON.stringify(location.areas)
      || JSON.stringify(draft.features) !== JSON.stringify(location.features)
      || JSON.stringify(draft.activities) !== JSON.stringify(location.activities)
      || JSON.stringify(draft.atmosphere) !== JSON.stringify(location.atmosphere)
      || JSON.stringify(draft.occupants) !== JSON.stringify(location.occupants)
      || JSON.stringify(draft.staffRoles) !== JSON.stringify(location.staffRoles)
      || JSON.stringify(draft.accessibilityFeatures) !== JSON.stringify(location.accessibilityFeatures)
      || JSON.stringify(draft.ageRange) !== JSON.stringify(location.ageRange)
      || JSON.stringify(draft.tags) !== JSON.stringify(location.tags)
      || draft.linkedWorldId !== location.linkedWorldId
    : draft.name.trim().length > 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal location-factory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-factory-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{mode === "create" ? "Awaken somewhere new" : "Edit location"}</p>
        <h2 id="location-factory-title">{mode === "create" ? "Create a location" : `Edit ${location?.name ?? "location"}`}</h2>

        <div className="character-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
          {activeTab === "identity" && (
            <div className="factory-section">
              <label>
                Name
                <input
                  name="name"
                  required
                  value={draft.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Where is this place?"
                  autoFocus
                />
              </label>
              <label>
                Type / Category
                <input
                  name="type"
                  value={draft.type ?? ""}
                  onChange={(event) => update({ type: event.target.value })}
                  placeholder="House, town, forest, spaceship…"
                />
              </label>
              <label>
                Short description
                <textarea
                  name="shortDescription"
                  value={draft.shortDescription ?? ""}
                  onChange={(event) => update({ shortDescription: event.target.value })}
                  rows={2}
                  placeholder="A brief tagline or summary."
                />
              </label>
              <label>
                Image URL
                <input
                  name="image"
                  value={draft.image ?? ""}
                  onChange={(event) => update({ image: event.target.value })}
                  placeholder="https://..."
                />
              </label>
            </div>
          )}

          {activeTab === "description" && (
            <div className="factory-section">
              <label>
                Full description
                <textarea
                  name="description"
                  value={draft.description ?? ""}
                  onChange={(event) => update({ description: event.target.value })}
                  rows={6}
                  placeholder="Describe this place in detail."
                />
              </label>
              <label>
                Atmosphere
                <textarea
                  name="atmosphere"
                  value={draft.atmosphere?.join("\n") ?? ""}
                  onChange={(event) => update({ atmosphere: event.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  rows={3}
                  placeholder="One atmosphere note per line."
                />
              </label>
            </div>
          )}

          {activeTab === "areas" && (
            <div className="factory-section">
              <p className="factory-section-help">
                Sublocations inside this place. These are descriptive only.
              </p>
              {(draft.areas ?? []).map((area, index) => (
                <div key={area.id} className="factory-area-card">
                  <label>
                    Name
                    <input
                      value={area.name}
                      onChange={(event) => {
                        const next = [...(draft.areas ?? [])];
                        next[index] = { ...area, name: event.target.value };
                        update({ areas: next });
                      }}
                      placeholder="Area name"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={area.description ?? ""}
                      onChange={(event) => {
                        const next = [...(draft.areas ?? [])];
                        next[index] = { ...area, description: event.target.value };
                        update({ areas: next });
                      }}
                      rows={2}
                    />
                  </label>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => {
                      update({ areas: (draft.areas ?? []).filter((_, i) => i !== index) });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  update({ areas: [...(draft.areas ?? []), { ...EMPTY_AREA }] });
                }}
              >
                + Add area
              </button>
            </div>
          )}

          {activeTab === "features" && (
            <div className="factory-section">
              <div className="factory-field">
                <label>Features</label>
                <ListEditor
                  items={draft.features ?? []}
                  onChange={(features) => update({ features })}
                  placeholder="Stone bridge, old watermill…"
                />
                <small>Physical landmarks or notable elements.</small>
              </div>
              <div className="factory-field">
                <label>Activities</label>
                <ListEditor
                  items={draft.activities ?? []}
                  onChange={(activities) => update({ activities })}
                  placeholder="Fishing, trading, hiking…"
                />
                <small>Things that commonly happen here.</small>
              </div>
              <div className="factory-field">
                <label>Occupants</label>
                <ListEditor
                  items={draft.occupants ?? []}
                  onChange={(occupants) => update({ occupants })}
                  placeholder="Farmers, traders, travelers…"
                />
                <small>Who lives or gathers here.</small>
              </div>
              <div className="factory-field">
                <label>Staff roles</label>
                <ListEditor
                  items={draft.staffRoles ?? []}
                  onChange={(staffRoles) => update({ staffRoles })}
                  placeholder="Ranger, medic, dock worker…"
                />
                <small>Roles that serve or work here.</small>
              </div>
              <div className="factory-field">
                <label>Accessibility features</label>
                <ListEditor
                  items={draft.accessibilityFeatures ?? []}
                  onChange={(accessibilityFeatures) => update({ accessibilityFeatures })}
                  placeholder="Step-free entrance, lift access…"
                />
                <small>Optional. Stay generic.</small>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="factory-section">
              <div className="factory-field">
                <label>Tags</label>
                <ListEditor
                  items={draft.tags ?? []}
                  onChange={(tags) => update({ tags })}
                  placeholder="Wilderness, settlement, rainy…"
                />
              </div>
              <div className="factory-field">
                <label>Linked world ID</label>
                <input
                  value={draft.linkedWorldId ?? ""}
                  onChange={(event) => update({ linkedWorldId: event.target.value })}
                  placeholder="Optional world identifier"
                />
                <small>Leave blank if this location is not tied to a specific world lorebook.</small>
              </div>
              <div className="factory-field">
                <label>Minimum age</label>
                <input
                  type="number"
                  min={0}
                  value={draft.ageRange?.minimum ?? ""}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    update({
                      ageRange: {
                        ...draft.ageRange,
                        minimum: value ? Math.max(0, parseInt(value, 10) || 0) : undefined,
                      },
                    });
                  }}
                />
              </div>
              <div className="factory-field">
                <label>Maximum age</label>
                <input
                  type="number"
                  min={0}
                  value={draft.ageRange?.maximum ?? ""}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    update({
                      ageRange: {
                        ...draft.ageRange,
                        maximum: value ? Math.max(0, parseInt(value, 10) || 0) : undefined,
                      },
                    });
                  }}
                />
              </div>
            </div>
          )}

          <div className="character-edit-actions">
            <button type="button" className="outline-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={!isDirty}>
              {mode === "create" ? "Create location" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
