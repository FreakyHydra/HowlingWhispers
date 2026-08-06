import type { IncomingMessage, ServerResponse } from "node:http";
import { getPool } from "./db.ts";
import { error, json, newId } from "./http.ts";

const PAGE_SIZE = 24;
const REPORT_CATEGORIES = new Set([
  "Copyright",
  "Impersonation",
  "Inappropriate minor content",
  "Harassment",
  "Spam",
  "Incorrect content rating",
  "Other",
]);

// GET /api/archive/search?q=&tags=&age=&rating=&page=
// Only moderation_status='published' AND visibility='public' rows are listed.
export async function searchHandler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const tags = (url.searchParams.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const age = url.searchParams.get("age") ?? "";
  const rating = url.searchParams.get("rating") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const conditions: string[] = [
    "moderation_status = 'published'",
    "visibility = 'public'",
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (q) {
    conditions.push(`(lower(name) LIKE $${paramIdx++} OR lower(role) LIKE $${paramIdx++} OR $${paramIdx++} = ANY(tags))`);
    params.push(`%${q}%`, `%${q}%`, q);
  }
  if (tags.length > 0) {
    conditions.push(`tags @> $${paramIdx++}::text[]`);
    params.push(tags);
  }
  if (age === "minor" || age === "adult" || age === "unspecified") {
    conditions.push(`age_category = $${paramIdx++}`);
    params.push(age);
  }
  if (rating === "general" || rating === "mature") {
    conditions.push(`content_rating = $${paramIdx++}`);
    params.push(rating);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const qq = getPool();
  const countResult = await qq.query(`SELECT count(*)::int AS total FROM publications ${whereClause}`, params);
  const total = countResult.rows[0]?.total ?? 0;
  const offset = (page - 1) * PAGE_SIZE;

  // Enforce "published" timestamp ordering so pages are stable.
  const rowsResult = await qq.query(
    `SELECT * FROM publications ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params,
  );
  const items = [];
  for (const row of rowsResult.rows) {
    const owner = await qq.query("SELECT username FROM users WHERE id = $1", [row.owner_id]);
    items.push({ ...row, owner: owner.rows[0]?.username ?? "unknown" });
  }
  return json(res, 200, {
    publications: items.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      avatar_url: r.avatar_url,
      scene_image_url: r.scene_image_url,
      tags: r.tags,
      age_category: r.age_category,
      content_rating: r.content_rating,
      created_at: r.created_at,
      owner: r.owner,
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  });
}

// POST /api/archive/report — auth required. Enforced in index.
export async function reportHandler(
  res: ServerResponse,
  user: { id: string },
  body: unknown,
) {
  const b = (body ?? {}) as Record<string, unknown>;
  const publicationId = typeof b.publicationId === "string" ? b.publicationId : "";
  const category = typeof b.category === "string" ? b.category : "";
  const details = typeof b.details === "string" ? b.details.slice(0, 2000) : "";
  if (!publicationId) return error(res, 400, "A publicationId is required.");
  if (!REPORT_CATEGORIES.has(category)) {
    return error(res, 400, "Please choose a valid report category.");
  }
  const q = getPool();
  const exists = await q.query("SELECT 1 FROM publications WHERE id = $1", [publicationId]);
  if (exists.rows.length === 0) return error(res, 404, "Publication not found.");

  const id = newId("rep");
  await q.query(
    "INSERT INTO reports (id, publication_id, reporter_id, category, details) VALUES ($1, $2, $3, $4, $5)",
    [id, publicationId, user.id, category, details || null],
  );
  return json(res, 201, { report: { id, category } });
}

// GET /api/archive/moderation?scope=pending — moderator only.
export async function moderationQueueHandler(res: ServerResponse, user: { id: string; role: string }) {
  if (user.role !== "moderator") return error(res, 403, "Moderator access required.");
  const q = getPool();
  const pendingPubs = await q.query(
    `SELECT * FROM publications WHERE moderation_status = 'pending' ORDER BY created_at ASC LIMIT 200`,
  );
  const openReports = await q.query(`SELECT * FROM reports WHERE status = 'open' ORDER BY created_at ASC LIMIT 200`);
  return json(res, 200, {
    pending: pendingPubs.rows.map((r) => ({ id: r.id, name: r.name, moderation_status: r.moderation_status, created_at: r.created_at })),
    reports: openReports.rows,
  });
}

// POST /api/archive/moderation/{id}/decide { action: 'approve'|'reject', reason? } — moderator only.
export async function decideHandler(
  res: ServerResponse,
  id: string,
  user: { id: string; role: string },
  body: unknown,
) {
  if (user.role !== "moderator") return error(res, 403, "Moderator access required.");
  const b = (body ?? {}) as Record<string, unknown>;
  const action = b.action;
  const q = getPool();
  const row = await q.query(`SELECT moderation_status FROM publications WHERE id = $1`, [id]);
  if (row.rows.length === 0) return error(res, 404, "Publication not found.");
  if (action === "approve") {
    await q.query(`UPDATE publications SET moderation_status = 'published', updated_at = now() WHERE id = $1`, [id]);
    return json(res, 200, { moderation_status: "published" });
  }
  if (action === "reject") {
    await q.query(`UPDATE publications SET moderation_status = 'rejected', updated_at = now() WHERE id = $1`, [id]);
    return json(res, 200, { moderation_status: "rejected" });
  }
  return error(res, 400, "action must be approve or reject.");
}