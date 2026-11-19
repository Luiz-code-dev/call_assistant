/**
 * POST /api/escola/professor/aulas/[id]/segunda-chance
 * Libera mais uma tentativa nas atividades da aula em que algum aluno ficou em "Praticando".
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { aulaDoProfessor, entregasPraticando } from "@/lib/escola/aula-acoes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;
const TENTATIVAS_MAX = 5;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const aula = await aulaDoProfessor(params.id, ctx.networkId, ctx.userId);
  if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  const entregas = await entregasPraticando(aula.id, ctx.networkId, aula.skillIds ?? []);

  const alunos = new Set(entregas.map((e) => e.studentId));
  const atividadeIds = Array.from(new Set(entregas.map((e) => e.activityId)));
  let liberadas = 0;
  if (atividadeIds.length) {
    const atividades: Array<{ id: string; maxAttempts: number }> = await P.eduActivity.findMany({
      where: { id: { in: atividadeIds }, networkId: ctx.networkId, lessonId: aula.id },
      select: { id: true, maxAttempts: true },
    });
    for (const a of atividades) {
      if (a.maxAttempts >= TENTATIVAS_MAX) continue;
      await P.eduActivity.update({ where: { id: a.id }, data: { maxAttempts: a.maxAttempts + 1 } });
      liberadas++;
    }
  }

  const message = alunos.size === 0
    ? "Nenhum aluno ficou em Praticando nesta aula."
    : liberadas > 0
      ? `Nova tentativa liberada para ${alunos.size} ${alunos.size === 1 ? "aluno" : "alunos"}.`
      : "As atividades desta aula já estão no limite de tentativas.";
  return NextResponse.json({ aulaId: aula.id, segundaChancePara: alunos.size, atividadesLiberadas: liberadas, message });
}
