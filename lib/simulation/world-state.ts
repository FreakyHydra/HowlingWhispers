import type { CastMessage, LivingCastEntry } from "../generation/living-cast.ts";
import type { BodyState, WorldSceneState } from "./schema.ts";

const MAX_HISTORY = 12;

export function createWorldSceneState(location = "Open sandbox", now = Date.now()): WorldSceneState {
  return {
    version: 2,
    location,
    presentCharacterIds: [],
    nearbyCharacterIds: [],
    entrances: [],
    exits: [],
    proximity: {},
    importantObjects: [],
    heldObjects: {},
    body: {},
    physicalContact: [],
    ongoingEvents: [],
    environment: [],
    updatedAt: now,
  };
}

export function sanitizeWorldSceneState(value: unknown): WorldSceneState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<WorldSceneState>;
  if (candidate.version !== 2) return undefined;
  const strings = (input: unknown, max = MAX_HISTORY) => Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 180)).slice(-max)
    : [];
  const record = (input: unknown): Record<string, string> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    return Object.fromEntries(Object.entries(input as Record<string, unknown>)
      .filter(([, item]) => typeof item === "string")
      .slice(0, 24)
      .map(([key, item]) => [key.slice(0, 120), String(item).slice(0, 180)]));
  };
  const state = createWorldSceneState(typeof candidate.location === "string" ? candidate.location.slice(0, 240) : "Open sandbox");
  state.presentCharacterIds = strings(candidate.presentCharacterIds, 24);
  state.nearbyCharacterIds = strings(candidate.nearbyCharacterIds, 24);
  state.proximity = record(candidate.proximity);
  state.importantObjects = strings(candidate.importantObjects);
  state.physicalContact = strings(candidate.physicalContact);
  state.ongoingEvents = strings(candidate.ongoingEvents);
  state.environment = strings(candidate.environment);
  state.updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now();
  if (candidate.heldObjects && typeof candidate.heldObjects === "object") {
    for (const [id, held] of Object.entries(candidate.heldObjects)) state.heldObjects[id.slice(0, 120)] = strings(held, 6);
  }
  if (candidate.body && typeof candidate.body === "object") {
    for (const [id, body] of Object.entries(candidate.body)) {
      if (!body || typeof body !== "object") continue;
      const item = body as BodyState;
      state.body[id.slice(0, 120)] = Object.fromEntries(Object.entries(item).filter(([, fact]) => typeof fact === "string").map(([key, fact]) => [key, fact.slice(0, 180)]));
    }
  }
  state.entrances = Array.isArray(candidate.entrances) ? candidate.entrances.filter((item) => item && typeof item.characterId === "string" && typeof item.reason === "string").slice(-MAX_HISTORY) : [];
  state.exits = Array.isArray(candidate.exits) ? candidate.exits.filter((item) => item && typeof item.characterId === "string" && typeof item.reason === "string").slice(-MAX_HISTORY) : [];
  return state;
}

function unique(values: string[], max = MAX_HISTORY): string[] {
  return [...new Set(values.filter(Boolean))].slice(-max);
}

function actorForText(message: CastMessage, cast: LivingCastEntry[]): string {
  if (message.sender === "player") return "player";
  const speaker = message.speaker ? cast.find((entry) => entry.name === message.speaker) : undefined;
  return speaker?.resolvedCharacterId ?? speaker?.id ?? "narrator";
}

function deriveBody(text: string, previous: BodyState): BodyState {
  const next = { ...previous };
  const posture = text.match(/\b(?:is |was )?(standing|sitting|seated|kneeling|crouching|lying down|curled up)\b/i)?.[1];
  const injury = text.match(/\b((?:bleeding|bruised|injured|wounded|cut|sprained|broken)[^.!?]{0,60})/i)?.[1];
  const pain = text.match(/\b((?:pain|aching|hurts?|stinging|burning)[^.!?]{0,60})/i)?.[1];
  const clothing = text.match(/\b((?:coat|shirt|dress|jacket|trousers|pants|clothes?|sleeve)[^.!?]{0,80}(?:torn|wet|open|buttoned|unbuttoned|removed|on|off))\b/i)?.[1];
  if (posture) next.posture = posture.toLocaleLowerCase("en-US");
  if (injury) next.injury = injury.trim();
  if (pain) next.pain = pain.trim();
  if (clothing) next.clothing = clothing.trim();
  return next;
}

export function updateWorldSceneState(
  previous: WorldSceneState | undefined,
  messages: CastMessage[],
  cast: LivingCastEntry[],
  location?: string,
  now = Date.now(),
): WorldSceneState {
  const base = previous?.version === 2 ? previous : createWorldSceneState(location, now);
  const next: WorldSceneState = {
    ...base,
    location: location?.trim() || base.location,
    presentCharacterIds: cast.filter((entry) => entry.presence === "active" && entry.origin !== "player" && entry.resolutionStatus !== "unresolved").map((entry) => entry.resolvedCharacterId ?? entry.id),
    nearbyCharacterIds: cast.filter((entry) => entry.presence === "mentioned" && entry.resolutionStatus === "resolved").map((entry) => entry.resolvedCharacterId ?? entry.id),
    entrances: [...base.entrances], exits: [...base.exits], proximity: { ...base.proximity },
    importantObjects: [...base.importantObjects], heldObjects: { ...base.heldObjects }, body: { ...base.body },
    physicalContact: [...base.physicalContact], ongoingEvents: [...base.ongoingEvents], environment: [...base.environment], updatedAt: now,
  };

  for (const entry of cast) {
    const id = entry.resolvedCharacterId ?? entry.id;
    if (entry.presence === "active" && entry.activationReason && !next.entrances.some((event) => event.characterId === id)) {
      next.entrances.push({ characterId: id, reason: entry.activationReason, at: now });
    }
    if (entry.presence === "absent" && base.presentCharacterIds.includes(id) && !next.exits.some((event) => event.characterId === id)) {
      next.exits.push({ characterId: id, reason: "character left the scene", at: now });
    }
  }

  for (const message of messages.slice(-4)) {
    const text = message.text ?? "";
    const actor = actorForText(message, cast);
    next.body[actor] = deriveBody(text, next.body[actor] ?? {});
    if (/\b(?:near|beside|next to|close to)\b/i.test(text)) next.proximity[actor] = "nearby";
    if (/\b(?:steps? back|moves? away|keeps? (?:his|her|their) distance|give(?:s)? space)\b/i.test(text)) next.proximity[actor] = "distant";
    const held = text.match(/\b(?:holds?|holding|carries|carrying|grasps?|gripping) (?:a |an |the )?([a-z][a-z -]{1,35})/i)?.[1];
    if (held) next.heldObjects[actor] = unique([...(next.heldObjects[actor] ?? []), held.trim()], 6);
    const object = text.match(/\b(?:the |a |an )([a-z][a-z -]{1,30}) (?:lies|sits|rests|stands)\b/i)?.[1];
    if (object) next.importantObjects = unique([...next.importantObjects, object.trim()]);
    if (/\b(?:touch(?:es|ed|ing)?|hug(?:s|ged|ging)?|holds? (?:his|her|their|your) hand|grabs?|gripped)\b/i.test(text)) next.physicalContact = unique([...next.physicalContact, `${actor}: ${text.slice(0, 120)}`]);
    if (/\b(?:rain(?:ing)?|storm|snow(?:ing)?|windy|dark|smoke|fire|music|crowd|quiet)\b/i.test(text)) next.environment = unique([...next.environment, text.slice(0, 140)]);
    if (/\b(?:still|continues?|ongoing|keeps? (?:ringing|burning|running|falling))\b/i.test(text)) next.ongoingEvents = unique([...next.ongoingEvents, text.slice(0, 140)]);
  }
  next.entrances = next.entrances.slice(-MAX_HISTORY);
  next.exits = next.exits.slice(-MAX_HISTORY);
  return next;
}

export function renderWorldSceneState(state: WorldSceneState): string {
  const lines = ["<world-engine-state>", `Location: ${state.location}`, `Present character IDs: ${state.presentCharacterIds.join(", ") || "none"}`, `Nearby character IDs: ${state.nearbyCharacterIds.join(", ") || "none"}`];
  if (Object.keys(state.proximity).length) lines.push(`Proximity: ${Object.entries(state.proximity).map(([id, value]) => `${id}=${value}`).join("; ")}`);
  if (state.importantObjects.length) lines.push(`Important objects: ${state.importantObjects.join(", ")}`);
  if (Object.keys(state.heldObjects).length) lines.push(`Held objects: ${Object.entries(state.heldObjects).map(([id, values]) => `${id} holds ${values.join(", ")}`).join("; ")}`);
  const body = Object.entries(state.body).filter(([, value]) => Object.keys(value).length);
  if (body.length) lines.push("Body state:", ...body.map(([id, value]) => `- ${id}: ${Object.entries(value).map(([key, fact]) => `${key}=${fact}`).join("; ")}`));
  if (state.physicalContact.length) lines.push(`Physical contact: ${state.physicalContact.join("; ")}`);
  if (state.ongoingEvents.length) lines.push(`Ongoing events: ${state.ongoingEvents.join("; ")}`);
  if (state.environment.length) lines.push(`Environment: ${state.environment.join("; ")}`);
  lines.push("These facts are authoritative. Do not reset location, presence, body, clothing, held objects, contact, injury, pain, or ongoing events unless the prose depicts a causal change.", "</world-engine-state>");
  return lines.join("\n");
}
