import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getPool } from "./db.ts";
import {
  clearSessionCookie,
  COOKIE_NAME,
  error,
  json,
  newId,
  newTokenBytes,
  parseCookies,
  setSessionCookie,
} from "./http.ts";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function mintSession(userId: string): Promise<string> {
  const token = newTokenBytes();
  const tokenHash = hashToken(token);
  await getPool().query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
    [tokenHash, userId],
  );
  return token;
}

export async function currentUser(req: IncomingMessage): Promise<SessionUser | null> {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const res = await getPool().query(
    `SELECT u.id, u.username, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return { id: row.id, username: row.username, role: row.role };
}

export async function requireUser(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SessionUser | null> {
  const user = await currentUser(req);
  if (!user) {
    error(res, 401, "You must be signed in to do that.");
    return null;
  }
  return user;
}

export async function registerHandler(req: IncomingMessage, res: ServerResponse, body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const username = typeof b.username === "string" ? b.username.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!USERNAME_RE.test(username)) {
    return error(res, 400, "Username must be 3-32 characters: letters, numbers, _ . -");
  }
  if (password.length < 8 || password.length > 200) {
    return error(res, 400, "Password must be between 8 and 200 characters.");
  }

  const pool = getPool();
  const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
  if (existing.rows.length > 0) {
    return error(res, 409, "That username is already taken.");
  }

  const id = newId("u");
  await pool.query(
    "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)",
    [id, username, hashPassword(password)],
  );
  const token = await mintSession(id);
  setSessionCookie(res, token, SESSION_TTL_MS / 1000);
  return json(res, 201, { user: { id, username, role: "user" } });
}

export async function loginHandler(req: IncomingMessage, res: ServerResponse, body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const username = typeof b.username === "string" ? b.username.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";

  const pool = getPool();
  const found = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  if (found.rows.length === 0 || !found.rows[0].password_hash) {
    return error(res, 401, "Invalid username or password.");
  }
  const row = found.rows[0];
  if (!verifyPassword(password, row.password_hash)) {
    return error(res, 401, "Invalid username or password.");
  }
  const token = await mintSession(row.id);
  setSessionCookie(res, token, SESSION_TTL_MS / 1000);
  return json(res, 200, { user: { id: row.id, username: row.username, role: row.role } });
}

export async function logoutHandler(req: IncomingMessage, res: ServerResponse) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) {
    try {
      await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    } catch {
      /* ignore */
    }
  }
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
}

export async function meHandler(req: IncomingMessage, res: ServerResponse) {
  const user = await currentUser(req);
  return json(res, 200, { user });
}