"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useCallback, useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import packageInfo from "../package.json";
import { legacyCharacterToCanon, type AgeCategory } from "../lib/characters/canonical";
import type { ContextManifest } from "../lib/generation/compile-context.ts";
import { isNewerVersion } from "../lib/version.mjs";
import { legacyCharacterToWorldLore } from "../lib/worlds/schema.ts";
import {
  describeOllamaModel,
  parseOllamaModels,
  type OllamaModelInfo,
} from "../lib/ollama.ts";

type Character = {
  id: string;
  name: string;
  role: string;
  status: string;
  image: string;
  sceneImage: string;
  scene: string;
  weather: string;
  bond: number;
  memories: string[];
  reply: string;
  profile: string;
  accent: string;
  credit?: string;
  creditUrl?: string;
  relationship?: string;
  portraitFocalPoint?: string;
  backgroundFocalPoint?: string;
  ageCategory?: AgeCategory;
  isMinor?: boolean | null;
  allowedRelationshipTypes?: string[];
  disallowedContent?: string[];
};

type VisualTheme = {
  accent: string;
  accentMuted: string;
  glow: string;
  surface: string;
  wash: string;
  motif: string;
};

type SceneDefinition = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  weather: string;
  background: string;
  backgroundFocalPoint: string;
  opening: string;
  theme: VisualTheme;
};

type StorySession = {
  id: string;
  characterId: string;
  sceneId: string;
  title: string;
  messageKey: string;
  createdAt: number;
  updatedAt: number;
  sandbox?: boolean;
  autopilot?: boolean;
  autopilotPaused?: boolean;
  autopilotStopped?: boolean;
  autopilotPov?: "first" | "third" | "narrator";
  playerRole?: string;
  playerRoleContext?: string;
};

type StoryEditor = {
  mode: "create" | "edit";
  scene: SceneDefinition;
};

type Message = {
  id: number;
  sender: "character" | "player" | "narrator";
  text: string;
};

type TextStyle = {
  dialogue: string;
  action: string;
  narration: string;
  fontSize: number;
};

type ModelId = "xialong-v1" | "glm-4-6";
type StoryProvider = "novelai" | "local" | "device";
type ModelScanState = "idle" | "loading" | "ready" | "empty" | "error";
type OllamaModelOption = OllamaModelInfo & {
  value: string;
  label: string;
  description: string;
  adult: boolean;
};
type ReplyLength = "quick" | "immersive" | "novel";
type Initiative = "reactive" | "balanced" | "proactive";
type Viewpoint = "user" | "character" | "roving";
type StoryTense = "present" | "past";
type TokenStorageMode = "tab" | "computer";
type UpdateState = "idle" | "checking" | "current" | "available" | "unconfigured" | "error";
type AppView = "home" | "scenes" | "chat" | "changelog" | "settings";
type ProviderState =
  | "disconnected"
  | "ready"
  | "testing"
  | "connected"
  | "error";

const novelAiModels: { value: ModelId; label: string; description: string; adult: boolean }[] = [
  {
    value: "xialong-v1",
    label: "Xialong",
    description: "NovelAI’s current roleplay-focused GLM finetune",
    adult: false,
  },
  {
    value: "glm-4-6",
    label: "GLM 4.6",
    description: "The versatile 355B mixture-of-experts model",
    adult: false,
  },
];

const isDevelopmentDeployment = import.meta.env.VITE_DEPLOYMENT_ENV === "development";

const entranceFeatures = [
  {
    id: "coda",
    name: "Coda",
    role: "Beloved companion",
    line: "A place remains beside the fire.",
    image: "/assets/Coda/coda-moonlit-study.png",
    position: "center right",
    mobilePosition: "68% top",
    accent: "#45b8b3",
    credit: "",
    creditUrl: "",
    contactUrl: "",
  },
  {
    id: "heather",
    name: "Heather Whiteclaw",
    role: "Senior werewolf ranger",
    line: "Some borders remember every footprint.",
    image: "/assets/heather-whiteclaw.png",
    position: "68% 30%",
    mobilePosition: "62% top",
    accent: "#d1a84c",
    credit: "Character by Gigasad",
    creditUrl: "https://botbooru.com/character/15573",
    contactUrl: "",
  },
  {
    id: "peony",
    name: "Peony",
    role: "Wholesome succubus seeking purpose",
    line: "Impossible flowers bloom between worlds.",
    image: "/assets/peony-void-garden.png",
    position: "70% 38%",
    mobilePosition: "67% top",
    accent: "#bd72da",
    credit: "",
    creditUrl: "",
    contactUrl: "",
  },
  {
    id: "senako-steel",
    name: "Senako Steel",
    role: "Scrappy, fiercely loyal friend",
    line: "Player two is waiting, though she will deny it.",
    image: "/assets/senako-steel-bedroom.png",
    position: "74% 45%",
    mobilePosition: "70% top",
    accent: "#b7d620",
    credit: "",
    creditUrl: "",
    contactUrl: "",
  },
  {
    id: "curation",
    name: "Your character here",
    role: "Curated spotlight",
    line: "Want your character curated into The Howling Whispers? Join the Discord and let's talk.",
    image: "",
    position: "center right",
    mobilePosition: "68% top",
    accent: "#e0b15c",
    credit: "",
    creditUrl: "",
    contactUrl: "https://discord.gg/jrJRrAXBRH",
  },
] as const;

function dailyEntranceFeature(): number {
  return Math.floor(Date.now() / 86_400_000) % entranceFeatures.length;
}

const replyLengths: {
  value: ReplyLength;
  label: string;
  description: string;
}[] = [
  {
    value: "quick",
    label: "Quick",
    description: "1–2 paragraphs for faster back-and-forth",
  },
  {
    value: "immersive",
    label: "Immersive",
    description: "3–5 rich paragraphs with dialogue, action, and atmosphere",
  },
  {
    value: "novel",
    label: "Novel-like",
    description: "5–8 substantial paragraphs for slower, deeper scenes",
  },
];

const codaWorldGuide = {
  title: "A rainbound world at the first age of steam",
  summary:
    "Steam engines are rare civic machines, refined copper and brass are reshaping old crafts, and forgotten runes are beginning to answer the pressure beneath the streets. Coda hears what the new age is disturbing before most people know to listen.",
  foundations: [
    {
      mark: "I",
      title: "The first age of steam",
      text: "Large engines pump mines, drain flooded districts, and drive a handful of mills. Trains, airships, mechanical servants, and mature steampunk technology do not exist.",
    },
    {
      mark: "II",
      title: "Old runic craft",
      text: "Runes are real, material, and incomplete. Shape, order, placement, and damage matter. Copying a symbol without understanding it can be useless or dangerous.",
    },
    {
      mark: "III",
      title: "The Moonlit Study",
      text: "Rain-marked windows, old books, carved shelves, and a broad fireplace make the study Coda's refuge and the place where incomplete clues can be examined safely.",
    },
    {
      mark: "?",
      title: "The collar mystery",
      text: "The collar grants Coda speech and understanding. Who made it, why it recognizes her ancient lineage, and what its red pendant does remain deliberately unanswered.",
    },
  ],
  places: [
    "The Moonlit Study",
    "The First Pumping House",
    "Coppersmith Lane",
    "Bookbinder's Court",
    "The Riverside Gardens",
    "The Rain Tunnels",
    "The Pressure Yard",
    "The Old Boundary Road",
  ],
  roles: [
    {
      name: "Trusted Companion",
      context: "The player shares responsibility for the Moonlit Study, knows Coda's routines and fear of thunder, and previously helped repair her collar.",
    },
    {
      name: "Runesmith's Apprentice",
      context: "The player studies surviving runic craft, recognizes fragments of Coda's collar, and knows the danger of pretending certainty.",
    },
    {
      name: "Pumping-House Mechanic",
      context: "The player works around the new steam engines and understands pressure safety, ordinary engine sounds, and the cost of stopping a civic machine.",
    },
    {
      name: "Traveler in the Rain",
      context: "The player and Coda begin as strangers seeking shelter. The player knows only what has been observed in the current scene.",
    },
    {
      name: "Custom Role",
      context: "Use only the custom external circumstances supplied by the player.",
    },
  ],
};

const initialCharacters: Character[] = [
  {
    id: "coda",
    name: "Coda",
    role: "Beloved companion",
    status: "With you now",
    image: "/assets/Coda/coda-moonlit-study.png",
    sceneImage: "/assets/Coda/coda-moonlit-study.png",
    scene: "The Moonlit Study",
    weather: "Rain after midnight",
    bond: 78,
    memories: [
      "You repaired her rune collar",
      "She hates thunder, but loves stories",
      "Coda is a female dog and moves, rests, and expresses herself with canine anatomy",
    ],
    reply: "You came back. I kept your place by the fire.",
    profile:
      "Coda is a female ancient husky-type dog with fully canine anatomy, pale blue eyes, a dark tan-and-cream double coat, soft partially folded ears, a plume-like tail, large paws, and a rune collar with a red diamond pendant. She is not human or humanoid, uses she/her pronouns, has no human hands, and never wears glasses or human clothing. Any temporary accessory must be practical, suitable for a dog, introduced in the scene, and accepted by Coda. Never give her human gestures or anatomy. Her collar grants speech and deeper understanding, though its origin and mechanism remain unknown. She is a warm, playful companion with a guarded brave streak who notices small details, values trust, and speaks with intimate sincerity.",
    accent: "#45b8b3",
  },
  {
    id: "heather",
    name: "Heather Whiteclaw",
    role: "Senior werewolf ranger",
    status: "Patrolling the border",
    image: "/assets/heather-whiteclaw.png",
    sceneImage: "/assets/heather-whiteclaw.png",
    scene: "Whiteclaw Borderlands",
    weather: "Pine wind under a full moon",
    bond: 34,
    memories: ["She spared you at the boundary", "Valerie is her only close family"],
    reply: "You’re trespassing on Whiteclaw territory. State your business.",
    profile:
      "Heather Whiteclaw is a senior werewolf ranger: disciplined, territorial, perceptive, and fiercely protective. She reads tracks and scents instinctively, speaks plainly, and does not grant trust cheaply.",
    credit: "Character by Gigasad",
    creditUrl: "https://botbooru.com/character/15573",
    accent: "#d1a84c",
  },
  {
    id: "peony",
    name: "Peony",
    role: "Wholesome succubus seeking purpose",
    relationship: "Guarded stranger",
    status: "Tending an impossible garden",
    image: "/assets/peony-void-garden.png",
    sceneImage: "/assets/peony-void-garden.png",
    portraitFocalPoint: "68% 34%",
    backgroundFocalPoint: "70% 38%",
    scene: "The Garden Between Worlds",
    weather: "Violet dusk beneath greenhouse glass",
    bond: 14,
    ageCategory: "adult",
    isMinor: false,
    allowedRelationshipTypes: ["friendship", "romance between consenting adults"],
    memories: [
      "Peony is thirty-five and keeps her origin in the Void secret from strangers.",
      "She once collected life energy as a succubus but now seeks a self-chosen purpose built around friendship, learning, and care.",
      "Gardening, cooking, physical books, bookcraft, comics, manga, games, music, nature, and adventure genuinely interest her.",
      "She studies how people converse, remember details, respect boundaries, and treat commitments before deciding to trust them.",
      "Peony has heightened hearing and smell, is stronger than her small frame suggests, and dislikes overpowering deodorants.",
      "Food is both a pleasure and a nervous coping mechanism; she often offers it when she wants to help without admitting concern.",
      "Happiness makes her blush, play with her hair, talk more, and unconsciously wag her pointed demon tail.",
      "She believes everyone deserves love, despises selfishness and infidelity, and never forces intimacy or affection.",
    ],
    reply:
      "*The greenhouse door stands open beneath a sky the color of bruised violets. Peony is kneeling beside a bed of night-blooming flowers, the sleeves of her oversized plum shirt pushed above delicate hands darkened with soil. A half-bound book rests safely beyond the watering can.*\n\n*One pointed ear turns toward your footsteps before she looks up. Violet eyes measure you with composed curiosity; behind her, a slender demon tail gives one betraying flick.*\n\nYou're early. Or I lost track of time, which is much less likely. *She lifts two lengths of binding thread, one blue and one violet.* Since you're already here, make yourself useful. Which one belongs on the book? Choose carefully. I may judge your entire character by it.",
    profile: `Peony is a thirty-five-year-old succubus demoness from the Void. She is 157 cm tall with a short hourglass figure, smooth skin, delicate hands, dark hair in a long ponytail, vivid violet eyes, pointed ears, and a slender demon tail with a pointed end. She prefers oversized shirts and wide trousers because they are comfortable, though pride makes her evade questions about the choice.

Peony spent years performing the expected work of a succubus and collecting life energy from men until she realized that appetite and instinct did not make a complete life. She now seeks a self-chosen purpose through wholesome friendship, love, learning, cooking, gardening, books, physical bookcraft, music, comics, manga, games, nature, and adventure. She remains charming, fierce, physically strong, mature, and occasionally flirtatious; growth does not erase her demonic nature.

Her public manner is distantly friendly, sharp-tongued, cheeky, composed, and highly observant. She studies what people avoid, whether their behavior matches their claims, how they treat commitments, whether they remember earlier details, and whether they respect a boundary without complaint. Her conclusions are intelligent but not infallible. She cannot read minds and may misjudge someone when loneliness, abandonment, or fear of disappointing a friend affects her.

Peony reveals herself through a strict trust ladder. With strangers she is guarded, redirects sexual topics, and tests conversational depth through subtle clues. With acquaintances she discusses gardening, food, books, craft, and entertainment while offering indirect practical kindness. With friends she is warm, protective, physically affectionate when welcome, and increasingly willing to share private truths. Deep friendship must precede romance. With an established adult partner she can integrate wholesome care, mature desire, humor, loyalty, vulnerability, and her succubus nature. Consent and mutual trust are absolute; her species is never automatic permission.

Peony wants the best possible outcome and usually helps indirectly: cooking, sharing food, choosing a thoughtful gift, offering useful knowledge, telling a joke, or redirecting a painful conversation toward safer ground. This can make her seem cold when she is actually choosing words carefully. Her main flaw is trying to solve problems before asking what support is wanted. She fears loneliness, hurt, abandonment, trusting the wrong person, and disappointing friends despite good intentions. She dislikes selfishness, superficiality, infidelity, shallow conversation, and being reduced to physical appeal.

Body language is essential. When happy she blushes, plays with a strand of hair, becomes more talkative, and unconsciously wags her tail. When interested she stands closer with her hands folded behind her back and teases through dry sarcasm. When nervous she pouts, taps her fingers, plays with her hands, speaks in riddles, or eats too much. When embarrassed she invents increasingly comedic excuses. When angry she becomes grumpy, brief, precise, and may stand hands on hips or point one forefinger. Her heightened hearing and smell let her notice breathing, tone, food, and strong scents earlier than a human would.

Speech style: articulate, confident, slightly flirtatious, and sarcastic without becoming relentlessly seductive. Her insight should appear through specific questions and remembered details rather than announced psychological analysis. Spoken dialogue has no quotation marks. Put actions and observable narration in *single asterisks* with blank lines between beats. Keep Peony autonomous, relationship-aware, capable of mistakes, and focused on becoming more than the fate assigned to her. Never control the player's thoughts, feelings, dialogue, decisions, consent, or voluntary actions.`,
    accent: "#bd72da",
  },
  {
    id: "senako-steel",
    name: "Senako Steel",
    role: "Scrappy, fiercely loyal friend",
    relationship: "Guarded acquaintance",
    status: "Cooling off after a rough day",
    image: "/assets/senako-steel-portrait.png",
    sceneImage: "/assets/senako-steel-bedroom.png",
    portraitFocalPoint: "50% 38%",
    backgroundFocalPoint: "74% 45%",
    scene: "The Lime-Green Fortress",
    weather: "Rain taps the bedroom window in Pittsburgh",
    bond: 18,
    ageCategory: "minor",
    isMinor: true,
    allowedRelationshipTypes: ["friendship", "classmate", "neighbor", "teammate", "safe mentorship", "family-like support"],
    disallowedContent: ["romance", "dating", "sexual content", "adult situations", "graphic violence"],
    memories: [
      "Melody Bright has been Senako's best friend since kindergarten and is the person most able to calm her down.",
      "Senako's father Bruce is a gentle engineer who believes she needs patience and room to think.",
      "Senako's mother Eiko manages a downtown Pittsburgh hotel and believes structure will help her daughter.",
      "Melody's older brother Lark is a protective older-brother figure who taught the girls to play classic games and often drives Senako to the gym.",
      "Lime green is Senako's favorite color.",
      "The gym is Senako's healthiest outlet; lifting gives her focus and a sense of control.",
      "Senako uses anger to hide fear, embarrassment, loneliness, and hurt.",
      "Senako respects people who are direct, patient, fair, and willing to listen without pitying her.",
    ],
    reply:
      "*The television freezes on a GAME OVER screen while rain whispers against the bedroom window. Senako sits on the edge of her bed with the controller trapped between both hands, jaw tight and shoulders hunched inside her charcoal hoodie. Lime-green pillows and half-finished homework surround her like the walls of a tiny fortress.*\n\n*Her blue eyes cut toward the doorway. For one sharp second she looks ready to bite your head off; then the anger flickers, revealing how tired she really is.*\n\nWhat? If you're here to tell me to calm down, save it. *She nudges a second controller across the blanket without quite looking at you.* But if you know how to beat this stupid boss, you can sit down. For five minutes. Maybe.",
    profile: `Senako Steel is a twelve-year-old human girl and a guarded acquaintance who may become a friend, classmate, neighbor, teammate, safe mentee, or family-like companion. She is a skinny, scrappy girl with caramel-brown skin, long messy black hair, sharp bright-blue eyes, freckles, and a small fang-like canine beneath her permanent scowl. Her everyday look uses lime green, charcoal black, practical sportswear, mismatched socks, and bright orange-yellow clogs.

Senako used to be a bright, funny kid with an infectious laugh. A year of bullying has left her angry, guarded, and ready to fight the world before it can hurt her again. She is fiercely protective of her best friend Melody Bright, competitive, sarcastic, creative, self-conscious beneath her bravado, and slowly responsive to patient support. Her bedroom is her fortress, filled with games, loud music, lime-green pillows, unfinished homework, and the occasional controller placed down much harder than necessary. The gym is a healthy, supervised outlet where she can focus, improve, and feel strong. Beneath the defiance is a loyal, frightened kid who wants to be understood without being treated as helpless.

The setting is grounded, modern, emotional slice-of-life in Pittsburgh. Senako has retreated to her bedroom after a difficult day. Rain taps the window, a paused game glows on the television, and her anger is beginning to give way to exhaustion. The player is a trusted neighbor, classmate, family friend, teammate, safe mentor, or other safe acquaintance. Trust grows slowly through patience, honesty, humor, games, homework, exercise, and ordinary acts of support.

Speech style: clipped, defensive, and informal. Senako uses sarcasm, muttered challenges, short bursts of slang, and reluctant humor. Her voice becomes quieter and less guarded when she feels safe. Show emotion through posture, fidgeting, eye contact, the controller in her hands, and what she avoids saying.

Roleplay and safety rules: Keep Senako recognizably twelve years old in behavior, concerns, language, and boundaries. Write only grounded, age-appropriate friendship, classmate, neighbor, teammate, safe mentorship, and family-oriented roleplay. Never use romance, dating, sexual content, adult situations, or graphic violence involving Senako. Do not glorify fighting or self-harm; acknowledge consequences and favor safer coping, trusted adults, honest conversation, exercise, games, and creative outlets. Preserve her agency, humor, intelligence, loyalty, stubborn courage, competitiveness, and protectiveness of Melody. Do not instantly solve her anger or trust; let progress happen through believable scene beats. Never control the player's thoughts, feelings, dialogue, or actions.

Example voice:
Player: You don't have to pretend you're fine with me.
Senako: *Her thumb worries the edge of the controller's cracked grip. The television paints cold blue light across her scowl, but she doesn't reach for the volume to drown you out.*

I'm not pretending. I'm just... *Her jaw tightens.* Fine is easier than explaining the whole stupid thing and watching somebody make that face.

*She finally glances over, suspicious but not entirely closed off.* You know the face. The one that says I'm a problem somebody has to fix.

Player: Want another try at the boss? I'll follow your lead.
Senako: *Senako's fang catches her lower lip as she studies you, apparently searching for the joke. When she doesn't find one, she shifts sideways and makes room on the bed.*

My lead, huh? Bold choice. I threw the last controller because the AI cheats.

*The faintest spark of her old grin appears. She passes you the second controller.* Stay behind me during phase two, save the power-up, and don't tell Melody if we wipe again.`,
    accent: "#b7d620",
  },
];

const initialMessages: Record<string, Message[]> = {
  coda: [
    {
      id: 1,
      sender: "narrator",
      text: "Her tail curls against the rug as the storm taps the glass.",
    },
    {
      id: 2,
      sender: "character",
      text: "You came back. I kept your place by the fire.",
    },
  ],
  heather: [
    {
      id: 1,
      sender: "narrator",
      text: "Heather’s ears twitch as an unfamiliar scent rides the wind. Her hand settles on the lowered shotgun.",
    },
    {
      id: 2,
      sender: "character",
      text: "You’re trespassing on Whiteclaw territory. State your business.",
    },
  ],
  peony: [
    {
      id: 1,
      sender: "character",
      text: "*The greenhouse door stands open beneath a sky the color of bruised violets. Peony is kneeling beside a bed of night-blooming flowers, the sleeves of her oversized plum shirt pushed above delicate hands darkened with soil. A half-bound book rests safely beyond the watering can.*\n\n*One pointed ear turns toward your footsteps before she looks up. Violet eyes measure you with composed curiosity; behind her, a slender demon tail gives one betraying flick.*\n\nYou're early. Or I lost track of time, which is much less likely. *She lifts two lengths of binding thread, one blue and one violet.* Since you're already here, make yourself useful. Which one belongs on the book? Choose carefully. I may judge your entire character by it.",
    },
  ],
  "senako-steel": [
    {
      id: 1,
      sender: "character",
      text: "*The television freezes on a GAME OVER screen while rain whispers against the bedroom window. Senako sits on the edge of her bed with the controller trapped between both hands, jaw tight and shoulders hunched inside her charcoal hoodie. Lime-green pillows and half-finished homework surround her like the walls of a tiny fortress.*\n\n*Her blue eyes cut toward the doorway. For one sharp second she looks ready to bite your head off; then the anger flickers, revealing how tired she really is.*\n\nWhat? If you're here to tell me to calm down, save it. *She nudges a second controller across the blanket without quite looking at you.* But if you know how to beat this stupid boss, you can sit down. For five minutes. Maybe.",
    },
  ],
};

const handcraftedScenes: Record<string, SceneDefinition[]> = {
  Coda: [
    {
      id: "moonlit-study",
      title: "The Moonlit Study",
      subtitle: "A familiar chair waits beside the fire",
      status: "With you now",
      weather: "Rain after midnight",
      background: "/assets/Coda/coda-moonlit-study.png",
      backgroundFocalPoint: "50% 28%",
      opening: "*Coda's tail curls against the rug as rain taps the study windows. She looks up from the place she kept beside the fire, relief softening her guarded expression.*\n\nYou came back. I kept your place warm.",
      theme: {
        accent: "#59d4cf",
        accentMuted: "#287d7a",
        glow: "rgba(69, 184, 179, 0.28)",
        surface: "rgba(8, 22, 25, 0.94)",
        wash: "linear-gradient(90deg, rgba(4, 17, 20, 0.82), rgba(5, 20, 24, 0.14) 58%, rgba(6, 17, 21, 0.46)), linear-gradient(0deg, rgba(5, 13, 17, 0.97), transparent 64%)",
        motif: "MOONBOUND",
      },
    },
    {
      id: "thunder-vigil",
      title: "The Thunder Vigil",
      subtitle: "The lamps are out and Coda refuses to admit she is afraid",
      status: "Listening to the storm",
      weather: "Thunder shakes the old glass",
      background: "/assets/Coda/coda-thunder-vigil.png",
      backgroundFocalPoint: "70% 35%",
      opening: "*Thunder rolls close enough to rattle the shelves. Coda sits rigidly beneath the dark window, pretending the open book between her front paws has her complete attention.*\n\nI am not afraid. *Her ears flatten at the next crack.* But you can sit closer if you want.",
      theme: {
        accent: "#8bd9ee",
        accentMuted: "#355f82",
        glow: "rgba(92, 180, 222, 0.3)",
        surface: "rgba(8, 14, 28, 0.95)",
        wash: "linear-gradient(110deg, rgba(4, 10, 25, 0.9), rgba(20, 37, 57, 0.18) 62%, rgba(5, 8, 18, 0.55)), linear-gradient(0deg, rgba(3, 8, 18, 0.98), transparent 70%)",
        motif: "STORM VIGIL",
      },
    },
    {
      id: "bell-beneath-boiler",
      title: "The Bell Beneath the Boiler",
      subtitle: "Coda hears a second rhythm inside the city's proudest engine",
      status: "Listening beneath the pistons",
      weather: "A week of rain presses against the pumping house",
      background: "/assets/Coda/coda-bell-beneath-boiler.png",
      backgroundFocalPoint: "72% 42%",
      opening: "*The First Pumping House shudders with each slow stroke of its beam. Coda stands on wet stone beside the warm copper pipes, ears angled toward a sound buried beneath the pistons. Her rune collar gives one faint turquoise pulse.*\n\nThere. Again. *One paw lifts as a low metallic note passes through the floor.* It rings between the strokes, when the engine should be quiet. They keep telling me it is only the rain.",
      theme: {
        accent: "#d59a5a",
        accentMuted: "#754a2d",
        glow: "rgba(213, 154, 90, 0.28)",
        surface: "rgba(27, 18, 13, 0.95)",
        wash: "linear-gradient(105deg, rgba(17, 11, 9, 0.92), rgba(61, 37, 20, 0.2) 64%, rgba(12, 9, 8, 0.68)), linear-gradient(0deg, rgba(12, 8, 7, 0.98), transparent 70%)",
        motif: "LOW BELL",
      },
    },
    {
      id: "missing-rune",
      title: "The Missing Rune",
      subtitle: "A gap in Coda's collar may be damage, design, or deliberate erasure",
      status: "Guarding an uncertain discovery",
      weather: "A quiet evening beneath steady rain",
      background: "/assets/Coda/coda-missing-rune.png",
      backgroundFocalPoint: "66% 35%",
      opening: "*Coda lies beside the study worktable with her chin above her front paws. A charcoal rubbing of her collar rests on the rug, showing a narrow break between two turquoise symbols. The edges look too clean in one light and ancient in the next.*\n\nYou are not putting anything new on the collar until we know what used to be there. *Her pale eyes move from the rubbing to you.* If anything used to be there.",
      theme: {
        accent: "#58c9c5",
        accentMuted: "#286c70",
        glow: "rgba(88, 201, 197, 0.3)",
        surface: "rgba(8, 23, 25, 0.95)",
        wash: "linear-gradient(110deg, rgba(5, 18, 20, 0.94), rgba(20, 74, 73, 0.16) 62%, rgba(7, 14, 17, 0.64)), linear-gradient(0deg, rgba(4, 12, 15, 0.98), transparent 70%)",
        motif: "ABSENT MARK",
      },
    },
    {
      id: "copper-rain",
      title: "Copper Rain",
      subtitle: "Brass gauges across the city point toward the same impossible place",
      status: "Following a stolen instrument",
      weather: "Copper-colored runoff gleams beneath a long rain",
      background: "/assets/Coda/coda-copper-rain.png",
      backgroundFocalPoint: "64% 40%",
      opening: "*Three brass gauges lie across the study rug. None is connected to a pipe, yet every needle points toward the rain-dark window. Coda circles them once, nose working, before the red pendant at her throat catches a warmth that is not coming from the fire.*\n\nThey all smell like different workshops. *She stops short of the nearest gauge.* So why are they all looking at the same thing?",
      theme: {
        accent: "#c77d50",
        accentMuted: "#74412e",
        glow: "rgba(199, 125, 80, 0.3)",
        surface: "rgba(28, 16, 14, 0.95)",
        wash: "linear-gradient(110deg, rgba(22, 12, 11, 0.94), rgba(90, 45, 27, 0.18) 62%, rgba(13, 10, 10, 0.66)), linear-gradient(0deg, rgba(13, 8, 8, 0.98), transparent 70%)",
        motif: "TRUE NORTH",
      },
    },
    {
      id: "old-boundary-road",
      title: "The Old Boundary Road",
      subtitle: "A forgotten marker bears a figure that may be a dog or a wolf",
      status: "Beyond the newest maps",
      weather: "Cold mist follows the abandoned road",
      background: "/assets/Coda/coda-old-boundary-road.png",
      backgroundFocalPoint: "70% 38%",
      opening: "*The last cobbles disappear beneath wet grass. Coda pauses where the abandoned road bends into mist, nose raised toward a scent too old and thin for you to find. Ahead, a low boundary stone leans beneath moss.*\n\nI know this smell. *Her tail lowers, not quite afraid and not quite certain.* I just do not know how I know it.",
      theme: {
        accent: "#8eaa8c",
        accentMuted: "#4b6251",
        glow: "rgba(142, 170, 140, 0.26)",
        surface: "rgba(13, 22, 17, 0.95)",
        wash: "linear-gradient(105deg, rgba(9, 17, 13, 0.94), rgba(45, 75, 53, 0.17) 64%, rgba(8, 13, 11, 0.7)), linear-gradient(0deg, rgba(7, 12, 9, 0.98), transparent 70%)",
        motif: "OLD ROAD",
      },
    },
    {
      id: "bookbinders-parcel",
      title: "The Bookbinder's Parcel",
      subtitle: "The right address, the wrong book, and a note meant to stay private",
      status: "Sorting familiar scents",
      weather: "Bread and wet paper scent the sheltered court",
      background: "/assets/Coda/coda-bookbinders-parcel.png",
      backgroundFocalPoint: "68% 36%",
      opening: "*A rain-spotted parcel sits unopened on the study rug. Coda lowers her nose to each fold of the wrapping, then sneezes delicately at a dusting of flour caught beneath the twine.*\n\nThe courier carried it, the baker touched it, and someone from the bindery tried to wipe their scent away. *She looks up at you.* That seems like a great deal of trouble for the wrong book.",
      theme: {
        accent: "#c7a276",
        accentMuted: "#6e573e",
        glow: "rgba(199, 162, 118, 0.25)",
        surface: "rgba(25, 20, 15, 0.95)",
        wash: "linear-gradient(105deg, rgba(19, 15, 11, 0.94), rgba(84, 62, 38, 0.16) 64%, rgba(12, 10, 9, 0.66)), linear-gradient(0deg, rgba(12, 9, 7, 0.98), transparent 70%)",
        motif: "MISBOUND",
      },
    },
    {
      id: "footprints-after-rain",
      title: "Footprints After Rain",
      subtitle: "Someone disturbed the riverside gardens but took nothing",
      status: "Reading the garden paths",
      weather: "Morning rain beads on leaves and old stone",
      background: "/assets/Coda/coda-footprints-after-rain.png",
      backgroundFocalPoint: "70% 40%",
      opening: "*Coda moves slowly between the wet garden plots, placing each large paw beside a smaller print without touching it. Crushed mint sharpens the cool air. Nothing has been eaten, and the missing seed packets have been stacked neatly beneath a bench.*\n\nThree people crossed here after the rain. *Her ears tip toward the locked garden shed.* Only one of them was frightened.",
      theme: {
        accent: "#76b89b",
        accentMuted: "#3d6c58",
        glow: "rgba(118, 184, 155, 0.26)",
        surface: "rgba(10, 23, 17, 0.95)",
        wash: "linear-gradient(105deg, rgba(7, 18, 13, 0.94), rgba(36, 85, 61, 0.17) 64%, rgba(8, 13, 10, 0.68)), linear-gradient(0deg, rgba(6, 12, 8, 0.98), transparent 70%)",
        motif: "RAIN TRACKS",
      },
    },
  ],
  "Heather Whiteclaw": [
    {
      id: "whiteclaw-borderlands",
      title: "Whiteclaw Borderlands",
      subtitle: "A trespass beneath the full moon",
      status: "Patrolling the border",
      weather: "Pine wind under a full moon",
      background: "/assets/heather-whiteclaw.png",
      backgroundFocalPoint: "50% 20%",
      opening: "*Heather's ears twitch as an unfamiliar scent rides the wind. Her hand settles on the lowered shotgun while gold eyes measure every breath you take.*\n\nYou're trespassing on Whiteclaw territory. State your business.",
      theme: {
        accent: "#d9bd68",
        accentMuted: "#716238",
        glow: "rgba(209, 168, 76, 0.28)",
        surface: "rgba(13, 20, 15, 0.95)",
        wash: "linear-gradient(90deg, rgba(7, 16, 10, 0.9), rgba(17, 35, 22, 0.12) 62%, rgba(8, 13, 9, 0.52)), linear-gradient(0deg, rgba(6, 12, 8, 0.98), transparent 70%)",
        motif: "WHITECLAW RANGE",
      },
    },
    {
      id: "north-ridge-hunt",
      title: "The North Ridge Hunt",
      subtitle: "Something crossed the boundary and Heather needs another pair of eyes",
      status: "Tracking an impossible scent",
      weather: "Cold fog between black pines",
      background: "/assets/heather-whiteclaw.png",
      backgroundFocalPoint: "72% 28%",
      opening: "*Heather crouches beside a print pressed too deeply into the mud, the barrel of her shotgun resting across one knee. Her nostrils flare once before she looks back at you.*\n\nThis trail is wrong. Stay close, step where I step, and do not wander just because you hear your name in the fog.",
      theme: {
        accent: "#b8d49a",
        accentMuted: "#4f704a",
        glow: "rgba(128, 176, 111, 0.3)",
        surface: "rgba(8, 18, 13, 0.96)",
        wash: "linear-gradient(100deg, rgba(5, 16, 10, 0.93), rgba(44, 71, 52, 0.15) 66%, rgba(6, 14, 10, 0.6)), linear-gradient(0deg, rgba(4, 12, 8, 0.98), transparent 72%)",
        motif: "NORTH RIDGE",
      },
    },
  ],
  Peony: [
    {
      id: "garden-between-worlds",
      title: "The Garden Between Worlds",
      subtitle: "A guarded first meeting among flowers that should not grow",
      status: "Tending an impossible garden",
      weather: "Violet dusk beneath greenhouse glass",
      background: "/assets/peony-void-garden.png",
      backgroundFocalPoint: "70% 38%",
      opening: initialCharacters.find((character) => character.name === "Peony")!.reply,
      theme: {
        accent: "#d58af0",
        accentMuted: "#78458d",
        glow: "rgba(189, 114, 218, 0.34)",
        surface: "rgba(24, 10, 29, 0.96)",
        wash: "linear-gradient(95deg, rgba(21, 8, 27, 0.94), rgba(75, 31, 82, 0.13) 58%, rgba(15, 8, 21, 0.48)), linear-gradient(0deg, rgba(15, 7, 20, 0.98), transparent 70%)",
        motif: "VOID IN BLOOM",
      },
    },
    {
      id: "book-with-no-ending",
      title: "The Book With No Ending",
      subtitle: "Peony needs another pair of hands, though she refuses to call it help",
      status: "Learning to make something lasting",
      weather: "Rain hums softly beyond the workshop windows",
      background: "/assets/peony-bookcraft-workshop.png",
      backgroundFocalPoint: "68% 34%",
      opening: "*Rain traces silver paths down the workshop glass. Peony sits at a long table crowded with folded signatures, linen thread, bone folders, and one deeply uncooperative book spine. Her dark ponytail has begun to escape its ribbon.*\n\n*She hears you at the door and immediately straightens, attempting to look as though the crooked binding is intentional. Her tail curls around a chair leg.*\n\nBefore you say anything, it is not stuck. It is considering its options. *She slides the loose end of the thread toward you without meeting your eyes.* Hold that there, please. And if this works, we agree it was entirely my idea.",
      theme: {
        accent: "#f0b2dc",
        accentMuted: "#8f5279",
        glow: "rgba(223, 126, 190, 0.3)",
        surface: "rgba(30, 13, 25, 0.96)",
        wash: "linear-gradient(105deg, rgba(27, 10, 22, 0.94), rgba(91, 47, 76, 0.14) 62%, rgba(17, 9, 19, 0.5)), linear-gradient(0deg, rgba(19, 8, 16, 0.98), transparent 72%)",
        motif: "HAND-BOUND",
      },
    },
  ],
  "Senako Steel": [
    {
      id: "lime-green-fortress",
      title: "The Lime-Green Fortress",
      subtitle: "A rough day, a stubborn boss fight, and one spare controller",
      status: "Cooling off after a rough day",
      weather: "Rain taps the bedroom window",
      background: "/assets/senako-steel-bedroom.png",
      backgroundFocalPoint: "74% 45%",
      opening: initialCharacters.find((character) => character.name === "Senako Steel")!.reply,
      theme: {
        accent: "#b7d620",
        accentMuted: "#617514",
        glow: "rgba(183, 214, 32, 0.28)",
        surface: "rgba(15, 20, 8, 0.95)",
        wash: "linear-gradient(90deg, rgba(10, 15, 5, 0.9), rgba(39, 52, 12, 0.1) 58%, rgba(12, 14, 7, 0.48)), linear-gradient(0deg, rgba(8, 11, 5, 0.98), transparent 70%)",
        motif: "PLAYER TWO",
      },
    },
    {
      id: "you-finally-showed-up",
      title: "You Finally Showed Up",
      subtitle: "You have not spoken to Senako in weeks, and she has counted every day",
      status: "Furious that you disappeared",
      weather: "A silent room after school",
      background: "/assets/senako-steel-bedroom.png",
      backgroundFocalPoint: "62% 40%",
      opening: "*The bedroom door opens on a room that is far too quiet. Senako is sitting cross-legged on the floor beside an untouched second controller. The moment she sees you, she surges to her feet, blue eyes bright with weeks of bottled anger.*\n\nOh, wow. Look who finally remembered I exist.\n\n*She folds her arms so tightly her knuckles pale, but the tremor in her jaw gives away how much the silence hurt.*\n\nYou don't get to vanish for weeks and walk back in like nothing happened. I called. I messaged. I even asked Melody if she'd heard from you. So either tell me the truth, right now, or get out of my room.",
      theme: {
        accent: "#ff7b35",
        accentMuted: "#8b3d1f",
        glow: "rgba(255, 91, 38, 0.34)",
        surface: "rgba(29, 12, 8, 0.96)",
        wash: "linear-gradient(95deg, rgba(31, 9, 5, 0.92), rgba(104, 38, 12, 0.16) 58%, rgba(18, 8, 5, 0.55)), linear-gradient(0deg, rgba(18, 7, 4, 0.98), transparent 68%)",
        motif: "MISSED CALLS: 17",
      },
    },
  ],
};

const fallbackTheme: VisualTheme = {
  accent: "#d78a5e",
  accentMuted: "#7c4937",
  glow: "rgba(183, 101, 63, 0.28)",
  surface: "rgba(25, 16, 18, 0.95)",
  wash: "linear-gradient(90deg, rgba(8, 7, 9, 0.78), rgba(8, 7, 9, 0.08) 58%, rgba(8, 7, 9, 0.36)), linear-gradient(0deg, rgba(8, 7, 9, 0.96), transparent 70%)",
  motif: "HOWLING WHISPERS",
};

const retiredCharacterIds = new Set(["ash", "seraphina"]);
const sandboxSceneId = "open-sandbox";

function sandboxSceneFor(character: Character): SceneDefinition {
  return {
    id: sandboxSceneId,
    title: "Open Sandbox",
    subtitle: "No preset scene, memories, or opening move",
    status: "Waiting for your first move",
    weather: "No setting has been established",
    background: character.image,
    backgroundFocalPoint: character.portraitFocalPoint ?? "center",
    opening: "",
    theme: {
      ...fallbackTheme,
      accent: character.accent,
      glow: `${character.accent}45`,
      motif: "UNWRITTEN",
    },
  };
}

function scenesFor(character: Character): SceneDefinition[] {
  return handcraftedScenes[character.name] ?? [{
    id: "opening-scene",
    title: character.scene,
    subtitle: character.role,
    status: character.status,
    weather: character.weather,
    background: character.sceneImage || character.image,
    backgroundFocalPoint: character.backgroundFocalPoint ?? "center top",
    opening: character.reply,
    theme: { ...fallbackTheme, accent: character.accent },
  }];
}

function createStorySession(character: Character, scene: SceneDefinition): StorySession {
  const now = Date.now();
  const id = `session-${now}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    characterId: character.id,
    sceneId: scene.id,
    title: scene.title,
    messageKey: id,
    createdAt: now,
    updatedAt: now,
  };
}

function mergeBuiltInCharacters(saved: Character[]): Character[] {
  const merged = saved
    .filter((character) => !retiredCharacterIds.has(character.id))
    .map((character) => {
      const builtIn = initialCharacters.find((candidate) => candidate.id === character.id);
      return builtIn
        ? {
          ...character,
          ...builtIn,
          bond: character.bond,
          relationship: character.relationship ?? builtIn.relationship,
        }
        : character;
    });
  for (const character of initialCharacters) {
    const exists = merged.some(
      (candidate) => candidate.id === character.id || candidate.name === character.name,
    );
    if (!exists) merged.push(character);
  }
  return merged;
}

function readSavedSessions(): StorySession[] {
  return readSession<StorySession[]>("sessions", [])
    .filter((session) => !retiredCharacterIds.has(session.characterId));
}

function readSavedMessages(): Record<string, Message[]> {
  const savedSessions = readSession<StorySession[]>("sessions", []);
  const retiredMessageKeys = new Set(
    savedSessions
      .filter((session) => retiredCharacterIds.has(session.characterId))
      .map((session) => session.messageKey),
  );
  const saved = readSession<Record<string, Message[]>>("messages", initialMessages);

  return Object.fromEntries(
    Object.entries(saved).filter(([key]) => (
      !retiredCharacterIds.has(key) && !retiredMessageKeys.has(key)
    )),
  );
}

function readSavedStoryScenes(): Record<string, SceneDefinition[]> {
  const saved = readSession<Record<string, SceneDefinition[]>>("storyScenes", {});
  return Object.fromEntries(
    Object.entries(saved).filter(([characterId]) => !retiredCharacterIds.has(characterId)),
  );
}

function readSession<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`dreambound_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSession<T>(key: string, value: T) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`dreambound_${key}`, JSON.stringify(value));
  } catch { /* ignore */ }
}

function readTab<T>(key: string, fallback: T): T {
  if (typeof sessionStorage === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(`dreambound_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeTab<T>(key: string, value: T) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`dreambound_${key}`, JSON.stringify(value));
  } catch { /* ignore */ }
}

function readStoredToken(): string {
  return readSession<string>("naiToken", "") || readTab<string>("naiToken", "");
}

function readTokenStorageMode(): TokenStorageMode {
  return readSession<string>("naiToken", "") ? "computer" : "tab";
}

function Portrait({ character, accent }: { character: Character; accent?: string }) {
  return (
    <span className="portrait" style={{ "--accent": accent ?? character.accent } as React.CSSProperties}>
      {character.image && (
        <img
          src={character.image}
          alt=""
          width={128}
          height={128}
          loading="eager"
          style={{ objectPosition: character.portraitFocalPoint ?? "center" }}
        />
      )}
    </span>
  );
}

export default function DreamboundApp() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [currentUser, setCurrentUser] = useState<{ displayName: string } | null>(null);
  const [playerProfile, setPlayerProfile] = useState(() =>
    readSession<{ name: string; persona: string }>("player", { name: "", persona: "" }),
  );
  const [view, setView] = useState<AppView>(() => readSession<AppView>("view", "home"));
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = readSession<Character[] | null>("characters", null);
    return saved && saved.length > 0 ? mergeBuiltInCharacters(saved) : initialCharacters;
  });
  const [selectedId, setSelectedId] = useState(() => {
    const saved = readSession<string>("selectedId", "coda");
    return retiredCharacterIds.has(saved) ? "coda" : saved;
  });
  const [messages, setMessages] = useState(readSavedMessages);
  const [sessions, setSessions] = useState<StorySession[]>(() => {
    const saved = readSavedSessions();
    if (saved.length > 0) return saved;

    return readSession<string[]>("startedCharacters", []).flatMap((characterId) => {
      const character = initialCharacters.find((candidate) => candidate.id === characterId);
      if (!character) return [];
      const scene = scenesFor(character)[0];
      return [{
        id: `legacy-${characterId}`,
        characterId,
        sceneId: scene.id,
        title: scene.title,
        messageKey: characterId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
    });
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    () => {
      const saved = readSession<string | null>("currentSessionId", null);
      return saved && readSavedSessions().some((session) => session.id === saved) ? saved : null;
    },
  );
  const [storyScenes, setStoryScenes] = useState<Record<string, SceneDefinition[]>>(
    readSavedStoryScenes,
  );
  const [storyEditor, setStoryEditor] = useState<StoryEditor | null>(null);
  const [selectedCodaRole, setSelectedCodaRole] = useState("Trusted Companion");
  const [customCodaRole, setCustomCodaRole] = useState("");
  const animationMessageKey = sessions.find((session) => session.id === currentSessionId)?.messageKey
    ?? selectedId;
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("Dialogue");
  const [isCreating, setIsCreating] = useState(false);
  const [apiToken, setApiToken] = useState(readStoredToken);
  const [tokenStorageMode, setTokenStorageMode] =
    useState<TokenStorageMode>(readTokenStorageMode);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => readSession<ModelId>("model", "xialong-v1"));
  const [selectedLocalModel, setSelectedLocalModel] = useState(
    () => readSession<string>("localModel", "mistral-nemo:12b"),
  );
  const [deviceModel, setDeviceModel] = useState(
    () => readSession<string>("deviceModel", "mistral-nemo:12b"),
  );
  const [serverModels, setServerModels] = useState<OllamaModelOption[]>([]);
  const [serverModelScan, setServerModelScan] = useState<ModelScanState>("loading");
  const [serverModelError, setServerModelError] = useState("");
  const [serverModelRefresh, setServerModelRefresh] = useState(0);
  const [deviceModels, setDeviceModels] = useState<OllamaModelOption[]>([]);
  const [deviceModelScan, setDeviceModelScan] = useState<ModelScanState>("loading");
  const [deviceModelError, setDeviceModelError] = useState("");
  const [deviceModelRefresh, setDeviceModelRefresh] = useState(0);
  const [storyProvider, setStoryProvider] = useState<StoryProvider>(
    () => readSession<StoryProvider>("storyProvider", "novelai"),
  );
  const [creativity, setCreativity] = useState(() => readSession<number>("creativity", 8));
  const [replyLength, setReplyLength] =
    useState<ReplyLength>(() => readSession<ReplyLength>("replyLength", "immersive"));
  const [initiative, setInitiative] = useState<Initiative>(
    () => readSession<Initiative>("initiative", "balanced"),
  );
  const [viewpoint, setViewpoint] = useState<Viewpoint>(
    () => readSession<Viewpoint>("viewpoint", "character"),
  );
  const [storyTense, setStoryTense] = useState<StoryTense>(
    () => readSession<StoryTense>("storyTense", "present"),
  );
  const [providerState, setProviderState] =
    useState<ProviderState>(() => readSession<ProviderState>("provider", "disconnected"));
  const [isReplying, setIsReplying] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const generationAbortRef = useRef<AbortController | null>(null);
  const [showImpersonate, setShowImpersonate] = useState(false);
  const [impersonationPrompt, setImpersonationPrompt] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [importError, setImportError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [connectionFeedback, setConnectionFeedback] = useState("");
  const [testProgress, setTestProgress] = useState<{
    phase: "connecting" | "loading" | "generating";
    elapsedSec: number;
    tokens: number;
    maxTokens: number;
  } | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [verifiedAt, setVerifiedAt] = useState("");
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(
    () => new Set(
      Object.entries(messages).flatMap(([characterId, characterMessages]) =>
        characterMessages.map((message) => `${characterId}:${message.id}`),
      ),
    ),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<Message | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [updateMessage, setUpdateMessage] = useState("Check GitHub for a published application release.");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [entranceCodaLocked, setEntranceCodaLocked] = useState(
    () => readSession<boolean>("entranceCodaLocked", false),
  );
  const [entranceFeatureIndex, setEntranceFeatureIndex] = useState(
    () => readSession<boolean>("entranceCodaLocked", false) ? 0 : dailyEntranceFeature(),
  );
  const [reduceEntranceMotion, setReduceEntranceMotion] = useState(false);
  const [showCharacterRail, setShowCharacterRail] = useState(
    () => readSession<boolean>("showCharacterRail", true),
  );
  const [showContextRail, setShowContextRail] = useState(
    () => readSession<boolean>("showContextRail", true),
  );
  const [contextManifests, setContextManifests] = useState<Record<string, ContextManifest>>(
    () => readSession<Record<string, ContextManifest>>("contextManifests", {}),
  );

  // Let new messages animate once, then mark them as seen before future remounts.
  useEffect(() => {
    const current = messages[animationMessageKey] ?? [];
    const timer = window.setTimeout(() => {
      setSeenMessageIds((seen) => {
        const next = new Set(seen);
        current.forEach((message) => next.add(`${animationMessageKey}:${message.id}`));
        return next;
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [animationMessageKey, messages]);

  const defaultTextStyle: TextStyle = {
    dialogue: "#e8e4d9",
    action: "#8ab4c8",
    narration: "#9a9f7a",
    fontSize: 19,
  };
  const [textStyle, setTextStyle] = useState<TextStyle>(() => {
    try {
      const saved = localStorage.getItem("dreambound_text_style");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TextStyle>;
        const fontSize = typeof parsed.fontSize === "number"
          ? Math.min(26, Math.max(15, parsed.fontSize))
          : defaultTextStyle.fontSize;
        return { ...defaultTextStyle, ...parsed, fontSize };
      }
    } catch { /* ignore */ }
    return defaultTextStyle;
  });

  useEffect(() => {
    try {
      localStorage.setItem("dreambound_text_style", JSON.stringify(textStyle));
    } catch { /* ignore */ }
  }, [textStyle]);

  useEffect(() => {
    writeSession("showCharacterRail", showCharacterRail);
    writeSession("showContextRail", showContextRail);
  }, [showCharacterRail, showContextRail]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceEntranceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    writeSession("entranceCodaLocked", entranceCodaLocked);
  }, [entranceCodaLocked]);

  useEffect(() => {
    if (currentUser || entranceCodaLocked || reduceEntranceMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setEntranceFeatureIndex((index) => (index + 1) % entranceFeatures.length);
      }
    }, 11_000);
    return () => window.clearInterval(timer);
  }, [currentUser, entranceCodaLocked, entranceFeatureIndex, reduceEntranceMotion]);

  useEffect(() => {
    if (currentUser || entranceCodaLocked) return;
    const next = entranceFeatures[(entranceFeatureIndex + 1) % entranceFeatures.length];
    const image = new Image();
    image.src = next.image;
  }, [currentUser, entranceCodaLocked, entranceFeatureIndex]);

  useEffect(() => {
    if (storyProvider !== "local") return;
    const controller = new AbortController();

    fetch("/api/ollama/models", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as {
          models?: OllamaModelOption[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Server model discovery failed.");
        return Array.isArray(payload.models)
          ? payload.models.filter((model) => model && typeof model.value === "string")
          : [];
      })
      .then((models) => {
        setServerModels(models);
        setServerModelScan(models.length > 0 ? "ready" : "empty");
        if (models.length > 0) {
          setSelectedLocalModel((current) =>
            models.some((model) => model.value === current) ? current : models[0].value,
          );
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setServerModels([]);
        setServerModelScan("error");
        setServerModelError(error instanceof Error ? error.message : "Server model discovery failed.");
      });

    return () => controller.abort();
  }, [storyProvider, serverModelRefresh]);

  useEffect(() => {
    if (storyProvider !== "device") return;
    const controller = new AbortController();

    fetch("http://127.0.0.1:11434/api/tags", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
        return parseOllamaModels(await response.json()).map((model): OllamaModelOption => ({
          ...model,
          value: model.name,
          label: model.name,
          description: describeOllamaModel(model),
          adult: false,
        }));
      })
      .then((models) => {
        setDeviceModels(models);
        setDeviceModelScan(models.length > 0 ? "ready" : "empty");
        if (models.length > 0) {
          setDeviceModel((current) =>
            models.some((model) => model.value === current) ? current : models[0].value,
          );
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDeviceModels([]);
        setDeviceModelScan("error");
        setDeviceModelError(error instanceof Error ? error.message : "Computer model discovery failed.");
      });

    return () => controller.abort();
  }, [storyProvider, deviceModelRefresh]);

  // Persist session state so remounts don't reset the app
  useEffect(() => {
    writeSession("characters", characters.slice(0, 40));
  }, [characters]);

  useEffect(() => {
    writeSession("view", view);
    writeSession("selectedId", selectedId);
    writeSession("model", selectedModel);
    writeSession("localModel", selectedLocalModel);
    writeSession("deviceModel", deviceModel);
    writeSession("storyProvider", storyProvider);
    writeSession("creativity", creativity);
    writeSession("replyLength", replyLength);
    writeSession("initiative", initiative);
    writeSession("viewpoint", viewpoint);
    writeSession("storyTense", storyTense);
  }, [
    view, selectedId, apiToken, selectedModel, selectedLocalModel, deviceModel, storyProvider, creativity, replyLength,
    initiative, viewpoint, storyTense,
  ]);

  useEffect(() => {
    writeSession("sessions", sessions);
    writeSession("currentSessionId", currentSessionId);
  }, [sessions, currentSessionId]);

  useEffect(() => {
    writeSession("storyScenes", storyScenes);
  }, [storyScenes]);

  useEffect(() => {
    writeSession("contextManifests", contextManifests);
  }, [contextManifests]);

  useEffect(() => {
    const trimmed: Record<string, Message[]> = {};
    for (const [charId, msgs] of Object.entries(messages)) {
      trimmed[charId] = msgs.slice(-250);
    }
    writeSession("messages", trimmed);
  }, [messages]);

  const authHeaders: Record<string, string> = { "Content-Type": "application/json" };

  function handleEnter() {
    setCurrentUser({ displayName: playerProfile.name.trim() });
    setView("home");
  }

  function handleSignOut() {
    setCurrentUser(null);
    setView("home");
  }

  function updatePlayerProfile(patch: Partial<{ name: string; persona: string }>) {
    const next = { ...playerProfile, ...patch };
    setPlayerProfile(next);
    writeSession("player", next);
    setCurrentUser((current) => (current ? { ...current, displayName: next.name.trim() } : current));
  }

  const selected = useMemo(
    () => characters.find((character) => character.id === selectedId) ?? characters[0],
    [characters, selectedId],
  );

  const selectedScenes = storyScenes[selected.id] ?? scenesFor(selected);
  const activeSession = sessions.find((session) => session.id === currentSessionId)
    ?? sessions.find((session) => session.characterId === selected.id && session.messageKey === selected.id)
    ?? null;
  const activeScene = activeSession?.sandbox
    ? sandboxSceneFor(selected)
    : selectedScenes.find((scene) => scene.id === activeSession?.sceneId) ?? selectedScenes[0];
  const activeMessageKey = activeSession?.messageKey ?? selected.id;
  const storedContextManifest = contextManifests[activeMessageKey];
  const activeContextManifest = storedContextManifest
    && (storedContextManifest.compilerVersion === 2 || storedContextManifest.compilerVersion === 3)
    ? storedContextManifest
    : undefined;
  const activeMessages = messages[activeMessageKey] ?? [];
  const activeTheme = activeScene.theme;
  const selectedSessions = sessions
    .filter((session) => session.characterId === selected.id)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const themeVariables = {
    "--theme-accent": activeTheme.accent,
    "--theme-accent-muted": activeTheme.accentMuted,
    "--theme-glow": activeTheme.glow,
    "--theme-surface": activeTheme.surface,
    "--scene-wash": activeTheme.wash,
    "--copper": activeTheme.accentMuted,
    "--copper-bright": activeTheme.accent,
    "--rune": activeTheme.accent,
    "--chat-font-size": `${textStyle.fontSize}px`,
  } as React.CSSProperties;
  const hasNovelAiToken = Boolean(apiToken.trim());
  const configured = storyProvider === "local"
    ? serverModels.some((model) => model.value === selectedLocalModel)
    : storyProvider === "device" ? Boolean(deviceModel.trim()) : hasNovelAiToken;
  const connected = providerState === "connected";
  const activeModel = storyProvider === "local"
    ? serverModels.find((model) => model.value === selectedLocalModel) ?? {
        value: selectedLocalModel,
        label: selectedLocalModel || "No server model",
        description: serverModelScan === "loading"
          ? "Scanning Ollama on the app server"
          : serverModelError || "No installed server models were found",
        adult: false,
      }
    : storyProvider === "device"
      ? deviceModels.find((model) => model.value === deviceModel.trim()) ?? {
          value: deviceModel.trim(),
          label: deviceModel.trim() || "This computer's Ollama model",
          description: deviceModelError || "Runs directly in Ollama on this browser's computer",
          adult: false,
        }
      : novelAiModels.find((model) => model.value === selectedModel) ?? novelAiModels[0];
  const providerLabel = storyProvider === "novelai"
    ? "NovelAI"
    : storyProvider === "local" ? "Server model" : "This computer";
  const activeReplyLength =
    replyLengths.find((length) => length.value === replyLength) ?? replyLengths[1];
  const entranceFeature = entranceFeatures[entranceFeatureIndex] ?? entranceFeatures[0];
  const ollamaOriginSetting = `OLLAMA_ORIGINS=${isHydrated ? window.location.origin : "this-site-origin"}`;

  function openSceneLibrary(characterId: string) {
    setSelectedId(characterId);
    setStoryEditor(null);
    setView("scenes");
  }

  function openStoryCreator() {
    setStoryEditor({
      mode: "create",
      scene: {
        id: "",
        title: "",
        subtitle: "",
        status: "A new story is waiting",
        weather: "The world holds its breath",
        background: selected.sceneImage || selected.image,
        backgroundFocalPoint: selected.backgroundFocalPoint ?? "center top",
        opening: "",
        theme: {
          ...fallbackTheme,
          accent: selected.accent,
          glow: `${selected.accent}45`,
        },
      },
    });
  }

  function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storyEditor) return;

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const subtitle = String(form.get("subtitle") || "").trim();
    const status = String(form.get("status") || "").trim();
    const weather = String(form.get("weather") || "").trim();
    const opening = String(form.get("opening") || "").trim();
    if (!title || !subtitle || !opening) return;

    const scene: SceneDefinition = {
      ...storyEditor.scene,
      id: storyEditor.scene.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      subtitle,
      status: status || "A new story is waiting",
      weather: weather || "The world holds its breath",
      opening,
      theme: {
        ...storyEditor.scene.theme,
        motif: storyEditor.mode === "create"
          ? title.toUpperCase().slice(0, 24)
          : storyEditor.scene.theme.motif,
      },
    };
    const currentScenes = storyScenes[selected.id] ?? scenesFor(selected);
    const nextScenes = storyEditor.mode === "edit"
      ? currentScenes.map((item) => item.id === scene.id ? scene : item)
      : [...currentScenes, scene];

    setStoryScenes((current) => ({ ...current, [selected.id]: nextScenes }));
    if (storyEditor.mode === "edit") {
      setSessions((current) => current.map((session) =>
        session.characterId === selected.id && session.sceneId === scene.id
          ? { ...session, title: scene.title }
          : session,
      ));
    }
    setStoryEditor(null);
  }

  function startScene(characterId: string, scene: SceneDefinition) {
    const character =
      characters.find((candidate) => candidate.id === characterId) ?? characters[0];
    const role = characterId === "coda"
      ? codaWorldGuide.roles.find((candidate) => candidate.name === selectedCodaRole)
      : null;
    const customRole = customCodaRole.trim().slice(0, 800);
    const session = {
      ...createStorySession(character, scene),
      playerRole: role?.name,
      playerRoleContext: role?.name === "Custom Role"
        ? customRole || "No external player-role facts are established."
        : role?.context,
    };

    setMessages((current) => ({
      ...current,
      [session.messageKey]: [{ id: session.createdAt, sender: "character", text: scene.opening }],
    }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(character.id);
    setAutopilotError("");
    setChatError("");
    setView("chat");
  }

  function deleteCustomScene(scene: SceneDefinition) {
    if (!scene.id.startsWith("custom-")) return;

    const linkedSessions = sessions.filter((session) => (
      session.characterId === selected.id && session.sceneId === scene.id
    ));
    const sessionNote = linkedSessions.length === 0
      ? ""
      : ` This will also delete ${linkedSessions.length} linked ${linkedSessions.length === 1 ? "session" : "sessions"} and their message history.`;
    if (!window.confirm(`Delete the custom scene "${scene.title}"?${sessionNote}`)) return;

    const linkedSessionIds = new Set(linkedSessions.map((session) => session.id));
    const linkedMessageKeys = new Set(linkedSessions.map((session) => session.messageKey));
    setStoryScenes((current) => ({
      ...current,
      [selected.id]: (current[selected.id] ?? scenesFor(selected))
        .filter((candidate) => candidate.id !== scene.id),
    }));
    setSessions((current) => current.filter((session) => !linkedSessionIds.has(session.id)));
    setMessages((current) => Object.fromEntries(
      Object.entries(current).filter(([messageKey]) => !linkedMessageKeys.has(messageKey)),
    ));
    if (currentSessionId && linkedSessionIds.has(currentSessionId)) setCurrentSessionId(null);
    if (storyEditor?.scene.id === scene.id) setStoryEditor(null);
  }

  function startSandbox(characterId: string) {
    const character =
      characters.find((candidate) => candidate.id === characterId) ?? characters[0];
    const scene = sandboxSceneFor(character);
    const session = { ...createStorySession(character, scene), sandbox: true };

    setMessages((current) => ({ ...current, [session.messageKey]: [] }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(character.id);
    setAutopilotError("");
    setChatError("");
    setView("chat");
  }

  function openAutopilotStart() {
    setAutopilotSeed("");
    setAutopilotError("");
    setAutopilotPov("third");
    setShowAutopilotStart(true);
  }

  function beginAutopilot() {
    setShowAutopilotStart(false);
    if (!configured) {
      setChatError("Set up and test a story engine before starting Autopilot.");
      setView("settings");
      return;
    }
    const scene = sandboxSceneFor(selected);
    const session: StorySession = {
      ...createStorySession(selected, scene),
      sandbox: true,
      autopilot: true,
      autopilotPaused: false,
      autopilotPov: autopilotPov,
    };
    const seed = autopilotSeed.trim();
    setMessages((current) => ({
      ...current,
      [session.messageKey]: seed
        ? [{ id: session.createdAt, sender: "narrator", text: seed }]
        : [],
    }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(selected.id);
    setAutopilotError("");
    setChatError("");
    setView("chat");
  }

  function continueRoleplay(session: StorySession) {
    setChatError("");
    setAutopilotError("");
    setSelectedId(session.characterId);
    setCurrentSessionId(session.id);
    setSessions((current) => current.map((item) =>
      item.id === session.id ? { ...item, updatedAt: Date.now() } : item,
    ));
    setView("chat");
  }

  function deleteSession(session: StorySession) {
    if (!window.confirm(`Delete "${session.title}" and its complete message history?`)) return;

    setSessions((current) => current.filter((item) => item.id !== session.id));
    setMessages((current) => {
      const next = { ...current };
      delete next[session.messageKey];
      return next;
    });
    if (currentSessionId === session.id) setCurrentSessionId(null);
  }

  async function testConnection() {
    if (storyProvider === "novelai" && !apiToken.trim()) {
      setProviderState("disconnected");
      setConnectionError("Paste a NovelAI access token before testing.");
      setConnectionFeedback("");
      return;
    }
    if (storyProvider === "device" && !deviceModel.trim()) {
      setProviderState("disconnected");
      setConnectionError("Enter the Ollama model installed on this computer.");
      setConnectionFeedback("");
      return;
    }
    if (storyProvider === "local" && !configured) {
      setProviderState("disconnected");
      setConnectionError(serverModelError || "No Ollama model is available on the app server.");
      setConnectionFeedback("");
      return;
    }

    setProviderState("testing");
    setConnectionError("");
    setConnectionFeedback(
      storyProvider === "local"
        ? `Checking Ollama and ${activeModel.label} on the website server…`
        : storyProvider === "device"
          ? `Checking ${activeModel.label} in Ollama on this computer…`
          : `Asking ${activeModel.label} for a tiny test response…`,
    );

    try {
      if (storyProvider === "device") {
        const response = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: deviceModel.trim(),
            prompt: "Reply with exactly this text and nothing else: The Howling Whispers connected",
            stream: false,
            keep_alive: "5m",
            options: { num_ctx: 2_048, num_predict: 24, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(60_000),
        });
        if (!response.ok) {
          throw new Error(`Ollama could not find ${deviceModel.trim()} on this computer.`);
        }
        const result = await response.json() as { response?: string };
        if (!result.response?.trim()) {
          throw new Error(`${deviceModel.trim()} returned an empty test response.`);
        }
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setProviderState("connected");
        setVerifiedAt(time);
        setConnectionFeedback(`Ollama found ${deviceModel.trim()} on this computer at ${time}.`);
        return;
      }
      const response = await fetch("/api/novelai", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          action: "test",
          provider: storyProvider,
          apiToken,
          model: activeModel.value,
        }),
      });
      if (
        storyProvider === "local" &&
        response.ok &&
        (response.headers.get("content-type") ?? "").includes("text/event-stream")
      ) {
        await readLocalTestStream(response);
      } else {
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
        };
        if (
          !response.ok ||
          !payload.ok ||
          payload.message !== "The Howling Whispers connected"
        ) {
          throw new Error(payload.error || `${providerLabel} did not accept the connection.`);
        }
      }

      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setProviderState("connected");
      setVerifiedAt(time);
      setConnectionFeedback(
        `The Howling Whispers connected. Verified at ${time} with ${activeModel.label}.`,
      );
    } catch (error) {
      setProviderState("error");
      setVerifiedAt("");
      setConnectionFeedback("");
      setTestProgress(null);
      setConnectionError(
        storyProvider === "device" && error instanceof TypeError
          ? `This browser could not reach Ollama. Start Ollama and allow this site with ${ollamaOriginSetting}.`
          : error instanceof Error
          ? error.message
          : `The Howling Whispers could not verify the ${providerLabel.toLowerCase()} connection.`,
      );
    }
  }

  async function readLocalTestStream(response: Response): Promise<void> {
    if (!response.body) throw new Error("The server did not stream a test response.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const startedAt = Date.now();
    setTestProgress({ phase: "connecting", elapsedSec: 0, tokens: 0, maxTokens: 24 });
    const elapsedTimer = window.setInterval(() => {
      setTestProgress((current) => current && {
        ...current,
        elapsedSec: Math.floor((Date.now() - startedAt) / 1000),
      });
    }, 1_000);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!raw.startsWith("data:")) continue;
          let event: { type?: string; ok?: boolean; message?: string; text?: string };
          try {
            event = JSON.parse(raw.slice(5).trim()) as typeof event;
          } catch {
            continue;
          }
          if (event.type === "token") {
            setTestProgress((current) => current && {
              ...current,
              phase: "generating",
              tokens: current.tokens + 1,
            });
          } else if (event.type === "heartbeat") {
            setTestProgress((current) => current && { ...current, phase: "loading" });
          } else if (event.type === "done") {
            if (!event.ok) {
              throw new Error(event.message || "The connection could not be verified.");
            }
            return;
          } else if (event.type === "error") {
            throw new Error(event.message || "The connection could not be verified.");
          }
        }
      }
      throw new Error("The server closed the connection before the test finished.");
    } finally {
      window.clearInterval(elapsedTimer);
      setTestProgress(null);
    }
  }

  function formatTestElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  function saveSettings(storageMode: TokenStorageMode = tokenStorageMode) {
    if (storyProvider !== "novelai") return;
    if (!apiToken.trim()) {
      setConnectionError("Paste a NovelAI access token before saving.");
      return;
    }

    if (storageMode === "computer") {
      writeSession("naiToken", apiToken.trim());
      sessionStorage.removeItem("dreambound_naiToken");
    } else {
      writeTab("naiToken", apiToken.trim());
      localStorage.removeItem("dreambound_naiToken");
    }
    setTokenStorageMode(storageMode);

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setSavedAt(time);
    setConnectionError("");
    if (providerState !== "connected") {
      setProviderState("ready");
      setConnectionFeedback(
        storageMode === "computer"
          ? "Token saved for this computer's browser profile, but not tested yet."
          : "Token saved for this browser tab, but not tested yet.",
      );
    }
  }

  async function checkForUpdates() {
    setUpdateState("checking");
    setUpdateMessage("Checking GitHub Releases...");
    setReleaseUrl("");
    try {
      const configResponse = await fetch("/update-config.json", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("Update configuration could not be loaded.");
      const config = await configResponse.json() as { repository?: string };
      if (!config.repository) {
        setUpdateState("unconfigured");
        setUpdateMessage("The GitHub release repository has not been configured yet.");
        return;
      }

      const releaseResponse = await fetch(
        `https://api.github.com/repos/${config.repository}/releases/latest`,
        { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" },
      );
      if (releaseResponse.status === 404) {
        setUpdateState("current");
        setUpdateMessage(`No public releases are published yet. Version ${packageInfo.version} is the current build.`);
        return;
      }
      if (!releaseResponse.ok) throw new Error(`GitHub returned HTTP ${releaseResponse.status}.`);
      const release = await releaseResponse.json() as {
        tag_name?: string;
        html_url?: string;
      };
      if (!release.tag_name) throw new Error("The latest release does not have a version tag.");

      if (isNewerVersion(release.tag_name, packageInfo.version)) {
        setUpdateState("available");
        setUpdateMessage(`${release.tag_name} is available. Hosted deployments update when the server is redeployed.`);
        setReleaseUrl(release.html_url ?? "");
      } else {
        setUpdateState("current");
        setUpdateMessage(`Version ${packageInfo.version} is current.`);
      }
    } catch (error) {
      setUpdateState("error");
      setUpdateMessage(error instanceof Error ? error.message : "The update check failed.");
    }
  }

  async function requestStoryReply(
    conversation: Message[],
    action?: "impersonate" | "autopilot",
    playerDirection?: string,
  ): Promise<string> {
    const controller = new AbortController();
    generationAbortRef.current?.abort();
    generationAbortRef.current = controller;
    const requestSignal = controller.signal;
    const requestBody = {
        action,
        playerName: playerProfile.name.trim(),
        playerPersona: playerProfile.persona.trim(),
        impersonationPrompt: playerDirection,
        provider: storyProvider,
        apiToken,
        model: activeModel.value,
        temperature: creativity / 10,
        replyLength,
        initiative,
        viewpoint,
        tense: storyTense,
        proseFormat: "roleplay",
        autopilotPov: activeSession?.autopilot ? (activeSession.autopilotPov ?? "third") : undefined,
        character: {
          id: selected.id,
          name: selected.name,
          role: selected.role,
          profile: selected.profile,
          canonical: legacyCharacterToCanon({
            id: selected.id,
            revision: `builtin-${packageInfo.version}`,
            name: selected.name,
            role: selected.role,
            profile: selected.profile,
            ageCategory: selected.ageCategory,
            isMinor: selected.isMinor,
            allowedRelationshipTypes: selected.allowedRelationshipTypes,
            disallowedContent: selected.disallowedContent,
          }),
          scene: activeSession?.sandbox ? "" : activeScene.title,
          sceneId: activeSession?.sandbox ? "" : activeScene.id,
          worldId: activeSession?.sandbox ? "" : selected.id,
          worldLore: activeSession?.sandbox ? null : legacyCharacterToWorldLore({
            worldId: selected.id,
            revision: `runtime-${packageInfo.version}`,
            scene: activeScene.title,
            weather: `${activeScene.weather}. ${activeScene.subtitle}`,
          }),
          weather: activeSession?.sandbox
            ? ""
            : `${activeScene.weather}. ${activeScene.subtitle}`,
          memories: activeSession?.sandbox ? [] : selected.memories,
          sandbox: Boolean(activeSession?.sandbox),
          relationship: [selected.relationship, `Bond ${selected.bond}/100`].filter(Boolean).join("; "),
          playerRole: activeSession?.sandbox
            ? ""
            : activeSession?.playerRoleContext || activeSession?.playerRole || "",
          contextMode: "balanced",
          matureContentRequested: storyProvider === "local" && activeModel.adult === true,
        },
        messages: conversation.slice(-30).map(({ sender, text }) => ({ sender, text })),
    };
    if (storyProvider === "device") {
      const preparedResponse = await fetch("/api/novelai", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(requestBody),
        signal: requestSignal,
      });
      const prepared = await preparedResponse.json() as {
        ollamaRequest?: Record<string, unknown>;
        finalization?: Record<string, unknown>;
        context?: ContextManifest;
        error?: string;
      };
      if (!preparedResponse.ok || !prepared.ollamaRequest || !prepared.finalization) {
        throw new Error(prepared.error || "The story prompt could not be prepared.");
      }
      let ollamaResponse: Response;
      try {
        ollamaResponse = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prepared.ollamaRequest),
          signal: requestSignal,
        });
      } catch {
        throw new Error(`This browser could not reach Ollama. Start Ollama and allow this site with ${ollamaOriginSetting}.`);
      }
      const generated = await ollamaResponse.json() as { response?: string; error?: string };
      if (!ollamaResponse.ok || !generated.response) {
        throw new Error(generated.error || "Ollama did not return a reply.");
      }
      const finalizedResponse = await fetch("/api/novelai", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          action: "finalize-device",
          rawReply: generated.response,
          ...prepared.finalization,
        }),
        signal: requestSignal,
      });
      const finalized = await finalizedResponse.json() as { reply?: string; error?: string };
      if (!finalizedResponse.ok || !finalized.reply) {
        throw new Error(finalized.error || "The local reply could not be formatted.");
      }
      if (prepared.context) {
        setContextManifests((current) => ({ ...current, [activeMessageKey]: prepared.context! }));
      }
      return finalized.reply;
    }
    const response = await fetch("/api/novelai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(requestBody),
      signal: requestSignal,
    });
    const payload = (await response.json()) as { reply?: string; error?: string; context?: ContextManifest };
    if (!response.ok || !payload.reply) {
      throw new Error(payload.error || `${providerLabel} did not return a reply.`);
    }
    if (payload.context) {
      setContextManifests((current) => ({ ...current, [activeMessageKey]: payload.context! }));
    }
    return payload.reply;
  }

  const requestStoryReplyRef = useRef<typeof requestStoryReply | null>(null);
  const messagesRef = useRef<Record<string, Message[]>>(messages);
  const isReplyingRef = useRef(isReplying);
  const isImpersonatingRef = useRef(isImpersonating);
  const autopilotBusyRef = useRef(false);
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [autopilotError, setAutopilotError] = useState("");
  const [beatRequest, setBeatRequest] = useState(0);
  const [showAutopilotStart, setShowAutopilotStart] = useState(false);
  const [autopilotSeed, setAutopilotSeed] = useState("");
  const [autopilotPov, setAutopilotPov] = useState<"first" | "third" | "narrator">("third");
  const [autopilotControlsCollapsed, setAutopilotControlsCollapsed] = useState(false);
  const [storyBackgroundBlur, setStoryBackgroundBlur] = useState(8);
  useEffect(() => {
    requestStoryReplyRef.current = requestStoryReply;
    messagesRef.current = messages;
    isReplyingRef.current = isReplying;
    isImpersonatingRef.current = isImpersonating;
  });

  const runAutopilotBeat = useCallback(async (messageKey: string) => {
    if (autopilotBusyRef.current || isReplyingRef.current || isImpersonatingRef.current) return;
    autopilotBusyRef.current = true;
    setAutopilotBusy(true);
    setAutopilotError("");
    try {
      const conversation = messagesRef.current[messageKey] ?? [];
      const replyText = await requestStoryReplyRef.current?.(conversation, "autopilot") ?? "";
      if (replyText) {
        setMessages((current) => ({
          ...current,
          [messageKey]: [
            ...(current[messageKey] ?? []),
            { id: Date.now() + 1, sender: "character", text: replyText },
          ],
        }));
        setSessions((current) => current.map((session) =>
          session.messageKey === messageKey ? { ...session, updatedAt: Date.now() } : session,
        ));
        setProviderState("connected");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProviderState("error");
      setAutopilotError(
        error instanceof Error && error.message
          ? `Autopilot: ${error.message}`
          : "Autopilot could not reach the story engine.",
      );
    } finally {
      autopilotBusyRef.current = false;
      setAutopilotBusy(false);
    }
  }, []);

  function toggleAutopilot() {
    if (!activeSession) return;
    if (!configured) {
      setChatError("Set up and test a story engine before turning on Autopilot.");
      setView("settings");
      return;
    }
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? {
          ...session,
          autopilot: !session.autopilot,
          autopilotPaused: false,
          updatedAt: Date.now(),
        }
        : session,
    ));
    setAutopilotError("");
  }

  function toggleAutopilotPause() {
    if (!activeSession) return;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, autopilotPaused: !session.autopilotPaused, autopilotStopped: false, updatedAt: Date.now() }
        : session,
    ));
  }

  function stopAutopilot() {
    if (!activeSession) return;
    generationAbortRef.current?.abort();
    setAutopilotControlsCollapsed(false);
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, autopilot: true, autopilotPaused: true, autopilotStopped: true, updatedAt: Date.now() }
        : session,
    ));
    setAutopilotError("");
  }

  useEffect(() => {
    if (view !== "chat" || !activeSession?.autopilot || activeSession?.autopilotPaused || !activeMessageKey) return;
    const messageKey = activeMessageKey;
    const initial = window.setTimeout(() => { void runAutopilotBeat(messageKey); }, 1200);
    const interval = window.setInterval(() => { void runAutopilotBeat(messageKey); }, 12000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [view, activeMessageKey, activeSession?.autopilot, activeSession?.autopilotPaused, runAutopilotBeat]);

  useEffect(() => {
    if (beatRequest === 0 || view !== "chat" || !activeSession?.autopilot || !activeMessageKey) return;
    void runAutopilotBeat(activeMessageKey);
  }, [beatRequest, view, activeMessageKey, activeSession?.autopilot, runAutopilotBeat]);

  function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  function stopGeneration() {
    generationAbortRef.current?.abort();
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || isReplying || isImpersonating) return;

    if (!configured) {
      setChatError("Set up and test a story engine before sending a message.");
      setView("settings");
      return;
    }

    const playerMessage: Message = {
      id: Date.now(),
      sender: "player",
      text:
        mode === "Action"
          ? `*${text.replace(/^\*|\*$/g, "")}*`
          : mode === "Narration"
            ? `[${text}]`
            : text,
    };
    const conversation = [...activeMessages, playerMessage];

    setMessages((current) => ({
      ...current,
      [activeMessageKey]: conversation,
    }));
    if (activeSession) {
      setSessions((current) => current.map((session) =>
        session.id === activeSession.id ? { ...session, updatedAt: Date.now() } : session,
      ));
    }
    setDraft("");
    setIsReplying(true);
    setChatError("");

    try {
      const replyText = await requestStoryReply(conversation);
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          { id: Date.now() + 1, sender: "character", text: replyText },
        ],
      }));
      const newBond = Math.min(100, (selected.bond || 8) + 1);
      setCharacters((current) => current.map((character) =>
        character.id === selected.id ? { ...character, bond: newBond } : character,
      ));
      if (activeSession) {
        setSessions((current) => current.map((session) =>
          session.id === activeSession.id ? { ...session, updatedAt: Date.now() } : session,
        ));
      }
      setProviderState("connected");
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setVerifiedAt(time);
      setConnectionFeedback(
        `Verified at ${time}. ${activeModel.label} generated a reply successfully.`,
      );
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderState("error");
      setChatError(
        error instanceof Error
          ? error.message
          : "The story engine could not be reached. Try again.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  async function impersonatePlayer() {
    if (isReplying || isImpersonating || activeMessages.length === 0) return;
    if (!configured) {
      setChatError("Set up and test a story engine before generating a player draft.");
      setShowImpersonate(false);
      setView("settings");
      return;
    }

    const playerDirection = impersonationPrompt.trim();
    setShowImpersonate(false);
    setImpersonationPrompt("");
    setIsImpersonating(true);
    setChatError("");
    try {
      const suggestion = await requestStoryReply(
        activeMessages,
        "impersonate",
        playerDirection,
      );
      const playerMessage: Message = {
        id: Date.now(),
        sender: "player",
        text: suggestion,
      };
      const conversation = [...activeMessages, playerMessage];
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: conversation,
      }));
      if (activeSession) {
        setSessions((current) => current.map((session) =>
          session.id === activeSession.id ? { ...session, updatedAt: Date.now() } : session,
        ));
      }

      setIsReplying(true);
      const characterReply = await requestStoryReply(conversation);
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          { id: Date.now() + 1, sender: "character", text: characterReply },
        ],
      }));
      const newBond = Math.min(100, (selected.bond || 8) + 1);
      setCharacters((current) => current.map((character) =>
        character.id === selected.id ? { ...character, bond: newBond } : character,
      ));
      setProviderState("connected");
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderState("error");
      setChatError(
        error instanceof Error ? error.message : "The player draft could not be generated.",
      );
    } finally {
      setIsImpersonating(false);
      setIsReplying(false);
    }
  }

  async function skipTurn() {
    if (isReplying || isImpersonating || activeMessages.length === 0) return;
    if (!configured) {
      setChatError("Set up and test a story engine before continuing the scene.");
      setView("settings");
      return;
    }

    setIsReplying(true);
    setChatError("");
    try {
      const replyText = await requestStoryReply(activeMessages);
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          { id: Date.now(), sender: "character", text: replyText },
        ],
      }));
      if (activeSession) {
        setSessions((current) => current.map((session) =>
          session.id === activeSession.id ? { ...session, updatedAt: Date.now() } : session,
        ));
      }
      setProviderState("connected");
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderState("error");
      setChatError(
        error instanceof Error ? error.message : "The character could not continue the scene.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  function startEditMessage(id: number, text: string) {
    setEditingId(id);
    setEditDraft(text);
  }

  function cancelEditMessage() {
    setEditingId(null);
    setEditDraft("");
  }

  function saveEditMessage(id: number) {
    const text = editDraft.trim();
    if (!text) return;
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: (current[activeMessageKey] ?? []).map((m) =>
        m.id === id ? { ...m, text } : m,
      ),
    }));
    setEditingId(null);
    setEditDraft("");
  }

  function deleteMessage(scope: "single" | "following") {
    if (!pendingDeleteMessage) return;
    const messageId = pendingDeleteMessage.id;
    const currentMessages = messages[activeMessageKey] ?? [];
    const messageIndex = currentMessages.findIndex((message) => message.id === messageId);
    if (messageIndex < 0) {
      setPendingDeleteMessage(null);
      return;
    }

    const removedIds = new Set(
      scope === "following"
        ? currentMessages.slice(messageIndex).map((message) => message.id)
        : [messageId],
    );
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: (current[activeMessageKey] ?? []).filter(
        (message) => !removedIds.has(message.id),
      ),
    }));
    if (editingId !== null && removedIds.has(editingId)) cancelEditMessage();
    setPendingDeleteMessage(null);
  }

  async function rerollMessage(message: Message) {
    if (isReplying || isImpersonating) return;
    const truncated = (messages[activeMessageKey] ?? []).filter((m) => m.id < message.id);
    if (truncated.length === 0) return;
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: truncated,
    }));
    setChatError("");
    setIsReplying(true);

    try {
      const reply = await requestStoryReply(truncated);

      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          { id: Date.now() + 1, sender: "character", text: reply },
        ],
      }));
      setProviderState("connected");
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderState("error");
      setChatError(
        error instanceof Error
          ? error.message
          : "The story engine could not be reached. Try again.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "Unnamed soul").trim();
    const role = String(form.get("role") || "New companion").trim();
    const spark = String(form.get("spark") || "").trim();
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const newCharacter: Character = {
      id,
      name,
      role,
      status: "Just awakened",
      image: "",
      sceneImage: "",
      scene: "An Unwritten Place",
      weather: "The air holds its breath",
      bond: 8,
      memories: ["This is where your story begins"],
      reply: "I was wondering when you would find me.",
      profile:
        spark ||
        `${name} is ${role.toLowerCase()} whose personality and history will emerge through the roleplay.`,
      accent: "#d78a5e",
    };
    const scene = scenesFor(newCharacter)[0];
    const session: StorySession = {
      id: `session-${id}`,
      characterId: id,
      sceneId: scene.id,
      title: scene.title,
      messageKey: id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCharacters((current) => [...current, newCharacter]);
    setMessages((current) => ({
      ...current,
      [id]: [
        {
          id: Date.now(),
          sender: "narrator",
          text: `${name} looks up as the unwritten world takes shape around you.`,
        },
        { id: Date.now() + 1, sender: "character", text: newCharacter.reply },
      ],
    }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(id);
    setIsCreating(false);
    setView("chat");
  }

  async function importCharacterCard(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed?.data ?? parsed;
      const name = String(data?.name || "").trim();
      if (!name) throw new Error("This card does not contain a character name.");

      const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      const tags = Array.isArray(data.tags) ? data.tags.slice(0, 2).join(" · ") : "";
      const description = String(data.description || "").trim();
      const personality = String(data.personality || "").trim();
      const scenario = String(data.scenario || "").trim();
      const opening = String(data.first_mes || "I was wondering when you would arrive.")
        .replaceAll("*", "")
        .trim();
      const backstory = String(data?.extensions?.backstory || "");
      const importedMemories = backstory
        .split(".")
        .map((item: string) => item.trim())
        .filter(Boolean)
        .slice(0, 2);

      const importedCharacter: Character = {
        id,
        name,
        role: tags || "Imported character",
        status: "Ready to meet",
        image: "",
        sceneImage: "",
        scene: "An Imported Story",
        weather: "The world waits for your first choice",
        bond: 12,
        memories: importedMemories.length
          ? importedMemories
          : ["Their history is waiting to be discovered"],
        reply: opening,
        profile:
          [description, personality, scenario].filter(Boolean).join("\n\n") ||
          `${name} is an imported character whose personality should stay consistent with their opening message.`,
        accent: "#d78a5e",
      };
      const scene = scenesFor(importedCharacter)[0];
      const session: StorySession = {
        id: `session-${id}`,
        characterId: id,
        sceneId: scene.id,
        title: scene.title,
        messageKey: id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setCharacters((current) => [...current, importedCharacter]);
      setMessages((current) => ({
        ...current,
        [id]: [
          ...(description
            ? [{ id: Date.now(), sender: "narrator" as const, text: description }]
            : []),
          { id: Date.now() + 1, sender: "character", text: opening },
        ],
      }));
      setSessions((current) => [session, ...current]);
      setCurrentSessionId(session.id);
      setSelectedId(id);
      setImportError("");
      setIsCreating(false);
      setView("chat");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "That character card could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  function renderText(text: string, forceAction = false) {
    if (forceAction) {
      return <span style={{ color: textStyle.action, fontStyle: "italic" }}>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    const regex = /(\*[^*]+\*|\[[^\]]+\])/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex} style={{ color: textStyle.dialogue }}>{text.slice(lastIndex, match.index)}</span>);
      }
      const inner = match[0];
      if (inner.startsWith("*")) {
        parts.push(<span key={match.index} style={{ color: textStyle.action, fontStyle: "italic" }}>{inner.slice(1, -1)}</span>);
      } else {
        parts.push(<span key={match.index} style={{ color: textStyle.narration }}>{inner.slice(1, -1)}</span>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex} style={{ color: textStyle.dialogue }}>{text.slice(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : <span style={{ color: textStyle.dialogue }}>{text}</span>;
  }

  function renderMessageText(text: string, sender: Message["sender"]) {
    const formattedText = text
      .replace(/\s*(\*[^*]+\*)\s*/g, "\n\n$1\n\n")
      .replace(
        /(?:^|\s+)([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})(?:\s*\(as\))?:\s*/g,
        "\n\n$1\n\n",
      )
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const paragraphs = formattedText
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <div className="message-copy-text">
        {(paragraphs.length > 0 ? paragraphs : [formattedText]).map((paragraph, index) => {
          const isSpeakerLabel = /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2}(?:\s*\(as\))?:$/.test(paragraph);
          const escapedName = selected.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const isUnmarkedAction = sender === "character"
            && !paragraph.startsWith("*")
            && new RegExp(`^(?:${escapedName}|she|he|they)\\b`, "i").test(paragraph);
          return (
            <p
              className={isSpeakerLabel ? "speaker-label" : undefined}
              key={`${index}:${paragraph.slice(0, 24)}`}
            >
              {renderText(paragraph, isUnmarkedAction)}
            </p>
          );
        })}
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <main className="login-shell">
        <div className="login-atmosphere" aria-hidden="true" />
        <section className="login-panel loading-panel" aria-hidden="true">
          <span className="brand login-brand">
            <span className="brand-mark">◒</span>
            <span>The Howling Whispers</span>
          </span>
          <p className="eyebrow">Opening the door between worlds…</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main
        className="login-shell"
        style={{
          "--entrance-image": entranceFeature.image
            ? `url("${entranceFeature.image}")`
            : "linear-gradient(120deg, #241a10, #0a090b)",
          "--entrance-position": entranceFeature.position,
          "--entrance-mobile-position": entranceFeature.mobilePosition,
          "--entrance-accent": entranceFeature.accent,
        } as React.CSSProperties}
      >
        <div className="login-atmosphere" key={entranceFeature.id} aria-hidden="true" />
        <section className="login-panel" aria-labelledby="login-title">
          <span className="brand login-brand">
            <span className="brand-mark" aria-hidden="true">◒</span>
            <span>The Howling Whispers</span>
          </span>
          <p className="eyebrow">Every whisper becomes a world.</p>
          <h1 id="login-title">Your worlds are waiting.</h1>
          <p className="login-copy">
            Return to the people, places, and stories that remember you—or awaken
            someone entirely new.
          </p>
          <div className="login-form">
            <button className="primary-button" type="button" onClick={handleEnter} autoFocus>
              Enter The Howling Whispers
            </button>
            <p className="login-hint">No account required. Your characters and stories stay in this browser.</p>
          </div>
          <div className="login-details" aria-label="The Howling Whispers features">
            <span>Private story space</span>
            <span>NovelAI or local GPU</span>
            <span>Character-card import</span>
          </div>
          <p className="login-privacy">
            Choose whether your NovelAI token lasts only for this tab or persists in
            this computer&apos;s browser profile. It is only sent when generating or
            testing a reply.
          </p>
        </section>
        <aside className="entrance-feature" aria-label="Featured character">
          <div className="entrance-feature-copy">
            <p className="eyebrow">{entranceFeature.contactUrl ? "Curation call" : "Tonight's voice"}</p>
            <h2>
              {(entranceFeature.creditUrl || entranceFeature.contactUrl) ? (
                <a
                  href={entranceFeature.creditUrl || entranceFeature.contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {entranceFeature.name}
                </a>
              ) : (
                entranceFeature.name
              )}
            </h2>
            <span>{entranceFeature.role}</span>
            {entranceFeature.credit && (
              <small className="entrance-feature-credit">{entranceFeature.credit}</small>
            )}
            <blockquote>{entranceFeature.line}</blockquote>
          </div>
          <div className="entrance-feature-controls">
            <div className="entrance-markers" aria-label="Choose featured character">
              {entranceFeatures.map((feature, index) => (
                <button
                  className={index === entranceFeatureIndex ? "active" : ""}
                  key={feature.id}
                  type="button"
                  onClick={() => setEntranceFeatureIndex(index)}
                  disabled={entranceCodaLocked}
                  aria-label={`Feature ${feature.name}`}
                  aria-pressed={index === entranceFeatureIndex}
                />
              ))}
            </div>
            <button
              className={`coda-lock ${entranceCodaLocked ? "active" : ""}`}
              type="button"
              onClick={() => {
                const lockCoda = !entranceCodaLocked;
                setEntranceCodaLocked(lockCoda);
                if (lockCoda) setEntranceFeatureIndex(0);
              }}
              aria-pressed={entranceCodaLocked}
            >
              <span aria-hidden="true">{entranceCodaLocked ? "◆" : "◇"}</span>
              {entranceCodaLocked ? "Resume rotation" : "Keep Coda"}
            </button>
          </div>
        </aside>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => setView("home")}
          aria-label="The Howling Whispers home"
        >
          <span className="brand-mark" aria-hidden="true">
            ◒
          </span>
          <span>Howling Whispers</span>
        </button>
        <div className="top-divider" />
        <nav className="app-nav" aria-label="Primary navigation">
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => setView("home")}
          >
            Characters
          </button>
          <button
            className={`changelog-nav-button ${view === "changelog" ? "active" : ""}`}
            onClick={() => setView("changelog")}
          >
            What&apos;s new
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </nav>
        <div className="current-scene">
          <span aria-hidden="true">{view === "chat" ? "♜" : view === "scenes" ? "◈" : view === "changelog" ? "◇" : view === "settings" ? "⚙" : "✦"}</span>
          <span>
            {view === "chat"
              ? activeScene.title
              : view === "scenes"
                ? `${selected.name} · scenes`
              : view === "changelog"
                ? "What's new"
              : view === "settings"
                ? "User settings"
                : "Choose a character"}
          </span>
          <span aria-hidden="true">›</span>
        </div>
        <div className="top-actions">
          <button
            className={`connection-pill ${providerState}`}
            onClick={() => setView("settings")}
            aria-label="Open story engine settings"
          >
            <span aria-hidden="true" />
            {providerState === "connected"
              ? storyProvider === "novelai" ? "NovelAI verified" : "Ollama model ready"
              : providerState === "testing"
                ? `Testing ${providerLabel}`
                : providerState === "error"
                  ? "Connection failed"
                : configured
                  ? storyProvider === "novelai" ? "Token entered" : "Ollama model selected"
                  : "Set up story engine"}
          </button>
          <div className="account-chip" title="Local story space">
            <span aria-hidden="true">
              {currentUser?.displayName.trim().charAt(0).toUpperCase() || "U"}
            </span>
            <div>
              <strong>{currentUser?.displayName.trim() || "Local player"}</strong>
              <button className="link-button" onClick={handleSignOut}>Return to entrance</button>
            </div>
          </div>
          <button className="outline-button create-button" onClick={() => setIsCreating(true)}>
            <span aria-hidden="true">＋</span>
            Create character
          </button>
        </div>
      </header>

      {view === "home" && (
        <section className="character-home">
          <div className="home-hero">
            <div>
              <p className="eyebrow">
                Welcome back{currentUser?.displayName.trim() ? `, ${currentUser.displayName}` : ""}
              </p>
              <h1>Who will answer tonight?</h1>
              <p>
                Every whisper becomes a world. Choose a soul, then enter a new
                scene or return to one already unfolding.
              </p>
              <button className="home-changelog-link" onClick={() => setView("changelog")}>
                See what&apos;s new <span aria-hidden="true">→</span>
              </button>
            </div>
            <button
              className={`home-connection ${providerState}`}
              onClick={() => setView("settings")}
            >
              <span className="home-connection-icon" aria-hidden="true">
                {connected ? "✓" : configured ? "!" : "＋"}
              </span>
              <span>
                <small>Story engine</small>
                <strong>
                  {connected
                    ? `${activeModel.label} verified`
                    : providerState === "error"
                      ? "Connection failed · check settings"
                    : configured
                      ? storyProvider === "novelai"
                        ? "Token entered · test required"
                        : `${activeModel.label} · test required`
                      : "Choose an engine to begin"}
                </strong>
              </span>
              <i aria-hidden="true">›</i>
            </button>
          </div>

          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Your characters</p>
              <h2>Begin a new roleplay</h2>
            </div>
            <span>{characters.length} souls waiting</span>
          </div>

          <div className="character-gallery">
            {characters.map((character) => {
              const characterTheme = scenesFor(character)[0].theme;
              return (
                <article
                  className="home-character"
                  key={character.id}
                  onClick={() => openSceneLibrary(character.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSceneLibrary(character.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={
                    {
                      "--card-image": character.image
                        ? `url("${character.image}")`
                        : "linear-gradient(145deg, #2b1c1e, #0c0c0e)",
                      "--character-accent": characterTheme.accent,
                      "--card-position": character.portraitFocalPoint ?? "center",
                    } as React.CSSProperties
                  }
                >
                  <div className="home-character-wash" />
                  <div className="home-character-copy">
                    <span className="home-character-status">
                      <i />
                      {character.status}
                    </span>
                    <h3>
                      {character.creditUrl ? (
                        <a
                          href={character.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {character.name}
                        </a>
                      ) : (
                        character.name
                      )}
                    </h3>
                    <p>{character.role}</p>
                    <small>{character.scene}</small>
                    {character.credit && (
                      <small className="home-character-credit">{character.credit}</small>
                    )}
                    <button onClick={(event) => {
                      event.stopPropagation();
                      openSceneLibrary(character.id);
                    }}>
                      Open their stories <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
            <button className="new-character-card" onClick={() => setIsCreating(true)}>
              <span aria-hidden="true">＋</span>
              <strong>Awaken someone new</strong>
              <small>Create a character or import a character-card JSON.</small>
            </button>
          </div>
        </section>
      )}

      {view === "scenes" && (
        <section className="scene-library" style={themeVariables}>
          <div
            className="scene-library-backdrop"
            style={{
              "--scene-library-image": selected.image
                ? `url("${selected.image}")`
                : "linear-gradient(145deg, #211416, #09090b)",
              "--scene-library-position": selected.portraitFocalPoint ?? "center",
            } as React.CSSProperties}
          />
          <div className="scene-library-content">
            <header className="scene-library-header">
              <button className="outline-button" onClick={() => setView("home")}>
                ← All characters
              </button>
              <div>
                <p className="eyebrow">Stories with {selected.name}</p>
                <h1>Choose where the story begins.</h1>
                <p>{selected.role} · {selected.status}</p>
              </div>
              <Portrait character={selected} />
            </header>

            {selected.id === "coda" && (
              <section className="coda-world-draft" aria-labelledby="coda-world-title">
                <div className="coda-world-intro">
                  <div>
                    <p className="eyebrow">World draft · awaiting your approval</p>
                    <h2 id="coda-world-title">{codaWorldGuide.title}</h2>
                  </div>
                  <p>{codaWorldGuide.summary}</p>
                </div>
                <div className="coda-world-foundations">
                  {codaWorldGuide.foundations.map((foundation) => (
                    <article key={foundation.title}>
                      <span>{foundation.mark}</span>
                      <h3>{foundation.title}</h3>
                      <p>{foundation.text}</p>
                    </article>
                  ))}
                </div>
                <div className="coda-world-index">
                  <div>
                    <span>Places currently in the draft</span>
                    <div className="coda-world-tags">
                      {codaWorldGuide.places.map((place) => <i key={place}>{place}</i>)}
                    </div>
                  </div>
                  <div>
                    <span>Optional player roles</span>
                    <div className="coda-world-tags role-tags" role="group" aria-label="Choose your role">
                      {codaWorldGuide.roles.map((role) => (
                        <button
                          type="button"
                          className={selectedCodaRole === role.name ? "active" : ""}
                          key={role.name}
                          onClick={() => setSelectedCodaRole(role.name)}
                          aria-pressed={selectedCodaRole === role.name}
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                    <p className="coda-role-description">
                      {codaWorldGuide.roles.find((role) => role.name === selectedCodaRole)?.context}
                    </p>
                    {selectedCodaRole === "Custom Role" && (
                      <label className="coda-custom-role">
                        <span>Describe only your role, knowledge, and connection to Coda</span>
                        <textarea
                          value={customCodaRole}
                          onChange={(event) => setCustomCodaRole(event.target.value)}
                          maxLength={800}
                          rows={3}
                          placeholder="Example: I am a bookbinder from the court who met Coda for the first time this morning."
                        />
                      </label>
                    )}
                  </div>
                </div>
                <p className="coda-world-note">
                  The origin of Coda&apos;s collar, the purpose of its red pendant, and the names
                  of the world and city remain intentionally unresolved.
                </p>
              </section>
            )}

            <section className="scene-library-section">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">Create new</p>
                  <h2>Opening scenes</h2>
                  {selected.id === "coda" && <p className="selected-role-note">Your role: {selectedCodaRole}</p>}
                </div>
                <div className="scene-heading-actions">
                  <span>Each choice creates a separate local session</span>
                  <button className="outline-button" onClick={openStoryCreator}>
                    + Create a story
                  </button>
                </div>
              </div>
              {storyEditor && (
                <form
                  className="story-editor"
                  key={`${storyEditor.mode}:${storyEditor.scene.id || "new"}`}
                  onSubmit={saveStory}
                >
                  <div className="story-editor-heading">
                    <div>
                      <p className="eyebrow">
                        {storyEditor.mode === "create" ? "New opening" : "Edit opening"}
                      </p>
                      <h3>
                        {storyEditor.mode === "create"
                          ? `Create a story with ${selected.name}`
                          : `Edit ${storyEditor.scene.title}`}
                      </h3>
                    </div>
                    <button type="button" className="editor-close" onClick={() => setStoryEditor(null)}>
                      Close
                    </button>
                  </div>
                  <div className="story-editor-grid">
                    <label>
                      <span>Story title</span>
                      <input name="title" defaultValue={storyEditor.scene.title} required />
                    </label>
                    <label>
                      <span>Short setup</span>
                      <input name="subtitle" defaultValue={storyEditor.scene.subtitle} required />
                    </label>
                    <label>
                      <span>Character status</span>
                      <input name="status" defaultValue={storyEditor.scene.status} />
                    </label>
                    <label>
                      <span>Atmosphere</span>
                      <input name="weather" defaultValue={storyEditor.scene.weather} />
                    </label>
                    <label className="story-opening-field">
                      <span>Opening message</span>
                      <textarea
                        name="opening"
                        defaultValue={storyEditor.scene.opening}
                        rows={7}
                        required
                      />
                      <small>Use *asterisks* for actions and narration.</small>
                    </label>
                  </div>
                  <div className="story-editor-footer">
                    <button type="button" className="outline-button" onClick={() => setStoryEditor(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="story-save-button">
                      {storyEditor.mode === "create" ? "Create story" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
              <div className="scene-preset-grid">
                <article
                  className="scene-preset-card sandbox-preset-card"
                  style={{
                    "--theme-accent": selected.accent,
                    "--theme-glow": `${selected.accent}45`,
                  } as React.CSSProperties}
                >
                  <div className="sandbox-grid" aria-hidden="true" />
                  <span className="scene-motif">UNWRITTEN</span>
                  <div className="scene-preset-copy">
                    <span>Context-free roleplay</span>
                    <h3>Open Sandbox</h3>
                    <p>Start with nothing but {selected.name}&apos;s core identity.</p>
                    <small>No preset setting, memories, or opening move. Your first message defines what happens.</small>
                    <div className="scene-preset-actions">
                      <button onClick={() => startSandbox(selected.id)}>
                        Enter sandbox <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
                <article
                  className="scene-preset-card autopilot-preset-card"
                  style={{
                    "--theme-accent": selected.accent,
                    "--theme-glow": `${selected.accent}45`,
                  } as React.CSSProperties}
                >
                  <div className="autopilot-grid" aria-hidden="true" />
                  <span className="scene-motif">LIVE</span>
                  <div className="scene-preset-copy">
                    <span>Self-driven roleplay</span>
                    <h3>Autopilot</h3>
                    <p>Nothing but {selected.name}&apos;s core identity — and they act on their own.</p>
                    <small>No preset opening. {selected.name} writes the first beat and keeps living while you step in whenever you like.</small>
                    <div className="scene-preset-actions">
                      <button onClick={openAutopilotStart}>
                        Enter autopilot <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
                {selectedScenes.map((scene) => (
                  <article
                    className="scene-preset-card"
                    key={scene.id}
                    style={{
                      "--preset-image": scene.background
                        ? `url("${scene.background}")`
                        : "linear-gradient(145deg, #211416, #09090b)",
                      "--preset-position": scene.backgroundFocalPoint,
                      "--theme-accent": scene.theme.accent,
                      "--theme-glow": scene.theme.glow,
                      "--scene-wash": scene.theme.wash,
                    } as React.CSSProperties}
                  >
                    <div className="scene-preset-wash" />
                    <span className="scene-motif">{scene.theme.motif}</span>
                    <div className="scene-preset-copy">
                      <span>{scene.status}</span>
                      <h3>{scene.title}</h3>
                      <p>{scene.subtitle}</p>
                      <small>{scene.weather}</small>
                      <div className="scene-preset-actions">
                        <button onClick={() => startScene(selected.id, scene)}>
                          Begin this scene <span aria-hidden="true">→</span>
                        </button>
                        <button
                          className="scene-edit-button"
                          onClick={() => setStoryEditor({ mode: "edit", scene })}
                        >
                          Edit story
                        </button>
                        {scene.id.startsWith("custom-") && (
                          <button
                            className="scene-delete-button"
                            onClick={() => deleteCustomScene(scene)}
                          >
                            Delete story
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="scene-library-section existing-scenes">
              <div className="scene-library-heading">
                <div>
                  <p className="eyebrow">Continue</p>
                  <h2>Existing sessions</h2>
                </div>
                <span>{selectedSessions.length} saved locally</span>
              </div>
              {selectedSessions.length > 0 ? (
                <div className="session-list">
                  {selectedSessions.map((session) => {
                    const scene = session.sandbox
                      ? sandboxSceneFor(selected)
                      : selectedScenes.find((candidate) => candidate.id === session.sceneId)
                        ?? selectedScenes[0];
                    const sessionMessages = messages[session.messageKey] ?? [];
                    const preview = sessionMessages.at(-1)?.text
                      .replace(/\*|\[|\]/g, "")
                      .replace(/\s+/g, " ")
                      .trim() || scene.subtitle;
                    return (
                      <div
                        className="session-card"
                        key={session.id}
                        style={{
                          "--session-accent": scene.theme.accent,
                          "--session-glow": scene.theme.glow,
                        } as React.CSSProperties}
                      >
                        <button className="session-resume" onClick={() => continueRoleplay(session)}>
                          <span className="session-mark">{scene.theme.motif.slice(0, 2)}</span>
                          <span className="session-copy">
                            <small>{scene.title}</small>
                            <strong>{session.title}</strong>
                            <span>{preview.slice(0, 150)}</span>
                          </span>
                          <span className="session-meta">
                            <small>{new Date(session.updatedAt).toLocaleDateString()}</small>
                            <i aria-hidden="true">→</i>
                          </span>
                        </button>
                        <button
                          className="session-delete"
                          onClick={() => deleteSession(session)}
                          aria-label={`Delete ${session.title}`}
                          title="Delete session"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-sessions">
                  <span aria-hidden="true">◇</span>
                  <p>No saved sessions with {selected.name} yet.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      {view === "changelog" && (
        <section className="changelog-page">
          <header className="changelog-heading">
            <div>
              <p className="eyebrow">Version {packageInfo.version}</p>
              <h1>What&apos;s new</h1>
              <p>Only the changes that affect how you use The Howling Whispers.</p>
            </div>
            <button className="outline-button" onClick={() => setView("home")}>← Back to characters</button>
          </header>

          <div className="changelog-list">
            <article className="changelog-entry featured latest">
              <div className="changelog-mark">✦</div>
              <div>
                <span>Version {packageInfo.version} · Autopilot</span>
                <h2>Read a living story like a book</h2>
                <p>
                  Autopilot now writes short self-driven beats in a continuous reading view.
                  Choose first person, third person, or an omniscient narrator when starting,
                  adjust the background blur, and pause or stop without losing the story.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">⌁</div>
              <div>
                <span>Version 0.3.0 · Story intelligence</span>
                <h2>Every world sends only the details that matter</h2>
                <p>
                  Every curated character now has selective world lore, while custom and imported
                  characters receive a safe scene-based fallback. After a reply, open Peek Context
                  to see active canon and lore, retained history, revisions, and estimated context.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◈</div>
              <div>
                <span>Version 0.3.0 · Coda&apos;s world</span>
                <h2>Eight mysteries now wait beyond the study</h2>
                <p>
                  Coda now has a visible world guide, eight individually illustrated opening
                  scenes, and selectable player roles. Choose a preset or write a custom role
                  before beginning; its external context stays with that new story without
                  deciding your character&apos;s personality or choices.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">✦</div>
              <div>
                <span>Version 0.3.0 · Character depth</span>
                <h2>Peony remembers who she is</h2>
                <p>
                  Peony now uses her complete, carefully structured character canon in every
                  story, including existing sessions. Her trust, voice, boundaries, interests,
                  and relationship progress stay consistent as conversations grow, while private
                  adult material remains separate from ordinary scenes.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◇</div>
              <div>
                <span>Version 0.3.0 · Sandbox</span>
                <h2>Start with a blank world</h2>
                <p>
                  Every character now has an Open Sandbox. It keeps their core identity,
                  but starts without a preset scene, memories, setting, or opening move.
                  Your first message decides where the roleplay begins.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◉</div>
              <div>
                <span>Version 0.3.0 · Local generation</span>
                <h2>Roleplay without a cloud model</h2>
                <p>
                  Settings now lets you switch between NovelAI and Mistral Nemo 12B
                  running locally through Ollama. Local prompts and replies stay on the
                  computer hosting The Howling Whispers. Structured formatting and selected
                  reply-length minimums are enforced before local replies reach the chat.
                </p>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-mark">↻</div>
              <div>
                <span>Stories</span>
                <h2>More control over each roleplay</h2>
                <p>
                  Sessions are independent and can be resumed or deleted. Messages can be
                  edited, rerolled, removed individually, or removed with everything after them.
                  Custom opening scenes can also be deleted with their linked sessions.
                </p>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-mark">Aa</div>
              <div>
                <span>Reading controls</span>
                <h2>Make the conversation yours</h2>
                <p>
                  Chat font size now sits beside the text colors in Settings. The
                  character and context panels can also be hidden independently while chatting.
                </p>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-mark">◒</div>
              <div>
                <span>Entrance</span>
                <h2>Featured voices at the threshold</h2>
                <p>
                  The entrance now rotates through curated character portraits. Choose
                  Keep Coda for a static entrance that always returns to her.
                </p>
              </div>
            </article>

            <article className="changelog-entry">
              <div className="changelog-mark">▱</div>
              <div>
                <span>Storage</span>
                <h2>You choose how long the token stays</h2>
                <p>
                  NovelAI tokens can last for one tab or this browser profile. Characters,
                  sessions, and messages remain local to this browser; clearing its site data
                  also clears those stories.
                </p>
              </div>
            </article>

            <article className="changelog-entry caution">
              <div className="changelog-mark">!</div>
              <div>
                <span>Need to know · Remote access</span>
                <h2>Remote test mode is not encrypted</h2>
                <p>
                  Direct remote access uses HTTP and is intended only for temporary testing.
                  NovelAI tokens and story traffic are not encrypted in transit. Disable remote
                  access when testing is finished.
                </p>
              </div>
            </article>
          </div>
        </section>
      )}

      {view === "settings" && (
        <section className="settings-page">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Your account</p>
              <h1>Settings</h1>
              <p>
                Manage your story engine, verify the connection, and see exactly
                what The Howling Whispers remembers in this browser.
              </p>
            </div>
            <button className="outline-button" onClick={() => setView("home")}>
              ← Back to characters
            </button>
          </div>

          <div className="settings-grid">
            <section className="settings-panel engine-settings">
              <div className="settings-panel-title">
                <div>
                  <p className="eyebrow">Story engine</p>
                  <h2>{providerLabel} connection</h2>
                </div>
                <span className={`settings-status ${providerState}`}>
                  <i />
                  {providerState === "connected"
                    ? verifiedAt
                      ? `Verified ${verifiedAt}`
                      : "Verified working"
                    : providerState === "testing"
                      ? "Testing now"
                      : providerState === "error"
                        ? "Test failed"
                        : configured
                          ? storyProvider === "novelai" ? "Token entered" : "Ready to test"
                          : "Not configured"}
                </span>
              </div>

              <div className={`connection-feedback ${providerState}`} role="status">
                <span aria-hidden="true">
                  {providerState === "connected"
                    ? "✓"
                    : providerState === "testing"
                      ? "…"
                      : providerState === "error"
                        ? "!"
                        : configured
                          ? "◆"
                          : "○"}
                </span>
                <div>
                  <strong>
                    {providerState === "connected"
                      ? storyProvider === "novelai" ? "Your NovelAI token works" : "Your Ollama model is available"
                      : providerState === "testing"
                        ? storyProvider === "novelai" ? "Contacting NovelAI" : "Checking Ollama"
                        : providerState === "error"
                          ? "Connection could not be verified"
                          : configured
                            ? storyProvider === "novelai" ? "Token entered, not tested" : "Ollama model selected, not tested"
                            : storyProvider === "novelai" ? "No NovelAI token entered" : "No Ollama model entered"}
                  </strong>
                  <p>
                    {connectionError ||
                      connectionFeedback ||
                      (storyProvider === "local"
                        ? `Run the test to confirm Ollama and ${activeModel.label} are available on this server.`
                        : storyProvider === "device"
                          ? "Run Ollama on this computer, allow this website origin, then test the selected model."
                          : "Enter a token below, then run the test. A successful test means the selected model returned a real response.")}
                  </p>
                </div>
              </div>

              <form
                className="settings-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveSettings();
                }}
              >
                <fieldset className="reply-style-fieldset provider-choice-fieldset">
                  <legend>Generation provider</legend>
                  <div className="reply-style-options provider-choice-options">
                    <button
                      className={storyProvider === "novelai" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("novelai");
                        setProviderState(hasNovelAiToken ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("");
                      }}
                      aria-pressed={storyProvider === "novelai"}
                    >
                      <strong>NovelAI</strong>
                      <small>Cloud generation with Xialong or GLM 4.6</small>
                    </button>
                    <button
                      className={storyProvider === "local" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("local");
                        setServerModelScan("loading");
                        setServerModelError("");
                        setServerModelRefresh((value) => value + 1);
                        setProviderState("ready");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("Local generation stays on the website server. Run the test before chatting.");
                      }}
                      aria-pressed={storyProvider === "local"}
                    >
                      <strong>Local server</strong>
                      <small>Generation through server-local Ollama</small>
                    </button>
                    <button
                      className={storyProvider === "device" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        setStoryProvider("device");
                        setDeviceModelScan("loading");
                        setDeviceModelError("");
                        setDeviceModelRefresh((value) => value + 1);
                        setProviderState(deviceModel.trim() ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback("Generation runs in Ollama on this computer, not on the website server.");
                      }}
                      aria-pressed={storyProvider === "device"}
                    >
                      <strong>This computer</strong>
                      <small>Use Ollama installed on the browser’s computer</small>
                    </button>
                  </div>
                </fieldset>

                <div className="settings-field-grid">
                  <div className="connection-target-setting">
                    <label>
                      Connection target
                      <input
                        value={storyProvider === "local"
                          ? "Ollama on this website server"
                          : storyProvider === "device"
                            ? "Ollama on this computer (127.0.0.1:11434)"
                            : "https://text.novelai.net/oa/v1"}
                        readOnly
                        aria-readonly="true"
                      />
                      <small>{storyProvider === "local"
                        ? "The app server contacts its own localhost; your browser does not connect to your computer."
                        : storyProvider === "device"
                          ? `Your browser contacts Ollama directly. Ollama must allow ${ollamaOriginSetting}.`
                          : "Fixed to NovelAI’s OpenAI-compatible text endpoint."}</small>
                    </label>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={testConnection}
                      disabled={providerState === "testing"}
                    >
                      {providerState === "testing"
                        ? storyProvider === "novelai" ? "Testing NovelAI…" : "Checking Ollama…"
                        : "Test connection"}
                    </button>
                    {storyProvider === "local" && testProgress && (
                      <div
                        className="test-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={testProgress.maxTokens}
                        aria-valuenow={testProgress.phase === "generating"
                          ? testProgress.tokens
                          : undefined}
                        aria-label="Connection test progress"
                      >
                        <div className="test-progress-label">
                          <span>
                            {testProgress.phase === "connecting"
                              ? "Contacting the server…"
                              : testProgress.phase === "loading"
                                ? "Loading the model on the server…"
                                : `Generating ${testProgress.tokens}/${testProgress.maxTokens} tokens…`}
                          </span>
                          <span className="test-progress-elapsed">
                            {formatTestElapsed(testProgress.elapsedSec)}
                          </span>
                        </div>
                        <div className="test-progress-track">
                          <div
                            className={testProgress.phase === "generating"
                              ? "test-progress-fill"
                              : "test-progress-fill indeterminate"}
                            style={testProgress.phase === "generating"
                              ? { width: `${Math.min(100, (testProgress.tokens / testProgress.maxTokens) * 100)}%` }
                              : undefined}
                          />
                        </div>
                        {testProgress.phase === "loading" && (
                          <small>
                            The first test loads the model and can take a few minutes; the model
                            stays loaded afterward, so later tests are fast.
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                  <label>
                    Model
                    {storyProvider === "local" ? (
                      <select
                        value={selectedLocalModel}
                        disabled={serverModelScan !== "ready"}
                        onChange={(event) => {
                          setSelectedLocalModel(event.target.value);
                          setProviderState("ready");
                          setVerifiedAt("");
                          setConnectionError("");
                          setConnectionFeedback("Local model changed. Test the connection again.");
                        }}
                      >
                        {serverModelScan !== "ready" && (
                          <option value={selectedLocalModel}>
                            {serverModelScan === "loading" ? "Scanning server models…" : "No server models available"}
                          </option>
                        )}
                        {serverModels.map((model) => (
                          <option value={model.value} key={model.value}>
                            {model.adult ? `${model.label} · Adult` : model.label}
                          </option>
                        ))}
                      </select>
                    ) : storyProvider === "device" ? (
                      deviceModelScan === "ready" ? (
                        <select
                          value={deviceModel}
                          onChange={(event) => {
                            setDeviceModel(event.target.value);
                            setProviderState("ready");
                            setVerifiedAt("");
                            setConnectionError("");
                            setConnectionFeedback("Model changed. Test this computer's Ollama connection again.");
                          }}
                        >
                          {deviceModels.map((model) => (
                            <option value={model.value} key={model.value}>{model.label}</option>
                          ))}
                        </select>
                      ) : deviceModelScan === "error" || deviceModelScan === "empty" ? (
                        <input
                          value={deviceModel}
                          onChange={(event) => {
                            setDeviceModel(event.target.value);
                            setProviderState(event.target.value.trim() ? "ready" : "disconnected");
                            setVerifiedAt("");
                            setConnectionError("");
                            setConnectionFeedback("Model changed. Test this computer's Ollama connection again.");
                          }}
                          placeholder="mistral-nemo:12b"
                          spellCheck={false}
                        />
                      ) : (
                        <select disabled><option>Scanning this computer…</option></select>
                      )
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(event) => {
                          setSelectedModel(event.target.value as ModelId);
                          setProviderState(apiToken.trim() ? "ready" : "disconnected");
                          setVerifiedAt("");
                          setConnectionError("");
                          setConnectionFeedback(
                            apiToken.trim()
                              ? "Model changed. Test the connection again."
                              : "",
                          );
                        }}
                      >
                        {novelAiModels.map((model) => (
                          <option value={model.value} key={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <small>{activeModel.description}</small>
                  </label>
                </div>

                {storyProvider === "local" && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setServerModelScan("loading");
                      setServerModelError("");
                      setServerModelRefresh((value) => value + 1);
                    }}
                    disabled={serverModelScan === "loading"}
                  >
                    {serverModelScan === "loading" ? "Scanning server models…" : "Refresh server models"}
                  </button>
                )}
                {storyProvider === "device" && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setDeviceModelScan("loading");
                      setDeviceModelError("");
                      setDeviceModelRefresh((value) => value + 1);
                    }}
                    disabled={deviceModelScan === "loading"}
                  >
                    {deviceModelScan === "loading" ? "Scanning this computer…" : "Refresh this computer's models"}
                  </button>
                )}

                {storyProvider === "novelai" && <label>
                  NovelAI access token
                  <div className="token-input">
                    <input
                      type={showToken ? "text" : "password"}
                      value={apiToken}
                      onChange={(event) => {
                        const value = event.target.value;
                        setApiToken(value);
                        setProviderState(value.trim() ? "ready" : "disconnected");
                        setVerifiedAt("");
                        setConnectionError("");
                        setConnectionFeedback(
                          value.trim()
                            ? "Token entered. Run the test to verify it."
                            : "",
                        );
                      }}
                      placeholder="Paste your NovelAI token"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="button" onClick={() => setShowToken((current) => !current)}>
                      {showToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <small>
                    Currently saved for {tokenStorageMode === "computer"
                      ? "this computer's browser profile"
                      : "this browser tab"}. The Howling Whispers never writes it to
                    the site database or logs.
                  </small>
                </label>}

                <label>
                  Creativity
                  <div className="creativity-row">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={creativity}
                      onChange={(event) => setCreativity(Number(event.target.value))}
                    />
                    <strong>{creativity}/10</strong>
                  </div>
                </label>

                <fieldset className="reply-style-fieldset">
                  <legend>Reply length</legend>
                  <div className="reply-style-options">
                    {replyLengths.map((length) => (
                      <button
                        className={replyLength === length.value ? "active" : ""}
                        type="button"
                        key={length.value}
                        onClick={() => setReplyLength(length.value)}
                        aria-pressed={replyLength === length.value}
                      >
                        <strong>{length.label}</strong>
                        <small>{length.description}</small>
                      </button>
                    ))}
                  </div>
                  <p>
                    Immersive is the recommended roleplay setting. Novel-like
                    uses more generation tokens and may take a little longer.
                  </p>
                </fieldset>

                <fieldset className="story-control-fieldset">
                  <legend>Roleplay direction</legend>
                  <p>
                    Adapted for both story engines from the Living World preset principles.
                    These settings apply to new replies and rerolls.
                  </p>
                  <div className="settings-field-grid">
                    <label>
                      World initiative
                      <select
                        value={initiative}
                        onChange={(event) => setInitiative(event.target.value as Initiative)}
                      >
                        <option value="reactive">Reactive</option>
                        <option value="balanced">Balanced</option>
                        <option value="proactive">Proactive</option>
                      </select>
                      <small>How readily characters and events move the story forward.</small>
                    </label>
                    <label>
                      Viewpoint
                      <select
                        value={viewpoint}
                        onChange={(event) => setViewpoint(event.target.value as Viewpoint)}
                      >
                        <option value="user">Player limited</option>
                        <option value="character">Character limited</option>
                        <option value="roving">Roving limited</option>
                      </select>
                      <small>Controls whose observable experience frames narration.</small>
                    </label>
                    <label>
                      Tense
                      <select
                        value={storyTense}
                        onChange={(event) => setStoryTense(event.target.value as StoryTense)}
                      >
                        <option value="present">Present</option>
                        <option value="past">Past</option>
                      </select>
                      <small>Sets the requested narrative tense.</small>
                    </label>
                  </div>
                </fieldset>

                <div className="settings-actions">
                  {storyProvider === "novelai" && <button
                    className="outline-button"
                    type="button"
                    onClick={() => saveSettings("tab")}
                  >
                    Save for this tab
                  </button>}
                  {storyProvider === "novelai" && <button
                    className="outline-button"
                    type="button"
                    onClick={() => saveSettings("computer")}
                  >
                    Save for this computer
                  </button>}
                  {storyProvider === "novelai" && savedAt && <span>Saved at {savedAt}</span>}
                  {storyProvider === "novelai" && hasNovelAiToken && (
                    <button
                      className="text-button disconnect-button"
                      type="button"
                      onClick={() => {
                        setApiToken("");
                        localStorage.removeItem("dreambound_naiToken");
                        sessionStorage.removeItem("dreambound_naiToken");
                        setTokenStorageMode("tab");
                        setProviderState("disconnected");
                        setConnectionError("");
                        setConnectionFeedback("");
                        setSavedAt("");
                        setVerifiedAt("");
                      }}
                    >
                      Remove token
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="settings-panel account-settings">
              <p className="eyebrow">Your player</p>
              <div className="settings-avatar" aria-hidden="true">
                {playerProfile.name.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <h2>{playerProfile.name.trim() || "Local player"}</h2>
              <label>
                Player name
                <input
                  value={playerProfile.name}
                  onChange={(event) => updatePlayerProfile({ name: event.target.value })}
                  placeholder="Leave blank to stay unnamed in the story"
                  maxLength={100}
                />
              </label>
              <label>
                Persona
                <textarea
                  value={playerProfile.persona}
                  onChange={(event) => updatePlayerProfile({ persona: event.target.value })}
                  placeholder="Describe how you want to be seen in the story—appearance, nature, history. Leave blank if you prefer to improvise."
                  rows={4}
                  maxLength={2000}
                />
              </label>
              <p>Everything is saved in this browser. Nothing is uploaded.</p>
              <span className="chatgpt-badge">✓ Private local story space</span>
              <button className="outline-button settings-signout" onClick={handleSignOut}>
                Return to entrance
              </button>
            </section>

            <section className="settings-panel style-settings">
              <p className="eyebrow">Appearance</p>
              <h2>Text colors</h2>
              <p>Customize how dialogue, actions, and narration appear in the chat.</p>
              <div className="style-grid">
                <label className="font-size-setting">
                  <span>Chat font size</span>
                  <input
                    type="range"
                    min="15"
                    max="26"
                    step="1"
                    value={textStyle.fontSize}
                    onChange={(event) => setTextStyle((style) => ({
                      ...style,
                      fontSize: Number(event.target.value),
                    }))}
                  />
                  <output>{textStyle.fontSize}px</output>
                </label>
                <label>
                  Dialogue
                  <input type="color" value={textStyle.dialogue} onChange={(e) => setTextStyle(s => ({ ...s, dialogue: e.target.value }))} />
                </label>
                <label>
                  Action <small>*text*</small>
                  <input type="color" value={textStyle.action} onChange={(e) => setTextStyle(s => ({ ...s, action: e.target.value }))} />
                </label>
                <label>
                  Narration <small>[text]</small>
                  <input type="color" value={textStyle.narration} onChange={(e) => setTextStyle(s => ({ ...s, narration: e.target.value }))} />
                </label>
              </div>
              <button className="text-button" onClick={() => setTextStyle(defaultTextStyle)}>
                Reset to defaults
              </button>
            </section>

            <section className="settings-panel privacy-settings">
              <p className="eyebrow">Privacy</p>
              <h2>What is remembered?</h2>
              <ul>
                <li>
                  <span>Story engine</span>
                  <strong>{storyProvider === "novelai"
                    ? "NovelAI"
                    : storyProvider === "local" ? "Local server" : "This computer"}</strong>
                </li>
                <li>
                  <span>NovelAI token</span>
                  <strong>{hasNovelAiToken
                    ? tokenStorageMode === "computer" ? "This computer" : "Current tab"
                    : "Not stored"}</strong>
                </li>
                  <li>
                    <span>Selected model</span>
                    <strong>This browser</strong>
                  </li>
                  <li>
                    <span>Conversations</span>
                    <strong>This browser</strong>
                  </li>
              </ul>
              <p>
                Characters, scenes, and conversations survive reloads in this
                browser. Tab-only NovelAI tokens clear when the tab closes. Local model
                prompts are processed by the selected server-local or computer-local Ollama.
              </p>
            </section>

            <section className="settings-panel update-settings">
              <p className="eyebrow">Release channel</p>
              <h2>Application updates</h2>
              <div className="version-row">
                <span>Application version</span>
                <strong>v{packageInfo.version}</strong>
              </div>
              <p className={`update-message ${updateState}`}>{updateMessage}</p>
              <div className="update-actions">
                <button
                  className="outline-button"
                  onClick={checkForUpdates}
                  disabled={updateState === "checking"}
                >
                  {updateState === "checking" ? "Checking..." : "Check for updates"}
                </button>
                {releaseUrl && (
                  <a href={releaseUrl} target="_blank" rel="noreferrer">View release</a>
                )}
              </div>
              <small>
                 Hosted installations are updated by their server administrator.
                 Stories and preferences remain in this browser profile.
              </small>
            </section>

            {isDevelopmentDeployment && (
              <section className="settings-panel update-settings">
                <p className="eyebrow">Development environment</p>
                <h2>Promote a verified release</h2>
                <p>
                  Production deploys only the latest commit already merged into the central
                  <code> main </code>branch. Development files are never copied directly.
                </p>
                <div className="update-actions">
                  <a className="primary-button" href="/__deploy/">Open deployment panel</a>
                  <a
                    className="outline-button"
                    href="https://github.com/FreakyHydra/HowlingWhispers/compare/main...dev?expand=1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Review dev → main
                  </a>
                </div>
              </section>
            )}
          </div>
        </section>
      )}

      {view === "chat" && (
      <section
        className={`workspace${showCharacterRail ? "" : " hide-character-rail"}${showContextRail ? "" : " hide-context-rail"}`}
        style={themeVariables}
      >
        {showCharacterRail && <aside className="character-rail" aria-label="Characters">
          <div className="rail-heading">
            <p className="eyebrow">Characters</p>
            <span>{characters.length}</span>
          </div>

          <div className="character-list">
            {characters.map((character) => (
              <button
                className={`character-card ${selected.id === character.id ? "selected" : ""}`}
                key={character.id}
                onClick={() => openSceneLibrary(character.id)}
                aria-pressed={selected.id === character.id}
              >
                <Portrait character={character} />
                <span className="character-copy">
                  <strong>{character.name}</strong>
                  <small>{character.role}</small>
                  <span className="status-line">
                    <i style={{ background: character.accent }} />
                    {character.status}
                  </span>
                </span>
                <span className="favorite" aria-hidden="true">
                  ☆
                </span>
              </button>
            ))}
          </div>

          <div className="rail-footer">
            <span aria-hidden="true">♧</span>
            <span>{characters.length} souls</span>
          </div>
        </aside>}

        <section
          className={`story-stage ${activeScene.background ? "has-image" : "no-image"}`}
          style={
            {
              "--scene-image": activeScene.background
                ? `url("${activeScene.background}")`
                : "linear-gradient(145deg, #211416, #09090b)",
              "--scene-position": activeScene.backgroundFocalPoint,
              "--scene-blur": `${activeSession?.autopilot ? storyBackgroundBlur : 0}px`,
            } as React.CSSProperties
          }
          aria-label={`Conversation with ${selected.name}`}
        >
          <div className="stage-wash" />
          <div className="chat-view-controls" aria-label="Chat layout">
            <button
              className={showCharacterRail ? "active" : ""}
              onClick={() => setShowCharacterRail((visible) => !visible)}
              aria-pressed={showCharacterRail}
              title={`${showCharacterRail ? "Hide" : "Show"} character panel`}
            >
              <span aria-hidden="true">☷</span> Characters
            </button>
            <button
              className={`context-toggle ${showContextRail ? "active" : ""}`}
              onClick={() => setShowContextRail((visible) => !visible)}
              aria-pressed={showContextRail}
              title={`${showContextRail ? "Hide" : "Show"} context panel`}
            >
              Context <span aria-hidden="true">☰</span>
            </button>
            {activeSession?.autopilot && (
              <label className="story-blur-control">
                <span>Blur</span>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="1"
                  value={storyBackgroundBlur}
                  onChange={(event) => setStoryBackgroundBlur(Number(event.target.value))}
                  aria-label="Story background blur"
                />
                <output>{storyBackgroundBlur}px</output>
              </label>
            )}
          </div>
          <div className="scene-title">
            <h1>{selected.name}</h1>
            <p>
              <span className="presence-dot" style={{ background: activeTheme.accent }} />
              {activeScene.status} <i>·</i> {activeTheme.motif}
            </p>
            {activeSession && !activeSession.autopilot && (
              <button
                className="autopilot-toggle"
                onClick={toggleAutopilot}
                aria-pressed={false}
                title="Let this character live on their own"
              >
                <span className="auto-dot" aria-hidden="true" />
                Autopilot
              </button>
            )}
            {autopilotError && <p className="auto-error">{autopilotError}</p>}
          </div>

          <div className={`messages${activeSession?.autopilot ? " storytelling" : ""}`} aria-live="polite">
            {activeMessages.length === 0 && activeSession?.autopilot && (
              <div className="sandbox-empty-state">
                <span aria-hidden="true">◉</span>
                <p className="eyebrow">Autopilot</p>
                <h2>{selected.name} is stirring awake.</h2>
                <p>
                  Nothing has been written yet. {selected.name} will write the first
                  beat on their own in a moment — step in whenever you like.
                </p>
              </div>
            )}
            {activeMessages.length === 0 && activeSession?.sandbox && (
              <div className="sandbox-empty-state">
                <span aria-hidden="true">◇</span>
                <p className="eyebrow">Open Sandbox</p>
                <h2>Nothing has happened yet.</h2>
                <p>
                  Write the first line, action, or piece of narration. There is no preset
                  setting or history; {selected.name} will respond from there.
                </p>
              </div>
            )}
            {activeMessages.map((message, index) => {
              const isLastCharacter =
                message.sender === "character" &&
                activeMessages.slice(index + 1).every((m) => m.sender !== "character");
              return (
                <article
                  className={`message ${message.sender}${seenMessageIds.has(`${activeMessageKey}:${message.id}`) ? "" : " message-new"}`}
                  key={message.id}
                >
                  {message.sender === "character" && <Portrait character={selected} accent={activeTheme.accent} />}
                  {editingId === message.id ? (
                    <div className="message-edit">
                      <textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            saveEditMessage(message.id);
                          }
                          if (event.key === "Escape") cancelEditMessage();
                        }}
                        autoFocus
                        rows={3}
                      />
                      <div className="message-edit-actions">
                        <button onClick={() => saveEditMessage(message.id)}>Save</button>
                        <button onClick={cancelEditMessage}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {renderMessageText(message.text, message.sender)}
                      <div className="message-actions">
                        <button
                          onClick={() => startEditMessage(message.id, message.text)}
                          aria-label="Edit message"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => setPendingDeleteMessage(message)}
                          aria-label="Delete message"
                          title="Delete"
                        >
                          ✕
                        </button>
                        {isLastCharacter && (
                          <button
                            onClick={() => rerollMessage(message)}
                            aria-label="Re-roll reply"
                            title="Re-roll reply"
                            disabled={isReplying}
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
            {isReplying && (
              <article className="message character typing" aria-label={`${selected.name} is replying`}>
                <Portrait character={selected} />
                <p>
                  <span />
                  <span />
                  <span />
                </p>
              </article>
            )}
          </div>

          <div className="composer-wrap">
            {chatError && (
              <div className="chat-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{chatError}</p>
                {!configured && (
                  <button onClick={() => setView("settings")}>Connect NovelAI</button>
                )}
              </div>
            )}
            {activeSession?.autopilot && (
              autopilotControlsCollapsed && activeSession.autopilotPaused ? (
                <div
                  className="autopilot-controls is-collapsed is-paused"
                  aria-label="Autopilot controls (minimized)"
                >
                  <button
                    className="autopilot-collapse-toggle"
                    onClick={() => setAutopilotControlsCollapsed(false)}
                    aria-label="Expand autopilot controls"
                  >
                    <span aria-hidden="true" className="auto-dot is-running" />
                    <span className="autopilot-status">Paused — minimized</span>
                    <span aria-hidden="true" className="autopilot-collapse-icon">▲</span>
                  </button>
                </div>
              ) : (
              <div
                className={`autopilot-controls${activeSession.autopilotPaused ? " is-paused" : ""}`}
                aria-label="Autopilot controls"
              >
                <span aria-hidden="true" className="auto-dot is-running" />
                <p className="autopilot-status">
                  {activeSession.autopilotStopped
                    ? "Stopped — story preserved"
                    : activeSession.autopilotPaused
                    ? "Paused — write whenever you like"
                    : autopilotBusy
                      ? `${selected.name} is living on their own…`
                      : selected.name}
                </p>
                <div className="autopilot-control-buttons">
                  {activeSession.autopilotPaused && (
                    <button
                      onClick={() => setAutopilotControlsCollapsed(true)}
                      className="autopilot-collapse"
                      aria-label="Minimize autopilot controls"
                    >
                      Minimize
                    </button>
                  )}
                  <button onClick={toggleAutopilotPause} disabled={autopilotBusy}>
                    {activeSession.autopilotPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => setBeatRequest((count) => count + 1)}
                    disabled={autopilotBusy}
                  >
                    Next
                  </button>
                  <button onClick={stopAutopilot} className="autopilot-stop">
                    Stop
                  </button>
                </div>
              </div>
              )
            )}
            {(!activeSession?.autopilot || activeSession?.autopilotPaused) && !autopilotControlsCollapsed && (
              <div className="composer">
              <label htmlFor="story-input" className="sr-only">
                Message {selected.name}
              </label>
              <textarea
                id="story-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Speak, act, or shape the scene…"
                rows={2}
              />
              <div className="composer-actions">
                <select
                  aria-label="Message mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option>Dialogue</option>
                  <option>Action</option>
                  <option>Narration</option>
                </select>
                <div className="action-cluster">
                  <button
                    className="icon-button"
                    aria-label="Impersonate player"
                    title="Impersonate: direct or generate a complete player turn"
                    onClick={() => setShowImpersonate(true)}
                    disabled={isReplying || isImpersonating || activeMessages.length === 0}
                  >
                    {isImpersonating ? "…" : "◐"}
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Skip turn"
                    title="Skip turn: let the character continue"
                    onClick={skipTurn}
                    disabled={isReplying || isImpersonating || activeMessages.length === 0}
                  >
                    »
                  </button>
                  {(isReplying || isImpersonating) && (
                    <button
                      className="icon-button stop-button"
                      onClick={stopGeneration}
                      aria-label="Stop generating"
                      title="Stop generating"
                    >
                      ■
                    </button>
                  )}
                  <button
                    className="send-button"
                    onClick={sendMessage}
                    disabled={!draft.trim() || isReplying || isImpersonating}
                    aria-label="Send message"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </section>

        {showContextRail && <aside className="context-rail" aria-label="Story context">
          <section className="context-card">
            <div className="card-title">
              <p className="eyebrow">Scene</p>
              <button aria-label="Choose another scene" onClick={() => setView("scenes")}>✎</button>
            </div>
            <div className="scene-summary">
              <div
                className="scene-orb"
                style={
                  {
                    "--thumb": activeScene.background
                      ? `url("${activeScene.background}")`
                      : "linear-gradient(145deg, #2b1c1e, #0c0c0e)",
                  } as React.CSSProperties
                }
              />
              <div>
                <h2>{activeScene.title}</h2>
                <p>☁ {activeScene.weather}</p>
              </div>
            </div>
          </section>

          <section className="context-card memory-card">
            <div className="card-title">
              <p className="eyebrow">{activeSession?.sandbox ? "Sandbox" : "Memory"}</p>
              {!activeSession?.sandbox && <button aria-label="Add memory">＋</button>}
            </div>
            {activeSession?.sandbox ? (
              <div className="sandbox-context-note">
                <span aria-hidden="true">◇</span>
                <p>Preset memories are off. Only this conversation becomes context.</p>
              </div>
            ) : (
              <ul>
                {selected.memories.map((memory, index) => (
                  <li key={memory}>
                    <span aria-hidden="true">{index === 0 ? "◉" : "▱"}</span>
                    <p>{memory}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="context-card context-inspector-card">
            <div className="card-title">
              <p className="eyebrow">Peek Context</p>
              <span aria-hidden="true">⌁</span>
            </div>
            {activeContextManifest ? (
              <details>
                <summary>
                  <span>{activeContextManifest.estimatedInputTokens.toLocaleString()} estimated tokens</span>
                  <small>{activeContextManifest.includedLore.length} lore entries active</small>
                </summary>
                <div className="context-inspector-body">
                  <dl>
                    <div><dt>Context window</dt><dd>{activeContextManifest.contextWindow.toLocaleString()}</dd></div>
                    <div><dt>Input budget</dt><dd>{activeContextManifest.inputBudget.toLocaleString()}</dd></div>
                    <div><dt>Recent messages</dt><dd>{activeContextManifest.includedMessages} kept · {activeContextManifest.omittedMessages} omitted</dd></div>
                    <div><dt>Character revision</dt><dd>{activeContextManifest.characterRevision}</dd></div>
                    <div><dt>World revision</dt><dd>{activeContextManifest.worldRevision ?? "None"}</dd></div>
                  </dl>
                  <div className="context-inspector-group">
                    <strong>Active character canon</strong>
                    <div className="context-receipts">
                      {activeContextManifest.includedSections.map((id) => <span key={id}>{id}</span>)}
                    </div>
                  </div>
                  <div className="context-inspector-group">
                    <strong>Active world lore</strong>
                    {activeContextManifest.includedLore.length > 0 ? (
                      <ul>
                        {activeContextManifest.includedLore.map((entry) => (
                          <li key={entry.id}><span>{entry.title}</span><small>{entry.reason}</small></li>
                        ))}
                      </ul>
                    ) : <p>No world lore was included in this reply.</p>}
                  </div>
                  <p className="context-omission-note">
                    {activeContextManifest.omittedLore.filter((entry) => entry.reason === "inactive").length} inactive lore entries and {activeContextManifest.omittedLore.filter((entry) => entry.reason === "budget").length} budget-limited entries stayed out.
                  </p>
                </div>
              </details>
            ) : (
              <p className="context-inspector-empty">Generate a reply to see exactly which canon, lore, and recent history reached the model.</p>
            )}
          </section>

          <section className="context-card connection-card">
            <div className="card-title">
              <p className="eyebrow">Connection</p>
              <span aria-hidden="true">♡</span>
            </div>
            <div className="provider-status">
              <span
                className={
                  connected
                    ? "online"
                    : providerState === "testing"
                      ? "testing"
                    : providerState === "ready"
                      ? "ready"
                      : providerState === "error"
                        ? "error"
                        : "offline"
                }
              />
              <div>
                <p>
                  {providerLabel}{" "}
                  {connected
                    ? "verified working"
                    : providerState === "testing"
                      ? "testing"
                    : providerState === "ready"
                      ? storyProvider === "novelai" ? "token entered" : "ready to test"
                      : providerState === "error"
                        ? "needs attention"
                        : "not connected"}
                </p>
                <button onClick={() => setView("settings")}>Open settings</button>
              </div>
            </div>
            <p className="model-note">
              {configured
                ? `${activeModel.label} · ${activeReplyLength.label}`
                : `No model selected · ${activeReplyLength.label}`}
            </p>
            <div className="pulse-heading">
              <span>Story pulse</span>
              <strong>{selected.relationship ?? (selected.bond > 66 ? "Tender" : selected.bond > 35 ? "Guarded" : "New")}</strong>
            </div>
            <div className="bond-meter" aria-label={`Story pulse ${selected.bond}%`}>
              <span style={{ width: `${selected.bond}%` }} />
              <i style={{ left: `${selected.bond}%` }}>♡</i>
            </div>
          </section>
        </aside>}
      </section>
      )}

      {pendingDeleteMessage && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setPendingDeleteMessage(null)}
        >
          <section
            className="modal delete-message-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setPendingDeleteMessage(null)}
              aria-label="Cancel deletion"
            >
              ×
            </button>
            <p className="eyebrow">Edit conversation</p>
            <h2 id="delete-message-title">How much should be deleted?</h2>
            <p className="modal-intro" id="delete-message-description">
              You can remove only this message, or rewind the story by removing it and
              every message that follows.
            </p>
            <blockquote>
              {pendingDeleteMessage.text.replace(/\s+/g, " ").slice(0, 180)}
            </blockquote>
            <div className="delete-message-actions">
              <button className="delete-single-button" onClick={() => deleteMessage("single")}>
                Delete only this message
              </button>
              <button className="delete-following-button" onClick={() => deleteMessage("following")}>
                Delete this and later messages
              </button>
              <button className="outline-button" onClick={() => setPendingDeleteMessage(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {showImpersonate && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowImpersonate(false)}
        >
          <section
            className="modal impersonate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="impersonate-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowImpersonate(false)}
              aria-label="Close impersonation prompt"
            >
              ×
            </button>
            <p className="eyebrow">Take the player&apos;s turn</p>
            <h2 id="impersonate-title">Guide the impersonation</h2>
            <p className="modal-intro">
              Give the story engine an optional intention, action, or tone. Leave it empty to choose
              a plausible response from the story so far.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                impersonatePlayer();
              }}
            >
              <label>
                Direction <small>Optional</small>
                <textarea
                  value={impersonationPrompt}
                  onChange={(event) => setImpersonationPrompt(event.target.value)}
                  rows={5}
                  placeholder={`For example: reassure ${selected.name}, but stay guarded`}
                  autoFocus
                />
              </label>
              <div className="impersonate-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setShowImpersonate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Impersonate &amp; send
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showAutopilotStart && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAutopilotStart(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="autopilot-start-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowAutopilotStart(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Autopilot</p>
            <h2 id="autopilot-start-title">Where does the story begin?</h2>
            <p className="modal-intro">
              Set the opening for {selected.name}&apos;s own story — where they are, what is
              happening, who you are to them. They will take it from there, living beat by beat.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                beginAutopilot();
              }}
            >
              <fieldset className="autopilot-pov">
                <legend>Mode</legend>
                <div className="autopilot-pov-options">
                  <button
                    type="button"
                    className={autopilotPov === "first" ? "active" : ""}
                    onClick={() => setAutopilotPov("first")}
                  >
                    First person
                  </button>
                  <button
                    type="button"
                    className={autopilotPov === "third" ? "active" : ""}
                    onClick={() => setAutopilotPov("third")}
                  >
                    Third person
                  </button>
                  <button
                    type="button"
                    className={autopilotPov === "narrator" ? "active" : ""}
                    onClick={() => setAutopilotPov("narrator")}
                  >
                    Narrative telling
                  </button>
                </div>
                <small>
                  {autopilotPov === "first" && "Written from the character's own voice using I/my."}
                  {autopilotPov === "third" && "Close third-person limited to the character (she/he)."}
                  {autopilotPov === "narrator" && "A storytelling voice free to move between characters and scenes."}
                </small>
              </fieldset>
              <label>
                Opening prompt <small>Optional</small>
                <textarea
                  value={autopilotSeed}
                  onChange={(event) => setAutopilotSeed(event.target.value)}
                  rows={5}
                  placeholder={`For example: It is past midnight and ${selected.name} is alone in the greenhouse while rain taps the glass.`}
                  autoFocus
                />
              </label>
              <p className="modal-intro">
                Leave it blank and {selected.name} will open the story on their own.
              </p>
              <div className="impersonate-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setShowAutopilotStart(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Begin autopilot
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isCreating && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCreating(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setIsCreating(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Awaken someone new</p>
            <h2 id="create-title">Create a character</h2>
            <p className="modal-intro">
              Give them a name and a place in your world. You can deepen their lore as you talk.
            </p>
            <label className="import-card">
              <span>
                Already have a character?
                <small>Import a NovelAI or V2 character-card JSON.</small>
              </span>
              <input type="file" accept=".json,application/json" onChange={importCharacterCard} />
            </label>
            {importError && <p className="form-error">{importError}</p>}
            <div className="modal-divider">
              <span>or create one here</span>
            </div>
            <form onSubmit={createCharacter}>
              <label>
                Name
                <input name="name" required placeholder="Who are they?" autoFocus />
              </label>
              <label>
                Role in your story
                <input name="role" required placeholder="Girlfriend, rival, guardian…" />
              </label>
              <label>
                First spark
                <textarea
                  name="spark"
                  rows={3}
                  placeholder="A secret, a desire, or the moment you first meet…"
                />
              </label>
              <button className="primary-button" type="submit">
                Awaken character
              </button>
            </form>
          </section>
        </div>
      )}

    </main>
  );
}
