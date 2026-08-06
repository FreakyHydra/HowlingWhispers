import type { ServerResponse } from "node:http";
import { getPool } from "./db.ts";
import { error, json, newId } from "./http.ts";

const NAME_MAX = 120;
const PROFILE_MAX = 20000;
const ROLE_MAX = 1200;
const OPENING_MAX = 2000;
const CREDIT_MAX = 300;
const LICENSE_MAX = 80;
const TAGS_MAX = 20;
const TAG_LEN_MAX = 40;

const AGE_CATEGORIES = new Set(["minor", "adult", "unspecified"]);
const CONTENT_RATINGS = new Set(["general", "mature"]);
const TAG_RE = /^[a-zA-Z0-9 _.-]+$/;
const URL_RE = /^https?:\/\//i;
const MEDIA_RE = /^\/api\/archive\/media\/[a-zA-Z0-9-]+\.(png|jpe?g|webp|gif)$/;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().toLowerCase();
    if (tag.length === 0 || tag.length > TAG_LEN_MAX) continue;
    if (!TAG_RE.test(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags.slice(0, TAGS_MAX);
}

type Validated = {
  name: string;
  role: string;
  profile: string;
  opening_message: string;
  avatar_url: string | null;
  scene_image_url: string | null;
  tags: string[];
  age_category: string;
  content_rating: string;
  creator_credit: string | null;
  license: string | null;
  source_character_id: string | null;
};

export function validatePublication(body: unknown): { ok: true; value: Validated } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const name = cleanText(b.name, NAME_MAX);
  if (name.length === 0) return { ok: false, error: "A name is required." };

  const opening_message = cleanText(b.openingMessage ?? b.opening_message, OPENING_MAX);
  if (opening_message.length === 0) {
    return { ok: false, error: "An opening message is required." };
  }

  const profile = cleanText(b.profile, PROFILE_MAX);
  const role = cleanText(b.role, ROLE_MAX);
  const creator_credit = cleanText(b.creator_credit, CREDIT_MAX);
  const license = cleanText(b.license, LICENSE_MAX);

  const avatar_url = cleanText(b.avatar_url, 500) || null;
  const scene_image_url = cleanText(b.scene_image_url, 500) || null;
  if (avatar_url && !(URL_RE.test(avatar_url) || MEDIA_RE.test(avatar_url))) {
    return { ok: false, error: "avatar_url must be a valid URL or archive media path." };
  }
  if (scene_image_url && !(URL_RE.test(scene_image_url) || MEDIA_RE.test(scene_image_url))) {
    return { ok: false, error: "scene_image_url must be a valid URL or archive media path." };
  }

  const age_category = cleanText(b.age_category, 20) || "unspecified";
  if (!AGE_CATEGORIES.has(age_category)) {
    return { ok: false, error: "age_category must be minor, adult or unspecified." };
  }
  const content_rating = cleanText(b.content_rating, 20) || "general";
  if (!CONTENT_RATINGS.has(content_rating)) {
    return { ok: false, error: "content_rating must be general or mature." };
  }
  if (age_category === "adult" && content_rating !== "mature") {
    return { ok: false, error: "Adult-age characters must be rated mature." };
  }
  if (age_category === "minor" && content_rating === "mature") {
    return { ok: false, error: "Minor-age characters cannot be rated mature." };
  }

  return {
    ok: true,
    value: {
      name,
      role,
      profile,
      opening_message,
      avatar_url,
      scene_image_url,
      tags: cleanTags(b.tags),
      age_category,
      content_rating,
      creator_credit: creator_credit || null,
      license: license || null,
      source_character_id: cleanText(b.source_character_id, 120) || null,
    },
  };
}

type DbRow = Record<string, unknown>;

function serialize(row: DbRow): DbRow {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    profile: row.profile,
    opening_message: row.opening_message,
    avatar_url: row.avatar_url,
    scene_image_url: row.scene_image_url,
    tags: row.tags,
    age_category: row.age_category,
    content_rating: row.content_rating,
    creator_credit: row.creator_credit,
    license: row.license,
    version: row.version,
    visibility: row.visibility,
    moderation_status: row.moderation_status,
    created_at: row.created_at,
    source_character_id: row.source_character_id,
    owner: row.owner ?? null,
  };
}

async function rowWithOwner(id: string): Promise<DbRow | null> {
  const q = getPool();
  const result = await q.query(`SELECT * FROM publications WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const owner = await q.query("SELECT username FROM users WHERE id = $1", [row.owner_id]);
  return { ...row, owner: owner.rows[0]?.username ?? "unknown" };
}

// POST /api/archive/publish — create a snapshot. Auth required (enforced in index).
export async function publishHandler(
  res: ServerResponse,
  user: { id: string },
  body: unknown,
) {
  const result = validatePublication(body);
  if (!result.ok) return error(res, 400, result.error);
  const v = result.value;
  const id = newId("pub");
  const q = getPool();
  await q.query(
    `INSERT INTO publications
       (id, owner_id, source_character_id, name, role, profile, opening_message,
        avatar_url, scene_image_url, tags, age_category, content_rating,
        creator_credit, license, version, visibility, moderation_status)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, 'unlisted', 'pending')`,
    [
      id,
      user.id,
      v.source_character_id,
      v.name,
      v.role,
      v.profile,
      v.opening_message,
      v.avatar_url,
      v.scene_image_url,
      v.tags,
      v.age_category,
      v.content_rating,
      v.creator_credit,
      v.license,
    ],
  );
  const row = await rowWithOwner(id);
  return json(res, 201, { publication: row ? serialize(row) : null });
}

// GET /api/archive/publish — list mine. Auth required.
export async function listMineHandler(res: ServerResponse, user: { id: string }) {
  const q = getPool();
  const result = await q.query(
    `SELECT * FROM publications WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [user.id],
  );
  const items: DbRow[] = [];
  for (const row of result.rows) {
    const owner = await q.query("SELECT username FROM users WHERE id = $1", [row.owner_id]);
    items.push({ ...row, owner: owner.rows[0]?.username ?? "unknown" });
  }
  return json(res, 200, { publications: items.map(serialize) });
}

// GET /api/archive/publish/{id} — read one. Public share link; rejected is only readable by owner/moderator.
export async function getPublicationHandler(
  res: ServerResponse,
  id: string,
  user: { id: string; role: string } | null,
) {
  const row = await rowWithOwner(id);
  if (!row) return error(res, 404, "Publication not found.");
  const isOwner = !!user && row.owner_id === user.id;
  const isMod = user?.role === "moderator";
  if (row.moderation_status === "rejected" && !isOwner && !isMod) {
    return error(res, 410, "This publication has been removed.");
  }
  return json(res, 200, { publication: serialize(row) });
}

// POST /api/archive/publish/{id}/visibility — owner only.
export async function setVisibilityHandler(
  res: ServerResponse,
  id: string,
  user: { id: string },
  body: unknown,
) {
  const target = cleanText((body as Record<string, unknown>)?.visibility, 20);
  if (target !== "unlisted" && target !== "public") {
    return error(res, 400, "visibility must be unlisted or public.");
  }
  const q = getPool();
  const row = await q.query(`SELECT owner_id FROM publications WHERE id = $1`, [id]);
  if (row.rows.length === 0) return error(res, 404, "Publication not found.");
  if (row.rows[0].owner_id !== user.id) {
    return error(res, 403, "You can only manage your own publication.");
  }
  await q.query(`UPDATE publications SET visibility = $1, updated_at = now() WHERE id = $2`, [target, id]);
  return json(res, 200, { visibility: target });
}

// DELETE /api/archive/publish/{id} — owner only.
export async function deletePublicationHandler(
  res: ServerResponse,
  id: string,
  user: { id: string },
) {
  const q = getPool();
  const row = await q.query(`SELECT owner_id FROM publications WHERE id = $1`, [id]);
  if (row.rows.length === 0) return error(res, 404, "Publication not found.");
  if (row.rows[0].owner_id !== user.id) {
    return error(res, 403, "You can only delete your own publication.");
  }
  await q.query(`DELETE FROM publications WHERE id = $1`, [id]);
  return json(res, 200, { ok: true });
}

// PUT /api/archive/publish/{id} — owner only; creates a NEW version row, old row stays intact.
export async function updateHandler(
  res: ServerResponse,
  id: string,
  user: { id: string },
  body: unknown,
) {
  const result = validatePublication(body);
  if (!result.ok) return error(res, 400, result.error);
  const v = result.value;
  const q = getPool();
  const existing = await q.query(`SELECT owner_id, version, source_character_id, visibility FROM publications WHERE id = $1`, [id]);
  if (existing.rows.length === 0) return error(res, 404, "Publication not found.");
  const old = existing.rows[0];
  if (old.owner_id !== user.id) {
    return error(res, 403, "You can only update your own publication.");
  }
  const newIdVal = newId("pub");
  await q.query(
    `INSERT INTO publications
       (id, owner_id, name, role, opening_message, profile, avatar_url, scene_image_url,
        tags, age_category, content_rating, creator_credit, license, source_character_id,
        version, visibility, moderation_status)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending')`,
    [
      newIdVal,
      user.id,
      v.name,
      v.role,
      v.opening_message,
      v.profile,
      v.avatar_url,
      v.scene_image_url,
      v.tags,
      v.age_category,
      v.content_rating,
      v.creator_credit,
      v.license,
      v.source_character_id ?? old.source_character_id,
      (old.version ?? 0) + 1,
      old.visibility,
    ],
  );
  const row = await rowWithOwner(newIdVal);
  return json(res, 201, { publication: row ? serialize(row) : null });
}