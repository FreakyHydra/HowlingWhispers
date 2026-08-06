import { NextRequest } from "next/server";

/** Origin of the standalone The Whispering Archive server (its own node:http process). */
export function archiveOrigin(): string {
  const override = process.env.ARCHIVE_ORIGIN;
  const origin = override && /^https?:\/\//.test(override)
    ? override.replace(/\/$/, "")
    : "http://127.0.0.1:2087";
  return origin;
}

/**
 * Forward an incoming Next request to the standalone archive server and return
 * the upstream response, copying through Set-Cookie so auth works on this origin.
 */
export async function forwardArchive(req: NextRequest): Promise<Response> {
  const target = `${archiveOrigin()}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  const accept = req.headers.get("accept");
  const cookie = req.headers.get("cookie");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (cookie) headers.set("cookie", cookie);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, { ...init });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

/**
 * Rewrite an absolute archive media URL (http://127.0.0.1:2087/...) to a
 * same-origin path that flows through the proxy: /api/archive/media/<file>.
 */
export function sameOriginMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/api\/archive\/media\/[a-zA-Z0-9.-]+$/);
  return match ? match[0] : url;
}