/**
 * GET /api/escola/aluno/diagnostico/pendente
 * Retorna diagnósticos OPEN para o ano/série da turma do aluno,
 * que ele ainda não concluiu.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

const P = prismaEdu as any;

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ diagnosticos: [] });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Busca turma do aluno para saber o gradeYear
  const enr = await P.eduEnrollment.findFirst({
    where: { studentId: ctx.studentId, status: "ACTIVE" },
    include: { class: { select: { gradeYear: true } } },
  });
  const gradeYear = enr?.class?.gradeYear ?? null;

  const now = new Date();
  const where: Record<string, unknown> = {
    networkId: ctx.networkId,
    status: "OPEN",
    OR: [{ opensAt: null }, { opensAt: { lte: now } }],
    AND: [{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }],
  };
  if (gradeYear != null) where.gradeYear = gradeYear;

  const todos = await P.eduDiagnostic.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, gradeYear: true, cycle: true,
      items: { select: { activityId: true } },
    },
  });

  // Filtra os que o aluno ainda não concluiu
  const pendentes = [];
  for (const d of todos) {
    const sessoesCompletas = await P.eduAttemptSession.count({
      where: { studentId: ctx.studentId, diagnosticId: d.id, completedAt: { not: null } },
    });
    if (sessoesCompletas === 0) {
      pendentes.push({ id: d.id, title: d.title, gradeYear: d.gradeYear, cycle: d.cycle, totalQuestoes: d.items.length });
    }
  }

  return NextResponse.json({ diagnosticos: pendentes });
}
