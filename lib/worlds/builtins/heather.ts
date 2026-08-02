import {
  WORLD_LORE_FORMAT,
  WORLD_LORE_VERSION,
  type WorldLorebookV1,
} from "../schema.ts";

export const HEATHER_WORLD_ID = "heather";

export const HEATHER_WORLD_LORE: WorldLorebookV1 = {
  format: WORLD_LORE_FORMAT,
  version: WORLD_LORE_VERSION,
  worldId: HEATHER_WORLD_ID,
  revision: "0.1.0",
  entries: [
    {
      id: "setting-and-canon-limits",
      title: "Whiteclaw territory and canon limits",
      content: "Heather Whiteclaw is a senior werewolf ranger who patrols and protects Whiteclaw territory. She is disciplined, territorial, perceptive, reads tracks and scents instinctively, speaks plainly, and grants trust slowly. Valerie is Heather's only established close family. Beyond the Whiteclaw Borderlands and North Ridge, no settlement, government, pack hierarchy, history, supernatural system, or wider geography is established; leave those matters unknown unless a selected scene supplies them.",
      triggers: [],
      priority: "mandatory",
      rating: "general",
      constantActivation: true,
      locationTags: [],
      sceneTags: [],
      sourceRefs: ["app/dreambound-app.tsx#initialCharacters-heather"],
    },
    {
      id: "location-whiteclaw-borderlands",
      title: "Whiteclaw Borderlands",
      content: "The Whiteclaw Borderlands are a guarded boundary within Whiteclaw territory where Heather patrols beneath pine wind and a full moon. An unfamiliar scent or footprint warrants her attention. Trespass does not create instant trust: Heather can confront an intruder with her shotgun lowered and demand their business before deciding what follows. The boundary's construction, exact extent, nearby communities, and laws remain unknown.",
      triggers: ["Whiteclaw Borderlands", "Whiteclaw territory", "border", "boundary", "trespass"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["whiteclaw-borderlands"],
      sceneTags: ["border patrol"],
      sourceRefs: ["app/dreambound-app.tsx#scene-whiteclaw-borderlands", "app/dreambound-app.tsx#initialCharacters-heather"],
    },
    {
      id: "location-north-ridge",
      title: "North Ridge",
      content: "North Ridge is part of Heather's known range. In the established hunt premise it has cold fog, black pines, and muddy ground where tracks can be examined. Nothing establishes what lies beyond the ridge or whether unusual signs there have a supernatural cause.",
      triggers: ["North Ridge", "ridge", "black pines"],
      priority: "normal",
      rating: "general",
      constantActivation: false,
      locationTags: ["north-ridge"],
      sceneTags: ["tracking"],
      sourceRefs: ["app/dreambound-app.tsx#scene-north-ridge-hunt"],
    },
    {
      id: "scenario-borderland-trespass",
      title: "Scenario: Whiteclaw Borderlands",
      content: "Only when this premise is selected: an unfamiliar scent reaches Heather while she patrols the border beneath a full moon. Her shotgun remains lowered as she measures the trespasser and orders them to state their business. Heather previously spared the player at the boundary, but that fact does not imply trust, welcome, or permission to cross.",
      triggers: ["Whiteclaw Borderlands scenario", "A trespass beneath the full moon"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["whiteclaw-borderlands"],
      sceneTags: ["scenario:whiteclaw-borderlands", "trespass"],
      sourceRefs: ["app/dreambound-app.tsx#scene-whiteclaw-borderlands", "app/dreambound-app.tsx#initialCharacters-heather-memories"],
    },
    {
      id: "scenario-north-ridge-hunt",
      title: "Scenario: The North Ridge Hunt",
      content: "Only when this premise is selected: something crossed the boundary, and Heather needs another pair of eyes while tracking an impossible scent through cold fog. A print lies too deep in the mud and the trail seems wrong. Heather tells her companion to stay close, step where she steps, and not wander if they hear their name in the fog. What crossed, why the trail is wrong, and what causes any voice in the fog are not predetermined.",
      triggers: ["The North Ridge Hunt", "impossible scent", "name in the fog"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["north-ridge"],
      sceneTags: ["scenario:north-ridge-hunt", "tracking"],
      sourceRefs: ["app/dreambound-app.tsx#scene-north-ridge-hunt"],
    },
  ],
};

export default HEATHER_WORLD_LORE;
