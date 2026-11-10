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

/**
 * Endereço do site para links que saem do app (QR, e-mail, convite).
 * O domínio sem "www" (speakflow.ia.br) não abre: sempre usa www.speakflow.ia.br.
 */
export const SITE_PADRAO = "https://www.speakflow.ia.br";
export function urlDoSite(candidata?: string | null): string {
  const c = (candidata ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(c)) return SITE_PADRAO;
  try {
    const u = new URL(c);
    if (u.hostname === "speakflow.ia.br") { u.hostname = "www.speakflow.ia.br"; u.protocol = "https:"; }
    return u.origin;
  } catch {
    return SITE_PADRAO;
  }
}
