/**
 * Indicadores do canal de apoio para a equipe indicada: só contagens e tempos médios.
 * Nenhum nome de aluno e nenhum texto de pedido sai por aqui.
 */
import { NextResponse } from "next/server";
import { contextoDaEquipe } from "@/lib/escola/apoio-equipe";
import { indicadores } from "@/lib/escola/apoio-aluno";

export const runtime = "nodejs";

export async function GET() {
  const { P, filtro, membro, erro } = await contextoDaEquipe();
  if (erro) return erro;
  const pedidos = await P.eduPedidoApoio.findMany({
    // Sem limite: os números são de todos os pedidos da rede ou das escolas atendidas
    where: filtro, orderBy: { createdAt: "desc" },
    select: { assunto: true, status: true, desfecho: true, comunicadoA: true, createdAt: true, vistoAt: true, concluidoEm: true },
  });
  return NextResponse.json({ ...indicadores(pedidos), redeToda: !membro!.schoolIds.length });
}
