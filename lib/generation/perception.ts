import type { Location } from "../locations/types.ts";
import type { AutonomousAgent } from "./autonomous-cast.ts";
import { recentResidue } from "./autonomous-cast.ts";
import type { LivingCastEntry } from "./living-cast.ts";

export type PovStyle = "standard" | "sensory";

export type SensoryChannel =
  | "sight"
  | "hearing"
  | "smell"
  | "touch"
  | "taste"
  | "bodyLanguage"
  | "spatialAwareness";

export type SpatialRelation =
  | "same-place"
  | "near"
  | "far"
  | "behind"
  | "in-front"
  | "beside"
  | "touching"
  | "separated-by-barrier"
  | "out-of-sight";

export type SensoryIntensity = "quiet" | "normal" | "loud";

export type SensoryPovConfig = {
  style: PovStyle;
  channels?: Partial<Record<SensoryChannel, boolean>>;
};

export type PerceptionFact = {
  id: string;
  channel: SensoryChannel;
  text: string;
  relation?: SpatialRelation;
  intensity?: SensoryIntensity;
  private?: boolean;
  requiresContact?: boolean;
};

export type PerceptionResult = {
  enabled: boolean;
  worldFacts: PerceptionFact[];
  observations: PerceptionFact[];
  filtered: Array<{ id: string; reason: string }>;
  block: string;
};

const CHANNEL_ORDER: SensoryChannel[] = [
  "sight",
  "hearing",
  "smell",
  "touch",
  "taste",
  "bodyLanguage",
  "spatialAwareness",
];

const CHANNEL_LABELS: Record<SensoryChannel, string> = {
  sight: "Visible",
  hearing: "Audible",
  smell: "Smell",
  touch: "Touch",
  taste: "Taste",
  bodyLanguage: "Observable body language",
  spatialAwareness: "Spatial awareness",
};

function channelEnabled(config: SensoryPovConfig, channel: SensoryChannel): boolean {
  return config.channels?.[channel] !== false;
}

function filteredReason(fact: PerceptionFact, config: SensoryPovConfig): string | null {
  if (!channelEnabled(config, fact.channel)) return "channel-disabled";
  if (fact.private) return "private-world-truth";

  const relation = fact.relation ?? "same-place";
  if (fact.channel === "sight" || fact.channel === "bodyLanguage") {
    if (relation === "behind" || relation === "out-of-sight" || relation === "separated-by-barrier") {
      return "no-line-of-sight";
    }
  }

  if (fact.channel === "hearing") {
    if (relation === "out-of-sight" && fact.intensity !== "loud") return "inaudible";
    if (relation === "separated-by-barrier" && fact.intensity === "quiet") return "barrier-muted";
  }

  if (fact.channel === "smell") {
    if (relation === "far" || relation === "out-of-sight" || relation === "separated-by-barrier") {
      return "scent-unavailable";
    }
  }

  if (fact.channel === "touch" || fact.channel === "taste" || fact.requiresContact) {
    if (relation !== "touching") return "no-contact";
  }

  if (fact.channel === "spatialAwareness" && relation === "out-of-sight") {
    return "position-unknown";
  }

  return null;
}

export function resolvePerception(
  facts: PerceptionFact[],
  config: SensoryPovConfig,
): PerceptionResult {
  if (config.style !== "sensory") {
    return { enabled: false, worldFacts: [], observations: [], filtered: [], block: "" };
  }

  const observations: PerceptionFact[] = [];
  const filtered: PerceptionResult["filtered"] = [];
  for (const fact of facts) {
    const reason = filteredReason(fact, config);
    if (reason) filtered.push({ id: fact.id, reason });
    else observations.push(fact);
  }

  const lines = [
    "<persona-perception>",
    "Narrate through the player persona's available senses and physical perspective only.",
    "Treat the observations below as what the persona can presently perceive, not as complete world truth.",
  ];
  for (const channel of CHANNEL_ORDER) {
    const matching = observations.filter((fact) => fact.channel === channel);
    if (matching.length === 0) continue;
    lines.push(`${CHANNEL_LABELS[channel]}:`);
    for (const fact of matching) lines.push(`- ${fact.text}`);
  }
  lines.push(
    "Perception rules:",
    "- Prefer observable evidence over direct labels for emotion, intent, pain, fear, attraction, deception, or hostility.",
    "- Body language supports cautious inference only; never present an inferred motive or emotion as confirmed fact.",
    "- Do not reveal private thoughts, unseen expressions, undiscovered objects, or actions outside the persona's perception.",
    "- Do not force every sense into every reply. Use a sensory detail only when it is relevant to the current beat.",
    "- Touch and taste require direct physical contact. Distant warmth, texture, pressure, or flavor is not directly felt.",
    "</persona-perception>",
  );

  return { enabled: true, worldFacts: facts, observations, filtered, block: lines.join("\n") };
}

export function buildSensoryContext(input: {
  config: SensoryPovConfig;
  location?: Location;
  weather?: string;
  cast?: LivingCastEntry[];
  autonomy?: AutonomousAgent[];
}): PerceptionResult {
  if (input.config.style !== "sensory") return resolvePerception([], input.config);

  const facts: PerceptionFact[] = [];
  if (input.location) {
    facts.push({
      id: `location:${input.location.id}`,
      channel: "spatialAwareness",
      text: `The persona is in ${input.location.name}.`,
      relation: "same-place",
    });
    for (const atmosphere of input.location.atmosphere?.slice(0, 3) ?? []) {
      facts.push({
        id: `location:${input.location.id}:atmosphere:${facts.length}`,
        channel: "spatialAwareness",
        text: `The immediate atmosphere is ${atmosphere}.`,
        relation: "same-place",
      });
    }
  }
  const weather = input.weather?.trim();
  if (weather) {
    facts.push({
      id: "environment:weather",
      channel: "spatialAwareness",
      text: `Immediate environmental conditions: ${weather}`,
      relation: "same-place",
    });
  }

  const activeCast = new Map(
    (input.cast ?? [])
      .filter((entry) => entry.presence === "active" && entry.origin !== "player")
      .map((entry) => [entry.id, entry]),
  );
  const activeCastNames = new Set(
    [...activeCast.values()].map((entry) => entry.name.trim().toLocaleLowerCase("en-US")),
  );
  for (const entry of activeCast.values()) {
    facts.push({
      id: `cast:${entry.id}:presence`,
      channel: "spatialAwareness",
      text: `${entry.name} is present in the same general place. Their exact distance and orientation are not established.`,
      relation: "same-place",
    });
  }

  for (const agent of input.autonomy ?? []) {
    if (!activeCast.has(agent.id) && !activeCastNames.has(agent.name.trim().toLocaleLowerCase("en-US"))) continue;
    const residue = recentResidue(agent, 2);
    for (const signal of residue.observable) {
      facts.push({
        id: `autonomy:${agent.id}:observable:${facts.length}`,
        channel: "bodyLanguage",
        text: signal.startsWith(agent.name) ? signal : `${agent.name} ${signal}`,
        relation: "same-place",
      });
    }
    for (const signal of residue.internal) {
      facts.push({
        id: `autonomy:${agent.id}:internal:${facts.length}`,
        channel: "spatialAwareness",
        text: signal,
        relation: "same-place",
        private: true,
      });
    }
  }

  return resolvePerception(facts, input.config);
}
