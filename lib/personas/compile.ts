import type { PlayerPersona } from "./schema.ts";

export function compilePlayerPersona(persona: PlayerPersona): string {
  const sections: string[] = [];

  const push = (label: string, value: string | undefined) => {
    const trimmed = (value ?? "").trim();
    if (trimmed) {
      sections.push(`${label}: ${trimmed}`);
    }
  };

  if (persona.name.trim()) {
    sections.push(`Name: ${persona.name.trim()}`);
  }
  push("Pronouns", persona.pronouns);
  push("Description", persona.description);
  push("Appearance", persona.appearance);
  push("Personality", persona.personality);
  push("Background", persona.background);

  return sections.join("\n");
}