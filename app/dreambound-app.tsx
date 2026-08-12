"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import packageInfo from "../package.json";
import { legacyCharacterToCanon, type AgeCategory } from "../lib/characters/canonical";
import {
  ensureUniqueCharacterIds,
  parseCharacterImport,
  serializeCharacter,
  serializeCharacterLibrary,
} from "../lib/characters/import-export";
import {
  characterCardV2ToHowling,
  CHARACTER_CARD_V2_LIMITS,
  characterCardV2BookToWorldLore,
  characterCardV2ToCanon,
  embedCharacterCardV2InPng,
  extractCharacterCardV2FromPng,
  howlingCharacterToV2,
  howlingWorldLoreToCharacterBook,
  isCharacterCardV2,
  parseCharacterCardV2Json,
  serializeCharacterCardV2,
  type HowlingV2Metadata,
} from "../lib/characters/character-card-v2";
import {
  deleteCharacterPortrait,
  isStoredPortraitReference,
  loadCharacterPortrait,
  persistCharacterPortrait,
} from "../lib/characters/portrait-storage";
import {
  buildBackupPayload,
  parsePortableBackup,
  serializeBackupPayload,
  validatePayload,
  type BackupPayload,
} from "../lib/backup/format";
import { ensureUniquePersonaIds } from "../lib/personas/import-export";
import { PersonaLibrary } from "../components/personas/persona-library";
import ArchiveView from "../components/archive/archive-view";
import { archive, type ArchivePublication, type ArchiveUser } from "../lib/archive/client";
import { PersonaPicker } from "../components/story/persona-picker";
import {
  loadPersonas,
  savePersonas,
  loadActivePersonaId,
  saveActivePersonaId,
  migrateLegacyPlayerProfile,
} from "../lib/personas/storage";
import { compilePlayerPersona } from "../lib/personas/compile";
import type { PlayerPersona } from "../lib/personas/schema";
import type { ContextManifest } from "../lib/generation/compile-context.ts";
import { formatPlayerTurn } from "../lib/generation/player-turn.ts";
import type { AutonomousAgent } from "../lib/generation/autonomous-cast.ts";
import {
  autonomousAgentsToArray,
  seedAutonomyFromCast,
} from "../lib/generation/autonomous-cast.ts";
import type { StoryMetadata } from "../lib/generation/story-metadata.ts";
import {
  createCast,
  detectLivingCast,
  detectPendingInteraction,
  matchesName,
  type LivingCastEntry,
} from "../lib/generation/living-cast.ts";
import { isNewerVersion } from "../lib/version.mjs";
import { legacyCharacterToWorldLore } from "../lib/worlds/schema.ts";
import { resolveBuiltinWorldLore } from "../lib/worlds/builtins.ts";
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
  cardV2?: HowlingV2Metadata;
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
  playerName?: string;
  playerPersona?: string;
  playerPersonaId?: string;
  livingCast?: LivingCastEntry[];
  autonomousCast?: AutonomousAgent[];
};

type StoryEditor = {
  mode: "create" | "edit";
  scene: SceneDefinition;
};

type Message = {
  id: number;
  sender: "character" | "player" | "narrator";
  text: string;
  speaker?: string;
  direction?: string;
  pages?: string[];
  pageIndex?: number;
  meta?: StoryMetadata | null;
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
type AppView = "home" | "scenes" | "chat" | "changelog" | "settings" | "archive" | "personas";
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
    eyebrow: "",
  },
  {
    id: "heather",
    name: "Heather Whiteclaw",
    role: "Senior werewolf ranger",
    line: "Some borders remember every footprint.",
    image: "/assets/Heather/heather-whiteclaw.png",
    position: "68% 30%",
    mobilePosition: "62% top",
    accent: "#d1a84c",
    credit: "Character by Gigasad",
    creditUrl: "https://botbooru.com/character/15573",
    contactUrl: "",
    eyebrow: "",
  },
  {
    id: "peony",
    name: "Peony",
    role: "Wholesome succubus seeking purpose",
    line: "Impossible flowers bloom between worlds.",
    image: "/assets/peony-void-garden-v2.png",
    position: "70% 38%",
    mobilePosition: "67% top",
    accent: "#bd72da",
    credit: "",
    creditUrl: "",
    contactUrl: "",
    eyebrow: "",
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
    eyebrow: "",
  },
  {
    id: "valerie",
    name: "Valerie Whiteclaw",
    role: "Heather&apos;s daughter · The pack&apos;s future",
    line: "Coming to a forest near you.",
    image: "/assets/Heather/valerie-whiteclaw-teaser.png",
    position: "center 30%",
    mobilePosition: "62% top",
    accent: "#c8a94f",
    credit: "Character by Gigasad",
    creditUrl: "",
    contactUrl: "",
    eyebrow: "Coming soon",
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
    eyebrow: "",
  },
] as const;

function randomEntranceFeature(): number {
  return Math.floor(Math.random() * entranceFeatures.length);
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
    credit: "Character by Arrax Shadowfang",
    accent: "#45b8b3",
  },
  {
    id: "heather",
    name: "Heather Whiteclaw",
    role: "Senior werewolf ranger",
    status: "Patrolling the border",
    image: "/assets/Heather/heather-whiteclaw.png",
    sceneImage: "/assets/Heather/heather-whiteclaw.png",
    scene: "Whiteclaw Borderlands",
    weather: "Pine wind under a full moon",
    bond: 34,
    memories: [
      "Her mate vanished years ago; the mystery was never solved",
      "Her only family is her daughter Valerie, now an adult",
      "An old-school werewolf supremacist who considers humans weak and ignorant",
      "A senior guardian in the Whiteclaw pack's ranger corps; her service weapon is a twelve-gauge",
    ],
    reply:
      "*The moonlight glowing overhead barely trickles past the thick forest canopy, bathing the undergrowth in a heavy, oppressive darkness that swallows everything. One shadowy stretch of the woods looks the same as any other, but there's a noticeable shift in the air the deeper you go. Even sound seems to disappear in the dark, right up until a footstep snaps a twig just inches behind you.*\n\nHands up. Nice and slow. *A woman's voice snarls from your back, followed by the click-clack of a shotgun being racked.* Start talking. Who the hell are you, and why'd you leave the road? *She growls each word through her teeth, her breath hot and furious but tightly controlled.* This is Whiteclaw territory. You better have a damn good reason to be stinking up my woods, punk.",
    profile: `Heather, age 42, is a senior member and guardian of the Whiteclaw werewolf pack. Heather's previous mate went missing many years ago, and remains an unsolved mystery. Her only remaining family is her daughter Valerie, now an adult.

Appearance: Heather is very lean and wiry, being a bit of a health nut and a cardio addict. Her hair is naturally silver-grey, tied into a ponytail, and her eyes glimmer golden yellow. Heather hasn't let age slow her down at all, and her strict training keeps her in top shape. Like any other werewolf she has a pair of soft wolf ears on top of her head, sharp fangs and a fluffy tail on her lower back. Time has left some hard creases around her eyes, but otherwise Heather is as fit and healthy as she was in her 20s.

Clothing: Most of Heather's clothes are military surplus, geared up for rugged outdoors work. This usually means camouflaged cargo pants, tank tops and armored jackets, with a strap for her shotgun and a combat knife on her belt. Everywhere she goes, Heather wears a dog tag declaring her as a member of the Whiteclaw pack's ranger corps.

Personality: Disciplined, loyal and bigoted. Heather is a very old-school werewolf supremacist who considers humans weak and ignorant. She looks down on outsiders, and treats werewolves from other packs with suspicion. However Heather is very compassionate with those from her community, and always makes time to help her packmates. She can be rough, and is fiercely protective of her pack, but has a good heart and a gift for her work. It hasn't happened in years, but when she gets angry enough Heather can be a violent, terrifying force of nature, able to tear a person in half with just her bare hands.

Mind: Heather is a workaholic, and gets anxious when she's away from her post for too long. She doesn't fool around while she's on patrol, and will not hesitate to open fire if she catches an intruder in her pack's territory. Heather's beast blood is well under control and she doesn't go into a blood frenzy under the full moon anymore, but she sometimes craves a chance to let loose and go wild like she did when she was young. Though she tries to always present herself as serious and cold, Heather can't help but wag her tail when she's happy.

 Speech style: blunt, growling, and plain. Put actions and observable narration in *single asterisks*, spoken dialogue in "double quotes", and inner voice in [square brackets]. Keep action, dialogue, and inner voice inline within the same paragraph; do not force blank lines between them. Preserve natural paragraph boundaries. Adjacent spans of the same type may merge. Keep Heather autonomous, proud, protective, and capable of cold cruelty and stubborn loyalty. Never control the player's thoughts, feelings, dialogue, decisions, or voluntary actions.`,
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
    image: "/assets/peony-void-garden-v2.png",
    sceneImage: "/assets/peony-void-garden-v2.png",
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

 Speech style: articulate, confident, slightly flirtatious, and sarcastic without becoming relentlessly seductive. Her insight should appear through specific questions and remembered details rather than announced psychological analysis. Put actions and observable narration in *single asterisks*, spoken dialogue in "double quotes", and inner voice in [square brackets]. Keep action, dialogue, and inner voice inline within the same paragraph; do not force blank lines between them. Preserve natural paragraph boundaries. Adjacent spans of the same type may merge. Keep Peony autonomous, relationship-aware, capable of mistakes, and focused on becoming more than the fate assigned to her. Never control the player's thoughts, feelings, dialogue, decisions, consent, or voluntary actions.`,
    credit: "Character by Derkomor",
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
    credit: "Character by FurbyMask",
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
      sender: "character",
      text:
        "*The moonlight glowing overhead barely trickles past the thick forest canopy, bathing the undergrowth in a heavy, oppressive darkness that swallows everything. One shadowy stretch of the woods looks the same as any other, but there's a noticeable shift in the air the deeper you go. Even sound seems to disappear in the dark, right up until a footstep snaps a twig just inches behind you.*\n\nHands up. Nice and slow. *A woman's voice snarls from your back, followed by the click-clack of a shotgun being racked.* Start talking. Who the hell are you, and why'd you leave the road? *She growls each word through her teeth, her breath hot and furious but tightly controlled.* This is Whiteclaw territory. You better have a damn good reason to be stinking up my woods, punk.",
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

const curatedCharacterIds = new Set(initialCharacters.map((character) => character.id));
function isUserOwnedCharacter(character: Character): boolean {
  return !curatedCharacterIds.has(character.id);
}

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
      background: "/assets/Heather/heather-whiteclaw-borderlands.png",
      backgroundFocalPoint: "50% 30%",
      opening: "*The moonlight glowing overhead barely trickles past the thick forest canopy, bathing the undergrowth in a heavy, oppressive darkness that swallows everything. One shadowy stretch of the woods looks the same as any other, but there's a noticeable shift in the air the deeper you go. Even sound seems to disappear in the dark, right up until a footstep snaps a twig just inches behind you.*\n\nHands up. Nice and slow. *A woman's voice snarls from your back, followed by the click-clack of a shotgun being racked.* Start talking. Who the hell are you, and why'd you leave the road? *She growls each word through her teeth, her breath hot and furious but tightly controlled.* This is Whiteclaw territory. You better have a damn good reason to be stinking up my woods, punk.",
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
      id: "ranger-station-cell",
      title: "The Ranger Station",
      subtitle: "A night in the station cell",
      status: "Busted by the day patrol",
      weather: "Cold rain on the tin roof",
      background: "/assets/Heather/heather-whiteclaw-ranger-station.png",
      backgroundFocalPoint: "50% 30%",
      opening: "*Heather arrives back at the ranger station and shrugs off her jacket, only to sniff the air and turn to face you.* Oh, right. Figures it's you. *She sighs, and her ears fold back as she leans on the door to your cell.*\n\nDelilah from the day patrol said she had to bust you again. She was being a real cagey bitch about it too. So what'd you do this time, jackass? *Her eyes narrow at you through the bars, equal parts amused and unimpressed.* Keep in mind that if you go whining about another misunderstanding I'm gonna come in there, and it's not gonna be fun. *Despite the look in her eyes her tail wags very slightly, as though she's looking forward to working you over.*",
      theme: {
        accent: "#8fb6c9",
        accentMuted: "#45697a",
        glow: "rgba(143, 182, 201, 0.28)",
        surface: "rgba(10, 15, 20, 0.96)",
        wash: "linear-gradient(90deg, rgba(7, 12, 17, 0.92), rgba(35, 58, 72, 0.14) 62%, rgba(9, 14, 19, 0.55)), linear-gradient(0deg, rgba(5, 9, 13, 0.98), transparent 70%)",
        motif: "RANGER STATION",
      },
    },
    {
      id: "moon-dance",
      title: "The Moon Dance",
      subtitle: "Practice for the pack's annual festival",
      status: "Leading the Moon Dance",
      weather: "Crisp night under a rising moon",
      background: "/assets/Heather/heather-whiteclaw-moon-dance.png",
      backgroundFocalPoint: "50% 30%",
      opening: "Hoo boy. *Heather sighs, and turns as she looks down at herself. She's wearing an elaborate, colorful costume, decorated with handmade beads and the Whiteclaw's pack insignia. Her silver hair is down from its usual ponytail, draped over her shoulders, and her face is painted with symbols of the moon phases.*\n\nI think the alpha picked me just to mess with me. I haven't led the Moon Dance since I was a kid. *Her grey tail droops a little.* You got time to practice before the festival starts, you? Sorry if I trip you up, but better now than in front of the pack. *Heather's typical confidence and icy glare are gone, faced with upholding pack tradition.* C'mon. We still have time before the elders come get us... please? *Her ears twitch anxiously.*",
      theme: {
        accent: "#e0b15c",
        accentMuted: "#8a6a33",
        glow: "rgba(224, 177, 92, 0.3)",
        surface: "rgba(20, 14, 8, 0.95)",
        wash: "linear-gradient(90deg, rgba(16, 11, 6, 0.92), rgba(90, 62, 26, 0.14) 62%, rgba(14, 10, 6, 0.55)), linear-gradient(0deg, rgba(10, 7, 4, 0.98), transparent 70%)",
        motif: "MOON DANCE",
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
      background: "/assets/peony-void-garden-v2.png",
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
    background: character.cardV2 ? "" : character.image,
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
    background: character.sceneImage || (character.cardV2 ? "" : character.image),
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
    livingCast: createCast({ id: character.id, name: character.name }),
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

function Portrait({ character, accent, image }: { character: Character; accent?: string; image?: string }) {
  const portrait = image ?? character.image;
  return (
    <span className="portrait" style={{ "--accent": accent ?? character.accent } as React.CSSProperties}>
      {portrait && (
        <img
          src={portrait}
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

function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    arrowLeft: number;
    above: boolean;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 10;
    const width = Math.min(340, viewportWidth - margin * 2);
    pop.style.width = `${width}px`;
    const height = pop.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    const below = rect.bottom + gap + height <= viewportHeight - margin;
    let top = below ? rect.bottom + gap : rect.top - gap - height;
    if (top < margin) top = margin;
    const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 18), width - 18);
    setPos({ top, left, width, arrowLeft, above: !below });
  }, []);

  useEffect(() => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, place]);

  const openPopup = useCallback(() => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }, []);

  return (
    <span
      className="info-tip"
      ref={triggerRef}
      role="note"
      tabIndex={0}
      onMouseEnter={openPopup}
      onMouseLeave={closePopup}
      onFocus={openPopup}
      onBlur={closePopup}
    >
      <span className="info-tip-icon" aria-hidden="true">
        i
      </span>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className={`info-tip-pop help-popover${pos ? " is-visible" : ""}${pos?.above ? " is-above" : ""}`}
            role="tooltip"
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
            onMouseEnter={openPopup}
            onMouseLeave={closePopup}
          >
            <span className="help-popover__arrow" style={{ left: pos?.arrowLeft }} />
            <h4 className="help-popover__title">{label}</h4>
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(69, 184, 179, ${alpha})`;
  const value = parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function mixHex(hexA: string, hexB: string, amount: number): string {
  const a = /^#?([0-9a-f]{6})$/i.exec(hexA.trim());
  const b = /^#?([0-9a-f]{6})$/i.exec(hexB.trim());
  if (!a || !b) return hexA;
  const va = parseInt(a[1], 16);
  const vb = parseInt(b[1], 16);
  const channel = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return `rgba(${channel((va >> 16) & 255, (vb >> 16) & 255)}, ${channel((va >> 8) & 255, (vb >> 8) & 255)}, ${channel(va & 255, vb & 255)}, 1)`;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, spacing: string) {
  const canvas2d = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  canvas2d.letterSpacing = spacing;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: [number, number, number, number],
) {
  const [topLeft, topRight, bottomRight, bottomLeft] = radii;
  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + width - topRight, y);
  ctx.arcTo(x + width, y, x + width, y + topRight, topRight);
  ctx.lineTo(x + width, y + height - bottomRight);
  ctx.arcTo(x + width, y + height, x + width - bottomRight, y + height, bottomRight);
  ctx.lineTo(x + bottomLeft, y + height);
  ctx.arcTo(x, y + height, x, y + height - bottomLeft, bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.arcTo(x, y, x + topLeft, y, topLeft);
  ctx.closePath();
}

type PaintedRun = { text: string; color: string; italic: boolean; bold: boolean };
type PaintedLine = PaintedRun[];
type PaintedParagraph = { runs: PaintedRun[]; isLabel: boolean };

function buildParagraphs(
  text: string,
  sender: Message["sender"],
  characterName: string,
  textStyle: TextStyle,
): PaintedParagraph[] {
  const formattedText = text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const raw = formattedText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const paragraphs = raw.length > 0 ? raw : [formattedText];
  const escapedName = characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return paragraphs.map((paragraph) => {
    const isLabel = /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2}(?:\s*\(as\))?:$/.test(paragraph);
    const isAction =
      sender === "character" &&
      !paragraph.startsWith("*") &&
      new RegExp(`^(?:${escapedName}|she|he|they)\\b`, "i").test(paragraph);
    const runs: PaintedRun[] = [];
    if (isAction) {
      runs.push({ text: paragraph, color: textStyle.action, italic: true, bold: false });
    } else {
      const regex = /(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          runs.push({ text: paragraph.slice(lastIndex, match.index), color: textStyle.dialogue, italic: false, bold: false });
        }
        const inner = match[0];
        if (inner.startsWith("**")) {
          runs.push({ text: inner.slice(2, -2), color: textStyle.dialogue, italic: false, bold: true });
        } else if (inner.startsWith("*")) {
          runs.push({ text: inner.slice(1, -1), color: textStyle.action, italic: true, bold: false });
        } else {
          runs.push({ text: inner.slice(1, -1), color: textStyle.narration, italic: false, bold: false });
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < paragraph.length) {
        runs.push({ text: paragraph.slice(lastIndex), color: textStyle.dialogue, italic: false, bold: false });
      }
      if (runs.length === 0) runs.push({ text: paragraph, color: textStyle.dialogue, italic: false, bold: false });
    }
    return { runs, isLabel };
  });
}

function escapesRe(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readResponseJson<T>(response: Response, context: string): Promise<T> {
  const status = response.status;
  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(`${context} could not be read (HTTP ${status}).`);
  }
  if (!text.trim()) {
    throw new Error(`${context} returned an empty response (HTTP ${status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.length > 260 ? `${text.slice(0, 260)}…` : text;
    throw new Error(`${context} returned an invalid response (HTTP ${status}). ${preview}`.trim());
  }
}

function isInvalidImpersonationDraft(
  _direction: string,
  draft: string,
  characterName: string,
): boolean {
  const trimmedDraft = draft.trim();
  if (!trimmedDraft) return true;

  const names = new Set<string>(
    [characterName, characterName.trim().split(/\s+/)[0]].filter(Boolean),
  );
  const nameAlternates = [...names].sort((a, b) => b.length - a.length)
    .map(escapesRe)
    .join("|");

  const characterSpeakerLabel = new RegExp(
    `(?:^|\\n)\\s*(?:${nameAlternates})\\s*:\\s*`,
    "i",
  );

  const markedCharacterAction = new RegExp(
    `(?:^|\\n)\\s*\\*\\s*(?:${nameAlternates}|he|she|they)\\b`,
    "i",
  );

  return (
    characterSpeakerLabel.test(trimmedDraft) ||
    markedCharacterAction.test(trimmedDraft)
  );
}

function messageVersions(message: Message): { versions: string[]; activeIndex: number } {
  if (message.pages && message.pages.length > 0) {
    const activeIndex = Math.min(
      Math.max(message.pageIndex ?? message.pages.length - 1, 0),
      message.pages.length - 1,
    );
    return { versions: message.pages, activeIndex };
  }
  return { versions: [message.text], activeIndex: 0 };
}

export default function DreamboundApp() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [currentUser, setCurrentUser] = useState<{ displayName: string } | null>(null);
  const [archiveUser, setArchiveUser] = useState<ArchiveUser | null>(null);
  const [playerProfile, setPlayerProfile] = useState(() =>
    readSession<{ name: string; persona: string }>("player", { name: "", persona: "" }),
  );
  const [personas, setPersonas] = useState<PlayerPersona[]>(() => {
    const saved = loadPersonas();
    if (saved !== null) return saved;
    const migrated = migrateLegacyPlayerProfile();
    if (migrated) {
      savePersonas([migrated]);
      if (!loadActivePersonaId()) saveActivePersonaId(migrated.id);
      return [migrated];
    }
    savePersonas([]);
    return [];
  });
  const [activePersonaId, setActivePersonaId] = useState<string | null>(() =>
    loadActivePersonaId(),
  );
  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === activePersonaId) ?? null,
    [personas, activePersonaId],
  );
  const resolvedActivePersonaId = activePersona?.id ?? null;
  const compiledActivePersona = useMemo(
    () => (activePersona ? compilePlayerPersona(activePersona) : ""),
    [activePersona],
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
        livingCast: createCast({ id: character.id, name: character.name }),
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
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [confirmDeleteCharacter, setConfirmDeleteCharacter] = useState<Character | null>(null);
  const [downloadingCharacter, setDownloadingCharacter] = useState<Character | null>(null);
  const [characterDownloadError, setCharacterDownloadError] = useState("");
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
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
  const [autoNpcReplies, setAutoNpcReplies] = useState<boolean>(
    () => readSession("autoNpcReplies", true),
  );
  const [providerState, setProviderState] =
    useState<ProviderState>(() => readSession<ProviderState>("provider", "disconnected"));
  const [isReplying, setIsReplying] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const generationAbortRef = useRef<AbortController | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [importError, setImportError] = useState("");
  const [characterBackupMsg, setCharacterBackupMsg] = useState("");
  const [characterBackupError, setCharacterBackupError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  type PendingPersonaStart =
    | { kind: "scene"; characterId: string; scene: SceneDefinition }
    | { kind: "sandbox"; characterId: string }
    | { kind: "autopilot"; characterId: string }
    | { kind: "imported"; characterId: string }
    | null;
  const [pendingPersonaStart, setPendingPersonaStart] = useState<PendingPersonaStart>(null);
  const [autopilotPersona, setAutopilotPersona] = useState<PlayerPersona | null>(null);
  const [shareCount, setShareCount] = useState(() => readSession<number>("shareCount", 5));
  const [shareCaptions, setShareCaptions] = useState(() => readSession<boolean>("shareCaptions", true));
  const [shareHeader, setShareHeader] = useState(() => readSession<boolean>("shareHeader", true));
  const [shareBusy, setShareBusy] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [shareError, setShareError] = useState("");
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
  const [copyFeedbackId, setCopyFeedbackId] = useState<number | null>(null);
  const [directionEditor, setDirectionEditor] = useState<{ id: number; text: string } | null>(null);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<Message | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [updateMessage, setUpdateMessage] = useState("Check GitHub for a published application release.");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [entranceCodaLocked, setEntranceCodaLocked] = useState(
    () => readSession<boolean>("entranceCodaLocked", false),
  );
  const [entranceFeatureIndex, setEntranceFeatureIndex] = useState(
    () => readSession<boolean>("entranceCodaLocked", false) ? 0 : randomEntranceFeature(),
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

  // ----- Private-data backups ------------------------------------------
  const [localBackupMsg, setLocalBackupMsg] = useState("");
  const [localRestoreMsg, setLocalRestoreMsg] = useState("");
  const [localBackupError, setLocalBackupError] = useState("");
  const [serverBackupMsg, setServerBackupMsg] = useState("");
  const [serverBackups, setServerBackups] = useState<
    | {
        id: string;
        created_at: string;
        size_bytes: number;
        format: string;
        version: number;
        device: string;
        source: string;
      }[]
    | null
  >(null);
  const [serverBackupsError, setServerBackupsError] = useState("");
  const [serverBackupBusy, setServerBackupBusy] = useState(false);

  const refreshServerBackups = useCallback(() => {
    if (!archiveUser) {
      setServerBackups(null);
      return Promise.resolve();
    }
    return archive.backups
      .list()
      .then((res) => {
        setServerBackups(res.backups);
        setServerBackupsError("");
      })
      .catch((err) => {
        setServerBackups([]);
        setServerBackupsError(err instanceof Error ? err.message : "Server backups could not be listed.");
      });
  }, [archiveUser]);

  function handleArchiveUserChange(next: ArchiveUser | null) {
    setArchiveUser(next);
    if (!next) {
      setServerBackups(null);
      return;
    }
    void archive.backups
      .list()
      .then((res) => {
        setServerBackups(res.backups);
        setServerBackupsError("");
      })
      .catch(() => {
        setServerBackups([]);
        setServerBackupsError("Server backups could not be listed.");
      });
  }

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
    let active = true;
    const urls: string[] = [];
    void Promise.all(characters.map(async (character) => {
      if (!isStoredPortraitReference(character.image)) return null;
      const bytes = await loadCharacterPortrait(character.image);
      if (!bytes) return null;
      const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
      urls.push(url);
      return [character.id, url] as const;
    })).then((entries) => {
      if (!active) return;
      setPortraitUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    }).catch(() => {
      if (active) setPortraitUrls({});
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [characters]);

  function portraitUrl(character: Character): string {
    return isStoredPortraitReference(character.image)
      ? portraitUrls[character.id] ?? ""
      : character.image;
  }

  useEffect(() => {
    writeSession("shareCount", shareCount);
  }, [shareCount]);

  useEffect(() => {
    writeSession("shareCaptions", shareCaptions);
  }, [shareCaptions]);

  useEffect(() => {
    writeSession("shareHeader", shareHeader);
  }, [shareHeader]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceEntranceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let active = true;
    archive
      .me()
      .then(({ user }) => {
        if (active) {
          setArchiveUser(user);
          if (user) {
            void archive.backups
              .list()
              .then((res) => {
                setServerBackups(res.backups);
                setServerBackupsError("");
              })
              .catch(() => {
                setServerBackups([]);
                setServerBackupsError("Server backups could not be listed.");
              });
          }
        }
      })
      .catch(() => {
        if (active) setArchiveUser(null);
      });
    return () => {
      active = false;
    };
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
    writeSession("characters", characters.slice(0, 60));
  }, [characters]);

  useEffect(() => {
    savePersonas(personas);
  }, [personas]);

  useEffect(() => {
    saveActivePersonaId(resolvedActivePersonaId);
  }, [resolvedActivePersonaId]);

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
    writeSession("autoNpcReplies", autoNpcReplies);
  }, [autoNpcReplies]);

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

  function updateActiveSessionPersona(patch: Partial<{ playerName: string; playerPersona: string }>) {
    if (!activeSession) return;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, ...patch, updatedAt: Date.now() }
        : session,
    ));
  }

  function persistSessionAutonomy(autonomy: AutonomousAgent[] | undefined) {
    if (!activeSession || !autonomy || autonomy.length === 0) return;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, autonomousCast: autonomy, updatedAt: Date.now() }
        : session,
    ));
  }

  function clearActiveSessionPersona() {
    if (!activeSession) return;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, playerPersonaId: undefined, playerName: "", playerPersona: "", updatedAt: Date.now() }
        : session,
    ));
  }

  function applySessionPersona(persona: PlayerPersona) {
    if (!activeSession) return;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? {
            ...session,
            playerPersonaId: persona.id,
            playerName: persona.name,
            playerPersona: compilePlayerPersona(persona),
            updatedAt: Date.now(),
          }
        : session,
    ));
  }

  function refreshSessionCast(
    conversation: Message[],
    messageKey: string,
    overrides: {
      characterId: string;
      characterName: string;
      livingCast: LivingCastEntry[];
      playerName: string;
    },
  ) {
    const baselineCast = overrides.livingCast?.length
      ? overrides.livingCast
      : createCast({ id: overrides.characterId, name: overrides.characterName }, overrides.playerName);
    const detection = detectLivingCast({
      messages: conversation,
      cast: baselineCast,
      primary: { id: overrides.characterId, name: overrides.characterName },
      playerName: overrides.playerName,
    });
    setSessions((current) => current.map((session) =>
      session.messageKey === messageKey
        ? { ...session, updatedAt: Date.now(), livingCast: detection.cast }
        : session,
    ));
  }

  function deriveRelationshipLabel(bond: number): string {
    if (bond >= 90) return "Deeply bonded";
    if (bond >= 75) return "Affectionate";
    if (bond >= 60) return "Close";
    if (bond >= 45) return "Trusted";
    if (bond >= 30) return "Comfortable";
    if (bond >= 15) return "Guarded acquaintance";
    if (bond >= 5) return "Wary";
    return "Stranger";
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
  const activePlayerName = activeSession?.playerName?.trim() || activePersona?.name.trim() || playerProfile.name.trim();
  const sessionUsesDefaultPersona = Boolean(
    !activeSession?.playerName?.trim() && !activeSession?.playerPersona?.trim(),
  );
  const sessionPersonaSnapshot = activeSession?.playerPersona?.trim() || "";
  const sessionPersonaName =
    activeSession?.playerName?.trim() ||
    activePersona?.name.trim() ||
    playerProfile.name.trim() ||
    null;
  const activeMessageKey = activeSession?.messageKey ?? selected.id;
  const storedContextManifest = contextManifests[activeMessageKey];
  const activeContextManifest = storedContextManifest
    && (storedContextManifest.compilerVersion === 2 || storedContextManifest.compilerVersion === 3)
    ? storedContextManifest
    : undefined;
  const activeMessages = messages[activeMessageKey] ?? [];
  const shareMessages = activeMessages.slice(-Math.max(1, Math.min(shareCount, activeMessages.length)));
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
        background: selected.sceneImage || (selected.cardV2 ? "" : selected.image),
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

  function personaSnapshot(persona?: PlayerPersona | null) {
    if (!persona) return {};
    return {
      playerPersonaId: persona.id,
      playerName: persona.name,
      playerPersona: compilePlayerPersona(persona),
    };
  }

  function buildSessionInitialState(
    character: Character,
    scene: SceneDefinition,
    overrides: {
      sandbox?: boolean;
      autopilot?: boolean;
      autopilotPaused?: boolean;
      autopilotPov?: "first" | "third" | "narrator";
      seedText?: string;
      description?: string;
      characterMessage?: string;
      persona?: PlayerPersona | null;
      playerRole?: string;
      playerRoleContext?: string;
    } = {},
  ): { session: StorySession; initialMessages: Message[] } {
    const session = {
      ...createStorySession(character, scene),
      ...personaSnapshot(overrides.persona),
      sandbox: overrides.sandbox,
      autopilot: overrides.autopilot,
      autopilotPaused: overrides.autopilotPaused,
      autopilotPov: overrides.autopilotPov,
      playerRole: overrides.playerRole,
      playerRoleContext: overrides.playerRoleContext,
    };

    const initialMessages: Message[] = [];
    let nextId = session.createdAt;
    if (overrides.description) {
      initialMessages.push({ id: nextId++, sender: "narrator", text: overrides.description });
    }
    if (overrides.seedText) {
      initialMessages.push({ id: nextId++, sender: "narrator", text: overrides.seedText });
    }
    if (overrides.characterMessage) {
      initialMessages.push({ id: nextId++, sender: "character", text: overrides.characterMessage });
    } else if (scene.opening) {
      initialMessages.push({ id: nextId++, sender: "character", text: scene.opening });
    }

    const effectivePlayerName = (session.playerName?.trim() || overrides.persona?.name.trim() || playerProfile.name).trim();
    const baseCast = createCast({ id: character.id, name: character.name }, effectivePlayerName);
    const detected = initialMessages.length > 0
      ? detectLivingCast({
          messages: initialMessages,
          cast: baseCast,
          primary: { id: character.id, name: character.name },
          playerName: effectivePlayerName,
        })
      : { cast: baseCast, newNames: [], events: [], pending: null, autoSpeakerId: null, autoSpeakerName: null };

    const seededAutonomy = autonomousAgentsToArray(seedAutonomyFromCast(new Map(), detected.cast));

    return {
      session: {
        ...session,
        livingCast: detected.cast,
        autonomousCast: seededAutonomy,
      },
      initialMessages,
    };
  }

  function requestPersonaStart(start: NonNullable<PendingPersonaStart>) {
    setPendingPersonaStart(start);
  }

  function commitPersonaStart(persona?: PlayerPersona | null) {
    const start = pendingPersonaStart;
    setPendingPersonaStart(null);
    if (!start) return;
    if (start.kind === "scene") startScene(start.characterId, start.scene, persona ?? null);
    else if (start.kind === "sandbox") startSandbox(start.characterId, persona ?? null);
    else if (start.kind === "autopilot") {
      setAutopilotPersona(persona ?? null);
      setShowAutopilotStart(true);
    }
    else if (start.kind === "imported") startImported(start.characterId, persona ?? null);
  }

  function startImported(characterId: string, persona?: PlayerPersona | null) {
    const character =
      characters.find((candidate) => candidate.id === characterId) ?? characters[0];
    const scene = scenesFor(character)[0];
    const description = character.profile && !character.credit
      ? character.profile
      : "";
    const { session, initialMessages } = buildSessionInitialState(character, scene, {
      description,
      characterMessage: character.reply,
      persona,
    });
    setMessages((current) => ({
      ...current,
      [session.messageKey]: initialMessages,
    }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(character.id);
    setView("chat");
  }

  function startScene(characterId: string, scene: SceneDefinition, persona?: PlayerPersona | null) {
    const character =
      characters.find((candidate) => candidate.id === characterId) ?? characters[0];
    const role = characterId === "coda"
      ? codaWorldGuide.roles.find((candidate) => candidate.name === selectedCodaRole)
      : null;
    const customRole = customCodaRole.trim().slice(0, 800);
    const { session, initialMessages } = buildSessionInitialState(character, scene, {
      playerRole: role?.name,
      playerRoleContext: role?.name === "Custom Role"
        ? customRole || "No external player-role facts are established."
        : role?.context,
      persona,
    });
    setMessages((current) => ({
      ...current,
      [session.messageKey]: initialMessages,
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

  function startSandbox(characterId: string, persona?: PlayerPersona | null) {
    const character =
      characters.find((candidate) => candidate.id === characterId) ?? characters[0];
    const scene = sandboxSceneFor(character);
    const { session, initialMessages } = buildSessionInitialState(character, scene, {
      sandbox: true,
      persona,
    });
    setMessages((current) => ({ ...current, [session.messageKey]: initialMessages }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(character.id);
    setAutopilotError("");
    setChatError("");
    setView("chat");
  }

  function beginAutopilot(characterId?: string, persona?: PlayerPersona | null) {
    setShowAutopilotStart(false);
    if (!configured) {
      setChatError("Set up and test a story engine before starting Whisper Mode.");
      setView("settings");
      return;
    }
    const resolvedPersona = persona ?? autopilotPersona ?? null;
    setAutopilotPersona(null);
    const target = characterId
      ? characters.find((candidate) => candidate.id === characterId) ?? selected
      : selected;
    const scene = sandboxSceneFor(target);
    const seed = autopilotSeed.trim();
    const { session, initialMessages } = buildSessionInitialState(target, scene, {
      sandbox: true,
      autopilot: true,
      autopilotPaused: false,
      autopilotPov: autopilotPov,
      seedText: seed || undefined,
      persona: resolvedPersona,
    });
    setMessages((current) => ({
      ...current,
      [session.messageKey]: initialMessages,
    }));
    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setSelectedId(target.id);
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
    let elapsedStartedAt = 0;
    setTestProgress({ phase: "connecting", elapsedSec: 0, tokens: 0, maxTokens: 24 });
    const elapsedTimer = window.setInterval(() => {
      setTestProgress((current) => {
        if (!current) return current;
        if (elapsedStartedAt === 0) elapsedStartedAt = Date.now();
        return { ...current, elapsedSec: Math.floor((Date.now() - elapsedStartedAt) / 1000) };
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
    action?: "impersonate" | "autopilot" | "skip",
    playerDirection?: string,
    reroll = false,
    respondAs?: string,
  ): Promise<{ reply: string; metadata: StoryMetadata | null }> {
    const controller = new AbortController();
    generationAbortRef.current?.abort();
    generationAbortRef.current = controller;
    const requestSignal = controller.signal;
    const effectivePlayerName = (activeSession?.playerName?.trim() || activePersona?.name.trim() || playerProfile.name).trim();
    const effectivePlayerPersona = (activeSession?.playerPersona?.trim() || compiledActivePersona || playerProfile.persona).trim();
    const sessionCast = activeSession?.livingCast?.length
      ? activeSession.livingCast
      : createCast({ id: selected.id, name: selected.name }, effectivePlayerName);
    const requestBody = {
        action,
        playerName: effectivePlayerName,
        playerPersona: effectivePlayerPersona,
        impersonationPrompt: playerDirection,
        reroll,
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
        livingCast: sessionCast,
        autonomousCast: activeSession?.autonomousCast ?? [],
        respondAs,
        character: {
          id: selected.id,
          name: selected.name,
          role: selected.role,
          profile: selected.profile,
          canonical: characterCardV2ToCanon(selected, `v2-${packageInfo.version}`) ?? legacyCharacterToCanon({
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
          worldLore: activeSession?.sandbox ? null : characterCardV2BookToWorldLore(
            selected.id,
            selected.cardV2?.characterBook,
          ) ?? legacyCharacterToWorldLore({
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
        messages: conversation.slice(-30).map(({ sender, text, speaker }) => ({ sender, text, speaker })),
    };
    if (storyProvider === "device") {
      const preparedResponse = await fetch("/api/novelai", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(requestBody),
        signal: requestSignal,
      });
      const prepared = await readResponseJson<{
        ollamaRequest?: Record<string, unknown>;
        finalization?: Record<string, unknown>;
        context?: ContextManifest;
        autonomy?: AutonomousAgent[];
        error?: string;
      }>(preparedResponse, "The story prompt preparation");
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
      const generated = await readResponseJson<{ response?: string; error?: string }>(ollamaResponse, "Ollama");
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
      const finalized = await readResponseJson<{ reply?: string; metadata?: StoryMetadata | null; error?: string }>(finalizedResponse, "The reply formatting");
      if (!finalizedResponse.ok || !finalized.reply) {
        throw new Error(finalized.error || "The local reply could not be formatted.");
      }
      if (prepared.context) {
        setContextManifests((current) => ({ ...current, [activeMessageKey]: prepared.context! }));
      }
      persistSessionAutonomy(prepared.autonomy);
      return { reply: finalized.reply, metadata: finalized.metadata ?? null };
    }
    const response = await fetch("/api/novelai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(requestBody),
      signal: requestSignal,
    });
    const payload = await readResponseJson<{ reply?: string; metadata?: StoryMetadata | null; error?: string; context?: ContextManifest; autonomy?: AutonomousAgent[] }>(response, providerLabel);
    if (!response.ok || !payload.reply) {
      throw new Error(payload.error || `${providerLabel} did not return a reply.`);
    }
    if (payload.context) {
      setContextManifests((current) => ({ ...current, [activeMessageKey]: payload.context! }));
    }
    persistSessionAutonomy(payload.autonomy);
    return { reply: payload.reply, metadata: payload.metadata ?? null };
  }

  const requestStoryReplyRef = useRef<typeof requestStoryReply | null>(null);
  const messagesRef = useRef<Record<string, Message[]>>(messages);
  const isReplyingRef = useRef(isReplying);
  const isImpersonatingRef = useRef(isImpersonating);
  const autopilotBusyRef = useRef(false);
  const selectedRef = useRef(selected);
  const sessionsRef = useRef(sessions);
  const refreshSessionCastRef = useRef<typeof refreshSessionCast | null>(null);
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [autopilotError, setAutopilotError] = useState("");
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
    selectedRef.current = selected;
    sessionsRef.current = sessions;
    refreshSessionCastRef.current = refreshSessionCast;
  });

  const runAutopilotBeat = useCallback(async (messageKey: string) => {
    if (autopilotBusyRef.current || isReplyingRef.current || isImpersonatingRef.current) return;
    autopilotBusyRef.current = true;
    setAutopilotBusy(true);
    setAutopilotError("");
    try {
      const conversation = messagesRef.current[messageKey] ?? [];
      const result = await requestStoryReplyRef.current?.(conversation, "autopilot") ?? { reply: "", metadata: null };
      const replyText = result.reply;
      if (replyText) {
        const updatedConversation = [...conversation, {
          id: Date.now() + 1,
          sender: "character" as const,
          text: replyText,
          meta: result.metadata ?? null,
        }];
        setMessages((current) => ({
          ...current,
          [messageKey]: updatedConversation,
        }));
        const session = sessionsRef.current.find((entry) => entry.messageKey === messageKey);
        const selected = selectedRef.current;
        refreshSessionCastRef.current?.(updatedConversation, messageKey, {
          characterId: session?.characterId ?? selected.id,
          characterName: selected.name,
          livingCast: session?.livingCast ?? [],
          playerName: session?.playerName?.trim() || "",
        });
        setProviderState("connected");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProviderState("error");
      setAutopilotError(
        error instanceof Error && error.message
          ? `Whisper Mode: ${error.message}`
          : "Whisper Mode could not reach the story engine.",
      );
    } finally {
      autopilotBusyRef.current = false;
      setAutopilotBusy(false);
    }
  }, []);

  function toggleAutopilot() {
    if (!activeSession) return;
    if (!configured) {
      setChatError("Set up and test a story engine before turning on Whisper Mode.");
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

  function requestNextAutopilotBeat() {
    if (!activeSession || !activeMessageKey || autopilotBusyRef.current || isReplyingRef.current || isImpersonatingRef.current) {
      return;
    }
    const messageKey = activeMessageKey;
    setSessions((current) => current.map((session) =>
      session.id === activeSession.id
        ? { ...session, autopilot: true, autopilotPaused: true, autopilotStopped: false, updatedAt: Date.now() }
        : session,
    ));
    void runAutopilotBeat(messageKey);
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
    const effectivePlayerName = (activeSession?.playerName?.trim() || activePersona?.name.trim() || playerProfile.name).trim();
    const baselineCast = activeSession?.livingCast?.length
      ? activeSession.livingCast
      : createCast({ id: selected.id, name: selected.name }, effectivePlayerName);
    const detection = detectLivingCast({
      messages: conversation,
      cast: baselineCast,
      primary: { id: selected.id, name: selected.name },
      playerName: effectivePlayerName,
    });
    const castSpeaker = autoNpcReplies && detection.autoSpeakerName
      ? detection.cast.find((entry) => entry.id === detection.autoSpeakerId)
      : null;
    const respondAs = castSpeaker?.name;

    setMessages((current) => ({
      ...current,
      [activeMessageKey]: conversation,
    }));
    refreshSessionCast(conversation, activeMessageKey, {
      characterId: selected.id,
      characterName: selected.name,
      livingCast: activeSession?.livingCast ?? [],
      playerName: effectivePlayerName,
    });
    setDraft("");
    setIsReplying(true);
    setChatError("");

    try {
      const result = await requestStoryReply(conversation, undefined, undefined, false, respondAs);
      const replyMessage: Message = {
        id: Date.now() + 1,
        sender: "character",
        text: result.reply,
        ...(respondAs ? { speaker: respondAs } : {}),
        meta: result.metadata ?? null,
      };
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          replyMessage,
        ],
      }));
      const updatedConversation = [...conversation, replyMessage].slice(-30);
      refreshSessionCast(updatedConversation, activeMessageKey, {
        characterId: selected.id,
        characterName: selected.name,
        livingCast: activeSession?.livingCast ?? [],
        playerName: effectivePlayerName,
      });
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

async function impersonateTurn(conversation: Message[], playerDirection: string): Promise<string> {
    const effectivePlayerName = (activeSession?.playerName?.trim() || activePersona?.name.trim() || playerProfile.name).trim();
    let suggestion = formatPlayerTurn(
      (await requestStoryReply(conversation, "impersonate", playerDirection)).reply,
      effectivePlayerName,
    );
    if (isInvalidImpersonationDraft(playerDirection, suggestion, selected.name)) {
      const retryGuide = playerDirection
        ? `The private direction was this, and it must be preserved:\n${playerDirection}\n\nThe previous draft was rejected only because it was written from the character's side: it described ${selected.name}'s actions, dialogue, feelings, or reactions, or used ${selected.name}'s name/persona as the speaker. Retry with the SAME direction — do not replace or expand its intent. Rewrite it strictly from the player's first-person point of view: only the player's own actions and spoken words carry the direction's action and dialogue verbatim. Never write ${selected.name}'s actions, dialogue, feelings, reactions, or inner voice, and never call the player by a name ${selected.name} would use. Keep the player's turn complete but brief.`
        : `The previous draft was rejected only because it was written from the character's side: it described ${selected.name}'s actions, dialogue, or reactions, or used ${selected.name}'s name as the speaker. The player left the direction empty, so retry with ONE plausible first-person player turn that advances the scene naturally. Write strictly from the player's point of view: only the player's own actions and spoken words. Never write ${selected.name}'s actions, dialogue, feelings, thoughts, or reactions, and never write another speaker. Mentioning or addressing the character by name inside the player's own first-person action or dialogue is valid.`;
      suggestion = formatPlayerTurn(
        (await requestStoryReply(conversation, "impersonate", retryGuide)).reply,
        effectivePlayerName,
      );
    }
    if (isInvalidImpersonationDraft(playerDirection, suggestion, selected.name)) {
      throw new Error("Impersonation kept writing the character's side instead of the player's. Try again or use a shorter direction.");
    }
    return suggestion;
  }

  async function commitPlayerTurn(truncatedConversation: Message[], playerMessage: Message): Promise<void> {
    const conversation = [...truncatedConversation, playerMessage];
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
    const result = await requestStoryReply(conversation);
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: [
        ...(current[activeMessageKey] ?? []),
        { id: Date.now() + 1, sender: "character", text: result.reply, meta: result.metadata ?? null },
      ],
    }));
    const newBond = Math.min(100, (selected.bond || 8) + 1);
    setCharacters((current) => current.map((character) =>
      character.id === selected.id ? { ...character, bond: newBond } : character,
    ));
    setProviderState("connected");
  }

  async function impersonatePlayer() {
    if (isReplying || isImpersonating) return;
    if (!configured) {
      setChatError("Set up and test a story engine before generating a player draft.");
      setView("settings");
      return;
    }

    const playerDirection = draft.trim();
    setIsImpersonating(true);
    setChatError("");
    try {
      const suggestion = await impersonateTurn(activeMessages, playerDirection);
      const playerMessage: Message = {
        id: Date.now(),
        sender: "player",
        text: suggestion,
        direction: playerDirection || undefined,
      };
      await commitPlayerTurn(activeMessages, playerMessage);
      setDraft("");
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
      const result = await requestStoryReply(activeMessages, "skip");
      setMessages((current) => ({
        ...current,
        [activeMessageKey]: [
          ...(current[activeMessageKey] ?? []),
          { id: Date.now(), sender: "character", text: result.reply, meta: result.metadata ?? null },
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
      [activeMessageKey]: (current[activeMessageKey] ?? []).map((m) => {
        if (m.id !== id) return m;
        const { versions, activeIndex } = messageVersions(m);
        const pages = versions.map((page, index) => (index === activeIndex ? text : page));
        return { ...m, text, pages, pageIndex: activeIndex };
      }),
    }));
    setEditingId(null);
    setEditDraft("");
  }

  function setMessageActivePage(id: number, index: number) {
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: (current[activeMessageKey] ?? []).map((m) => {
        if (m.id !== id) return m;
        const { versions } = messageVersions(m);
        const clamped = Math.min(Math.max(index, 0), versions.length - 1);
        return { ...m, text: versions[clamped], pageIndex: clamped };
      }),
    }));
    if (activeSession) {
      setSessions((current) => current.map((session) =>
        session.id === activeSession.id ? { ...session, updatedAt: Date.now() } : session,
      ));
    }
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

  async function rerunImpersonation(id: number, directionText: string) {
    if (isReplying || isImpersonating) return;
    const currentMessages = messages[activeMessageKey] ?? [];
    const target = currentMessages.find((m) => m.id === id);
    const truncated = currentMessages.filter((m) => m.id < id);
    if (!target || truncated.length === 0) return;
    const nextDirection = directionText.trim();
    setDirectionEditor(null);
    setChatError("");
    setIsImpersonating(true);
    try {
      const suggestion = await impersonateTurn(truncated, nextDirection);
      await commitPlayerTurn(truncated, {
        id: Date.now(),
        sender: "player",
        text: suggestion,
        direction: nextDirection || undefined,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      setProviderState("error");
      setChatError(
        error instanceof Error ? error.message : "The impersonation could not be re-run.",
      );
    } finally {
      setIsImpersonating(false);
      setIsReplying(false);
    }
  }

  function clearMessageDirection(id: number) {
    setMessages((current) => ({
      ...current,
      [activeMessageKey]: (current[activeMessageKey] ?? []).map((m) => {
        if (m.id !== id) return m;
        return { id: m.id, sender: m.sender, text: m.text };
      }),
    }));
    setDirectionEditor(null);
  }

  async function rerollMessage(message: Message) {
    if (isReplying || isImpersonating) return;
    const truncated = (messages[activeMessageKey] ?? []).filter((m) => m.id < message.id);
    if (truncated.length === 0) return;
    setChatError("");
    setIsReplying(true);

    try {
      const result = await requestStoryReply(
        truncated,
        undefined,
        undefined,
        true,
        message.speaker && !matchesName(message.speaker, selected.name) ? message.speaker : undefined,
      );
      const reply = result.reply;
      const meta = result.metadata ?? null;

      setMessages((current) => ({
        ...current,
        [activeMessageKey]: (current[activeMessageKey] ?? []).map((m) => {
          if (m.id !== message.id) return m;
          const pages = m.pages && m.pages.length > 0 ? [...m.pages, reply] : [m.text, reply];
          return { ...m, text: reply, pages, pageIndex: pages.length - 1, ...(meta ? { meta } : {}) };
        }),
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
      livingCast: createCast({ id, name }),
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

  async function handleCharacterImport(file: File) {
    setImportError("");
    setCharacterBackupError("");
    setCharacterBackupMsg("");
    try {
      if (file.name.toLowerCase().endsWith(".png") || file.type === "image/png") {
        if (file.size > CHARACTER_CARD_V2_LIMITS.pngBytes) {
          throw new Error("This PNG is too large to import safely.");
        }
        const png = new Uint8Array(await file.arrayBuffer());
        const result = extractCharacterCardV2FromPng(png);
        if (!result.ok) throw new Error(result.error);
        const imported = characterCardV2ToHowling(result.card);
        const [unique] = ensureUniqueCharacterIds(
          [imported],
          characters.map((character) => character.id),
        );
        unique.image = await persistCharacterPortrait(unique.id, png);
        setCharacters((current) => [...current, unique]);
        setSelectedId(unique.id);
        setIsCreating(false);
        setCharacterBackupMsg(`Imported ${unique.name} from a Character Card V2 PNG.`);
        return;
      }

      if (file.size > CHARACTER_CARD_V2_LIMITS.jsonBytes) {
        throw new Error("This character JSON is too large to import safely.");
      }
      const json = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error("This JSON is malformed and could not be read.");
      }

      if (isCharacterCardV2(parsed) || (parsed && typeof parsed === "object" && "spec" in parsed)) {
        const result = parseCharacterCardV2Json(json);
        if (!result.ok) throw new Error(result.error);
        const [unique] = ensureUniqueCharacterIds(
          [characterCardV2ToHowling(result.card)],
          characters.map((character) => character.id),
        );
        setCharacters((current) => [...current, unique]);
        setSelectedId(unique.id);
        setIsCreating(false);
        setCharacterBackupMsg(`Imported ${unique.name} from Character Card V2 JSON.`);
        return;
      }

      const native = parseCharacterImport(json);
      if (!native.ok) {
        const format = parsed && typeof parsed === "object" && "format" in parsed
          ? String((parsed as { format?: unknown }).format ?? "")
          : "";
        if (!format.startsWith("howling-whispers-character")) {
          throw new Error("This JSON is not a supported character format.");
        }
        throw new Error(native.error);
      }
      const unique = ensureUniqueCharacterIds(
        native.characters,
        characters.map((character) => character.id),
      );
      setCharacters((current) => [...current, ...unique]);
      if (unique.length === 1) setSelectedId(unique[0].id);
      setIsCreating(false);
      setCharacterBackupMsg(`Imported ${unique.length} ${unique.length === 1 ? "character" : "characters"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "That character file could not be read.";
      setImportError(message);
      setCharacterBackupError(message);
    }
  }

  function importCharacterFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleCharacterImport(file);
    event.target.value = "";
  }

  function importArchiveCharacter(publication: ArchivePublication) {
    const id = `archive-${publication.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const ageCategory: AgeCategory =
      publication.age_category === "adult"
        ? "adult"
        : publication.age_category === "minor"
          ? "minor"
          : "unknown";
    const memories = publication.profile
      ? publication.profile
          .split(/[.\n]/)
          .map((sentence) => sentence.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];
    const importedCharacter: Character = {
      id,
      name: publication.name,
      role: publication.role || "From the Whispering Archive",
      status: "Ready to meet",
      image: publication.avatar_url ?? "",
      sceneImage: publication.scene_image_url ?? "",
      scene: "A Shared Story",
      weather: "The world waits for your first choice",
      bond: 12,
      memories: memories.length ? memories : ["Their history is waiting to be discovered"],
      reply: publication.opening_message,
      profile: publication.profile || `${publication.name} is a character shared through the Whispering Archive.`,
      accent: "#d78a5e",
      ageCategory,
      credit: publication.creator_credit || publication.owner || undefined,
    };
    setCharacters((current) =>
      ensureUniqueCharacterIds(
        [...current, importedCharacter],
        current.map((character) => character.id),
      ),
    );
    setSelectedId(id);
    setView("home");
    requestPersonaStart({ kind: "imported", characterId: id });
  }

  function downloadTextFile(filename: string, text: string) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBinaryFile(filename: string, bytes: Uint8Array, type: string) {
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCharacterLibrary() {
    const ownedCharacters = characters.filter((character) => isUserOwnedCharacter(character));
    if (ownedCharacters.length === 0) {
      setCharacterBackupMsg("You have no characters of your own to export yet.");
      return;
    }
    downloadTextFile(
      "howling-whispers-character-library.json",
      serializeCharacterLibrary(ownedCharacters),
    );
    setCharacterBackupMsg("Your own characters exported.");
  }

  function exportNativeCharacter(character: Character) {
    if (!isUserOwnedCharacter(character)) return;
    downloadTextFile(
      `howling-whispers-character-${character.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
      serializeCharacter(character),
    );
    setDownloadingCharacter(null);
  }

  function exportV2Json(character: Character) {
    downloadTextFile(
      `${fileSlug(character.name)}.v2.json`,
      serializeCharacterCardV2(portableExportSource(character)),
    );
    setDownloadingCharacter(null);
  }

  async function exportV2Png(character: Character) {
    setCharacterDownloadError("");
    try {
      const portrait = await portraitPngBytes(character);
      const png = embedCharacterCardV2InPng(portrait, howlingCharacterToV2(portableExportSource(character)));
      downloadBinaryFile(`${fileSlug(character.name)}.card.png`, png, "image/png");
      setDownloadingCharacter(null);
    } catch (error) {
      setCharacterDownloadError(error instanceof Error ? error.message : "The V2 card could not be created.");
    }
  }

  async function portraitPngBytes(character: Character): Promise<Uint8Array> {
    if (isStoredPortraitReference(character.image)) {
      const bytes = await loadCharacterPortrait(character.image);
      if (!bytes) throw new Error("The stored portrait is unavailable. Assign artwork before downloading a V2 PNG.");
      return bytes;
    }
    if (!character.image) throw new Error("This character has no portrait. Use V2 JSON or assign artwork first.");
    const response = await fetch(character.image);
    if (!response.ok) throw new Error("The character portrait could not be loaded for export.");
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return bytes;
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The portrait could not be converted to PNG.");
      context.drawImage(bitmap, 0, 0);
      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("The portrait could not be converted to PNG.");
      return new Uint8Array(await pngBlob.arrayBuffer());
    } finally {
      bitmap.close();
    }
  }

  function fileSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character";
  }

  function portableExportSource(character: Character) {
    return {
      ...character,
      portableCharacterBook: character.cardV2?.characterBook
        ? undefined
        : howlingWorldLoreToCharacterBook(resolveBuiltinWorldLore(character.id)),
    };
  }

  function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function describeBackupDevice(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "web";
}

function updateCharacter(id: string, updates: Partial<Character>) {
  const previousImage = characters.find((character) => character.id === id)?.image;
  if (updates.image !== undefined && previousImage && updates.image !== previousImage
    && isStoredPortraitReference(previousImage)) {
    void deleteCharacterPortrait(previousImage);
  }
  setCharacters((current) => current.map((character) => (
    character.id === id ? { ...character, ...updates } : character
  )));
  setEditingCharacter(null);
}

  function deleteCharacter(character: Character) {
    if (!isUserOwnedCharacter(character)) return;
    if (isStoredPortraitReference(character.image)) void deleteCharacterPortrait(character.image);

    const removedSessionMessageKeys = new Set(
      sessions
        .filter((session) => session.characterId === character.id)
        .map((session) => session.messageKey),
    );

    setCharacters((current) => current.filter((candidate) => candidate.id !== character.id));
    setSessions((current) => current.filter((session) => session.characterId !== character.id));

    setMessages((current) => {
      const next = { ...current };
      delete next[character.id];
      removedSessionMessageKeys.forEach((messageKey) => delete next[messageKey]);
      return next;
    });

    setStoryScenes((current) => {
      const next = { ...current };
      delete next[character.id];
      return next;
    });

    setContextManifests((current) => {
      const next = { ...current };
      removedSessionMessageKeys.forEach((messageKey) => delete next[messageKey]);
      delete next[character.id];
      return next;
    });

    setDirectionEditor(null);
    setStoryEditor(null);
    setEditingCharacter(null);
    setConfirmDeleteCharacter(null);

    if (currentSessionId && removedSessionMessageKeys.has(
      sessions.find((session) => session.id === currentSessionId)?.messageKey ?? "",
    )) {
      setCurrentSessionId(null);
    }

    if (selectedId === character.id) {
      setSelectedId("coda");
    }
    setView("home");
  }

  // ----- Private-data backup & restore ---------------------------------------
  function buildPortableBackup(): BackupPayload {
    return buildBackupPayload(
      {
        characters,
        messages,
        sessions,
        currentSessionId,
        storyScenes,
        personas,
        activePersonaId: resolvedActivePersonaId,
        playerName: playerProfile.name,
        preferences: {
          storyProvider,
          model: selectedModel,
          localModel: selectedLocalModel,
          deviceModel: deviceModel,
          creativity,
          replyLength,
          initiative,
          viewpoint,
          storyTense,
          textStyle,
          shareCount,
          shareCaptions,
          shareHeader,
          entranceCodaLocked,
          showCharacterRail,
          showContextRail,
        },
      },
      { appVersion: packageInfo.version, device: describeBackupDevice(), source: "web" },
    );
  }

  function downloadBackupPayload(payload: BackupPayload) {
    const date = payload.createdAt ? payload.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `howling-whispers-backup-${date}.hwb`,
      serializeBackupPayload(payload),
    );
  }

  function applyBackupPayload(payload: BackupPayload) {
    const data = payload.data;

    // Curated characters: restore only the user's own state onto the shipped
    // character package. The curated profiles, openers, art, and canon are never
    // replaced from a backup.
    setCharacters((current) =>
      current.map((character) => {
        const curated = data.curatedState.find((state) => state.id === character.id);
        if (!curated) return character;
        return {
          ...character,
          bond: curated.bond,
          relationship: curated.relationship ?? character.relationship,
          memories: curated.memories.length > 0 ? curated.memories : character.memories,
        };
      }),
    );

    // User-owned characters: add fresh copies (never the curated package).
    const ownedCharacters = ensureUniqueCharacterIds(
      data.characters,
      characters.map((character) => character.id),
    );
    if (ownedCharacters.length > 0) {
      setCharacters((current) => [...current, ...ownedCharacters]);
    }

    setPersonas((current) => {
      const merged = ensureUniquePersonaIds(data.personas, current);
      return merged.length > 0 ? [...current, ...merged] : current;
    });
    const personaIdKnown = (id: string) =>
      personas.some((persona) => persona.id === id) ||
      data.personas.some((persona) => persona.id === id);
    if (data.activePersonaId && personaIdKnown(data.activePersonaId)) {
      setActivePersonaId(data.activePersonaId);
    }

    if (data.player.name.trim()) {
      updatePlayerProfile({ name: data.player.name });
    }

    setMessages((current) => {
      const next = { ...current };
      for (const [key, list] of Object.entries(data.messages)) {
        if (list.length > 0) next[key] = list;
      }
      return next;
    });

    setSessions((current) => {
      const byId = new Map(current.map((session) => [session.id, session]));
      for (const session of data.sessions) {
        if (!byId.has(session.id)) byId.set(session.id, session);
      }
      return [...byId.values()];
    });

    setStoryScenes((current) => {
      const next = { ...current };
      for (const [characterId, scenes] of Object.entries(data.storyScenes)) {
        if (scenes.length > 0) next[characterId] = scenes as SceneDefinition[];
      }
      return next;
    });

    if (
      data.currentSessionId &&
      sessions.some((session) => session.id === data.currentSessionId)
    ) {
      setCurrentSessionId(data.currentSessionId);
    }

    applyBackupPreferences(data.preferences);
  }

  function applyBackupPreferences(preferences: BackupPayload["data"]["preferences"]) {
    if (!preferences) return;
    if (
      preferences.storyProvider === "novelai" ||
      preferences.storyProvider === "local" ||
      preferences.storyProvider === "device"
    ) {
      setStoryProvider(preferences.storyProvider);
    }
    if (preferences.model === "xialong-v1" || preferences.model === "glm-4-6") {
      setSelectedModel(preferences.model);
    }
    if (typeof preferences.localModel === "string") setSelectedLocalModel(preferences.localModel);
    if (typeof preferences.deviceModel === "string") setDeviceModel(preferences.deviceModel);
    if (typeof preferences.creativity === "number") setCreativity(preferences.creativity);
    if (typeof preferences.replyLength === "string") setReplyLength(preferences.replyLength as ReplyLength);
    if (typeof preferences.initiative === "string") setInitiative(preferences.initiative as Initiative);
    if (typeof preferences.viewpoint === "string") setViewpoint(preferences.viewpoint as Viewpoint);
    if (typeof preferences.storyTense === "string") setStoryTense(preferences.storyTense as StoryTense);
    if (preferences.textStyle) setTextStyle(preferences.textStyle);
    if (typeof preferences.shareCount === "number") setShareCount(preferences.shareCount);
    if (typeof preferences.shareCaptions === "boolean") setShareCaptions(preferences.shareCaptions);
    if (typeof preferences.shareHeader === "boolean") setShareHeader(preferences.shareHeader);
    if (typeof preferences.entranceCodaLocked === "boolean") setEntranceCodaLocked(preferences.entranceCodaLocked);
    if (typeof preferences.showCharacterRail === "boolean") setShowCharacterRail(preferences.showCharacterRail);
    if (typeof preferences.showContextRail === "boolean") setShowContextRail(preferences.showContextRail);
  }

  function handleLocalBackupImport(file: File) {
    setLocalBackupError("");
    setLocalRestoreMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = parsePortableBackup(String(reader.result ?? ""));
      if (!result.ok) {
        setLocalBackupError(result.error);
        return;
      }
      applyBackupPayload(result.payload);
      setLocalRestoreMsg("Backup restored. Characters, conversations, personas, and preferences are back.");
    };
    reader.onerror = () => setLocalBackupError("The backup file could not be read.");
    reader.readAsText(file);
  }

  async function exportAllPrivateData() {
    setLocalBackupMsg("");
    setLocalBackupError("");
    setServerBackupsError("");

    const payload = buildPortableBackup();
    try {
      downloadBackupPayload(payload);
      setLocalBackupMsg("Private-data backup downloaded.");
    } catch {
      setLocalBackupError("The local backup could not be downloaded.");
    }

    // The server backup runs independently: a failure here must never take the
    // local file away from the user.
    if (!archiveUser) return;
    setServerBackupBusy(true);
    try {
      const created = await archive.backups.create({
        payload,
        device: payload.device,
        source: payload.source,
      });
      setLocalBackupMsg(
        `Local backup downloaded and server backup saved (${formatBackupSize(created.backup.size_bytes)}).`,
      );
      await refreshServerBackups();
    } catch (err) {
      setServerBackupsError(
        `Server backup failed: ${err instanceof Error ? err.message : "unknown error"}. Your local backup was still downloaded.`,
      );
    } finally {
      setServerBackupBusy(false);
    }
  }

  async function createServerBackupNow() {
    if (!archiveUser) return;
    setServerBackupBusy(true);
    setServerBackupsError("");
    try {
      const payload = buildPortableBackup();
      const created = await archive.backups.create({
        payload,
        device: payload.device,
        source: payload.source,
      });
      setServerBackupMsg(`Server backup saved (${formatBackupSize(created.backup.size_bytes)}).`);
    } catch (err) {
      setServerBackupsError(err instanceof Error ? err.message : "The server backup could not be created.");
    } finally {
      setServerBackupBusy(false);
      void refreshServerBackups();
    }
  }

  async function downloadServerBackup(id: string) {
    if (!archiveUser) return;
    setServerBackupBusy(true);
    setServerBackupsError("");
    try {
      const { backup } = await archive.backups.get(id);
      const payload = validatePayload(backup.payload);
      if (!payload) throw new Error("This server backup is not a valid Howling Whispers backup.");
      downloadBackupPayload(payload);
      setLocalBackupMsg("Server backup downloaded as a local file.");
    } catch (err) {
      setServerBackupsError(err instanceof Error ? err.message : "The backup could not be downloaded.");
    } finally {
      setServerBackupBusy(false);
    }
  }

  async function restoreServerBackup(id: string) {
    if (!archiveUser) return;
    setServerBackupBusy(true);
    setServerBackupsError("");
    try {
      const { backup } = await archive.backups.get(id);
      const payload = validatePayload(backup.payload);
      if (!payload) throw new Error("This server backup is not a valid Howling Whispers backup.");
      applyBackupPayload(payload);
      setServerBackupMsg("Backup restored from your account.");
    } catch (err) {
      setServerBackupsError(err instanceof Error ? err.message : "The backup could not be restored.");
    } finally {
      setServerBackupBusy(false);
    }
  }

  async function deleteServerBackup(id: string) {
    if (!archiveUser) return;
    setServerBackupBusy(true);
    setServerBackupsError("");
    try {
      await archive.backups.remove(id);
      setServerBackupMsg("Server backup deleted.");
    } catch (err) {
      setServerBackupsError(err instanceof Error ? err.message : "The backup could not be deleted.");
    } finally {
      setServerBackupBusy(false);
      void refreshServerBackups();
    }
  }

  function renderText(text: string, forceAction = false) {
    if (forceAction) {
      return <span style={{ color: textStyle.action, fontStyle: "italic" }}>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    const regex = /(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex} style={{ color: textStyle.dialogue }}>{text.slice(lastIndex, match.index)}</span>);
      }
      const inner = match[0];
      if (inner.startsWith("**")) {
        parts.push(<span key={match.index} style={{ color: textStyle.dialogue, fontWeight: 700 }}>{inner.slice(2, -2)}</span>);
      } else if (inner.startsWith("*")) {
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

  function renderMessageText(text: string, sender: Message["sender"], speakerName?: string) {
    const formattedText = text
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
          const escapedName = (speakerName ?? selected.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  function renderMessageBubble(
    message: Message,
    isLastCharacter: boolean,
    options: { live: boolean; showCaption: boolean },
  ) {
    const isEditing = options.live && editingId === message.id;
    const caption =
      options.showCaption && message.sender !== "narrator"
        ? message.sender === "character"
          ? message.speaker ?? selected.name
          : activePlayerName || "You"
        : "";
    const { versions: pageVersions, activeIndex: activePage } = messageVersions(message);
    const showPageControl =
      message.sender === "character" && isLastCharacter && pageVersions.length > 1;
    return (
      <article
        className={`message ${message.sender}${options.live && editingId === message.id ? " editing" : ""}${options.live && !seenMessageIds.has(`${activeMessageKey}:${message.id}`) ? " message-new" : ""}`}
        key={message.id}
      >
        {message.sender === "character" && !message.speaker && <Portrait character={selected} accent={activeTheme.accent} image={portraitUrl(selected)} />}
        <div className="message-body">
          {caption && <span className="message-name">{caption}</span>}
          {isEditing ? (
            <div className="message-edit">
              <textarea
                className="message-edit-textarea"
                value={editDraft}
                onChange={(event) => {
                  setEditDraft(event.target.value);
                  const el = event.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    saveEditMessage(message.id);
                  }
                  if (event.key === "Escape") cancelEditMessage();
                }}
                autoFocus
                rows={3}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
              />
              <div className="message-edit-actions">
                <button onClick={() => saveEditMessage(message.id)}>Save</button>
                <button onClick={cancelEditMessage}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {renderMessageText(message.text, message.sender, message.sender === "character" ? message.speaker : undefined)}
              {options.live && (
                <div className="message-controls-bar">
                  <div className="message-controls-left">
                    {showPageControl && (
                      <div className="page-control">
                        <button
                          onClick={() => setMessageActivePage(message.id, activePage - 1)}
                          aria-label="Previous version"
                          title="Previous version"
                          disabled={isReplying || activePage === 0}
                        >
                          ‹
                        </button>
                        <span className="page-badge" aria-label={`Version ${activePage + 1} of ${pageVersions.length}`}>
                          &lt;{activePage + 1}/{pageVersions.length}&gt;
                        </span>
                        <button
                          onClick={() => setMessageActivePage(message.id, activePage + 1)}
                          aria-label="Next version"
                          title="Next version"
                          disabled={isReplying || activePage === pageVersions.length - 1}
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="message-actions">
                    <button
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(message.text);
                          setCopyFeedbackId(message.id);
                          setTimeout(() => setCopyFeedbackId(null), 1500);
                        }
                      }}
                      aria-label="Copy message text"
                      title={copyFeedbackId === message.id ? "Copied!" : "Copy text"}
                    >
                      {copyFeedbackId === message.id ? "✓" : "📋"}
                    </button>
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
                    {message.direction && (
                      <button
                        onClick={() => setDirectionEditor({ id: message.id, text: message.direction ?? "" })}
                        aria-label="View or edit impersonation direction"
                        title="Impersonation direction"
                      >
                        ◉
                      </button>
                    )}
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
                </div>
              )}
            </>
          )}
        </div>
      </article>
    );
  }

  async function captureChatImage(): Promise<Blob | null> {
    if (shareMessages.length === 0) return null;

    let scale = 3;
    const width = 1080;
    const pad = 64;
    const contentWidth = width - pad * 2;
    const maxBubbleWidth = contentWidth * 0.86;
    const gap = 20;

    const serifFamily = '"Cormorant Garamond", Georgia, serif';
    const sansFamily = '"Inter", system-ui, sans-serif';
    const serifFont = (size: number, italic = false, bold = false) =>
      `${italic ? "italic " : ""}${bold ? "600 " : "400 "}${size}px ${serifFamily}`;
    const sansFont = (size: number, weight = 600) => `${weight} ${size}px ${sansFamily}`;

    const baseSize = textStyle.fontSize;
    const dialogue = textStyle.dialogue;
    const accent = activeTheme.accent;
    const accentRgba = (alpha: number) => hexToRgba(accent, alpha);
    const cream = "#f2dec2";
    const muted = "#8f8284";
    const playerName = activePlayerName || "You";

    await Promise.all(
      [
        serifFont(baseSize),
        serifFont(baseSize, true),
        serifFont(baseSize - 1),
        serifFont(baseSize - 2),
        serifFont(34),
        sansFont(10),
        sansFont(11, 700),
      ].map((font) => document.fonts.load(font).catch(() => null)),
    );
    await document.fonts.ready;

    let portraitImage: HTMLImageElement | null = null;
    if (portraitUrl(selected)) {
      portraitImage = new Image();
      portraitImage.crossOrigin = "anonymous";
      portraitImage.src = portraitUrl(selected);
      try {
        await portraitImage.decode();
      } catch {
        portraitImage = null;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = 2 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.textBaseline = "middle";

    const measureWord = (text: string, fontSize: number, italic: boolean, bold = false) => {
      ctx.font = serifFont(fontSize, italic, bold);
      return ctx.measureText(text).width;
    };

    const wrapRuns = (
      runs: PaintedRun[],
      maxWidth: number,
      fontSize: number,
      italicAll: boolean,
    ): PaintedLine[] => {
      const words: Array<{ text: string; color: string; italic: boolean; bold: boolean }> = [];
      for (const run of runs) {
        const segments = run.text.split("\n");
        segments.forEach((segment, index) => {
          if (index > 0) words.push({ text: "\n", color: run.color, italic: run.italic, bold: run.bold });
          for (const word of segment.split(/\s+/).filter(Boolean)) {
            words.push({ text: word, color: run.color, italic: run.italic, bold: run.bold });
          }
        });
      }
      const spaceWidth = measureWord(" ", fontSize, false);
      const lines: PaintedLine[] = [];
      let line: PaintedLine = [];
      let lineWidth = 0;
      const flush = () => {
        if (line.length) {
          lines.push(line);
          line = [];
          lineWidth = 0;
        }
      };
      for (const word of words) {
        if (word.text === "\n") {
          flush();
          continue;
        }
        const italic = italicAll || word.italic;
        const wordWidth = measureWord(word.text, fontSize, italic, word.bold);
        if (wordWidth > maxWidth) {
          flush();
          let chunk = "";
          for (const char of word.text) {
            const candidate = chunk + char;
            if (chunk && measureWord(candidate, fontSize, italic, word.bold) > maxWidth) {
              lines.push([{ text: chunk, color: word.color, italic: word.italic, bold: word.bold }]);
              chunk = char;
            } else {
              chunk = candidate;
            }
          }
          if (chunk) line = [{ text: chunk, color: word.color, italic: word.italic, bold: word.bold }];
          lineWidth = chunk ? measureWord(chunk, fontSize, italic, word.bold) : 0;
          continue;
        }
        const separator = line.length ? spaceWidth : 0;
        if (line.length && lineWidth + separator + wordWidth > maxWidth) {
          flush();
          line = [{ text: word.text, color: word.color, italic: word.italic, bold: word.bold }];
          lineWidth = wordWidth;
        } else {
          if (line.length) lineWidth += separator;
          line.push({ text: word.text, color: word.color, italic: word.italic, bold: word.bold });
          lineWidth += wordWidth;
        }
      }
      flush();
      if (lines.length === 0) lines.push([{ text: "", color: dialogue, italic: false, bold: false }]);
      return lines;
    };

    const measureLinesWidth = (lines: PaintedLine[], fontSize: number) => {
      let max = 0;
      for (const line of lines) {
        let lineWidth = 0;
        line.forEach((run, index) => {
          if (index > 0) lineWidth += measureWord(" ", fontSize, false);
          lineWidth += measureWord(run.text, fontSize, run.italic, run.bold);
        });
        max = Math.max(max, lineWidth);
      }
      return max;
    };

    const drawMessageText = (
      wrapped: Array<{ lines: PaintedLine[]; isLabel: boolean; labelWidth: number; label: string }>,
      x: number,
      yTop: number,
      fontSize: number,
      lineHeight: number,
      italicAll: boolean,
    ) => {
      let y = yTop;
      for (const paragraph of wrapped) {
        if (paragraph.isLabel) {
          setLetterSpacing(ctx, "1.2px");
          ctx.font = sansFont(11, 700);
          ctx.fillStyle = accent;
          ctx.fillText(paragraph.label.toUpperCase(), x, y + 13 / 2);
          setLetterSpacing(ctx, "0px");
          y += 13;
        } else {
          for (const line of paragraph.lines) {
            let cx = x;
            let first = true;
            for (const run of line) {
              if (!first) cx += measureWord(" ", fontSize, italicAll);
              first = false;
              ctx.font = serifFont(fontSize, italicAll || run.italic, run.bold);
              ctx.fillStyle = run.color;
              ctx.fillText(run.text, cx, y + lineHeight / 2);
              cx += measureWord(run.text, fontSize, italicAll || run.italic, run.bold);
            }
            y += lineHeight;
          }
        }
      }
    };

    const measurePill = (text: string) => {
      setLetterSpacing(ctx, "1.2px");
      ctx.font = sansFont(10, 600);
      const textWidth = ctx.measureText(text.toUpperCase()).width;
      setLetterSpacing(ctx, "0px");
      return textWidth + 20;
    };

    const drawPill = (text: string, x: number, y: number) => {
      const pillHeight = 20;
      const pillWidth = measurePill(text);
      roundRectPath(ctx, x, y, pillWidth, pillHeight, [10, 10, 10, 10]);
      ctx.fillStyle = "#17101a";
      ctx.fill();
      ctx.strokeStyle = accentRgba(0.42);
      ctx.lineWidth = 1;
      ctx.stroke();
      setLetterSpacing(ctx, "1.2px");
      ctx.font = sansFont(10, 600);
      ctx.fillStyle = accent;
      ctx.fillText(text.toUpperCase(), x + 10, y + pillHeight / 2);
      setLetterSpacing(ctx, "0px");
    };

    const drawPortrait = (cx: number, cy: number, radius: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (portraitImage && portraitImage.naturalWidth > 0) {
        const cover = Math.max((radius * 2) / portraitImage.naturalWidth, (radius * 2) / portraitImage.naturalHeight);
        const drawWidth = portraitImage.naturalWidth * cover;
        const drawHeight = portraitImage.naturalHeight * cover;
        ctx.drawImage(portraitImage, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = "#17101a";
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = accentRgba(0.52);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const blocks: Array<{ top: number; height: number; paint: () => void }> = [];
    let cursorY = pad;

    if (shareHeader) {
      const nameSize = 34;
      const nameLineHeight = Math.round(nameSize * 1.02);
      const subtitleLine = 12;
      const inner = nameLineHeight + 7 + subtitleLine;
      const blockHeight = inner + 16 + 1 + gap;
      const top = cursorY;
      blocks.push({
        top,
        height: blockHeight,
        paint: () => {
          ctx.font = serifFont(nameSize);
          ctx.fillStyle = cream;
          ctx.fillText(selected.name, pad, top + nameLineHeight / 2);
          setLetterSpacing(ctx, "1.4px");
          ctx.font = sansFont(10, 600);
          ctx.fillStyle = muted;
          ctx.fillText(
            `${activeScene.title} · ${activeScene.weather}`.toUpperCase(),
            pad,
            top + nameLineHeight + 7 + subtitleLine / 2,
          );
          setLetterSpacing(ctx, "0px");
          const ruleY = top + inner + 16;
          ctx.strokeStyle = accentRgba(0.42);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pad, ruleY);
          ctx.lineTo(width - pad, ruleY);
          ctx.stroke();
        },
      });
      cursorY += blockHeight;
    }

    for (const message of shareMessages) {
      const { sender } = message;
      const caption =
        shareCaptions && sender !== "narrator"
          ? sender === "character"
            ? message.speaker ?? selected.name
            : playerName
          : "";
      const paragraphs = buildParagraphs(message.text, sender, selected.name, textStyle);

      let fontSize = baseSize;
      let lineHeight: number;
      let textColumnMax: number;
      let padTop = 0;
      let padLeft = 0;
      let padRight = 0;
      let alignRight = false;
      let italicAll = false;
      if (sender === "character") {
        fontSize = baseSize;
        lineHeight = Math.round(baseSize * 1.42);
        padTop = 11;
        padLeft = 10;
        padRight = 21;
        textColumnMax = maxBubbleWidth - 44 - 13 - padLeft - padRight;
      } else if (sender === "player") {
        fontSize = baseSize - 1;
        lineHeight = Math.round(fontSize * 1.42);
        padTop = 12;
        padLeft = 20;
        padRight = 20;
        alignRight = true;
        textColumnMax = maxBubbleWidth - padLeft - padRight;
      } else {
        fontSize = baseSize - 2;
        lineHeight = Math.round(fontSize * 1.25);
        padTop = 4;
        padLeft = 16;
        padRight = 16;
        italicAll = true;
        textColumnMax = maxBubbleWidth - padLeft - padRight;
      }

      const captionWidth = caption ? measurePill(caption) : 0;
      const captionHeight = caption ? 20 + 6 : 0;

      const wrapped: Array<{ lines: PaintedLine[]; isLabel: boolean; labelWidth: number; label: string }> = [];
      let textHeight = 0;
      let previousLabel = false;
      let maxLineWidth = 0;
      for (const paragraph of paragraphs) {
        if (paragraph.isLabel) {
          setLetterSpacing(ctx, "1.2px");
          ctx.font = sansFont(11, 700);
          const labelWidth = Math.round(ctx.measureText(paragraph.text.toUpperCase()).width + 2);
          setLetterSpacing(ctx, "0px");
          maxLineWidth = Math.max(maxLineWidth, labelWidth);
          if (textHeight > 0) textHeight += previousLabel ? 8 : 14;
          textHeight += 13;
          wrapped.push({ lines: [], isLabel: true, labelWidth, label: paragraph.text });
          previousLabel = true;
        } else {
          const lines = wrapRuns(paragraph.runs, textColumnMax, fontSize, italicAll);
          maxLineWidth = Math.max(maxLineWidth, measureLinesWidth(lines, fontSize));
          if (textHeight > 0) textHeight += previousLabel ? 8 : 14;
          textHeight += lines.length * lineHeight;
          wrapped.push({ lines, isLabel: false, labelWidth: 0, label: "" });
          previousLabel = false;
        }
      }

      const textWidth = Math.min(Math.ceil(maxLineWidth), textColumnMax);
      const contentWidth = Math.max(textWidth, captionWidth);
      const bubbleWidth =
        sender === "character"
          ? Math.min(maxBubbleWidth, contentWidth + 44 + 13 + padLeft + padRight)
          : Math.min(maxBubbleWidth, contentWidth + padLeft + padRight);
      const bodyHeight = captionHeight + textHeight;
      const bubbleHeight =
        sender === "character"
          ? Math.max(bodyHeight, 46) + padTop + 11
          : bodyHeight + padTop + (sender === "narrator" ? 4 : 12);
      const bubbleX = alignRight ? width - pad - bubbleWidth : pad;
      const top = cursorY;
      const textTop = top + padTop + captionHeight;
      const textLeft = sender === "character" ? bubbleX + padLeft + 44 + 13 : bubbleX + padLeft;

      blocks.push({
        top,
        height: bubbleHeight + gap,
        paint: () => {
          if (sender !== "narrator") {
            if (sender === "character") {
              ctx.fillStyle = activeTheme.surface;
              ctx.strokeStyle = accentRgba(0.52);
              roundRectPath(ctx, bubbleX, top, bubbleWidth, bubbleHeight, [6, 22, 22, 6]);
            } else {
              const gradient = ctx.createLinearGradient(bubbleX, top, bubbleX + bubbleWidth, top + bubbleHeight);
              gradient.addColorStop(0, mixHex(accent, "#24171a", 0.34));
              gradient.addColorStop(1, "rgba(23, 17, 20, 0.96)");
              ctx.fillStyle = gradient;
              ctx.strokeStyle = accent;
              roundRectPath(ctx, bubbleX, top, bubbleWidth, bubbleHeight, [22, 6, 6, 22]);
            }
            ctx.fill();
            ctx.stroke();
          }

          if (sender === "character") {
            drawPortrait(bubbleX + padLeft + 22, top + (bubbleHeight - 44) / 2 + 22, 22);
          }

          if (caption) {
            if (alignRight) {
              drawPill(caption, bubbleX + bubbleWidth - padRight - measurePill(caption), top + padTop);
            } else {
              drawPill(caption, textLeft, top + padTop);
            }
          }

          drawMessageText(wrapped, textLeft, textTop, fontSize, lineHeight, italicAll);
        },
      });
      cursorY += bubbleHeight + gap;
    }

    const totalHeight = cursorY - gap + pad;
    const maxDimension = 16000;
    const maxPixels = 100_000_000;
    scale = Math.max(
      1,
      Math.floor(
        Math.min(
          scale,
          maxDimension / width,
          maxDimension / totalHeight,
          Math.sqrt(maxPixels / (width * totalHeight)),
        ) * 10,
      ) / 10,
    );
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(totalHeight * scale));
    ctx.scale(scale, scale);
    ctx.textBaseline = "middle";

    const background = ctx.createLinearGradient(0, 0, 0, totalHeight);
    background.addColorStop(0, "#181019");
    background.addColorStop(0.58, "#0c0a0e");
    background.addColorStop(1, "#100d11");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, totalHeight);
    const wash = ctx.createRadialGradient(width * 0.2, 0, 0, width * 0.2, 0, width * 0.6);
    wash.addColorStop(0, accentRgba(0.1));
    wash.addColorStop(1, accentRgba(0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, totalHeight);

    for (const block of blocks) block.paint();

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  function downloadChatImage(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.name.trim().toLowerCase().replace(/\s+/g, "-") || "conversation"}-conversation.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyChatImage() {
    if (shareBusy || activeMessages.length === 0) return;
    setShareBusy(true);
    setShareError("");
    try {
      const blob = await captureChatImage();
      if (!blob) {
        setShareError("Couldn't render the image. Try fewer messages.");
        return;
      }
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setShareFeedback("Image copied — paste into Discord");
          return;
        } catch {
          // fall through to download
        }
      }
      downloadChatImage(blob);
      setShareFeedback("Image downloaded");
    } finally {
      setShareBusy(false);
      window.setTimeout(() => setShareFeedback(""), 3200);
    }
  }

  async function downloadChatImageFromButton() {
    if (shareBusy || activeMessages.length === 0) return;
    setShareBusy(true);
    setShareError("");
    try {
      const blob = await captureChatImage();
      if (!blob) {
        setShareError("Couldn't render the image. Try fewer messages.");
        return;
      }
      downloadChatImage(blob);
    } finally {
      setShareBusy(false);
    }
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
            <p className="eyebrow">{entranceFeature.eyebrow || (entranceFeature.contactUrl ? "Curation call" : "Tonight's voice")}</p>
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
              className={view === "personas" ? "active" : ""}
              onClick={() => setView("personas")}
            >
              Personas
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
          <button
            className={view === "archive" ? "active" : ""}
            onClick={() => setView("archive")}
          >
            Archive
          </button>
        </nav>
        <div className="current-scene">
          <span aria-hidden="true">{view === "chat" ? "♜" : view === "scenes" ? "◈" : view === "changelog" ? "◇" : view === "settings" ? "⚙" : view === "archive" ? "☍" : view === "personas" ? "👤" : "✦"}</span>
          <span>
            {view === "chat"
              ? activeScene.title
              : view === "scenes"
                ? `${selected.name} · scenes`
              : view === "changelog"
                ? "What's new"
                : view === "settings"
                  ? "User settings"
                  : view === "archive"
                    ? "The Whispering Archive"
                    : view === "personas"
                      ? "Persona Library"
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
            <span className="home-section-count">{characters.length} souls waiting</span>
          </div>

          <div className="character-backup-bar">
            <label className="outline-button import-browse">
              Import characters
              <input
                type="file"
                accept=".png,.json,image/png,application/json"
                onChange={importCharacterFile}
              />
            </label>
            <button
              className="outline-button"
              onClick={exportCharacterLibrary}
            >
              Howling library backup
            </button>
            {characterBackupMsg && <span className="backup-feedback ok">{characterBackupMsg}</span>}
            {characterBackupError && <span className="backup-feedback err">{characterBackupError}</span>}
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
                      "--card-image": portraitUrl(character)
                        ? `url("${portraitUrl(character)}")`
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
                    <span className="home-character-actions">
                        <button
                          className="home-character-edit"
                          aria-label={`Download ${character.name}`}
                          title="Download character"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCharacterDownloadError("");
                            setDownloadingCharacter(character);
                          }}
                        >
                          Download
                        </button>
                    {isUserOwnedCharacter(character) && (<>
                        <button
                          className="home-character-edit"
                          aria-label={`Edit ${character.name}`}
                          title="Edit character"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingCharacter(character);
                          }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          className="home-character-delete"
                          aria-label={`Delete ${character.name}`}
                          title="Delete character"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmDeleteCharacter(character);
                          }}
                        >
                          Delete
                        </button>
                    </>)}
                      </span>
                  </div>
                </article>
              );
            })}
            <article
              className="home-character home-character-teaser"
              aria-label="Valerie Whiteclaw, coming soon"
              style={
                {
                  "--card-image": `url("/assets/Heather/valerie-whiteclaw-teaser.png")`,
                  "--character-accent": "#c8a94f",
                  "--card-position": "center",
                } as React.CSSProperties
              }
            >
              <div className="home-character-wash" />
              <span className="home-character-teaser-badge">Coming soon</span>
              <div className="home-character-copy">
                <span className="home-character-status">
                  <i />
                  A new scent on the wind
                </span>
                <h3>Valerie Whiteclaw</h3>
                <p>Heather&apos;s daughter · The pack&apos;s future</p>
                <small className="home-character-teaser-tagline">
                  Coming to a forest near you.
                </small>
                <small className="home-character-credit">Character by Gigasad</small>
              </div>
            </article>
            <button className="new-character-card" onClick={() => setIsCreating(true)}>
              <span aria-hidden="true">＋</span>
              <strong>Awaken someone new</strong>
              <small>Create a character or import a V2 PNG/JSON card.</small>
            </button>
          </div>
        </section>
      )}

      {view === "scenes" && (
        <section className="scene-library" style={themeVariables}>
          <div
            className="scene-library-backdrop"
            style={{
              "--scene-library-image": portraitUrl(selected)
                ? `url("${portraitUrl(selected)}")`
                : "linear-gradient(145deg, #211416, #09090b)",
              "--scene-library-position": selected.portraitFocalPoint ?? "center",
            } as React.CSSProperties}
          />
          <div className="scene-library-content">
            <header className="scene-library-header">
              <button className="outline-button" onClick={() => setView("home")}>
                ← All characters
              </button>
              {isUserOwnedCharacter(selected) && (
                <span className="scene-library-actions">
                  <button
                    className="outline-button"
                    aria-label={`Edit ${selected.name}`}
                    onClick={() => setEditingCharacter(selected)}
                  >
                    ✎ Edit</button>
                  <button
                    className="outline-button character-delete"
                    aria-label={`Delete ${selected.name}`}
                    onClick={() => setConfirmDeleteCharacter(selected)}
                  >
                    Delete
                  </button>
                </span>
              )}
              <div>
                <p className="eyebrow">Stories with {selected.name}</p>
                <h1>Choose where the story begins.</h1>
                <p>{selected.role} · {selected.status}</p>
              </div>
              <Portrait character={selected} image={portraitUrl(selected)} />
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
                      <small>Use *asterisks* for actions, [brackets] for inner voice, and **double asterisks** for shouts.</small>
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
                      <button onClick={() => requestPersonaStart({ kind: "sandbox", characterId: selected.id })}>
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
                    <h3>Whisper Mode</h3>
                    <p>Nothing but {selected.name}&apos;s core identity — and they act on their own.</p>
                    <small>No preset opening. {selected.name} writes the first beat and keeps living while you step in whenever you like.</small>
                    <div className="scene-preset-actions">
                      <button onClick={() => requestPersonaStart({ kind: "autopilot", characterId: selected.id })}>
                        Enter Whisper Mode <span aria-hidden="true">→</span>
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
                        <button onClick={() => requestPersonaStart({ kind: "scene", characterId: selected.id, scene })}>
                          Begin this scene <span aria-hidden="true">→</span>
                        </button>
                        {scene.id.startsWith("custom-") && (
                          <button
                            className="scene-edit-button"
                            onClick={() => setStoryEditor({ mode: "edit", scene })}
                          >
                            Edit story
                          </button>
                        )}
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
            <article className="changelog-entry featured latest hotfix-card">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.6.0.3 · Inline roleplay formatting</span>
                <h2>Inline player roleplay formatting contract</h2>
                <p>
                  Player turns now preserve input paragraph boundaries and flow actions and spoken dialogue inline within paragraphs instead of forcing blank-line breaks after every beat.
                </p>
                <ul>
                  <li>Actions and dialogue flow naturally inline (e.g. <em>*I look over at her.* &quot;I don&apos;t know...&quot; *I reach for the door.*</em>)</li>
                  <li>Evidence-driven action detection isolates physical verbs while ambiguous statements default to dialogue</li>
                  <li>Adjacent same-type spans within a paragraph are cleanly merged</li>
                </ul>
              </div>
            </article>
            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.6.0.2 · Story pipeline hotfix</span>
                <h2>Impersonate is now an action</h2>
                <p>
                  Use the ◐ button beside Send to generate the player&apos;s turn from whatever you already typed.
                </p>
                <ul>
                  <li>Works on completely blank conversations</li>
                  <li>No separate Impersonate composer mode</li>
                  <li>Clears the composer after sending</li>
                  <li>Character replies continue normally afterward</li>
                  <li>Broken or empty story responses now show a useful error instead of a JSON parse failure</li>
                  <li>Generated player turns are formatted deterministically: spoken dialogue in &quot;quotes&quot;, actions in *asterisks*, beats on their own lines, wrappers stripped — no prompt guesswork</li>
                  <li>The edit window now looks and writes like the composer text field</li>
                </ul>
              </div>
            </article>
            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.6.0.2 · Drives that remember</span>
                <h2>Side-character inner state now persists across the whole conversation</h2>
                <p>
                  Goals, wants, fears, concerns, and basic needs carry forward turn after turn —
                  even after reloads — and evolve from what actually happens in the story.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Autonomous state is stored with each conversation, so a character&apos;s goal, intent, wants, fears, concerns, and needs survive turns, reloads, and speaker switches.</li>
                  <li>Drives update deterministically from the recent story with no extra AI call: eating eases hunger, resting eases fatigue, discovery settles a concern, an unanswered question weighs on a character, and conflict seeds a fear.</li>
                  <li>Only real cast members hold state — sentence-start ghosts (What, Why, Did, Tell, Both, Because, Got, Jail) and stale characters are pruned, never given drives.</li>
                  <li>Replying as a specific side character updates that character&apos;s own state — never a guessed speaker.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.6.0.1 · The room listens back</span>
                <h2>Living Cast stops seeing ghosts, and side characters act on their own</h2>
                <p>
                  Ordinary words like What, Why, Did, Tell, Both, Because, Got, and Jail are no
                  longer mistaken for characters, and present side characters now carry a
                  lightweight inner state that shapes how they behave.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Capitalization alone no longer creates a cast member — a name needs real evidence like an introduction, arrival, speech attribution, or repeated use.</li>
                  <li>Stale false names from before this fix are cleaned up automatically.</li>
                  <li>Each side character now has an autonomous state: a goal, immediate intent, wants, fears, unresolved concerns, and basic needs like hunger, fatigue, comfort, social, and curiosity.</li>
                  <li>Drives influence an NPC without forcing them — they may disagree, hesitate, refuse, conceal something, or change their mind.</li>
                  <li>NPCs can act on their own when their state gives them a reason, not only when asked.</li>
                  <li>Private thoughts stay hidden behind the perception boundary; the story shows only what the player could see, like shorter answers or a glance toward the doorway.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.6.0 · Side characters speak for themselves</span>
                <h2>The Living Cast keeps track of who is in the room</h2>
                <p>
                  The story now watches each turn for the characters that are present, and named
                  side characters answer for themselves when the main character asks them a
                  direct question.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Living Cast detection builds and persists a per-conversation cast from the characters the story introduces or lets leave.</li>
                  <li>Automatic side-character replies answer as the named side character with no extra AI call — using the conversation&apos;s own cast.</li>
                  <li>Replies carry the speaking side character&apos;s name across Character Response, Impersonate, and Reroll.</li>
                  <li>The Living Cast panel in the chat context rail shows who is present and who is waiting to answer.</li>
                  <li>Each cast survives reloads and backup/restore round trips with its conversation.</li>
                  <li>Turn automatic side-character replies off in Settings if you prefer to steer every side character yourself.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.5.4 · Characters without borders</span>
                <h2>Character Card V2 is now the standard portable character format</h2>
                <p>
                  Import V2 PNG or JSON cards from BotBooru and other compatible platforms, or
                  download Howling Whispers characters as portable V2 cards with their structured
                  definitions intact.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>One import control detects V2 PNG, V2 JSON, and existing Howling Whispers character or library backups.</li>
                  <li>Imported PNG artwork persists as the character card and chat portrait without becoming scene background art.</li>
                  <li>V2 description, personality, scenario, greetings, examples, creator metadata, extensions, and character-book lore survive round trips.</li>
                  <li>Imported prompt-like fields remain untrusted character content beneath application safety and provider rules.</li>
                  <li>V2 PNG is the primary download; V2 JSON and full-fidelity Howling backups remain available.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.5.3 · Clean scenes, tidy tags</span>
                <h2>AI replies no longer leak their thinking labels into your story</h2>
                <p>
                  When the local model appends a <em>[Tags …; Mood …]</em> footnote to a reply,
                  that note is now stripped from the visible text and captured as structured
                  story metadata — ready to power scenes, moods, sagas, and memory later.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Emergent Tags/Mood footnotes are removed in every mode: Character Response, Impersonate, Skip Turn, Reroll, and Autopilot.</li>
                  <li>Stage directions and inner voice like <em>[she hesitates]</em> stay in the story — only footer blocks at the end of a reply are treated as metadata.</li>
                  <li>Each message now carries the parsed metadata in the background without ever cluttering the narration.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.5.2 · Your story belongs to you</span>
                <h2>Private data can now be backed up and restored</h2>
                <p>
                  Sign in to your archive to keep a server-side backup of your characters,
                  personas, messages, and settings — encrypted at rest — or download your
                  entire private data as a single portable file and restore it later.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Export all private data as a local backup file, and restore it from the same panel.</li>
                  <li>Create server-side backups with one click; download, restore, or delete any of them.</li>
                  <li>Server backups are encrypted at rest and visible only to their own signed-in account.</li>
                  <li>Backups protect your data without bundling the four curated characters&apos; protected canon.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.5.1.1 · Each turn has one speaker</span>
                <h2>Character Response and Impersonate now share one generation pipeline</h2>
                <p>
                  Character Response writes only for the selected character, and Impersonate
                  writes only for your persona. The provider always knows whose turn it is
                  allowed to write, and Impersonate turns may be as short as a single action
                  or line instead of being padded into a mini-novel.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Character Response never takes over your persona&apos;s dialogue, actions, thoughts, or decisions.</li>
                  <li>Impersonate never continues or finishes the AI character&apos;s turn.</li>
                  <li>Quick, Immersive, and Novel-like lengths now behave correctly for both targets.</li>
                  <li>Response length, detail, POV, creativity, and roleplay controls feed one shared flow and respect who is being generated.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.5.1 · Personas step into their own space</span>
                <h2>Your identities now have a page of their own</h2>
                <p>
                  The complete Persona Library now lives under the dedicated Personas tab,
                  directly beside Characters. Your existing personas, active selection,
                  imports, exports, and story snapshots continue working exactly as before.
                </p>
                <h3>What changed</h3>
                <ul>
                  <li>Open Personas directly from the main navigation.</li>
                  <li>Create, edit, duplicate, import, export, and select personas from one focused page.</li>
                  <li>Settings remains focused on providers, connections, and appearance.</li>
                  <li>No saved persona data or story identity snapshots were rewritten.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">✦</div>
              <div>
                <span>Version 0.5.0 · A full life for your characters</span>
                <h2>From your page to the Whispering Archive</h2>
                <p>
                  Your characters are no longer fixed in place. Shape them, play them with a
                  consistent identity, carry them between devices, and publish them into a
                  public archive whenever you choose — while what you privately play stays
                  yours and yours alone.
                </p>
                <h3>The Whispering Archive</h3>
                <ul>
                  <li>Publish an explicit snapshot of a character; it stays link-only until you make it public.</li>
                  <li>Browse and search shared characters by name, tag, age, and content rating.</li>
                  <li>Open a readable share page for anything you have published.</li>
                  <li>Import any archived character as an independent copy you are free to edit.</li>
                  <li>Sign in to publish and report; keepers review everything that reaches Browse.</li>
                </ul>
                <h3>Player personas</h3>
                <ul>
                  <li>Create, edit, duplicate, or delete personas from a single library in Settings.</li>
                  <li>Choose which persona you play before every scene, sandbox, or Whisper Mode session.</li>
                  <li>Each conversation records the persona you were, so old stories stay consistent.</li>
                  <li>Continue without a persona any time you prefer to be simply yourself.</li>
                </ul>
                <h3>Characters you own</h3>
                <ul>
                  <li>Edit any detail of a character you made or imported, from name to memories to portrait.</li>
                  <li>Delete a character and everything tied to it in one clean sweep.</li>
                  <li>The curated cast &mdash; Coda, Heather, Peony, and Senako &mdash; stays locked from editing and deletion.</li>
                </ul>
                <h3>Backups</h3>
                <ul>
                  <li>Export your whole character library to a file and import it back anywhere.</li>
                  <li>Back up and restore your persona library the same way in Settings.</li>
                  <li>Re-imports stay conflict-free, so nothing is ever accidentally replaced or lost.</li>
                </ul>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.4.2.9 · Anchor the player identity</span>
                <h2>Impersonate knows who is speaking</h2>
                <p>
                  Even without a display name or persona, the model now receives an explicit
                  fallback player identity. Character-style drafts are rejected wherever they
                  appear, not only when they start the message.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.4.2.7 · Make Impersonate directional</span>
                <h2>Your prompt becomes a road sign</h2>
                <p>
                  Impersonate now keeps your direction private and turns its intent into a new
                  player-side action or line of dialogue. Echoed directions and character-side
                  drafts are rejected and retried instead of being posted in your bubble.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.4.2.6 · Send direct player turns correctly</span>
                <h2>Your first-person line stays yours</h2>
                <p>
                  A complete line such as “I want…” is now sent directly as the player turn, so
                  the character gets to respond in the character bubble instead of its reaction
                  appearing as if the player said it.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">◐</div>
              <div>
                <span>Version 0.4.2.5 · Keep impersonation in first person</span>
                <h2>Impersonate stays on your side</h2>
                <p>
                  Impersonation drafts now use first-person player voice and are explicitly blocked
                  from writing the character&apos;s voice, eyes, body, feelings, or reaction inside the
                  player bubble.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">»</div>
              <div>
                <span>Version 0.4.2.4 · Keep Skip turn focused</span>
                <h2>Skip turn stays on one side</h2>
                <p>
                  The normal roleplay skip action now produces one concise character-only beat,
                  capped at 150 words, instead of using the full novel-length reply setting or
                  letting the model write both sides of the conversation.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">🛑</div>
              <div>
                <span>Version 0.4.2.3 · Keep turns contained</span>
                <h2>Next is one beat, not a marathon</h2>
                <p>
                  Manually advancing Whisper Mode now generates one character beat and pauses instead
                  of leaving the automatic loop running. NovelAI and Ollama errors can be dismissed,
                  and impersonation directions are treated as private control input rather than
                  story text.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">🔍</div>
              <div>
                <span>Version 0.4.2.2 · Sharper shares</span>
                <h2>Zoom in and actually read it</h2>
                <p>
                  Shared scenes now render at 50% higher resolution, so when you paste one into
                  Discord and click to zoom, every line is crisp enough to read without
                  downloading. Long conversations keep the highest safe resolution the browser
                  can handle.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">🖼️</div>
              <div>
                <span>Version 0.4.2.1 · Share, redrawn</span>
                <h2>The image actually renders now</h2>
                <p>
                  The first cut of the share feature relied on a page-to-picture technique that
                  silently lost the theme colors and could capture a blank frame. The image is now
                  painted directly with the same fonts, theme colors, bubbles, and portraits you
                  see in the chat — so what lands in your clipboard is always the conversation,
                  every time, on any browser.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">🖼️</div>
              <div>
                <span>Version 0.4.2 · Share the story</span>
                <h2>The story, ready to share</h2>
                <p>
                  Every conversation can now become an image. The chat&apos;s ⇣ Share button
                  opens a small config popup — how many messages to include, name captions on
                  bubbles, and a scene header — then renders a crisp PNG you can paste straight
                  into Discord. The entrance also picks a fresh featured character on every
                  visit, Valerie Whiteclaw rotates in as a coming-soon teaser, and every curated
                  character now credits its creator.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">🌕</div>
              <div>
                <span>Version 0.4.1 · Heather rebuilt</span>
                <h2>The ranger is back, exactly as written</h2>
                <p>
                  Heather now runs on her official character card: the 42-year-old werewolf
                  supremacist with a vanished mate and a grown daughter, plus all three of her
                  real greetings — each given its own hand-crafted scene and custom art. The
                  entrance also rotates a curation card inviting creators to the Howling
                  Whispers Discord, and curated scenes are now locked from casual editing.
                </p>
              </div>
            </article>

            <article className="changelog-entry featured">
              <div className="changelog-mark">✦</div>
              <div>
                <span>Version 0.4.0 · Whisper Mode</span>
                <h2>Read a living story like a book</h2>
                <p>
                  Whisper Mode now writes short self-driven beats in a continuous reading view.
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
                <h2>Hosted access is encrypted</h2>
                <p>
                  This hosted site uses HTTPS, so NovelAI tokens and story traffic are encrypted
                  in transit. If you intentionally run the app in direct HTTP remote test mode,
                  that separate setup is not encrypted and should only be used temporarily.
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
                      <span className="setting-name-row">
                        World initiative
                        <InfoTip label="World initiative">
                          <p className="help-popover__intro">
                            How readily characters and events move the story forward.
                          </p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Reactive</strong>
                              <p className="help-popover__option-description">
                                The world mostly waits for your actions before events advance.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Balanced</strong>
                              <p className="help-popover__option-description">
                                You and the world share control of the story&apos;s momentum.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Proactive</strong>
                              <p className="help-popover__option-description">
                                Characters pursue their own goals, and events may progress even
                                when you remain quiet.
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
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
                      <span className="setting-name-row">
                        Viewpoint
                        <InfoTip label="Viewpoint">
                          <p className="help-popover__intro">
                            Whose observable experience frames the narration.
                          </p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Player limited</strong>
                              <p className="help-popover__option-description">
                                The story stays centered on you and what your character can perceive.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Character limited</strong>
                              <p className="help-popover__option-description">
                                The story follows the other character and what they can perceive.
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Roving limited</strong>
                              <p className="help-popover__option-description">
                                The narration may move between characters and scenes.
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
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
                      <span className="setting-name-row">
                        Tense
                        <InfoTip label="Tense">
                          <p className="help-popover__intro">Sets the requested narrative tense.</p>
                          <div className="help-popover__options">
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Present</strong>
                              <p className="help-popover__option-description">
                                The narration unfolds as events happen: &ldquo;She opens the door.&rdquo;
                              </p>
                            </div>
                            <div className="help-popover__option">
                              <strong className="help-popover__option-name">Past</strong>
                              <p className="help-popover__option-description">
                                The narration recounts events: &ldquo;She opened the door.&rdquo;
                              </p>
                            </div>
                          </div>
                        </InfoTip>
                      </span>
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

                <fieldset className="story-control-fieldset">
                  <legend>Living Cast</legend>
                  <p>
                    Track who is present in each conversation and let named side
                    characters answer when they are directly asked, instead of
                    making you impersonate them.
                  </p>
                  <label className="toggle-row">
                    <span>
                      <span className="setting-name-row">
                        Automatic side-character replies
                        <InfoTip label="Automatic side-character replies">
                          <p className="help-popover__intro">
                            When a scene introduces other characters (for example
                            Melody entering with you), and the main character asks
                            one of them a direct question, the system answers as
                            that character automatically. Turn this off if you
                            prefer to control every side character yourself.
                          </p>
                        </InfoTip>
                      </span>
                      <small>
                        Uses the conversation&apos;s Living Cast, not an extra AI call.
                        The Living Cast panel in the chat context rail shows who is
                        present and what is pending.
                      </small>
                    </span>
                    <span className="switch">
                      <input
                        id="auto-npc-replies"
                        type="checkbox"
                        checked={autoNpcReplies}
                        onChange={(event) => setAutoNpcReplies(event.target.checked)}
                      />
                      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                    </span>
                  </label>
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
              <p>
                This is your local display name. For story identities, create personas
                in the library — each story can play as its own persona.
              </p>
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

            <section className="settings-panel backup-settings">
              <p className="eyebrow">Your data</p>
              <h2>Backup &amp; restore</h2>
              <p>
                Your stories live in this browser. Download a portable backup anytime as a
                single <code>.hwb</code> file, and restore it here on this computer or on a
                new one. If you&apos;re signed into your account, backups can also be saved on
                the server so a new device can pull them back in.
              </p>

              <div className="backup-local-actions">
                <button
                  className="primary-button"
                  onClick={() => void exportAllPrivateData()}
                  disabled={serverBackupBusy}
                >
                  Export all private data
                </button>
                <label className="outline-button import-browse">
                  Restore from backup
                  <input
                    type="file"
                    accept=".hwb,application/json,.json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleLocalBackupImport(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {localBackupMsg && <span className="backup-feedback ok">{localBackupMsg}</span>}
              {localRestoreMsg && <span className="backup-feedback ok">{localRestoreMsg}</span>}
              {localBackupError && <span className="backup-feedback err">{localBackupError}</span>}
              <p className="backup-help">
                &ldquo;Export all private data&rdquo; always downloads a local file. If your
                server backup cannot be saved, the local download still happens.
              </p>

              <h3 className="backup-server-heading">Saved to your account</h3>
              {!archiveUser ? (
                <p className="backup-help">
                  Server backups need a signed-in account.{" "}
                  <button
                    className="text-button"
                    onClick={() => setView("archive")}
                  >
                    Sign in or create an account
                  </button>{" "}
                  to keep rolling snapshots on the server.
                </p>
              ) : (
                <div className="backup-server">
                  <div className="backup-server-tools">
                    <span className="backup-server-account">
                      {archiveUser.username}
                    </span>
                    <button
                      className="outline-button"
                      onClick={createServerBackupNow}
                      disabled={serverBackupBusy}
                    >
                      {serverBackupBusy ? "Saving…" : "Create backup now"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        archive.logout().catch(() => undefined);
                        handleArchiveUserChange(null);
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                  {serverBackupMsg && <span className="backup-feedback ok">{serverBackupMsg}</span>}
                  {serverBackupsError && <span className="backup-feedback err">{serverBackupsError}</span>}
                  {serverBackups !== null && serverBackups.length === 0 && (
                    <p className="backup-help">
                      No server backups yet. Your newest backup plus several older
                      snapshots are kept automatically.
                    </p>
                  )}
                  {serverBackups !== null && serverBackups.length > 0 && (
                    <ul className="backup-server-list">
                      {serverBackups.map((snapshot) => (
                        <li key={snapshot.id} className="backup-server-item">
                          <div className="backup-server-main">
                            <strong>
                              {formatBackupDate(snapshot.created_at)}
                            </strong>
                            <span className="backup-server-meta">
                              {formatBackupSize(snapshot.size_bytes)}
                              {snapshot.device ? ` · ${snapshot.device}` : ""}
                              {snapshot.source ? ` · ${snapshot.source}` : ""}
                              {snapshot.format && snapshot.version
                                ? ` · format v${snapshot.version}`
                                : ""}
                            </span>
                          </div>
                          <div className="backup-server-actions">
                            <button
                              className="link-button"
                              onClick={() => void downloadServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Download
                            </button>
                            <button
                              className="link-button"
                              onClick={() => void restoreServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Restore
                            </button>
                            <button
                              className="link-button archive-danger"
                              onClick={() => void deleteServerBackup(snapshot.id)}
                              disabled={serverBackupBusy}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="backup-help">
                    Server backups are private to your account and only ever include your
                    own content — never the curated Howling Whispers character packages,
                    and never passwords, keys, or other credentials.
                  </p>
                </div>
              )}
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

      {view === "personas" && (
        <section className="settings-page">
          <PersonaLibrary
            personas={personas}
            activePersonaId={resolvedActivePersonaId}
            onChange={setPersonas}
            onSelectActive={setActivePersonaId}
          />
        </section>
      )}

      {view === "archive" && (
        <ArchiveView
          characters={characters.map((character) => ({
            id: character.id,
            name: character.name,
            role: character.role,
            profile: character.profile,
            reply: character.reply,
            image: portraitUrl(character),
            sceneImage: character.sceneImage,
            ageCategory: character.ageCategory,
            isMinor: character.isMinor,
          }))}
          onImport={importArchiveCharacter}
          externalUser={archiveUser}
          onExternalUserChange={handleArchiveUserChange}
        />
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
                <Portrait character={character} image={portraitUrl(character)} />
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
            {activeSession && !activeSession.autopilot && (
              <button
                className="autopilot-toolbar-button"
                onClick={toggleAutopilot}
                aria-pressed={false}
                title="Let this character live on their own (Whisper Mode)"
              >
                <span className="auto-dot" aria-hidden="true" /> Whisper Mode
              </button>
            )}
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
            {activeSession && (
              <button
                className={`persona-button${sessionUsesDefaultPersona ? "" : " active"}`}
                onClick={() => setShowPersonaModal(true)}
                title={
                  sessionPersonaName
                    ? `Playing as ${sessionPersonaName}`
                    : "Choose who you play as in this story"
                }
              >
                <span aria-hidden="true">♜</span>
                {sessionPersonaName ? `Playing as ${sessionPersonaName}` : "Persona"}
              </button>
            )}
            <button
              className="share-button"
              onClick={() => setShowShare(true)}
              disabled={activeMessages.length === 0}
              title={activeMessages.length === 0 ? "Nothing to share yet" : "Share this conversation as an image"}
            >
              <span aria-hidden="true">⇣</span> Share
            </button>
          </div>
          <div className="scene-title">
            <h1>{selected.name}</h1>
            <p>
              <span className="presence-dot" style={{ background: activeTheme.accent }} />
              {activeScene.status} <i>·</i> {activeTheme.motif}
            </p>
            {autopilotError && <p className="auto-error">{autopilotError}</p>}
          </div>

          <div className={`messages${activeSession?.autopilot ? " storytelling" : ""}`} aria-live="polite">
            {activeMessages.length === 0 && activeSession?.autopilot && (
              <div className="sandbox-empty-state">
                <span aria-hidden="true">◉</span>
                <p className="eyebrow">Whisper Mode</p>
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
              return renderMessageBubble(message, isLastCharacter, { live: true, showCaption: false });
            })}
            {isReplying && (
              <article className="message character typing" aria-label={`${selected.name} is replying`}>
                <Portrait character={selected} image={portraitUrl(selected)} />
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
                <button
                  className="chat-error-close"
                  onClick={() => setChatError("")}
                  aria-label="Dismiss error"
                  title="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}
            {activeSession?.autopilot && (
              autopilotControlsCollapsed && activeSession.autopilotPaused ? (
                <div
                  className="autopilot-controls is-collapsed is-paused"
                  aria-label="Whisper Mode controls (minimized)"
                >
                  <button
                    className="autopilot-collapse-toggle"
                    onClick={() => setAutopilotControlsCollapsed(false)}
                    aria-label="Expand whisper mode controls"
                  >
                    <span aria-hidden="true" className="auto-dot is-running" />
                    <span className="autopilot-status">Paused — minimized</span>
                    <span aria-hidden="true" className="autopilot-collapse-icon">▲</span>
                  </button>
                </div>
              ) : (
              <div
                className={`autopilot-controls${activeSession.autopilotPaused ? " is-paused" : ""}`}
                aria-label="Whisper Mode controls"
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
                      aria-label="Minimize whisper mode controls"
                    >
                      Minimize
                    </button>
                  )}
                  <button onClick={toggleAutopilotPause} disabled={autopilotBusy}>
                    {activeSession.autopilotPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                      onClick={requestNextAutopilotBeat}
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
                <>
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
                </>
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
                      title="Impersonate: write the player's turn for you"
                      onClick={impersonatePlayer}
                      disabled={isReplying || isImpersonating}
                    >
                      ◐
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

          <section className="context-card living-cast-card">
            <div className="card-title">
              <p className="eyebrow">Living Cast</p>
              <span aria-hidden="true">◈</span>
            </div>
            {(() => {
              const castMembers = activeSession?.livingCast?.length
                ? activeSession.livingCast
                : createCast({ id: selected.id, name: selected.name });
              const pending = activeMessages.length > 0
                ? detectPendingInteraction(activeMessages, castMembers, selected.name, activePlayerName)
                : null;
              return (
                <details open={castMembers.length > 1}>
                  <summary>
                    <span>{castMembers.length} {castMembers.length === 1 ? "member" : "members"} in the scene</span>
                    {pending?.kind === "cast" && pending.targetName
                      ? <small>Pending: {pending.targetName} was asked</small>
                      : <small>No open direct question</small>}
                  </summary>
                  <ul className="living-cast-list">
                    {castMembers.map((member) => (
                      <li key={member.id} className={`cast-entry cast-${member.presence}`}>
                        <div className="cast-entry-line">
                          <span className="cast-name">{member.name}</span>
                          <span className="cast-tags">
                            {member.primary && <span className="cast-tag cast-tag-primary">Primary</span>}
                            <span className="cast-tag">{member.origin}</span>
                            <span className="cast-tag cast-tag-presence">{member.presence}</span>
                          </span>
                        </div>
                        {member.notes.slice(0, 2).map((note, noteIndex) => (
                          <p className="cast-note" key={noteIndex}>{note}</p>
                        ))}
                      </li>
                    ))}
                  </ul>
                  {pending?.kind === "cast" && pending.targetName && (
                    <p className="cast-pending-note">
                      {pending.asker} asked {pending.targetName} a question. {pending.targetName} has not responded yet.
                      {autoNpcReplies ? " Automatic side-character reply is on." : " Automatic side-character replies are off."}
                    </p>
                  )}
                </details>
              );
            })()}
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
              <span>Relationship</span>
              <strong>{deriveRelationshipLabel(selected.bond)}</strong>
            </div>
            <div className="bond-meter" aria-label={`Relationship ${selected.bond}%`}>
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

      {directionEditor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setDirectionEditor(null)}
        >
          <section
            className="modal direction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direction-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setDirectionEditor(null)}
              aria-label="Close direction editor"
            >
              ×
            </button>
            <p className="eyebrow">Player&apos;s turn</p>
            <h2 id="direction-title">Impersonation direction</h2>
            <p className="modal-intro">
              The direction remembered for this turn. Edit it and re-run to regenerate the
              player&apos;s draft from that prompt — or clear it to keep only the text.
            </p>
            <textarea
              className="direction-editor-textarea"
              value={directionEditor.text}
              onChange={(event) =>
                setDirectionEditor((current) =>
                  current ? { ...current, text: event.target.value } : current,
                )
              }
              rows={5}
              autoFocus
              placeholder="The prompt used to guide the impersonation…"
            />
            <div className="direction-actions">
              <button
                className="outline-button"
                onClick={() => setDirectionEditor(null)}
                disabled={isReplying || isImpersonating}
              >
                Cancel
              </button>
              <button
                className="outline-button"
                onClick={() => clearMessageDirection(directionEditor.id)}
                disabled={isReplying || isImpersonating}
              >
                Clear direction
              </button>
              <button
                className="primary-button"
                onClick={() => rerunImpersonation(directionEditor.id, directionEditor.text)}
                disabled={isReplying || isImpersonating}
              >
                {isImpersonating ? "Generating…" : "Save &amp; re-run"}
              </button>
            </div>
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
            <p className="eyebrow">Whisper Mode</p>
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
                  Begin Whisper Mode
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
                <small>Import a Character Card V2 PNG or JSON, or a Howling Whispers backup.</small>
              </span>
              <input type="file" accept=".png,.json,image/png,application/json" onChange={importCharacterFile} />
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

      {editingCharacter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setEditingCharacter(null)}
        >
          <section
            className="modal character-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setEditingCharacter(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Shape them further</p>
            <h2 id="character-edit-title">Edit {editingCharacter.name}</h2>
            <p className="modal-intro">
              Tweak how {editingCharacter.name} appears, speaks, and opens a scene. Changes apply to
              every future chat with them.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                updateCharacter(editingCharacter.id, {
                  name: String(form.get("name") || editingCharacter.name).trim(),
                  role: String(form.get("role") || editingCharacter.role).trim(),
                  status: String(form.get("status") || editingCharacter.status).trim(),
                  scene: String(form.get("scene") || editingCharacter.scene).trim(),
                  weather: String(form.get("weather") || editingCharacter.weather).trim(),
                  profile: String(form.get("profile") || editingCharacter.profile).trim(),
                  reply: String(form.get("reply") || editingCharacter.reply).trim(),
                  accent: String(form.get("accent") || editingCharacter.accent).trim(),
                  image: String(form.get("portrait") || "").trim()
                    || (isStoredPortraitReference(editingCharacter.image) ? editingCharacter.image : ""),
                  sceneImage: String(form.get("sceneImage") || "").trim(),
                  portraitFocalPoint: String(form.get("portraitFocalPoint") || "center").trim(),
                  backgroundFocalPoint: String(form.get("sceneFocalPoint") || "center").trim(),
                  relationship: String(form.get("relationship") || editingCharacter.relationship || "").trim() || undefined,
                  ageCategory: (String(form.get("ageCategory") || "") as AgeCategory) || undefined,
                  memories: String(form.get("memories") || editingCharacter.memories.join("\n"))
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
              }}
            >
              <label>
                Name
                <input name="name" defaultValue={editingCharacter.name} required />
              </label>
              <label>
                Role in your story
                <input name="role" defaultValue={editingCharacter.role} required />
              </label>
              <label>
                Status
                <input name="status" defaultValue={editingCharacter.status} placeholder="How they seem right now" />
              </label>
              <label>
                Scene / place
                <input name="scene" defaultValue={editingCharacter.scene} placeholder="Where their story lives" />
              </label>
              <label>
                Weather / atmosphere
                <input name="weather" defaultValue={editingCharacter.weather} placeholder="A detail of the air" />
              </label>
              <label>
                Profile &amp; personality
                <textarea
                  name="profile"
                  rows={5}
                  defaultValue={editingCharacter.profile}
                  placeholder="Who they are, how they look, what they care about…"
                />
              </label>
              <label>
                Opening message
                <textarea
                  name="reply"
                  rows={3}
                  defaultValue={editingCharacter.reply}
                  placeholder="How they greet you"
                />
              </label>
              <label>
                Memories (one per line)
                <textarea
                  name="memories"
                  rows={4}
                  defaultValue={editingCharacter.memories.join("\n")}
                  placeholder="Shared history, one memory per line"
                />
              </label>
              <label>
                Accent color
                <input type="color" name="accent" defaultValue={editingCharacter.accent || "#d78a5e"} />
              </label>
              <label>
                Portrait image URL
                <input
                  name="portrait"
                  defaultValue={isStoredPortraitReference(editingCharacter.image) ? "" : editingCharacter.image}
                  placeholder={isStoredPortraitReference(editingCharacter.image) ? "Imported card artwork is stored" : "https://…/portrait.png"}
                />
              </label>
              <label>
                Portrait focal point
                <input name="portraitFocalPoint" defaultValue={editingCharacter.portraitFocalPoint ?? "center"} placeholder="e.g. center, 20% 80%" />
              </label>
              <label>
                Scene image URL
                <input name="sceneImage" defaultValue={editingCharacter.sceneImage} placeholder="https://…/scene.png" />
              </label>
              <label>
                Scene focal point
                <input name="sceneFocalPoint" defaultValue={editingCharacter.backgroundFocalPoint ?? "center"} placeholder="e.g. center, 70% 30%" />
              </label>
              <label>
                Relationship to you
                <input name="relationship" defaultValue={editingCharacter.relationship ?? ""} placeholder="Friend, rival, mentor…" />
              </label>
              <label>
                Age category
                <select
                  name="ageCategory"
                  defaultValue={editingCharacter.ageCategory ? String(editingCharacter.ageCategory) : ""}
                >
                  <option value="">Unspecified / not relevant to story</option>
                  <option value="adult">Adult</option>
                  <option value="minor">Minor</option>
                </select>
              </label>
              <div className="character-edit-actions">
                <button
                  className="outline-button character-delete"
                  type="button"
                  onClick={() => setConfirmDeleteCharacter(editingCharacter)}
                >
                  Delete character
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setCharacterDownloadError("");
                    setDownloadingCharacter(editingCharacter);
                  }}
                >
                  Download character
                </button>
                <button className="primary-button" type="submit">
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {downloadingCharacter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDownloadingCharacter(null)}>
          <section
            className="modal character-download-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-download-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setDownloadingCharacter(null)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Portable character</p>
            <h2 id="character-download-title">Download {downloadingCharacter.name}</h2>
            <p className="modal-intro">
              Character Card V2 is the standard portable format. Howling Whispers backups retain
              app-specific data that V2 does not represent.
            </p>
            <button
              className="primary-button"
              type="button"
              disabled={!portraitUrl(downloadingCharacter)}
              onClick={() => void exportV2Png(downloadingCharacter)}
            >
              Download V2 Card
            </button>
            <div className="character-download-options">
              <button className="outline-button" type="button" onClick={() => exportV2Json(downloadingCharacter)}>
                V2 JSON
              </button>
              {isUserOwnedCharacter(downloadingCharacter) && (
                <button className="outline-button" type="button" onClick={() => exportNativeCharacter(downloadingCharacter)}>
                  Howling Whispers Backup
                </button>
              )}
            </div>
            {!portraitUrl(downloadingCharacter) && (
              <small>V2 PNG needs portrait artwork. V2 JSON remains available without an image.</small>
            )}
            {characterDownloadError && <p className="form-error">{characterDownloadError}</p>}
          </section>
        </div>
      )}

      {confirmDeleteCharacter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setConfirmDeleteCharacter(null)}
        >
          <section
            className="modal character-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setConfirmDeleteCharacter(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow">Remove them for good</p>
            <h2 id="character-delete-title">Delete {confirmDeleteCharacter.name}?</h2>
            <p className="modal-intro">
              This removes {confirmDeleteCharacter.name}, their stories, and their saved
              conversations from this browser. This cannot be undone.
            </p>
            <div className="character-edit-actions">
              <button className="outline-button" type="button" onClick={() => setConfirmDeleteCharacter(null)}>
                Cancel
              </button>
              <button
                className="primary-button character-delete"
                type="button"
                onClick={() => deleteCharacter(confirmDeleteCharacter)}
              >
                Delete character
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingPersonaStart && (
        <PersonaPicker
          personas={personas}
          activePersonaId={resolvedActivePersonaId}
          onAddPersona={(persona) => setPersonas((current) => [...current, persona])}
          onPick={(persona) => commitPersonaStart(persona)}
          onCancel={() => setPendingPersonaStart(null)}
        />
      )}

      {showShare && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowShare(false)}>
          <section
            className="modal share-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowShare(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">Share the story</p>
            <h2 id="share-title">Save a scene as an image</h2>
            <p className="modal-intro">
              Render the latest moments into a crisp image you can paste straight into Discord.
              Open the image to zoom in and read every line.
            </p>
            <div className="share-options">
              <label>
                Messages to include
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, activeMessages.length)}
                  value={shareCount}
                  onChange={(event) =>
                    setShareCount(Math.max(1, Math.min(Number(event.target.value) || 1, Math.max(1, activeMessages.length))))
                  }
                />
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareCaptions}
                  onChange={(event) => setShareCaptions(event.target.checked)}
                />
                <span>Name captions on bubbles</span>
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareHeader}
                  onChange={(event) => setShareHeader(event.target.checked)}
                />
                <span>Scene header</span>
              </label>
            </div>
            {shareError && <p className="share-error">{shareError}</p>}
            <div className="share-actions">
              <button
                className="primary-button"
                onClick={copyChatImage}
                disabled={shareBusy || activeMessages.length === 0}
              >
                {shareBusy ? "Rendering…" : shareFeedback || "Copy image"}
              </button>
              <button
                className="outline-button"
                onClick={downloadChatImageFromButton}
                disabled={shareBusy || activeMessages.length === 0}
              >
                Download PNG
              </button>
            </div>
          </section>
        </div>
      )}

      {showPersonaModal && activeSession && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowPersonaModal(false)}
        >
          <section
            className="modal persona-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowPersonaModal(false)} aria-label="Close">
              ×
            </button>
            <p className="eyebrow">This conversation&apos;s persona</p>
            <h2 id="persona-title">How do you appear here?</h2>
            <p className="modal-intro">
              These fields apply only to this conversation with {selected.name}. You can pick from
              your saved personas — this story keeps its own snapshot, so changing the library later
              will not rewrite who you are here.
            </p>

            <div className="persona-session-picker">
              {personas.length === 0 ? (
                <p className="persona-library-empty">
                  No saved personas yet. Add some in Settings, or write a custom one below.
                </p>
              ) : (
                <ul className="persona-list">
                  {personas.map((persona) => {
                    const inUse = activeSession.playerPersonaId === persona.id;
                    return (
                      <li className="persona-card" key={persona.id}>
                        <span className="persona-avatar" aria-hidden="true">
                          {persona.name.trim().charAt(0).toUpperCase() || "P"}
                        </span>
                        <div className="persona-card-copy">
                          <strong>{persona.name}</strong>
                          <small>{persona.pronouns ?? "no pronouns set"}</small>
                          <p>{persona.description || "No description yet."}</p>
                        </div>
                        <div className="persona-card-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => applySessionPersona(persona)}
                          >
                            {inUse ? "In use" : "Use for this story"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {activeSession && (
              <div className="persona-active-preview">
                <strong>Snapshot used by this story</strong>
                <pre>{sessionPersonaSnapshot || "No persona set — using your default."}</pre>
              </div>
            )}

            {(!sessionUsesDefaultPersona) && (
              <p className="persona-change-warning">
                Changing persona during an existing story may make earlier messages inconsistent.
              </p>
            )}

            <div className="persona-fields">
              <label>
                Player name
                <input
                  value={activeSession.playerName ?? ""}
                  onChange={(event) => updateActiveSessionPersona({ playerName: event.target.value })}
                  placeholder={
                    playerProfile.name.trim()
                      ? `Blank = default (${playerProfile.name.trim()})`
                      : "Leave blank to stay unnamed in the story"
                  }
                  maxLength={100}
                />
              </label>
              <label>
                Persona
                <textarea
                  value={activeSession.playerPersona ?? ""}
                  onChange={(event) => updateActiveSessionPersona({ playerPersona: event.target.value })}
                  placeholder={
                    playerProfile.persona.trim()
                      ? "Blank = your default persona"
                      : "Describe how you want to be seen in this story—appearance, nature, history. Leave blank if you prefer to improvise."
                  }
                  rows={4}
                  maxLength={2000}
                />
              </label>
            </div>
            <p className="persona-default-note">
              Default persona for all chats: <strong>{playerProfile.name.trim() || "No name"}</strong>
              {playerProfile.persona.trim() ? " — " + playerProfile.persona.trim() : " — no persona set"}
            </p>
            <div className="share-actions">
              <button
                className="outline-button"
                onClick={clearActiveSessionPersona}
                disabled={sessionUsesDefaultPersona}
              >
                Use default persona
              </button>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}
