import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionUser } from "./auth.ts";
import {
  currentUser,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
} from "./auth.ts";
import {
  createBackup,
  deleteBackup,
  getBackup,
  listBackups,
  readBackupJson,
} from "./backups.ts";
import { loadConfig, pingDb } from "./db.ts";
import { error, HttpError, json, readJson } from "./http.ts";

type AuthenticatedUser = SessionUser;
import { serveMedia, storeUploadedImage } from "./media.ts";
import { decideHandler, moderationQueueHandler, reportHandler, searchHandler } from "./moderation.ts";
import {
  deletePublicationHandler,
  getPublicationHandler,
  listMineHandler,
  publishHandler,
  setVisibilityHandler,
  updateHandler,
} from "./publications.ts";
import { clientIp, rateLimit } from "./ratelimit.ts";

async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;
  if (!pathname.startsWith("/api/archive")) return false;

  // Health check (no rate limit, no auth).
  if (req.method === "GET" && pathname === "/api/archive/health") {
    return json(res, 200, { ok: await pingDb() });
  }

  const ip = clientIp(req);
  const needRate = (key: string) => {
    if (!rateLimit(key, { windowMs: 60_000, max: 60 })) {
      error(res, 429, "Too many requests. Please wait a moment.");
      return false;
    }
    return true;
  };

  try {
    // -- Auth -------------------------------------------------------------
    if (pathname === "/api/archive/auth/register" && req.method === "POST") {
      if (!needRate(`auth:${ip}`)) return true;
      const body = await readJson(req);
      await registerHandler(req, res, body);
      return true;
    }
    if (pathname === "/api/archive/auth/login" && req.method === "POST") {
      if (!needRate(`auth:${ip}`)) return true;
      const body = await readJson(req);
      await loginHandler(req, res, body);
      return true;
    }
    if (pathname === "/api/archive/auth/logout" && req.method === "POST") {
      await logoutHandler(req, res);
      return true;
    }
    if (pathname === "/api/archive/auth/me" && req.method === "GET") {
      await meHandler(req, res);
      return true;
    }

    const user = await currentUser(req);

    // ---------- Private-data server backups ----------------------
    if (pathname === "/api/archive/backup" && req.method === "POST") {
      if (!needRate(`backup:${ip}`)) return true;
      if (!(await guard(req, res, user))) return true;
      const body = await readBackupJson(req);
      const created = await createBackup(user!, body);
      if (!created.ok) return error(res, created.status ?? 400, created.error);
      return json(res, 201, { backup: created.backup });
    }
    if (pathname === "/api/archive/backup" && req.method === "GET") {
      if (!(await guard(req, res, user))) return true;
      const backups = await listBackups(user!);
      return json(res, 200, { backups });
    }
    const backupItem = pathname.match(/^\/api\/archive\/backup\/([^/]+)$/);
    if (backupItem) {
      if (!(await guard(req, res, user))) return true;
      const id = backupItem[1];
      if (req.method === "GET") {
        const detail = await getBackup(user!, id);
        if (!detail) return error(res, 404, "Backup not found.");
        return json(res, 200, { backup: detail });
      }
      if (req.method === "DELETE") {
        const removed = await deleteBackup(user!, id);
        if (!removed) return error(res, 404, "Backup not found.");
        return json(res, 200, { ok: true });
      }
    }

    // --------- Media uploads ---------------------------------------
    if (pathname === "/api/archive/media" && req.method === "POST") {
      if (!needRate(`media:${ip}`)) return true;
      if (!(await guard(req, res, user))) return true;
      const body = await readJson(req);
      const stored = await storeUploadedImage(body, req);
      if (!stored.ok) return error(res, 400, stored.error);
      return json(res, 201, { url: stored.url });
    }
    // Media serving: /api/archive/media/<file>
    const mediaMatch = pathname.match(/^\/api\/archive\/media\/([a-zA-Z0-9.-]+)$/);
    if (req.method === "GET" && mediaMatch) {
      serveMedia(req, res, mediaMatch[1]);
      return true;
    }

    // ---------- Publications ---------------------------------------
    if (pathname === "/api/archive/publish" && req.method === "POST") {
      if (!needRate(`publish:${ip}`)) return true;
      if (!(await guard(req, res, user))) return true;
      const body = await readJson(req);
      await publishHandler(res, user!, body);
      return true;
    }

    if (pathname === "/api/archive/publish" && req.method === "GET") {
      if (!(await guard(req, res, user))) return true;
      await listMineHandler(res, user!);
      return true;
    }

    const pubMatch = pathname.match(/^\/api\/archive\/publish\/([^/]+)(\/.+)?$/);
    if (pubMatch) {
      const id = pubMatch[1];
      const sub = pubMatch[2] ?? "";
      if (req.method === "GET" && sub === "") {
        await getPublicationHandler(res, id, user);
        return true;
      }
      if (req.method === "GET" && sub === "/visibility") {
        await getPublicationHandler(res, id, user);
        return true;
      }
      if (req.method === "POST" && sub === "/visibility") {
        if (!(await guard(req, res, user))) return true;
        const body = await readJson(req);
        await setVisibilityHandler(res, id, user!, body);
        return true;
      }
      if (req.method === "DELETE" && sub === "") {
        if (!(await guard(req, res, user))) return true;
        await deletePublicationHandler(res, id, user!);
        return true;
      }
      if (req.method === "PUT" && sub === "") {
        if (!needRate(`publish:${ip}`)) return true;
        if (!(await guard(req, res, user))) return true;
        const body = await readJson(req);
        await updateHandler(res, id, user!, body);
        return true;
      }
    }

    // ---------- Search ---------------------------------------------
    if (pathname === "/api/archive/search" && req.method === "GET") {
      if (!needRate(`search:${ip}`)) return true;
      await searchHandler(req, res);
      return true;
    }

    // ---------- Reports --------------------------------------------
    if (pathname === "/api/archive/report" && req.method === "POST") {
      if (!needRate(`report:${ip}`)) return true;
      if (!(await guard(req, res, user))) return true;
      const body = await readJson(req);
      await reportHandler(res, user!, body);
      return true;
    }

    // ---------- Moderation -----------------------------------------
    if (pathname === "/api/archive/moderation" && req.method === "GET") {
      if (!(await guard(req, res, user))) return true;
      await moderationQueueHandler(res, user!);
      return true;
    }
    const modMatch = pathname.match(/^\/api\/archive\/moderation\/([^/]+)\/decide$/);
    if (req.method === "POST" && modMatch) {
      if (!(await guard(req, res, user))) return true;
      const body = await readJson(req);
      await decideHandler(res, modMatch[1], user!, body);
      return true;
    }

    error(res, 404, "Not found.");
    return true;
  } catch (err) {
    if (err instanceof HttpError) return error(res, err.status, err.message);
    error(res, 500, "Something went wrong.");
    console.error("[archive]", err);
    return true;
  }
}

async function guard(
  req: IncomingMessage,
  res: ServerResponse,
  user: AuthenticatedUser | null,
): Promise<boolean> {
  if (!user) {
    error(res, 401, "Discord login and Human Verified approval are required.");
    return false;
  }
  return true;
}

export function archiveHandler(req: IncomingMessage, res: ServerResponse) {
  void handle(req, res)
    .then((handled) => {
      if (!handled) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found." }));
      }
    })
    .catch((e) => {
      console.error("[archive] handler error", req.method, req.url, e);
      try {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal error." }));
      } catch {
        /* already sent */
      }
    });
}

export async function initArchive(): Promise<void> {
  const { bootstrapSchema } = await import("./db.ts");
  await bootstrapSchema();
}

export function archiveServerConfigPort(): number {
  const config = loadConfig();
  const port = parseInt(config.ARCHIVE_PORT ?? "2087", 10);
  return Number.isFinite(port) ? port : 2087;
}