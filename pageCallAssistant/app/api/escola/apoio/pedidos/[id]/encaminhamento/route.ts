/**
 * Registra na auditoria que um documento de encaminhamento foi gerado para um órgão.
 * O documento em si é montado na tela e impresso pelo profissional; nada é enviado pelo sistema.
 */
import { NextRequest, NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";
import { ORGAOS } from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, P, filtro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const p = await P.eduPedidoApoio.findFirst({ where: { ...filtro, id: params.id }, select: { id: true } });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { orgao?: unknown; comRelato?: unknown };
  if (typeof b.orgao !== "string" || !(ORGAOS as readonly string[]).includes(b.orgao)) return NextResponse.json({ error: "Órgão inválido." }, { status: 400 });
  await P.eduAuditLog.create({
    data: {
      networkId: ctx!.networkId, actorType: "user", actorId: ctx!.userId, action: "apoio.encaminhamento.gerado", entity: "EduPedidoApoio", entityId: p.id,
      metadata: { orgao: b.orgao, comRelato: b.comRelato === true },
    },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
