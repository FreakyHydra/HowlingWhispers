import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;
  const url = loadUrl();
  if (!url) {
    throw new Error("The archive is not configured (ARCHIVE_DATABASE_URL missing).");
  }
  pool = new pg.Pool({ connectionString: url, max: 10 });
  return pool;
}

function loadUrl() {
  return loadConfig().ARCHIVE_DATABASE_URL || null;
}

export function loadConfig(): Record<string, string> {
  const out: Record<string, string> = {};
  const candidates = [
    "/etc/howlingwhispers/archive.env",
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env.archive"),
  ];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      for (const line of raw.split("\n")) {
        const eq = line.indexOf("=");
        if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      }
      if (out.ARCHIVE_DATABASE_URL) break;
    } catch {
      /* continue */
    }
  }
  return out;
}

export async function pingDb(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function bootstrapSchema(): Promise<void> {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await getPool().query(sql);
}