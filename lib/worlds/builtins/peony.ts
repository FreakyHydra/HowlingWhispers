import {
  WORLD_LORE_FORMAT,
  WORLD_LORE_VERSION,
  type WorldLorebookV1,
} from "../schema.ts";

export const PEONY_WORLD_ID = "peony";

export const PEONY_WORLD_LORE: WorldLorebookV1 = {
  format: WORLD_LORE_FORMAT,
  version: WORLD_LORE_VERSION,
  worldId: PEONY_WORLD_ID,
  revision: "0.1.0",
  entries: [
    {
      id: "setting-secrecy-and-limits",
      title: "Known setting, secrecy, and limits",
      content: "Peony is an adult succubus whose origin is the Void, but the Void is secret from strangers and is disclosed only after the specific relationship earns sufficient trust. Her former life, succubus companions, private hopes, and sensitive preferences are likewise not public knowledge. The established settings are the Garden Between Worlds and a bookcraft workshop; their location relative to the Void, the nature of travel between worlds, and broader mortal or demon geography, societies, rules, and history remain unknown. Mature private material is never general lore and remains gated to an established, mutually chosen adult romantic relationship.",
      triggers: [],
      priority: "mandatory",
      rating: "general",
      constantActivation: true,
      locationTags: [],
      sceneTags: [],
      sourceRefs: ["lib/characters/builtins/peony.ts#knowledge-boundaries", "lib/characters/builtins/peony.ts#adult-intimacy", "app/dreambound-app.tsx#scenes-Peony"],
    },
    {
      id: "location-garden-between-worlds",
      title: "The Garden Between Worlds",
      content: "The Garden Between Worlds is an established greenhouse garden under violet dusk. It contains beds of night-blooming flowers and supports Peony's genuine interest in gardening. Flowers there are described as impossible or as flowers that should not grow, but their species, properties, origin, and the mechanism implied by 'between worlds' are not established.",
      triggers: ["Garden Between Worlds", "greenhouse", "night-blooming flowers", "impossible flowers"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["garden-between-worlds"],
      sceneTags: ["gardening", "greenhouse"],
      sourceRefs: ["app/dreambound-app.tsx#scene-garden-between-worlds", "lib/characters/builtins/peony.ts#interests-and-abilities"],
    },
    {
      id: "location-bookcraft-workshop",
      title: "The bookcraft workshop",
      content: "The established workshop has rain beyond its glass, a long worktable, and physical bookbinding materials including folded signatures, linen thread, bone folders, and book spines. It supports Peony's effort to learn physical bookcraft and make knowledge durable. The workshop's owner, address, surrounding settlement, and connection to the garden are unknown.",
      triggers: ["workshop", "bookcraft", "bookbinding", "linen thread", "bone folder"],
      priority: "normal",
      rating: "general",
      constantActivation: false,
      locationTags: ["bookcraft-workshop"],
      sceneTags: ["bookcraft", "learning"],
      sourceRefs: ["app/dreambound-app.tsx#scene-book-with-no-ending", "lib/characters/builtins/peony.ts#interests-and-abilities"],
    },
    {
      id: "scenario-garden-between-worlds",
      title: "Scenario: The Garden Between Worlds",
      content: "Only when this premise is selected: a guarded first meeting occurs in the greenhouse garden. Peony kneels beside night-blooming flowers with soil on her hands; a half-bound book rests beyond the watering can. She notices the player's footsteps before looking up and asks them to choose between blue and violet binding thread. This invitation to answer is not established trust or disclosure of her origin.",
      triggers: ["The Garden Between Worlds scenario", "blue and violet thread"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["garden-between-worlds"],
      sceneTags: ["scenario:garden-between-worlds", "first meeting"],
      sourceRefs: ["app/dreambound-app.tsx#scene-garden-between-worlds", "lib/characters/builtins/peony.ts#trust-model"],
    },
    {
      id: "scenario-book-with-no-ending",
      title: "Scenario: The Book With No Ending",
      content: "Only when this premise is selected: Peony is trying to bind a difficult book at the workshop and needs another pair of hands, though pride makes her reluctant to call it help. She slides the loose thread toward the player and asks them to hold it. The book's contents, intended recipient, ownership, and whether it literally lacks an ending are not established.",
      triggers: ["The Book With No Ending", "uncooperative book spine"],
      priority: "normal",
      rating: "general",
      constantActivation: false,
      locationTags: ["bookcraft-workshop"],
      sceneTags: ["scenario:book-with-no-ending", "bookcraft"],
      sourceRefs: ["app/dreambound-app.tsx#scene-book-with-no-ending"],
    },
  ],
};

export default PEONY_WORLD_LORE;
