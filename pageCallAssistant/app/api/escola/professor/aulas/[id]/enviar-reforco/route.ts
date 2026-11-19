/**
 * POST /api/escola/professor/aulas/[id]/enviar-reforco
 * Atribui trilha de reforço aos alunos que ficaram em "Praticando" nas atividades da aula.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { aulaDoProfessor, entregasPraticando } from "@/lib/escola/aula-acoes";
import { assignAfterDiagnostic } from "@/lib/escola/track-assignment";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const aula = await aulaDoProfessor(params.id, ctx.networkId, ctx.userId);
  if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  const entregas = await entregasPraticando(aula.id, ctx.networkId, aula.skillIds ?? []);

  // Habilidades em que cada aluno ficou em Praticando
  const porAluno = new Map<string, Set<string>>();
  for (const e of entregas) {
    if (!porAluno.has(e.studentId)) porAluno.set(e.studentId, new Set());
    for (const sk of e.skillIds) porAluno.get(e.studentId)!.add(sk);
  }

  let alunosEnviados = 0;
  let trilhasAtribuidas = 0;
  const pendentes = Array.from(porAluno.entries());
  for (const [studentId, skills] of pendentes) {
    if (!skills.size) continue;
    const r = await assignAfterDiagnostic({
      networkId: ctx.networkId,
      diagnosticId: aula.id,
      studentId,
      notYetSkillIds: Array.from(skills),
      assignedBy: ctx.userId ?? "system",
    }).catch(() => null);
    if (r && r.atribuidos > 0) { alunosEnviados++; trilhasAtribuidas += r.atribuidos; }
  }

  const message = porAluno.size === 0
    ? "Nenhum aluno ficou em Praticando nesta aula."
    : alunosEnviados > 0
      ? `Reforço enviado para ${alunosEnviados} ${alunosEnviados === 1 ? "aluno" : "alunos"}.`
      : "Os alunos em Praticando já têm trilha de reforço para estes conteúdos, ou ainda não há trilha pronta para eles.";
  return NextResponse.json({ aulaId: aula.id, alunosEnviados, trilhasAtribuidas, message });
}
