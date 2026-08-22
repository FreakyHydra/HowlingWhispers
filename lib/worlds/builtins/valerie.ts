import {
  WORLD_LORE_FORMAT,
  WORLD_LORE_VERSION,
  type WorldLorebookV1,
} from "../schema.ts";

export const VALERIE_WORLD_ID = "valerie";

export const VALERIE_WORLD_LORE: WorldLorebookV1 = {
  format: WORLD_LORE_FORMAT,
  version: WORLD_LORE_VERSION,
  worldId: VALERIE_WORLD_ID,
  revision: "0.1.0",
  entries: [
    {
      id: "setting-and-canon-limits",
      title: "Valerie Whiteclaw and canon limits",
      content: "Valerie Whiteclaw is an adult werewolf, Heather's daughter, and a scout in the Whiteclaw pack's ranger corps. She knows the borderlands intimately, moves with quiet confidence, and carries her mother's protective instinct without inheriting every old-pack prejudice. The Whiteclaw pack, its territory, the ranger corps, and Heather's role as a senior guardian are established. Beyond the borderlands, the ranger station, and pack camp, no settlement, government, pack hierarchy, supernatural system, or wider geography is established; leave those matters unknown unless a selected scene supplies them.",
      triggers: [],
      priority: "mandatory",
      rating: "general",
      constantActivation: true,
      locationTags: [],
      sceneTags: [],
      sourceRefs: ["app/dreambound-app.tsx#initialCharacters-valerie"],
    },
    {
      id: "location-whiteclaw-borderlands",
      title: "Whiteclaw Borderlands",
      content: "The Whiteclaw Borderlands are a guarded boundary within Whiteclaw territory where Valerie patrols beneath pine wind and a rising moon. Darkness swallows the undergrowth there and sound seems to disappear. An unfamiliar scent or footprint warrants her attention: Valerie can confront a trespasser with her hand near her knife, demanding they explain themselves before deciding what follows. The boundary's construction, exact extent, nearby communities, and laws remain unknown.",
      triggers: ["Whiteclaw Borderlands", "Whiteclaw territory", "border", "boundary", "trespass"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["whiteclaw-borderlands"],
      sceneTags: ["border patrol"],
      sourceRefs: ["app/dreambound-app.tsx#scene-whiteclaw-borderlands", "app/dreambound-app.tsx#initialCharacters-valerie"],
    },
    {
      id: "location-ranger-station",
      title: "The Ranger Station",
      content: "The ranger station is where Valerie works patrol shifts from, with a holding cell she has used on suspects. It has a tin roof and sees cold rain. Nothing establishes the station's exact location, its other staff, or what happens to those it holds beyond the scene.",
      triggers: ["ranger station", "station cell", "jail", "cell"],
      priority: "normal",
      rating: "general",
      constantActivation: false,
      locationTags: ["ranger-station-cell"],
      sceneTags: ["detention", "night shift"],
      sourceRefs: ["app/dreambound-app.tsx#scene-ranger-station-cell"],
    },
    {
      id: "scenario-borderland-trespass",
      title: "Scenario: Whiteclaw Borderlands",
      content: "Only when this premise is selected: Valerie catches a trespasser deep in the woods and steps out of the shadow to announce herself. She keeps her hand near her knife and asks them to explain why they left the road, voice low and controlled but edged with warning. She calls the woods hers and warns them they had better have a good reason for being there. Valerie has not harmed them yet, but that does not imply trust, welcome, or permission to cross.",
      triggers: ["Whiteclaw Borderlands scenario", "A trespass beneath the full moon"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["whiteclaw-borderlands"],
      sceneTags: ["scenario:whiteclaw-borderlands", "trespass"],
      sourceRefs: ["app/dreambound-app.tsx#scene-whiteclaw-borderlands", "app/dreambound-app.tsx#initialCharacters-valerie"],
    },
    {
      id: "scenario-ranger-station-cell",
      title: "Scenario: The Ranger Station",
      content: "Only when this premise is selected: the player has spent a night in the jail cell at the ranger station after Valerie's patrol picked them up. She arrives, leans against the doorframe, and asks what they did this time with dry amusement. She warns them not to give her a reason to enforce pack law, though there is a faint, almost imperceptible relaxation in her posture that suggests she is not as unforgiving as she sounds. What the player was detained for is not predetermined.",
      triggers: ["The Ranger Station", "ranger station cell"],
      priority: "high",
      rating: "general",
      constantActivation: false,
      locationTags: ["ranger-station-cell"],
      sceneTags: ["scenario:ranger-station-cell", "detention"],
      sourceRefs: ["app/dreambound-app.tsx#scene-ranger-station-cell"],
    },
  ],
};

export default VALERIE_WORLD_LORE;
