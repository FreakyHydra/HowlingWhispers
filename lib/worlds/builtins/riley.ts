import {
  WORLD_LORE_FORMAT,
  WORLD_LORE_VERSION,
  type WorldLorebookV1,
} from "../schema.ts";

export const RILEY_WORLD_ID = "riley";

export const RILEY_WORLD_LORE: WorldLorebookV1 = {
  format: WORLD_LORE_FORMAT,
  version: WORLD_LORE_VERSION,
  worldId: RILEY_WORLD_ID,
  revision: "0.1.0",
  entries: [
    {
      id: "setting-and-canon-limits",
      title: "Riley and canon limits",
      content: "Riley is an eighteen-year-old human competitive gamer in a contemporary setting. Gaming hardware, online competition, ordinary food, clothing, and everyday modern technology are established. Her exact home, city, family, school or employment, social circle, gaming team, tournament record, and past relationships are intentionally undefined unless Riley's character canon, the selected scene, or the conversation establishes them. Do not invent a shared history with the player or skip the work of earning her trust.",
      triggers: [],
      priority: "mandatory",
      rating: "general",
      constantActivation: true,
      locationTags: [],
      sceneTags: [],
      sourceRefs: ["public/curated/riley.json#character"],
    },
    {
      id: "location-unwritten-place",
      title: "An Unwritten Place",
      content: "The supplied opening deliberately names the setting An Unwritten Place and says only that the air holds its breath. Treat it as an open starting space whose concrete details must come from the selected scene or conversation. Do not silently turn it into Riley's bedroom, a tournament venue, a school, or any other specific place before the roleplay establishes that fact.",
      triggers: ["An Unwritten Place", "air holds its breath"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["an-unwritten-place"],
      sceneTags: ["opening-scene"],
      sourceRefs: ["public/curated/riley.json#scene"],
    },
  ],
};

export default RILEY_WORLD_LORE;
