/**
 * Suporte a sessao do APP nativo (SpeakFlow Escolas), alem do cookie da web.
 *
 * - O app envia o cabecalho `X-Client: speakflow-escolas-app` no login e recebe
 *   o JWT no corpo (a web continua so com cookie httpOnly, sem token no corpo).
 * - Nas rotas /api/escola/*, os contextos aceitam `Authorization: Bearer <jwt>`
 *   OU o cookie. Se vierem os dois, vale o Bearer.
 * - Cada token carrega `aud` ("staff" | "student" | "family"); o leitor de cada
 *   perfil so aceita o seu `aud` (defesa extra — os segredos ja sao distintos).
 *
 * Este modulo usa next/headers, entao e so para Route Handlers / Server
 * Components (nao edge/middleware).
 */
import { headers } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";

export const APP_CLIENT = "speakflow-escolas-app";
export type EduAudience = "staff" | "student" | "family";

// TODO(2026-11-27): remover a tolerancia a tokens sem `aud`. Todo token novo
// (web e app) ja e emitido com `aud`; apos 30 dias do deploy nao deve restar
// nenhum cookie legado sem `aud`. O teste em app-auth.test.ts falha depois
// desta data para forcar a limpeza.
export const AUD_LEGACY_UNTIL = new Date("2026-11-27T00:00:00Z");

// Duracoes da sessao no app (o ESPEC pede: equipe/familia 30 dias; aluno 15 h,
// ou 30 dias quando "Este aparelho e de casa").
export const APP_STAFF_SECONDS = 60 * 60 * 24 * 30;
export const APP_FAMILY_SECONDS = 60 * 60 * 24 * 30;
export const APP_STUDENT_SECONDS = 60 * 60 * 15;
export const APP_STUDENT_HOME_SECONDS = 60 * 60 * 24 * 30;

/** True quando a requisicao vem do app nativo (cabecalho X-Client). */
export function isAppClient(): boolean {
  try {
    return headers().get("x-client") === APP_CLIENT;
  } catch {
    return false;
  }
}

/** Token do cabecalho `Authorization: Bearer <jwt>`, ou null. */
export function bearerToken(): string | null {
  try {
    const h = headers().get("authorization");
    if (!h) return null;
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Verifica assinatura + expiracao e confere o `aud`. O `aud` so e exigido
 * quando presente, para nao derrubar cookies legados emitidos antes do `aud`
 * (a separacao por tipo ja e garantida pelo segredo distinto de cada perfil).
 * Retorna o payload ou null.
 */
export async function verifyTypedToken(
  raw: string,
  secret: Uint8Array,
  aud: EduAudience,
  now: number = Date.now()
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(raw, secret);
    if (payload.aud) return payload.aud === aud ? payload : null;
    // Sem aud = cookie legado: tolerado so durante a janela de migracao.
    // (A separacao por tipo ja e garantida pelo segredo distinto de cada perfil.)
    return now < AUD_LEGACY_UNTIL.getTime() ? payload : null;
  } catch {
    return null;
  }
}
