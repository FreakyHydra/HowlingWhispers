// Server-side private-data backups for The Whispering Archive.
//
// Every backup is tied to the authenticated user's account (user_id) and every
// read/write is filtered through that account id. Backups are never served from
// predictable URLs and are always encrypted at rest when a key is available
// (AES-256-GCM). Retention is configurable on the server so the newest backup
// plus several older snapshots are kept, never an unlimited history.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getPool, loadConfig } from "./db.ts";
import { HttpError, json, newId } from "./http.ts";
import type { SessionUser } from "./auth.ts";

export const BACKUP_FORMAT = "howling-whispers-backup";

const DEFAULT_RETENTION = 5;
const MAX_RETENTION = 50;
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

const ENVELOPE_ENCRYPTED = Buffer.from("hwb1e\0", "utf8");
const ENVELOPE_PLAIN = Buffer.from("hwb1r\0", "utf8");

// ---------- Config -----------------------------------------------------------

function dataDir(): string {
  const config = loadConfig();
  if (config.ARCHIVE_DATA_DIR) return config.ARCHIVE_DATA_DIR;
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".archive-data");
}

export function backupRetention(): number {
  const config = loadConfig();
  const parsed = parseInt(config.ARCHIVE_BACKUP_RETENTION ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_RETENTION) return parsed;
  return DEFAULT_RETENTION;
}

function getBackupKey(): Buffer {
  const config = loadConfig();
  const fromEnv = config.ARCHIVE_BACKUP_ENCRYPTION_KEY;
  if (fromEnv && /^[0-9a-fA-F]{64}$/.test(fromEnv)) {
    return Buffer.from(fromEnv, "hex");
  }
  const keyFile = path.join(dataDir(), "backup-key");
  try {
    const existing = fs.readFileSync(keyFile);
    if (existing.length === 32) return existing;
  } catch {
    /* generate below */
  }
  const key = randomBytes(32);
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(keyFile, key, { mode: 0o600 });
    console.warn(
      "[archive] No ARCHIVE_BACKUP_ENCRYPTION_KEY configured; generated a key at",
      keyFile,
      "(keep this file safe — it unlocks server backups at rest).",
    );
  } catch {
    throw new Error(
      "Server backups need a stable encryption key. Set ARCHIVE_BACKUP_ENCRYPTION_KEY " +
        "(64 hex chars, i.e. 32 bytes) in the archive env file.",
    );
  }
  return key;
}

// ---------- Encryption -----------------------------------------------------------

function encryptPayload(plaintext: Buffer): Buffer {
  const key = getBackupKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([ENVELOPE_ENCRYPTED, iv, tag, encrypted]);
}

function decryptPayload(envelope: Buffer): Buffer {
  if (envelope.subarray(0, ENVELOPE_PLAIN.length).equals(ENVELOPE_PLAIN)) {
    return envelope.subarray(ENVELOPE_PLAIN.length);
  }
  if (envelope.subarray(0, ENVELOPE_ENCRYPTED.length).equals(ENVELOPE_ENCRYPTED)) {
    const body = envelope.subarray(ENVELOPE_ENCRYPTED.length);
    if (body.length < 12 + 16) {
      throw new HttpError(500, "Stored backup is malformed.");
    }
    const iv = body.subarray(0, 12);
    const tag = body.subarray(12, 12 + 16);
    const ciphertext = body.subarray(12 + 16);
    const decipher = createDecipheriv("aes-256-gcm", getBackupKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
  throw new HttpError(500, "Stored backup has an unknown encoding.");
}

/** pg may hand bytea back as a Buffer or as a "\x…" hex string. */
function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string") {
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    if (/^[0-9a-fA-F]*$/.test(hex)) {
      const decoded = Buffer.from(hex, "hex");
      if (decoded.length * 2 === hex.length) return decoded;
    }
  }
  return null;
}

// ---------- Handlers --------------------------------------------------------------

export type BackupSummary = {
  id: string;
  format: string;
  version: number;
  device: string;
  source: string;
  size_bytes: number;
  created_at: string;
};

export type BackupDetail = BackupSummary & { payload: unknown };

export async function createBackup(
  user: SessionUser,
  body: unknown,
): Promise<{ ok: true; backup: BackupSummary } | { ok: false; error: string; status?: number }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const payloadValue = b.payload;
  if (payloadValue === undefined || payloadValue === null) {
    return { ok: false, error: "No backup payload was sent.", status: 400 };
  }
  const text = JSON.stringify(payloadValue);
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: "This backup is too large to store.", status: 413 };
  }
  const format =
    payloadValue && typeof payloadValue === "object"
      ? String((payloadValue as Record<string, unknown>).format ?? BACKUP_FORMAT)
      : BACKUP_FORMAT;
  const version =
    payloadValue && typeof payloadValue === "object" &&
    typeof (payloadValue as Record<string, unknown>).version === "number"
      ? (payloadValue as Record<string, unknown>).version as number
      : 1;
  const device = typeof b.device === "string" ? b.device.slice(0, 200) : "";
  const source = typeof b.source === "string" ? b.source.slice(0, 100) : "web";
  const bytes = Buffer.from(text, "utf8");

  const pool = getPool();
  const id = newId("bak");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO user_backups (id, user_id, format, version, device, source, size_bytes, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, user.id, format, version, device, source, bytes.length, encryptPayload(bytes)],
    );
    await client.query(
      `DELETE FROM user_backups
        WHERE user_id = $1
          AND id NOT IN (
            SELECT id FROM user_backups WHERE user_id = $1
            ORDER BY created_at DESC, id DESC LIMIT $2
          )`,
      [user.id, backupRetention()],
    );
    const fresh = await client.query(
      "SELECT id, format, version, device, source, size_bytes, created_at FROM user_backups WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    return { ok: true, backup: mapRow(fresh.rows[0]) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function mapRow(row: Record<string, unknown>): BackupSummary {
  return {
    id: row.id as string,
    format: row.format as string,
    version: Number(row.version),
    device: row.device as string,
    source: row.source as string,
    size_bytes: Number(row.size_bytes),
    created_at: new Date(row.created_at as string).toISOString(),
  };
}

export async function listBackups(user: SessionUser): Promise<BackupSummary[]> {
  const res = await getPool().query(
    `SELECT id, format, version, device, source, size_bytes, created_at
       FROM user_backups
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC`,
    [user.id],
  );
  return res.rows.map((row) => mapRow(row));
}

export async function getBackup(user: SessionUser, id: string): Promise<BackupDetail | null> {
  const res = await getPool().query(
    "SELECT id, format, version, device, source, size_bytes, created_at, payload FROM user_backups WHERE id = $1 AND user_id = $2",
    [id, user.id],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const envelope = toBuffer(row.payload);
  if (!envelope) throw new HttpError(500, "Stored backup could not be read.");
  const plaintext = decryptPayload(envelope).toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    throw new HttpError(500, "Stored backup could not be decoded.");
  }
  return { ...mapRow(row), payload: parsed };
}

export async function deleteBackup(user: SessionUser, id: string): Promise<boolean> {
  const res = await getPool().query(
    "DELETE FROM user_backups WHERE id = $1 AND user_id = $2",
    [id, user.id],
  );
  return (res.rowCount ?? 0) > 0;
}

// ---------- HTTP helpers ----------------------------------------------------------

/** Read a JSON request body with a large cap (backups can be several MB). */
export async function readBackupJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BACKUP_BYTES) {
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

export function jsonBackup(res: ServerResponse, status: number, body: unknown): true {
  return json(res, status, body);
}