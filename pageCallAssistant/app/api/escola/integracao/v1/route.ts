/**
 * GET /api/escola/integracao/v1
 * Teste de conexão do sistema externo: confirma que a chave vale e diz o que ela pode fazer.
 */
import { NextRequest, NextResponse } from "next/server";
import { autenticarIntegracao } from "@/lib/escola/integracao/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await autenticarIntegracao(req, null);
  if (ctx instanceof NextResponse) return ctx;
  const rede = await ctx.db.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true } }).catch(() => null);
  return NextResponse.json(
    { ok: true, versao: "v1", rede: rede?.name ?? null, chave: ctx.keyName, permissoes: ctx.scopes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
