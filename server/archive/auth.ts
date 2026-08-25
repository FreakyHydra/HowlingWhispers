import type { IncomingMessage, ServerResponse } from "node:http";
import { getPool, loadConfig } from "./db.ts";
import { error, json } from "./http.ts";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

type DiscordIdentity = {
  discord_user_id: string;
  username: string;
  avatar?: string | null;
  isGuildMember: boolean;
  humanVerified: boolean;
  canUseArchive: boolean;
  archiveRole?: "user" | "moderator";
};

function codaOrigin(): string {
  const config = loadConfig();
  const configured = process.env.CODA_ADMIN_ORIGIN || config.CODA_ADMIN_ORIGIN;
  return configured && /^https?:\/\//.test(configured)
    ? configured.replace(/\/$/, "")
    : "http://127.0.0.1:3000";
}

async function discordIdentity(req: IncomingMessage): Promise<DiscordIdentity | null> {
  try {
    const cookie = req.headers.cookie;
    const response = await fetch(`${codaOrigin()}/api/coda/auth/identity`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { user?: DiscordIdentity | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

function publicDiscordUser(identity: DiscordIdentity) {
  return {
    id: identity.discord_user_id,
    username: identity.username,
    avatar: identity.avatar ?? null,
  };
}

async function archiveUserFor(identity: DiscordIdentity): Promise<SessionUser> {
  const pool = getPool();
  const id = `discord:${identity.discord_user_id}`;
  const desiredRole = identity.archiveRole === "moderator" ? "moderator" : "user";
  const existing = await pool.query(
    "SELECT id, username, role FROM users WHERE id = $1",
    [id],
  );

  if (existing.rows.length > 0) {
    try {
      await pool.query(
        "UPDATE users SET username = $1, role = $2 WHERE id = $3",
        [identity.username, desiredRole, id],
      );
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err;
      await pool.query("UPDATE users SET role = $1 WHERE id = $2", [desiredRole, id]);
    }
    const refreshed = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1",
      [id],
    );
    return refreshed.rows[0] as SessionUser;
  }

  const base = identity.username.trim() || `discord-${identity.discord_user_id}`;
  const candidates = [
    base,
    `${base}-${identity.discord_user_id.slice(-4)}`,
    `discord-${identity.discord_user_id}`,
  ];

  for (const username of candidates) {
    try {
      await pool.query(
        "INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)",
        [id, username, "!discord-oauth", desiredRole],
      );
      return { id, username, role: desiredRole };
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err;
      const raced = await pool.query(
        "SELECT id, username, role FROM users WHERE id = $1",
        [id],
      );
      if (raced.rows.length > 0) return raced.rows[0] as SessionUser;
    }
  }

  throw new Error("Could not reserve an Archive display name.");
}

export async function currentUser(req: IncomingMessage): Promise<SessionUser | null> {
  const identity = await discordIdentity(req);
  if (!identity?.isGuildMember || !identity.humanVerified || !identity.canUseArchive) {
    return null;
  }
  return archiveUserFor(identity);
}

export async function requireUser(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SessionUser | null> {
  const user = await currentUser(req);
  if (!user) {
    error(res, 401, "Discord login and Human Verified approval are required.");
    return null;
  }
  return user;
}

export async function registerHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _body: unknown,
) {
  return error(res, 410, "Archive passwords were replaced by Discord login.");
}

export async function loginHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _body: unknown,
) {
  return error(res, 410, "Archive passwords were replaced by Discord login.");
}

export async function logoutHandler(_req: IncomingMessage, res: ServerResponse) {
  return json(res, 200, { ok: true });
}

export async function meHandler(req: IncomingMessage, res: ServerResponse) {
  const identity = await discordIdentity(req);
  if (!identity) {
    return json(res, 200, {
      user: null,
      discordUser: null,
      humanVerified: false,
    });
  }

  if (!identity.isGuildMember || !identity.humanVerified || !identity.canUseArchive) {
    return json(res, 200, {
      user: null,
      discordUser: publicDiscordUser(identity),
      humanVerified: false,
    });
  }

  const user = await archiveUserFor(identity);
  return json(res, 200, {
    user,
    discordUser: publicDiscordUser(identity),
    humanVerified: true,
  });
}
