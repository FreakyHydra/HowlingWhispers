"use client";

import React, { useState, useCallback } from "react";
import type { Scenario } from "../../lib/scenarios/types";

export type ScenarioFactoryMode = "create" | "edit";

export interface ScenarioFactoryProps {
  mode: ScenarioFactoryMode;
  scenario: Scenario | null;
  onSave: (scenario: Scenario) => void;
  onCancel: () => void;
}

type TabId = "identity" | "situation" | "state" | "connections";

const TABS: { id: TabId; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "situation", label: "Situation" },
  { id: "state", label: "Starting state" },
  { id: "connections", label: "Connections" },
];

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

function ChipSelector({
  available,
  selected,
  onChange,
  label,
}: {
  available: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = available.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="factory-field">
      <label>{label}</label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search…"
      />
      <div className="factory-list-items">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`factory-list-chip ${selectedSet.has(item.id) ? "selected" : ""}`}
            onClick={() => toggle(item.id)}
          >
            {item.name}
            {selectedSet.has(item.id) && <span aria-hidden="true">×</span>}
          </button>
        ))}
        {filtered.length === 0 && <small>No matches.</small>}
      </div>
    </div>
  );
}

export function ScenarioFactory({ mode, scenario, onSave, onCancel }: ScenarioFactoryProps) {
  const [draft, setDraft] = useState<Scenario>(() => {
    if (scenario) return { ...scenario };
    return {
      id: `scenario-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      source: "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  const [activeTab, setActiveTab] = useState<TabId>("identity");

  const update = useCallback((patch: Partial<Scenario>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const saved = {
      ...draft,
      updatedAt: now,
      createdAt: scenario?.createdAt || draft.createdAt || now,
    };
    onSave(saved);
  }, [draft, scenario, onSave]);

  const isDirty = scenario
    ? draft.name !== scenario.name
      || draft.shortDescription !== scenario.shortDescription
      || draft.description !== scenario.description
      || draft.openingSituation !== scenario.openingSituation
      || draft.image !== scenario.image
      || draft.atmosphere !== scenario.atmosphere
      || JSON.stringify(draft.startingConditions) !== JSON.stringify(scenario.startingConditions)
      || JSON.stringify(draft.activeElements) !== JSON.stringify(scenario.activeElements)
      || JSON.stringify(draft.possibleHooks) !== JSON.stringify(scenario.possibleHooks)
      || JSON.stringify(draft.tags) !== JSON.stringify(scenario.tags)
      || draft.linkedWorldId !== scenario.linkedWorldId
      || JSON.stringify(draft.linkedLocationIds) !== JSON.stringify(scenario.linkedLocationIds)
      || JSON.stringify(draft.linkedCharacterIds) !== JSON.stringify(scenario.linkedCharacterIds)
    : draft.name.trim().length > 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal location-factory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-factory-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{mode === "create" ? "Shape a new situation" : "Edit scenario"}</p>
        <h2 id="scenario-factory-title">{mode === "create" ? "Create a scenario" : `Edit ${scenario?.name ?? "scenario"}`}</h2>

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
                  placeholder="What is happening?"
                  autoFocus
                />
              </label>
              <label>
                Short description
                <textarea
                  name="shortDescription"
                  value={draft.shortDescription ?? ""}
                  onChange={(event) => update({ shortDescription: event.target.value })}
                  rows={2}
                  placeholder="A brief summary of the situation."
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
              <div className="factory-field">
                <label>Tags</label>
                <ListEditor
                  items={draft.tags ?? []}
                  onChange={(tags) => update({ tags })}
                  placeholder="Pursuit, storm, festival…"
                />
              </div>
            </div>
          )}

          {activeTab === "situation" && (
            <div className="factory-section">
              <label>
                Full description
                <textarea
                  name="description"
                  value={draft.description ?? ""}
                  onChange={(event) => update({ description: event.target.value })}
                  rows={6}
                  placeholder="Describe the situation in detail."
                />
              </label>
              <label>
                Opening situation
                <textarea
                  name="openingSituation"
                  value={draft.openingSituation ?? ""}
                  onChange={(event) => update({ openingSituation: event.target.value })}
                  rows={5}
                  placeholder="The canonical setup when this scenario begins."
                />
              </label>
              <label>
                Atmosphere
                <textarea
                  name="atmosphere"
                  value={draft.atmosphere ?? ""}
                  onChange={(event) => update({ atmosphere: event.target.value })}
                  rows={2}
                  placeholder="Tension, mystery, urgency…"
                />
              </label>
            </div>
          )}

          {activeTab === "state" && (
            <div className="factory-section">
              <div className="factory-field">
                <label>Starting conditions</label>
                <ListEditor
                  items={draft.startingConditions ?? []}
                  onChange={(startingConditions) => update({ startingConditions })}
                  placeholder="Night has fallen, the roads are flooded…"
                />
                <small>Facts that are true when the scenario begins.</small>
              </div>
              <div className="factory-field">
                <label>Active elements</label>
                <ListEditor
                  items={draft.activeElements ?? []}
                  onChange={(activeElements) => update({ activeElements })}
                  placeholder="A search party is forming, the thieves are returning…"
                />
                <small>Elements already in motion.</small>
              </div>
              <div className="factory-field">
                <label>Possible hooks</label>
                <ListEditor
                  items={draft.possibleHooks ?? []}
                  onChange={(possibleHooks) => update({ possibleHooks })}
                  placeholder="A witness may come forward…"
                />
                <small>Narrative opportunities, not guaranteed events.</small>
              </div>
            </div>
          )}

          {activeTab === "connections" && (
            <div className="factory-section">
              <div className="factory-field">
                <label>Linked world ID</label>
                <input
                  value={draft.linkedWorldId ?? ""}
                  onChange={(event) => update({ linkedWorldId: event.target.value })}
                  placeholder="Optional world identifier"
                />
                <small>Leave blank if this scenario is not tied to a specific world lorebook.</small>
              </div>
              <div className="factory-field">
                <label>Linked location IDs</label>
                <ListEditor
                  items={draft.linkedLocationIds ?? []}
                  onChange={(linkedLocationIds) => update({ linkedLocationIds })}
                  placeholder="location-id-1, location-id-2…"
                />
                <small>Paste or type location IDs. These are metadata links only.</small>
              </div>
              <div className="factory-field">
                <label>Linked contact IDs</label>
                <ListEditor
                  items={draft.linkedCharacterIds ?? []}
                  onChange={(linkedCharacterIds) => update({ linkedCharacterIds })}
                  placeholder="character-id-1, character-id-2…"
                />
                <small>Paste or type character IDs. These are metadata links only.</small>
              </div>
            </div>
          )}

          <div className="character-edit-actions">
            <button type="button" className="outline-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={!isDirty}>
              {mode === "create" ? "Create scenario" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
