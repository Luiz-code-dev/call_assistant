/**
 * POST /api/escola/professor/aulas/[id]/retomar-em-sala
 * Aponta as atividades da aula em que mais alunos ficaram em "Praticando", para o
 * professor retomar em sala.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { aulaDoProfessor, entregasPraticando } from "@/lib/escola/aula-acoes";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const aula = await aulaDoProfessor(params.id, ctx.networkId, ctx.userId);
  if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  const entregas = await entregasPraticando(aula.id, ctx.networkId, aula.skillIds ?? []);

  const porAtividade = new Map<string, { activityId: string; titulo: string; alunos: Set<string> }>();
  for (const e of entregas) {
    if (!porAtividade.has(e.activityId)) porAtividade.set(e.activityId, { activityId: e.activityId, titulo: e.activityTitle, alunos: new Set() });
    porAtividade.get(e.activityId)!.alunos.add(e.studentId);
  }
  const topicosParaRetomar = Array.from(porAtividade.values())
    .map((t) => ({ activityId: t.activityId, titulo: t.titulo, alunos: t.alunos.size }))
    .sort((a, b) => b.alunos - a.alunos)
    .slice(0, 5);

  const message = topicosParaRetomar.length
    ? `Para retomar em sala: ${topicosParaRetomar.map((t) => `${t.titulo} (${t.alunos} ${t.alunos === 1 ? "aluno" : "alunos"})`).join("; ")}.`
    : "Nenhum aluno ficou em Praticando nesta aula. Não há o que retomar.";
  return NextResponse.json({ aulaId: aula.id, topicosParaRetomar, message });
}
