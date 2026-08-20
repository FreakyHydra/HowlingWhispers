"use client";

import { useState, useCallback, useMemo } from "react";
import type { CharacterTraits, CustomTrait } from "@/lib/characters/traits";
import { searchTraits, getTraitById } from "@/lib/characters/trait-library";
import { cloneCharacterTraits, isTraitAssigned, removeTrait, addTrait } from "@/lib/characters/traits";

export function TraitSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: CharacterTraits;
  onChange: (traits: CharacterTraits) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const traits = useMemo(() => cloneCharacterTraits(value), [value]);

  const results = useMemo(() => searchTraits(query), [query]);

  const handleAdd = useCallback(
    (id: string, tier: "primary" | "secondary" | "situational") => {
      if (disabled || isTraitAssigned(traits, id)) return;
      onChange(addTrait(traits, id, tier));
    },
    [disabled, traits, onChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(removeTrait(traits, id));
    },
    [traits, onChange],
  );

  const handleMove = useCallback(
    (id: string, tier: "primary" | "secondary" | "situational") => {
      if (isTraitAssigned(traits, id)) return;
      onChange(addTrait(removeTrait(traits, id), id, tier));
    },
    [traits, onChange],
  );

  const handleAddCustom = useCallback(() => {
    const name = customName.trim();
    if (!name || disabled) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const custom: CustomTrait = { id, name, description: customDesc.trim() };
    onChange({
      ...traits,
      custom: [...(traits.custom ?? []), custom],
    });
    setCustomName("");
    setCustomDesc("");
  }, [customName, customDesc, disabled, traits, onChange]);

  const assignedIds = useMemo(
    () => new Set([...traits.primary, ...traits.secondary, ...traits.situational, ...(traits.custom ?? []).map((c) => c.id)]),
    [traits],
  );

  return (
    <div className={`trait-selector${disabled ? " disabled" : ""}`}>
      <label className="trait-search-label">
        <span>Search traits</span>
        <input
          className="trait-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the 111-trait library…"
          disabled={disabled}
        />
      </label>

      <div className="trait-results">
        {results.length === 0 && query.trim() ? (
          <p className="trait-empty">No traits match that search.</p>
        ) : (
          results.map((trait) => {
            const assigned = assignedIds.has(trait.id);
            return (
              <div className="trait-item" key={trait.id}>
                <div className="trait-item-main">
                  <strong>{trait.name}</strong>
                  <small>{trait.description}</small>
                </div>
                <div className="trait-item-actions">
                  <button
                    type="button"
                    disabled={disabled || assigned}
                    onClick={() => handleAdd(trait.id, "primary")}
                  >
                    Add Primary
                  </button>
                  <button
                    type="button"
                    disabled={disabled || assigned}
                    onClick={() => handleAdd(trait.id, "secondary")}
                  >
                    Add Secondary
                  </button>
                  <button
                    type="button"
                    disabled={disabled || assigned}
                    onClick={() => handleAdd(trait.id, "situational")}
                  >
                    Add Situational
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="trait-assigned">
        {["primary", "secondary", "situational"].map((tier) => (
          <div className="trait-tier" key={tier}>
            <h4>{tier === "primary" ? "Core traits" : tier === "secondary" ? "Secondary traits" : "Situational traits"}</h4>
            {traits[tier].length === 0 ? (
              <p className="trait-empty">None selected.</p>
            ) : (
              <ul>
                {traits[tier].map((id) => {
                  const def = getTraitById(id);
                  return (
                    <li key={id}>
                      <span>{def ? def.name : id}</span>
                      <select
                        value={tier}
                        onChange={(e) => handleMove(id, e.target.value as "primary" | "secondary" | "situational")}
                        disabled={disabled}
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="situational">Situational</option>
                      </select>
                      <button type="button" onClick={() => handleRemove(id)} disabled={disabled}>
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="trait-custom-form">
        <h4>Custom traits</h4>
        <label>
          <span>Name</span>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Trait name"
            disabled={disabled}
          />
        </label>
        <label>
          <span>Description</span>
          <input
            type="text"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Short description"
            disabled={disabled}
          />
        </label>
        <button type="button" onClick={handleAddCustom} disabled={disabled || !customName.trim()}>
          Add custom trait
        </button>
        {traits.custom && traits.custom.length > 0 && (
          <ul className="trait-custom-list">
            {traits.custom.map((t) => (
              <li key={t.id}>
                <span>{t.name} — {t.description}</span>
                <button type="button" onClick={() => handleRemove(t.id)} disabled={disabled}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
