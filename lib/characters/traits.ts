export type TraitTier = "primary" | "secondary" | "situational";

export type CharacterTraitAssignment = {
  id: string;
  tier: TraitTier;
};

export type CustomTrait = {
  id: string;
  name: string;
  description: string;
};

export type CharacterTraits = {
  primary: string[];
  secondary: string[];
  situational: string[];
  custom?: CustomTrait[];
};

export const EMPTY_CHARACTER_TRAITS: CharacterTraits = {
  primary: [],
  secondary: [],
  situational: [],
  custom: [],
};

export function cloneCharacterTraits(traits: CharacterTraits | undefined): CharacterTraits {
  if (!traits) return { ...EMPTY_CHARACTER_TRAITS };
  return {
    primary: [...traits.primary],
    secondary: [...traits.secondary],
    situational: [...traits.situational],
    custom: traits.custom ? traits.custom.map((t) => ({ ...t })) : [],
  };
}

export function isTraitAssigned(traits: CharacterTraits | undefined, id: string): boolean {
  if (!traits) return false;
  return traits.primary.includes(id) || traits.secondary.includes(id) || traits.situational.includes(id);
}

export function removeTrait(traits: CharacterTraits, id: string): CharacterTraits {
  return {
    primary: traits.primary.filter((t) => t !== id),
    secondary: traits.secondary.filter((t) => t !== id),
    situational: traits.situational.filter((t) => t !== id),
    custom: traits.custom?.filter((t) => t.id !== id),
  };
}

export function addTrait(traits: CharacterTraits, id: string, tier: TraitTier): CharacterTraits {
  const cleaned = removeTrait(traits, id);
  return {
    ...cleaned,
    [tier]: [...cleaned[tier], id],
  };
}

export function normalizeCustomTraits(traits: CharacterTraits): CharacterTraits {
  const seen = new Set<string>();
  const custom: CustomTrait[] = [];
  for (const trait of traits.custom ?? []) {
    const id = trait.id?.trim();
    const name = trait.name?.trim();
    const description = trait.description?.trim() ?? "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    custom.push({ id, name, description });
  }
  return { ...traits, custom };
}

export function sanitizeTraits(traits: CharacterTraits | undefined): CharacterTraits {
  if (!traits) return { ...EMPTY_CHARACTER_TRAITS };
  const seen = new Set<string>();
  const custom: CustomTrait[] = [];
  for (const t of traits.custom ?? []) {
    const id = typeof t.id === "string" ? t.id.trim().slice(0, 120) : "";
    const name = typeof t.name === "string" ? t.name.trim().slice(0, 80) : "";
    const description = typeof t.description === "string" ? t.description.trim().slice(0, 240) : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    custom.push({ id, name, description });
  }
  return {
    primary: traits.primary.filter((t): t is string => typeof t === "string").slice(0, 20),
    secondary: traits.secondary.filter((t): t is string => typeof t === "string").slice(0, 20),
    situational: traits.situational.filter((t): t is string => typeof t === "string").slice(0, 20),
    custom: custom.slice(0, 10),
  };
}
