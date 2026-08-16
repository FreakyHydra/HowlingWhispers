export type ContextSource = "manual" | "auto-generated";

export type MemoryEntry = {
  id: string;
  text: string;
  enabled: boolean;
  source: ContextSource;
  createdAt: number;
  updatedAt: number;
};

export type AuthorNoteEntry = {
  id: string;
  text: string;
  enabled: boolean;
  preset?: string;
  createdAt: number;
  updatedAt: number;
};

export type LorebookParsedEntry = {
  id?: string | number;
  displayName?: string;
  text: string;
  keys: string[];
  enabled: boolean;
  forceActivation?: boolean;
  searchRange?: number;
  contextConfig?: Record<string, unknown>;
  loreBiasGroups?: unknown[];
  category?: string | null;
  comment?: string | null;
  extensions?: Record<string, unknown>;
};

export type LorebookRecord = {
  id: string;
  name: string;
  enabled: boolean;
  raw: unknown;
  parsed?: {
    lorebookVersion: number;
    entries: LorebookParsedEntry[];
    categories?: Array<{ id: string; name: string; enabled: boolean }>;
  };
  createdAt: number;
  updatedAt: number;
};

export type ContextLibrary = {
  memories: MemoryEntry[];
  authorNotes: AuthorNoteEntry[];
  lorebooks: LorebookRecord[];
};

export type ContextInput = {
  memories: MemoryEntry[];
  authorNotes: AuthorNoteEntry[];
  lorebooks: LorebookRecord[];
};
