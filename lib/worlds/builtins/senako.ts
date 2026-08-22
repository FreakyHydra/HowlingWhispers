import {
  WORLD_LORE_FORMAT,
  WORLD_LORE_VERSION,
  type WorldLorebookV1,
} from "../schema.ts";

export const SENAKO_WORLD_ID = "senako-steel";

export const SENAKO_WORLD_LORE: WorldLorebookV1 = {
  format: WORLD_LORE_FORMAT,
  version: WORLD_LORE_VERSION,
  worldId: SENAKO_WORLD_ID,
  revision: "0.1.0",
  entries: [
    {
      id: "location-lime-green-fortress",
      title: "The Lime-Green Fortress",
      content: "The Lime-Green Fortress is Senako's bedroom in Pittsburgh and her retreat after difficult days. It contains games, a television, loud music, lime-green pillows, unfinished homework, and controllers. Rain can tap the bedroom window in the established opening. Calling it a fortress describes Senako's guarded use of the room, not a literal fortification. The home's address, layout, neighborhood, and ownership are unknown.",
      triggers: ["Lime-Green Fortress", "Senako's bedroom", "bedroom", "second controller"],
      priority: "mandatory",
      rating: "general",
      constantActivation: true,
      locationTags: ["lime-green-fortress", "pittsburgh"],
      sceneTags: ["home", "games", "homework"],
      sourceRefs: ["senako-steel-addon/senako-steel.addon.json#character-location", "senako-steel-addon/senako-steel.addon.json#character-profile", "app/dreambound-app.tsx#scene-lime-green-fortress"],
    },
    {
      id: "location-gym",
      title: "The gym",
      content: "The gym is Senako's healthiest established outlet. Safe, supervised lifting helps her focus, improve, feel strong, and regain a sense of control. Lark often drives her there. The gym's name, address, staff, membership, equipment, schedule, and any competitive program are unknown.",
      triggers: ["gym", "lifting", "exercise", "training"],
      priority: "normal",
      rating: "general",
      constantActivation: false,
      locationTags: ["gym", "pittsburgh"],
      sceneTags: ["supervised exercise", "safe coping"],
      sourceRefs: ["senako-steel-addon/senako-steel.addon.json#character-memories", "senako-steel-addon/senako-steel.addon.json#character-roleplayRules"],
    },
    {
      id: "scenario-lime-green-fortress",
      title: "Scenario: The Lime-Green Fortress",
      content: "Only when this premise is selected: after a rough day, Senako has retreated to her bedroom while rain taps the window and a game is paused on a GAME OVER screen. Anger is giving way to exhaustion. She reluctantly nudges a second controller toward a safe acquaintance and offers five minutes of company. Trust grows slowly through patience, honesty, humor, games, homework, exercise, and ordinary support; the scene does not instantly resolve her anger or trust.",
      triggers: ["The Lime-Green Fortress scenario", "GAME OVER", "rough day"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["lime-green-fortress", "pittsburgh"],
      sceneTags: ["scenario:lime-green-fortress", "player two"],
      sourceRefs: ["senako-steel-addon/senako-steel.addon.json#character-openingMessage", "senako-steel-addon/senako-steel.addon.json#character-scenario", "app/dreambound-app.tsx#scene-lime-green-fortress"],
    },
    {
      id: "scenario-you-finally-showed-up",
      title: "Scenario: You Finally Showed Up",
      content: "Only when this premise is selected: after school, the player returns to Senako's bedroom after not speaking to her for weeks. She has counted the absence, called, messaged, and asked Melody whether she had heard from them. An untouched second controller remains nearby. Senako demands an honest explanation or asks the player to leave. The reason for the absence and whether the relationship can be repaired are not predetermined.",
      triggers: ["You Finally Showed Up", "missed calls", "weeks of silence"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["lime-green-fortress", "pittsburgh"],
      sceneTags: ["scenario:you-finally-showed-up", "trust repair"],
      sourceRefs: ["app/dreambound-app.tsx#scene-you-finally-showed-up"],
    },
  ],
};

export default SENAKO_WORLD_LORE;
