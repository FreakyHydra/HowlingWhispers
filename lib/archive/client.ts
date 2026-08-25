const BASE = "/api/archive";

export type ArchiveUser = {
  id: string;
  username: string;
  role: string;
};

export type ArchiveDiscordIdentity = {
  discord_user_id: string;
  username: string;
  avatar?: string | null;
  humanVerified: boolean;
  canUseArchive: boolean;
};

export type ArchivePublication = {
  id: string;
  name: string;
  role: string;
  profile: string;
  opening_message: string;
  avatar_url: string | null;
  scene_image_url: string | null;
  tags: string[];
  age_category: "minor" | "adult" | "unspecified";
  content_rating: "general" | "mature";
  creator_credit: string | null;
  license: string | null;
  version: number;
  visibility: "unlisted" | "public";
  moderation_status: "pending" | "published" | "rejected";
  created_at: string;
  source_character_id: string | null;
  owner?: string | null;
};

export type SearchResult = {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  scene_image_url: string | null;
  tags: string[];
  age_category: ArchivePublication["age_category"];
  content_rating: ArchivePublication["content_rating"];
  created_at: string;
  owner?: string | null;
};

export type ServerBackupSummary = {
  id: string;
  format: string;
  version: number;
  device: string;
  source: string;
  size_bytes: number;
  created_at: string;
};

export type ServerBackupDetail = ServerBackupSummary & {
  payload: unknown;
};

export type PublishInput = {
  name: string;
  role?: string;
  profile?: string;
  openingMessage: string;
  avatar_url?: string | null;
  scene_image_url?: string | null;
  tags?: string[];
  age_category?: ArchivePublication["age_category"];
  content_rating?: ArchivePublication["content_rating"];
  creator_credit?: string | null;
  license?: string | null;
  source_character_id?: string | null;
};

class ArchiveApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON */
    }
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status}).`;
    throw new ArchiveApiError(res.status, message);
  }
  return body as T;
}

export const archive = {
  me: () =>
    request<{
      user: ArchiveUser | null;
      discordUser: { id: string; username: string; avatar?: string | null } | null;
      humanVerified: boolean;
    }>("/auth/me"),
  discordIdentity: async () => {
    const response = await fetch("/api/curator/auth/identity", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new ArchiveApiError(response.status, "Discord identity check failed.");
    return response.json() as Promise<{ user: ArchiveDiscordIdentity | null }>;
  },
  discordLoginUrl: (returnTo: string) =>
    `/api/curator/auth/login?return_to=${encodeURIComponent(returnTo)}`,
  discordLogout: async () => {
    const response = await fetch("/api/curator/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new ArchiveApiError(response.status, "Discord sign out failed.");
    return response.json() as Promise<{ ok: boolean }>;
  },

  backups: {
    list: () => request<{ backups: ServerBackupSummary[] }>("/backup"),
    create: (input: { payload: unknown; device?: string; source?: string }) =>
      request<{ backup: ServerBackupSummary }>("/backup", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    get: (id: string) => request<{ backup: ServerBackupDetail }>(`/backup/${id}`),
    remove: (id: string) => request<{ ok: boolean }>(`/backup/${id}`, { method: "DELETE" }),
  },

  publish: (input: PublishInput) =>
    request<{ publication: ArchivePublication }>("/publish", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  mine: () => request<{ publications: ArchivePublication[] }>("/publish"),
  get: (id: string) => request<{ publication: ArchivePublication }>(`/publish/${id}`),
  setVisibility: (id: string, visibility: "unlisted" | "public") =>
    request<{ visibility: string }>(`/publish/${id}/visibility`, {
      method: "POST",
      body: JSON.stringify({ visibility }),
    }),
  update: (id: string, input: PublishInput) =>
    request<{ publication: ArchivePublication }>(`/publish/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<{ ok: boolean }>(`/publish/${id}`, { method: "DELETE" }),

  search: (params: { q?: string; tags?: string[]; age?: string; rating?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.tags && params.tags.length) sp.set("tags", params.tags.join(","));
    if (params.age) sp.set("age", params.age);
    if (params.rating) sp.set("rating", params.rating);
    if (params.page) sp.set("page", String(params.page));
    return request<{ publications: SearchResult[]; page: number; totalPages: number; total: number }>(
      `/search?${sp.toString()}`,
    );
  },

  report: (publicationId: string, category: string, details: string) =>
    request<{ report: { id: string; category: string } }>("/report", {
      method: "POST",
      body: JSON.stringify({ publicationId, category, details }),
    }),

  moderation: () =>
    request<{
      pending: { id: string; name: string; moderation_status: string; created_at: string }[];
      reports: { id: string; publication_id: string; category: string; details: string | null; status: string; created_at: string }[];
    }>("/moderation"),
  decide: (id: string, action: "approve" | "reject") =>
    request<{ moderation_status: string }>(`/moderation/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};

/** Rewrite an archive media URL/absolute to a same-origin proxied path. */
export function archiveMediaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/\/api\/archive\/media\/[a-zA-Z0-9.-]+$/);
  return match ? match[0] : raw;
}

export { ArchiveApiError };