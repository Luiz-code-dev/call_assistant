/**
 * Quem pode ler os pedidos de apoio: só quem a secretaria indicou por nome (EduEquipeApoio).
 * O perfil sozinho não dá acesso: nem a secretaria, nem a direção, nem o professor.
 * Cada pessoa da equipe atende a rede toda ou só as escolas que a secretaria marcou.
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

export interface MembroDoApoio { funcao: string; schoolIds: string[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function membroDoApoio(P: any, networkId: string, userId: string | null | undefined): Promise<MembroDoApoio | null> {
  if (!userId) return null;
  const linha = await P.eduEquipeApoio.findFirst({ where: { networkId, userId }, select: { funcao: true, schoolIds: true } }).catch(() => null);
  return linha ? { funcao: linha.funcao ?? "INDICADO", schoolIds: linha.schoolIds ?? [] } : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function estaNaEquipeDeApoio(P: any, networkId: string, userId: string | null | undefined): Promise<boolean> {
  return !!(await membroDoApoio(P, networkId, userId));
}

/** Filtro dos pedidos que esta pessoa pode ver. */
export function filtroDoMembro(networkId: string, membro: MembroDoApoio): Record<string, unknown> {
  return membro.schoolIds.length ? { networkId, schoolId: { in: membro.schoolIds } } : { networkId };
}

export async function contextoDaEquipe() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext({ permitirApoio: true });
  if (!ctx || !ctx.userId) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.db) setTenantDb(ctx.db);
  const P = (ctx.db ?? prismaEdu) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const membro = await membroDoApoio(P, ctx.networkId, ctx.userId);
  // Quem não é da equipe recebe "não encontrado": a tela nem confirma que existe
  if (!membro) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  return { ctx, P, membro, filtro: filtroDoMembro(ctx.networkId, membro) };
}

/**
 * Das pessoas informadas, quais ainda têm vínculo ativo na rede e conta ativa.
 * Quem teve o vínculo desativado continua na lista da equipe, mas não consegue entrar:
 * não pode receber caso nem aviso.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function comVinculoAtivo(P: any, networkId: string, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const vinculos: { userId: string }[] = await P.eduMembership.findMany({
    where: { networkId, userId: { in: userIds }, isActive: true, user: { isActive: true } }, select: { userId: true },
  });
  return new Set(vinculos.map((v) => v.userId));
}
