/**
 * POST /api/escola/rede/integracoes/[id]/testar
 * Envia um aviso de teste ao endereço cadastrado e diz se o sistema externo respondeu.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { entregar, montarAviso } from "@/lib/escola/integracao/webhook";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const endereco = await prismaEdu.eduWebhookEndpoint.findFirst({ where: { id: params.id, networkId: ctx.networkId } });
  if (!endereco) return NextResponse.json({ error: "Endereço não encontrado" }, { status: 404 });

  const aviso = montarAviso(ctx.networkId, "integracao.teste", { mensagem: "Aviso de teste do SpeakFlow Escolas." });
  const r = await entregar(prismaEdu, endereco, aviso);
  return NextResponse.json({ ok: r.ok, codigo: r.codigo, motivo: r.motivo ?? null });
}
