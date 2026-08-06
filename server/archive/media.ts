import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import sharp from "sharp";
import { loadConfig } from "./db.ts";
import { error } from "./http.ts";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 64;
const ALLOWED_MIME = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function mediaDir(): string {
  const config = loadConfig();
  if (config.ARCHIVE_MEDIA_DIR) return config.ARCHIVE_MEDIA_DIR;
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".archive-media");
}

function baseUrl(req: IncomingMessage): string {
  const config = loadConfig();
  return config.ARCHIVE_PUBLIC_BASE_URL || `http://${req.headers.host ?? "127.0.0.1"}`;
}

export type MediaUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function storeUploadedImage(body: unknown, req: IncomingMessage): Promise<MediaUploadResult> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.dataUrl !== "string") {
    return { ok: false, error: "Send the image as a data URL." };
  }
  const comma = b.dataUrl.indexOf(",");
  if (comma < 0) return { ok: false, error: "The image data URL is malformed." };
  const header = b.dataUrl.slice(0, comma);
  const mimeMatch = /^data:([a-z0-9/+.-]+);base64/i.exec(header);
  if (!mimeMatch) return { ok: false, error: "The image must be a base64 data URL." };
  const mime = mimeMatch[1].toLowerCase();
  const extension = ALLOWED_MIME.get(mime);
  if (!extension) {
    return { ok: false, error: "Only JPEG, PNG, WebP and GIF images are allowed." };
  }

  const data = Buffer.from(b.dataUrl.slice(comma + 1), "base64");
  if (data.length === 0) return { ok: false, error: "The image data is empty." };
  if (data.length > MAX_BYTES) {
    return { ok: false, error: "Images must be 2 MB or smaller." };
  }

  let meta;
  try {
    meta = await sharp(data).metadata();
  } catch {
    return { ok: false, error: "That file is not a readable image." };
  }
  const { width, height } = meta;
  if (!width || !height || width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return { ok: false, error: "Images must be at least 64x64 pixels." };
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { ok: false, error: "Images must be no larger than 4096px on a side." };
  }

  const dir = mediaDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}${extension}`;
  fs.writeFileSync(path.join(dir, filename), data);

  return { ok: true, url: `${baseUrl(req)}/api/archive/media/${filename}` };
}

export function serveMedia(req: IncomingMessage, res: ServerResponse, filename: string) {
  const safe = path.basename(filename);
  if (safe !== filename) {
    return error(res, 400, "Invalid media path.");
  }
  const full = path.join(mediaDir(), safe);
  if (!fs.existsSync(full)) {
    return error(res, 404, "Media not found.");
  }
  const ext = path.extname(safe).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(full).pipe(res);
}