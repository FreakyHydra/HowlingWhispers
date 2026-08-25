import { NextRequest } from "next/server";

const ID_SEGMENT = String.raw`(?:[a-zA-Z0-9._:-]|%[0-9A-Fa-f]{2})+`;
const ALLOWED_SUFFIX = new RegExp(
  String.raw`^\\/(?:auth\\/(?:login|logout|identity)|curated-characters(?:\\/authorize-export|\\/${ID_SEGMENT}(?:\\/export)?)?)import { NextRequest } from "next/server";

,
);

export function curatorBridgeOrigin(): string {
  const override = process.env.CODA_ADMIN_ORIGIN;
  return override && /^https?:\/\//.test(override)
    ? override.replace(/\/$/, "")
    : "http://127.0.0.1:3000";
}

export async function forwardCurator(req: NextRequest): Promise<Response> {
  const prefix = "/api/curator";
  const suffix = req.nextUrl.pathname.startsWith(prefix)
    ? req.nextUrl.pathname.slice(prefix.length)
    : "";

  if (!ALLOWED_SUFFIX.test(suffix)) {
    return Response.json({ error: "Unknown Curator bridge route" }, { status: 404 });
  }

  const upstreamPath = suffix.startsWith("/auth/")
    ? `/api/coda${suffix}`
    : `/api${suffix}`;
  const target = new URL(`${curatorBridgeOrigin()}${upstreamPath}`);
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  if (suffix === "/auth/login" && !target.searchParams.has("return_to")) {
    target.searchParams.set("return_to", req.nextUrl.origin);
  }

  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();
    for (const name of ["content-type", "location", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const setCookies =
      (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      setCookies.forEach(value => responseHeaders.append("set-cookie", value));
    } else {
      const value = upstream.headers.get("set-cookie");
      if (value) responseHeaders.set("set-cookie", value);
    }
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { error: "The Discord Curator service is unavailable." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
