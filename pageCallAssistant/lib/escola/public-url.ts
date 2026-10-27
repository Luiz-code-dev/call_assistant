import type { NextRequest } from "next/server";

// Monta a URL publica a partir dos headers do proxy (Railway). req.url, atras
// do proxy, traz o host interno (0.0.0.0:3000) — por isso nao usar req.url.
export function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export function publicUrl(req: NextRequest, path: string): string {
  return `${publicOrigin(req)}${path.startsWith("/") ? path : `/${path}`}`;
}
