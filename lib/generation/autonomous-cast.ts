// Autonomous Cast — lightweight per-NPC agency state for the roleplay prompt.
//
// Phase 3. This is the "persistent-drive" tier: each active NPC carries a small
// drive state (goal, intent, wants, fears, unresolved concerns, and basic needs)
// plus the latest internal vs. player-facing residue. Drives *influence* the
// prompt the model consumes, they never mechanically force an outcome — the
// character may disagree, hesitate, refuse, conceal, or change their mind.
//
// Only valid Living Cast identities may own autonomous state. State is keyed to
// the cast member id, seeded/pruned from the living cast, and updated by a cheap
// deterministic delta layer (`updateAutonomyState`) over the recent conversation —
// no extra AI call is spent keeping drives alive.
//
// Design notes (adapted, not copied, from the Neutraverse/Gemfeld references):
//   - NPCs are independent participants and may initiate actions or interact
//     with other NPCs when their own state gives them a reason, instead of only
//     waiting for the player (PROACTIVE_CASCADE / COLLATERAL_INTERACTION).
//   - Perception boundary: internal state is richer than player-facing prose.
//     What the player sees are physical residue signs, never the raw drive
//     ("answers grow shorter / she keeps glancing at the doorway", not
//     "Melody distrust increased").
//   - Drives are advisory state rendered into the prompt, not runtime controls.

import { isRejectedAutonomyIdentity, findCastEntryById } from "./living-cast.ts";

export type AutonomyNeed =
  | "hunger"
  | "fatigue"
  | "comfort"
  | "social"
  | "curiosity";

export type CastDrive = {
  /** What this NPC presently wants to accomplish. */
  goal: string;
  /** The immediate move the NPC is leaning toward right now. */
  intent: string;
  /** Things the NPC wants (people, outcomes, objects). */
  wants: string[];
  /** Things the NPC is afraid of. */
  fears: string[];
  /** Open, unresolved concerns weighing on the NPC. */
  concerns: string[];
  /** Basic needs, normalized 0..1 (0 = satisfied, 1 = pressing). */
  needs: Record<AutonomyNeed, number>;
};

export type AutonomyResidue = {
  /** Internal, hidden state — richer than the player ever sees. */
  internal: string[];
  /** Player-facing physical signals that hint at the internal state. */
  observable: string[];
};

export type AutonomousAgent = {
  id: string;
  name: string;
  drive: CastDrive;
  /** Newest first; bounded to the last few beats. */
  revisions: AutonomyResidue[];
  updatedAt: number;
};

export const MAX_DRIVE_WORDS = 120;
export const MAX_DRIVE_ITEMS = 4;
export const MAX_REVISIONS = 3;

export function blankDrive(): CastDrive {
  return {
    goal: "",
    intent: "",
    wants: [],
    fears: [],
    concerns: [],
    needs: { hunger: 0, fatigue: 0, comfort: 0, social: 0, curiosity: 0 },
  };
}

function cleanString(value: unknown, max = MAX_DRIVE_WORDS): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanStringList(value: unknown, max = MAX_DRIVE_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_DRIVE_WORDS))
    .filter(Boolean)
    .slice(0, max);
}

function cleanNeeds(value: unknown): Record<AutonomyNeed, number> {
  const base = blankDrive().needs;
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(base) as AutonomyNeed[]) {
    const raw = record[key];
    const num = typeof raw === "number" ? raw : raw === "high" ? 1 : raw === "low" ? 0.33 : 0;
    base[key] = Math.min(1, Math.max(0, num));
  }
  return base;
}

/** Defensive parse of a persisted autonomous agent map or flat array form. */
export function sanitizeAutonomousCast(value: unknown): Map<string, AutonomousAgent> {
  const out = new Map<string, AutonomousAgent>();
  if (!value || typeof value !== "object") return out;
  const entries = Array.isArray(value)
    ? value as unknown[]
    : Object.values(value as Record<string, unknown>);
  for (const raw of entries) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const name = cleanString(entry.name);
    const id = cleanString(entry.id) || (name ? `rc:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "");
    if (!name || !id || isRejectedAutonomyIdentity({ name }) || out.has(id)) continue;
    const driveRaw = (entry.drive ?? {}) as Record<string, unknown>;
    const revisions = Array.isArray(entry.revisions)
      ? entry.revisions
        .filter((rev): rev is Record<string, unknown> => !!rev && typeof rev === "object")
        .map((rev) => ({
          internal: cleanStringList(rev.internal, 6),
          observable: cleanStringList(rev.observable, 6),
        }))
        .filter((rev) => rev.internal.length > 0 || rev.observable.length > 0)
        .slice(0, MAX_REVISIONS)
      : [];
    out.set(id, {
      id,
      name,
      drive: {
        goal: cleanString(driveRaw.goal),
        intent: cleanString(driveRaw.intent),
        wants: cleanStringList(driveRaw.wants),
        fears: cleanStringList(driveRaw.fears),
        concerns: cleanStringList(driveRaw.concerns),
        needs: cleanNeeds(driveRaw.needs),
      },
      revisions,
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : Date.now(),
    });
    if (out.size >= 24) break;
  }
  return out;
}

/** Flat array form (like LivingCast) for prompt rendering and storage. */
export function autonomousAgentsToArray(agents: Map<string, AutonomousAgent>): AutonomousAgent[] {
  return [...agents.values()].sort((a, b) => a.updatedAt - b.updatedAt);
}

/**
 * Ensure every active, non-player cast member has an autonomy agent with at
 * least a blank drive. Richer user-authored drives (goal/intent/wants/fears/
 * concerns/needs) merge on top; absent members get a neutral baseline so the
 * prompt always carries a subtext block when the living cast is non-trivial.
 */
export function seedAutonomyFromCast(
  agents: Map<string, AutonomousAgent>,
  cast: LivingCastShim[],
  now = Date.now(),
): Map<string, AutonomousAgent> {
  const castIds = new Set(cast.map((member) => member.id).filter(Boolean));
  const working = new Map<string, AutonomousAgent>();
  for (const [id, entry] of agents) {
    if (!castIds.has(id)) continue;
    working.set(id, {
      ...entry,
      drive: { ...entry.drive, needs: { ...entry.drive.needs } },
      revisions: entry.revisions.slice(0, MAX_REVISIONS),
    });
  }
  for (const member of cast) {
    if (!member.id || !member.name) continue;
    if (!working.has(member.id)) {
      working.set(member.id, {
        id: member.id,
        name: member.name,
        drive: blankDrive(),
        revisions: [],
        updatedAt: now,
      });
    }
  }
  return working;
}

/** Bounded reverse-chronological list of the agent's recent residue, newest first. */
export function recentResidue(agent: AutonomousAgent, max = 2): AutonomyResidue {
  const newest = [...agent.revisions].slice(0, max);
  return {
    internal: newest.flatMap((revision) => revision.internal).slice(0, 6),
    observable: newest.flatMap((revision) => revision.observable).slice(0, 6),
  };
}

/**
 * Perception boundary: turn raw internal statements into observable physical
 * residue for the player-facing prose, in the style of the reference examples.
 * Internal ("Melody intends to leave") -> observable ("She keeps glancing toward
 * the doorway"). No internal line ever leaks verbatim into player-facing prose.
 */
export function perceptionBoundary(internal: string[]): string[] {
  const residue: string[] = [];
  for (const line of internal) {
    const lower = line.toLocaleLowerCase("en-US");
    if (/\b(?:leav(?:e|es|ing)?|depart(?:s|ed)?|walk(?:s|ed)? away|exit(?:s|ed)?|slip(?:s|ped)? away|quit(?:s)?)\b/.test(lower)) {
      residue.push("keeps glancing toward the way out");
    } else if (/\b(don'?t|no longer|stop(?:ped)?).*trust|trust.*(?:lost|faded|drained)|distrust\b/.test(lower)) {
      residue.push("answers grow shorter and more guarded");
    } else if (/\b(refus|decline|won'?t|unwilling|will not|not going to)\b/.test(lower)) {
      residue.push("hesitates, then shakes their head");
    } else if (/\b(hide|conceal|secret|lie|without (?:him|her|them|me) knowing)\b/.test(lower)) {
      residue.push("looks away and changes the subject");
    } else if (/\b(hunger|starving|hungry|meal|eat)\b/.test(lower)) {
      residue.push("worries at their lip and glances at the table");
    } else if (/\b(tired|fatigue|exhausted|sleep)\b/.test(lower)) {
      residue.push("smothers a yawn and leans on one hand");
    } else {
      residue.push("falls quiet and studies the ground");
    }
  }
  return residue;
}

type LivingCastShim = { id: string; name: string };

/** Minimal roleplay-message shape the state layer reads. */
type MessageShim = {
  sender: string;
  text: string;
  speaker?: string | null;
};

const EATING_SIGNALS =
  /\b(?:eat(?:s|ing)?|ate|eaten|meal|dinner|lunch|breakfast|snack(?:s)?|feast(?:s|ed|ing)?|bite(?:s)?|chew(?:s|ed|ing)?|sip(?:s|ped|ping)?|drink(?:s|ing|s)|drank|gulp(?:s|ed)?)\b/i;
const RESTING_SIGNALS =
  /\b(?:sleep(?:s|ing)?|slept|rest(?:s|ing|ed)?|nap(?:s|ped|ping)?|doze(?:s|d|ing)?|recline(?:s)?d?|settle(?:s)?d? in|lie down|laid down|lay down|yawn(?:s|ed|ing)?)\b/i;
const COMFORT_SIGNALS =
  /\b(?:comfort|cozy|warmth|warm|sooth(?:ed|ing)?|soft|bathe|bath|relax(?:ed|ing)?|calm(?:ed|ing)?|content(?:ed)?)\b/i;
const SOCIAL_SIGNALS =
  /\b(?:welcome(?:d)?|greet(?:s|ed|ing)?|embrace(?:d)?|hug(?:s|ged|ging)?|together|companion(?:.ship)?|talk(?:ed|ing)?|chat(?:ted|ting)?|laugh(?:ed|ing)?|conversation(?:s)?|joined|confided)\b/i;
const DISCOVERY_SIGNALS =
  /\b(?:discover(?:ed|y|ies)?|realiz(?:e|ed)|figured out|found out|learn(?:ed)?|understand?|understood|answer(?:ed|s)?|revealed|uncovered|solved|recalled|remembered)\b/i;
const QUESTION_SIGNALS =
  /\b(?:who|what|when|where|why|how|anyone|somebody|someone|will you|would you|did you|do you)\b[^.!?]*\?/i;
const CONFLICT_SIGNALS =
  /\b(?:argument|argue(?:s|d)?|fight(?:s|ing)?|fought|shout(?:s|ed|ing)?|yell(?:s|ed|ing)?|angry|anger|threaten(?:s)?(?:ed|ing)?|hostile|glare(?:s)?d?|snapped|demand(?:ed)?)\b/i;
const COMPLETION_SIGNALS =
  /\b(?:finally|done|finished|completed|accomplished|achieved|secured|succeed(?:ed)?|fulfil(?:l)?ed)\b/i;

const clampNeed = (value: number) => Math.min(1, Math.max(0, value));

function mentionsName(text: string, name: string): boolean {
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "i").test(text);
}

/**
 * Deterministic, AI-free delta layer for persistent character drives (Phase 3).
 * Reads the most recent roleplay beats, attributes signals to the cast member
 * who owns them (respondAs keeps authority — the speaking member answers
 * pending questions), and applies small, clamped deltas to needs and drives.
 * Nothing changes when nothing meaningful happened, so idle state is stable.
 */
export function updateAutonomyState(
  agents: Map<string, AutonomousAgent>,
  cast: LivingCastShim[],
  messages: MessageShim[],
  options: { speakerId?: string | null; primaryId: string; now?: number },
): Map<string, AutonomousAgent> {
  const now = options.now ?? Date.now();
  const working = new Map<string, AutonomousAgent>();
  for (const [id, entry] of agents) {
    working.set(id, {
      ...entry,
      drive: { ...entry.drive, needs: { ...entry.drive.needs } },
      revisions: entry.revisions.slice(0, MAX_REVISIONS),
    });
  }

  const window = messages.slice(-3);

  for (const member of cast) {
    if (!member.id || !member.name) continue;
    if (member.id === options.primaryId) continue;
    const entry = working.get(member.id);
    if (!entry) continue;

    const isSpeaker = Boolean(options.speakerId) && options.speakerId === member.id;
    const beatText = window
      .filter((message) => message.sender === "character"
        ? (message.speaker ?? "") === member.name || mentionsName(message.text, member.name)
        : mentionsName(message.text, member.name))
      .map((message) => message.text)
      .join("\n");
    if (!beatText.trim()) continue;

    const needs = entry.drive.needs;
    let changed = false;

    if (EATING_SIGNALS.test(beatText)) {
      needs.hunger = clampNeed(needs.hunger - 0.2);
      changed = true;
    }
    if (RESTING_SIGNALS.test(beatText)) {
      needs.fatigue = clampNeed(needs.fatigue - 0.25);
      changed = true;
    }
    if (COMFORT_SIGNALS.test(beatText)) {
      needs.comfort = clampNeed(needs.comfort - 0.15);
      changed = true;
    }
    if (SOCIAL_SIGNALS.test(beatText)) {
      needs.social = clampNeed(needs.social - 0.15);
      changed = true;
    }
    if (DISCOVERY_SIGNALS.test(beatText)) {
      needs.curiosity = clampNeed(needs.curiosity - 0.15);
      if (entry.drive.concerns.length > 0) {
        entry.drive.concerns = entry.drive.concerns.slice(0, -1);
      }
      changed = true;
    }
    if (QUESTION_SIGNALS.test(beatText)) {
      if (!isSpeaker) {
        needs.social = clampNeed(needs.social + 0.1);
        const concern = `${member.name} was asked something and has not answered`;
        if (!entry.drive.concerns.includes(concern)) {
          entry.drive.concerns = [...entry.drive.concerns, concern].slice(0, MAX_DRIVE_ITEMS);
        }
        changed = true;
      } else {
        const concern = `${member.name} was asked something and has not answered`;
        entry.drive.concerns = entry.drive.concerns.filter((candidate) => candidate !== concern);
        entry.revisions = entry.revisions
          .map((revision) => ({
            internal: revision.internal.filter((line) => !line.includes("asked and has not answered")),
            observable: revision.observable,
          }))
          .filter((revision) => revision.internal.length > 0 || revision.observable.length > 0);
        changed = changed || entry.revisions.length !== agents.get(member.id)?.revisions.length;
      }
    }
    if (CONFLICT_SIGNALS.test(beatText)) {
      const fear = entry.drive.fears.find((existing) => /brewing conflict/i.test(existing));
      if (!fear) {
        entry.drive.fears = ["the brewing conflict", ...entry.drive.fears].slice(0, MAX_DRIVE_ITEMS);
      }
      changed = true;
    }
    if (COMPLETION_SIGNALS.test(beatText) && entry.drive.goal) {
      entry.drive.goal = "";
      entry.drive.intent = "";
      changed = true;
    }

    if (changed) entry.updatedAt = now;
  }

  return working;
}

/**
 * Derive an agent pulse from the conversation without spending an AI call.
 * This is intentionally light: it records unresolved questions to an NPC and
 * the fact that the NPC has been present but silent, both of which are enough
 * for the model to act on its own instead of always answering the player.
 */
export function deriveAutonomyPulse(
  agents: Map<string, AutonomousAgent>,
  cast: LivingCastShim[],
  options: {
    speakerId?: string | null;
    primaryId: string;
    pendingTargetId?: string | null;
    now?: number;
  },
): Map<string, AutonomousAgent> {
  const now = options.now ?? Date.now();
  const working = new Map<string, AutonomousAgent>();
  for (const [id, entry] of agents) {
    working.set(id, {
      ...entry,
      drive: { ...entry.drive, needs: { ...entry.drive.needs } },
      revisions: entry.revisions.slice(0, MAX_REVISIONS),
    });
  }

  for (const member of cast) {
    const entry = working.get(member.id);
    if (!entry || entry.id === options.primaryId) continue;
    if (options.speakerId && member.id === options.speakerId) continue;
    const internal: string[] = [];
    const observable: string[] = [];
    if (options.pendingTargetId && entry.id === options.pendingTargetId) {
      internal.push(`${entry.name} has been asked and has not answered`);
      observable.push("keeps returning to a half-formed thought, lips pressed shut");
    } else {
      internal.push(`${entry.name} is present but has not been given a clear reason to speak yet`);
      observable.push("keeps to themselves, still but watchful");
    }
    entry.revisions = [
      { internal, observable },
      ...entry.revisions,
    ].slice(0, MAX_REVISIONS);
    entry.updatedAt = now;
  }

  return working;
}

export type PulseViewAgent = {
  id: string;
  name: string;
  goal: string;
  needs: Record<AutonomyNeed, number>;
  observable: string[];
};

export type PulseView = {
  agents: PulseViewAgent[];
  pending: { targetName: string | null; asker: string | null } | null;
};

export function renderPulseView(
  agents: Map<string, AutonomousAgent> | AutonomousAgent[],
  cast: LivingCastShim[],
  options: {
    primaryId: string;
    speakerId?: string | null;
    pendingTargetId?: string | null;
    now?: number;
  },
): PulseView {
  const agentMap = agents instanceof Map ? agents : new Map(agents.map((agent) => [agent.id, agent]));
  const derived = deriveAutonomyPulse(agentMap, cast, options);
  const pending = options.pendingTargetId
    ? (() => {
        const target = findCastEntryById(cast, options.pendingTargetId);
        return { targetName: target?.name ?? null, asker: null };
      })()
    : null;
  const viewAgents: PulseViewAgent[] = [];
  for (const [, entry] of derived) {
    if (entry.id === options.primaryId) continue;
    if (options.speakerId && entry.id === options.speakerId) continue;
    const residue = recentResidue(entry);
    viewAgents.push({
      id: entry.id,
      name: entry.name,
      goal: entry.drive.goal,
      needs: { ...entry.drive.needs },
      observable: residue.observable,
    });
  }
  return { agents: viewAgents, pending };
}

/**
 * Agencies map rendered to a compact block for the prompt:
 *   [NPC SUBTEXT] — internal drive (never player-facing)
 *   [OBSERVABLE] — physical residue the player can see
 */
export function renderAutonomousBlock(
  agents: AutonomousAgent[],
  options: { primaryDisplayName?: string } = {},
): string {
  if (agents.length === 0) return "";
  const lines: string[] = ["<autonomy>"];
  let renderedAny = false;
  for (const agent of agents) {
    if (options.primaryDisplayName && agent.name === options.primaryDisplayName) continue;
    renderedAny = true;
    lines.push(`[NPC SUBTEXT: ${agent.name}]`);
    const drive = agent.drive;
    if (drive.goal) lines.push(`Goal: ${drive.goal}`);
    if (drive.intent) lines.push(`Intent: ${drive.intent}`);
    if (drive.wants.length > 0) lines.push(`Wants: ${drive.wants.join("; ")}`);
    if (drive.fears.length > 0) lines.push(`Fears: ${drive.fears.join("; ")}`);
    if (drive.concerns.length > 0) lines.push(`Unresolved: ${drive.concerns.join("; ")}`);
    const pressed = (Object.keys(drive.needs) as AutonomyNeed[])
      .filter((need) => drive.needs[need] >= 0.6)
      .map((need) => need);
    if (pressed.length > 0) lines.push(`Pressed needs: ${pressed.join(", ")}`);
    const residue = recentResidue(agent, 2);
    if (residue.internal.length > 0) {
      for (const line of residue.internal) lines.push(`- internal: ${line}`);
    }
    if (residue.observable.length > 0) {
      lines.push(
        `[OBSERVABLE] ${agent.name} — ${residue.observable
          .map((signal) => (signal.startsWith(agent.name) ? signal : `${agent.name} ${signal}`))
          .join("; ")}`,
      );
    }
  }
  lines.push("</autonomy>");
  if (!renderedAny) return "";
  return lines.join("\n");
}

/**
 * Autonomy guidance appended when the model must write one NPC's turn, so the
 * NPC acts as an independent participant (may disagree, hesitate, refuse,
 * conceal, or change their mind) instead of being a puppet of the plot.
 */
export function renderAutonomyInstruction(agent: AutonomousAgent, primaryDisplayName: string): string {
  const lines = [
    `As ${agent.name}, you are an independent participant, not a plot device. Follow your own goal and inner state, not only the player's: you may disagree, hesitate, refuse, conceal what you know, or change your mind. ${primaryDisplayName}'s influence shapes your choices but never overwrites them.`,
  ];
  const drive = agent.drive;
  const parts: string[] = [];
  if (drive.goal) parts.push(`you are trying to ${drive.goal}`);
  if (drive.wants.length > 0) parts.push(`you want ${drive.wants.join(", ")}`);
  if (drive.fears.length > 0) parts.push(`you fear ${drive.fears.join(", ")}`);
  if (drive.concerns.length > 0) parts.push(`you are still worried about ${drive.concerns.join(", ")}`);
  if (parts.length > 0) lines.push(parts.join("; ").replace(/^./, (c) => c.toLocaleUpperCase("en-US")) + ".");
  const needs = (Object.keys(drive.needs) as AutonomyNeed[])
    .filter((need) => drive.needs[need] >= 0.6)
    .map((need) => need);
  if (needs.length > 0) {
    lines.push(
      `Your body is reminding you of ${needs.join(", ")}. Let it color your mood and choices, but never make it the sole reason for anything you do.`,
    );
  }
  const residue = recentResidue(agent, 2);
  if (residue.internal.length > 0) {
    lines.push(
      `What is true in your private thoughts right now: ${residue.internal.join(" ")}. Keep this hidden — reveal it only through actions, posture, and careful words, never by naming the thought itself.`,
    );
  }
  if (residue.observable.length > 0) {
    lines.push(
      `Others can see: ${residue.observable.join("; ")}. Carry that in the way the room would notice you.`,
    );
  }
  return lines.join("\n");
}
