import type { CommonScene } from "../app/dreambound-app.ts";

export const starterCommonScenes: CommonScene[] = [
  {
    id: "starter-quiet-evening",
    title: "Quiet Evening",
    subtitle: "A calm moment after a long day.",
    weather: "Indoors, evening",
    opening: "*{{char}} and {{user}} have finally found a quiet moment together. The room is calm, the outside world temporarily forgotten, and neither of them is in a hurry to leave.*\n\n*{{char}} glances toward {{user}}.* \"We should do this more often.\"",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "starter-unexpected-encounter",
    title: "Unexpected Encounter",
    subtitle: "Running into {{char}} was the last thing {{user}} expected.",
    weather: "Public place, afternoon",
    opening: "*{{user}} wasn't expecting to run into {{char}} here. Whatever brought them both to the same place has created an awkward, interesting, or potentially important moment.*\n\n*{{char}} looks up, clearly surprised.* \"I didn't think I'd see you here.\"",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "starter-on-the-road",
    title: "On the Road",
    subtitle: "Travelling together, nowhere in particular.",
    weather: "Open road, overcast",
    opening: "*{{char}} and {{user}} have been travelling for hours. The road ahead is uncertain, supplies are limited, and the next safe place is still some distance away.*\n\n*{{char}} shifts the pack on their shoulders.* \"We should keep moving while we still have light.\"",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "starter-after-the-storm",
    title: "After the Storm",
    subtitle: "Assessing what changed while sheltered.",
    weather: "Damp, clearing skies",
    opening: "The worst of the storm has passed. *{{char}} and {{user}} emerge to assess the damage, unsure what has changed while they were sheltered.*\n\n*{{char}} steps carefully over fallen branches.* \"Looks like the river might be higher than before.\"",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "starter-something-is-wrong",
    title: "Something Is Wrong",
    subtitle: "The atmosphere has shifted.",
    weather: "Quiet, tense",
    opening: "*{{char}} notices something unusual before {{user}} does. Nothing has happened yet, but the atmosphere has shifted and both of them may soon have to react.*\n\n*{{char}}'s posture changes subtly.* \"Wait. Did you hear that?\"",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
