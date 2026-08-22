import type { Character } from "../../app/dreambound-app.ts";

type ProfileSection = { title: string; body: string | null };

function line(label: string, value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  return `${label}: ${value.trim()}`;
}

function block(title: string, body: string | undefined): ProfileSection | null {
  if (!body || !body.trim()) return null;
  return { title, body: body.trim() };
}

function listBlock(title: string, value: string | undefined): ProfileSection | null {
  if (!value || !value.trim()) return null;
  const items = value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return null;
  return { title, body: items.join(", ") };
}

/**
 * Assembles a single rich description from the structured character fields and
 * the freeform profile. Structured fields never override the authored profile;
 * they extend it. Existing characters without structured data produce the same
 * text as their profile, so this is safe to use as the system description.
 */
export function compileCharacterProfile(character: Character): string {
  const parts: string[] = [];

  if (character.profile && character.profile.trim()) {
    parts.push(character.profile.trim());
  }

  const identityLines = [
    line("Species", character.identity?.species),
    line("Pronouns", character.pronouns),
    line("Actual age", character.ageBehavior?.actualAge),
    line("Age category", character.ageCategory),
    line("Maturity level", character.ageBehavior?.maturityLevel),
    line("Speech age", character.ageBehavior?.speechAge),
    line("Emotional maturity", character.ageBehavior?.emotionalMaturity),
    line("Independence level", character.ageBehavior?.independenceLevel),
  ].filter(Boolean) as string[];
  if (identityLines.length) parts.push(["Identity details", identityLines.join("\n")].join("\n"));

  if (character.ageBehavior?.areasOfExpertise?.trim()) {
    parts.push(block("Areas of expertise", character.ageBehavior.areasOfExpertise)?.body ?? "");
  }
  if (character.ageBehavior?.areasOfKnowledgeGaps?.trim()) {
    parts.push(block("Areas where knowledge is age-appropriate and limited", character.ageBehavior.areasOfKnowledgeGaps)?.body ?? "");
  }
  if (character.ageBehavior?.knowledgeBoundaries?.trim()) {
    parts.push(block("Knowledge boundaries", character.ageBehavior.knowledgeBoundaries)?.body ?? "");
  }
  if (character.ageBehavior?.ageConsistencyInstructions?.trim()) {
    parts.push(block("Age-consistency instructions", character.ageBehavior.ageConsistencyInstructions)?.body ?? "");
  }

  const appearance = character.appearance;
  if (appearance) {
    const lines = [
      block("Height", appearance.height),
      block("Build", appearance.build),
      block("Hair", appearance.hair),
      block("Eyes", appearance.eyes),
      block("Skin", appearance.skin),
      block("Distinguishing features", appearance.distinguishingFeatures),
      block("Clothing and style", appearance.clothing),
      block("General description", appearance.generalDescription),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Appearance", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const personality = character.personality;
  if (personality) {
    const lines = [
      block("Core traits", personality.coreTraits),
      listBlock("Strengths", personality.strengths),
      listBlock("Flaws", personality.flaws),
      listBlock("Weaknesses", personality.weaknesses),
      listBlock("Fears", personality.fears),
      listBlock("Habits", personality.habits),
      listBlock("Quirks", personality.quirks),
      listBlock("Likes", personality.likes),
      listBlock("Dislikes", personality.dislikes),
      block("Temperament", personality.temperament),
      block("Confidence", personality.confidence),
      block("Curiosity", personality.curiosity),
      block("Impulsiveness", personality.impulsiveness),
      block("Social behavior", personality.socialBehavior),
      block("Values and principles", personality.values),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Personality", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const voice = character.voice;
  if (voice) {
    const lines = [
      block("Speech style", voice.speechStyle),
      block("Vocabulary", voice.vocabulary),
      block("Vocabulary level", voice.vocabularyLevel),
      block("Accent and dialect", voice.accentDialect),
      block("Sentence length", voice.sentenceLength),
      block("Slang", voice.slang),
      block("Verbal habits", voice.verbalHabits),
      block("Emotional speech changes", voice.emotionalSpeechChanges),
      block("Phrases to avoid", voice.phrasesToAvoid),
      block("Humor style", voice.humorStyle),
      block("Swearing level", voice.swearingLevel),
      block("Emotional expressiveness", voice.emotionalExpressiveness),
      block("Body language", voice.bodyLanguage),
      block("Mannerisms", voice.mannerisms),
      block("Rarely says or does", voice.rarePhrases),
      block("Example dialogue", voice.exampleDialogue),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Voice and speech", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const knowledge = character.knowledge;
  if (knowledge) {
    const lines = [
      listBlock("Knows well", knowledge.knowsWell),
      listBlock("Knows somewhat", knowledge.knowsSomewhat),
      listBlock("Does not know", knowledge.doesNotKnow),
      listBlock("Hobbies", knowledge.hobbies),
      listBlock("Practical skills", knowledge.practicalSkills),
      listBlock("Academic knowledge", knowledge.academicKnowledge),
      listBlock("Professional knowledge", knowledge.professionalKnowledge),
      listBlock("Misconceptions", knowledge.misconceptions),
      block("Knowledge limits", knowledge.knowledgeLimits),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Knowledge and competence", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const interests = character.interests;
  if (interests) {
    const lines = [
      listBlock("Interests", interests.interests),
      listBlock("Skills", interests.skills),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Interests and skills", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const background = character.background;
  if (background) {
    const lines = [
      block("Biography", background.biography),
      block("Childhood and upbringing", background.childhood),
      block("Important past events", background.importantEvents),
      block("Family", background.family),
      block("Education", background.education),
      block("Occupation and history", background.occupation),
      block("Skills", background.skills),
      block("Secrets", background.secrets),
      block("Formative events", background.trauma),
      block("Current situation", background.currentSituation),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Background", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const rpBehavior = character.rpBehavior;
  if (rpBehavior) {
    const lines = [
      block("Goals", rpBehavior.goals),
      block("Motivations", rpBehavior.motivations),
      block("Boundaries", rpBehavior.boundaries),
      block("Avoids", rpBehavior.avoids),
      block("Pursues", rpBehavior.pursues),
      block("Conflict behavior", rpBehavior.conflictBehavior),
      block("Response to danger", rpBehavior.responseToDanger),
      block("Response to affection", rpBehavior.responseToAffection),
      block("Response to strangers", rpBehavior.responseToStrangers),
      block("Response to authority", rpBehavior.responseToAuthority),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["Roleplay behavior", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  const worldLore = character.worldLore;
  if (worldLore) {
    const lines = [
      block("Setting", worldLore.setting),
      block("Faction", worldLore.faction),
      block("Home", worldLore.home),
      block("Default scenario", worldLore.defaultScenario),
    ].filter(Boolean) as ProfileSection[];
    if (lines.length) {
      parts.push(["World and lore", lines.map((section) => `${section.title}: ${section.body}`).join("\n")].join("\n"));
    }
  }

  return parts.filter(Boolean).join("\n\n");
}
