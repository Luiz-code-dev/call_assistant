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

/**
 * Endereço próprio do Escolas, para quando ele roda separado do SpeakFlow IA
 * (ESCOLAS_PUBLIC_URL, lida na hora em que o servidor roda, e não na construção da imagem).
 * Sem a variável, devolve null e todos os links continuam exatamente como hoje.
 */
export function enderecoProprioDoEscolas(valor: string | undefined = process.env.ESCOLAS_PUBLIC_URL): string | null {
  const c = (valor ?? "").trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(c)) return null;
  try { return new URL(c).origin; } catch { return null; }
}

/**
 * No navegador: endereço para montar links (por exemplo, o QR da aula).
 * No domínio atual (ou em localhost) usa o endereço padrão, como sempre; em um domínio
 * próprio do Escolas, usa o endereço em que a pessoa está.
 */
export function enderecoNoNavegador(origin: string, hostname: string): string {
  const atual = hostname === "speakflow.ia.br" || hostname.endsWith(".speakflow.ia.br");
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
  return atual || local ? SITE_PADRAO : origin;
}

export function urlDoSite(candidata?: string | null): string {
  const proprio = enderecoProprioDoEscolas();
  if (proprio) return proprio;
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
