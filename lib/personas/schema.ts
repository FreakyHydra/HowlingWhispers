export type PlayerPersona = {
  id: string;
  name: string;
  pronouns?: string;
  description: string;
  appearance?: string;
  personality?: string;
  background?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
};

export const PERSONA_TEXT_LIMIT = 4000;

export function newPersonaId(seed = Date.now()): string {
  return `persona-${seed.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createPersona(input: {
  name: string;
  pronouns?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  avatar?: string;
}): PlayerPersona {
  const now = Date.now();
  return {
    id: newPersonaId(now),
    name: input.name.trim() || "Unnamed persona",
    pronouns: input.pronouns?.trim() || undefined,
    description: input.description?.trim() || "",
    appearance: input.appearance?.trim() || undefined,
    personality: input.personality?.trim() || undefined,
    background: input.background?.trim() || undefined,
    avatar: input.avatar?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function clonePersona(persona: PlayerPersona): PlayerPersona {
  const now = Date.now();
  return {
    ...persona,
    id: newPersonaId(now),
    name: `${persona.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function isBlankPersona(persona: PlayerPersona): boolean {
  return (
    !persona.name.trim() &&
    !(persona.pronouns ?? "").trim() &&
    !persona.description.trim() &&
    !(persona.appearance ?? "").trim() &&
    !(persona.personality ?? "").trim() &&
    !(persona.background ?? "").trim()
  );
}
