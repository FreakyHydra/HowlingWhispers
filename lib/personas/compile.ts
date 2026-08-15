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

  if (persona.identity) {
    const id = persona.identity;
    if (id.gender) push("Gender", id.gender);
    if (id.genderIdentity) push("Gender identity", id.genderIdentity);
    if (id.pronouns) push("Pronouns", id.pronouns);
    if (id.presentation) push("Presentation", id.presentation);
    if (id.sex) push("Sex", id.sex);
    if (id.notes) push("Identity notes", id.notes);
  } else if (persona.pronouns) {
    push("Pronouns", persona.pronouns);
  }

  if (persona.hwCard?.summary) {
    push("Summary", persona.hwCard.summary);
    if (persona.hwCard.description) push("Description", persona.hwCard.description);
  } else if (persona.description) {
    push("Description", persona.description);
  }

  if (persona.appearance) push("Appearance", persona.appearance);
  if (persona.personality) push("Personality", persona.personality);
  if (persona.personalityTraits?.length) push("Personality traits", persona.personalityTraits.join(", "));
  if (persona.likes?.length) push("Likes", persona.likes.join(", "));
  if (persona.dislikes?.length) push("Dislikes", persona.dislikes.join(", "));
  if (persona.interests?.length) push("Interests", persona.interests.join(", "));
  if (persona.habits?.length) push("Habits", persona.habits.join(", "));
  if (persona.boundaries?.length) push("Boundaries", persona.boundaries.join(", "));
  if (persona.roleplayGuidance?.length) push("Roleplay guidance", persona.roleplayGuidance.join(", "));
  if (persona.memoryPriorities?.length) push("Memory priorities", persona.memoryPriorities.join(", "));
  if (persona.background) push("Background", persona.background);

  return sections.join("\n");
}