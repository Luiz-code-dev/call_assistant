/**
 * Quem pode ler os pedidos de apoio: só quem a secretaria indicou por nome (EduEquipeApoio).
 * O perfil sozinho não dá acesso: nem a secretaria, nem a direção, nem o professor.
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function estaNaEquipeDeApoio(P: any, networkId: string, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const linha = await P.eduEquipeApoio.findUnique({ where: { networkId_userId: { networkId, userId } }, select: { id: true } }).catch(() => null);
  return !!linha;
}

export async function contextoDaEquipe() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx || !ctx.userId) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.db) setTenantDb(ctx.db);
  const P = (ctx.db ?? prismaEdu) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Quem não é da equipe recebe "não encontrado": a tela nem confirma que existe
  if (!(await estaNaEquipeDeApoio(P, ctx.networkId, ctx.userId))) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  return { ctx, P };
}
