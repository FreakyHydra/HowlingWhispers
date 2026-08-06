import { randomBytes, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const COOKIE_NAME = "hw_archive_session";

export function json(res: ServerResponse, status: number, body: unknown): true {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
  return true;
}

export function error(res: ServerResponse, status: number, message: string): true {
  json(res, status, { error: message });
  return true;
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > 256 * 1024) {
      throw new HttpError(413, "Request body too large.");
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.");
  }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

export function setSessionCookie(res: ServerResponse, token: string, maxAgeSeconds: number) {
  const cookie =
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: ServerResponse) {
  const cookie =
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  res.setHeader("Set-Cookie", cookie);
}

export function newTokenBytes(): string {
  return randomBytes(32).toString("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}