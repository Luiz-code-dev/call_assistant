/**
 * Para o menu: a pessoa está na equipe de apoio? Quantos pedidos novos há para ela?
 * Só números. Quem não é da equipe recebe naEquipe=false, sem erro.
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { membroDoApoio, filtroDoMembro } from "@/lib/escola/apoio-equipe";

export const runtime = "nodejs";

export async function GET() {
  const fora = NextResponse.json({ naEquipe: false, novos: 0 });
  if (!isEscolasEnabled()) return fora;
  const ctx = await getEduContext();
  if (!ctx || !ctx.userId || !ctx.networkId) return fora;
  if (ctx.db) setTenantDb(ctx.db);
  const P = (ctx.db ?? prismaEdu) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const membro = await membroDoApoio(P, ctx.networkId, ctx.userId);
  if (!membro) return fora;
  const novos = await P.eduPedidoApoio.count({ where: { ...filtroDoMembro(ctx.networkId, membro), status: "RECEBIDO" } }).catch(() => 0);
  return NextResponse.json({ naEquipe: true, novos });
}
