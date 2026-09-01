export type CharacterActivationSource =
  | "primary-character"
  | "explicit-invitation"
  | "relationship-linked-known-character"
  | "known-character-entry"
  | "unresolved-character";

export type CharacterResolution = {
  status: "resolved" | "unresolved" | "ambient";
  characterId?: string;
  reason?: string;
  source?: CharacterActivationSource;
  matchedBy?: "id" | "full-name" | "unique-first-name";
};

export type BodyState = {
  posture?: string;
  injury?: string;
  pain?: string;
  clothing?: string;
};

export type WorldSceneState = {
  version: 2;
  location: string;
  presentCharacterIds: string[];
  nearbyCharacterIds: string[];
  entrances: Array<{ characterId: string; reason: string; at: number }>;
  exits: Array<{ characterId: string; reason: string; at: number }>;
  proximity: Record<string, string>;
  importantObjects: string[];
  heldObjects: Record<string, string[]>;
  body: Record<string, BodyState>;
  physicalContact: string[];
  ongoingEvents: string[];
  environment: string[];
  updatedAt: number;
};

export type ActivationDiagnostic = {
  characterId?: string;
  name: string;
  reason: string;
  source: CharacterActivationSource;
  resolved: boolean;
};
