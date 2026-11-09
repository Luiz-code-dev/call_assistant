/**
 * GET /api/escola/aluno/diagnostico/pendente
 * Retorna diagnósticos disponíveis para o aluno:
 * 1. Diagnósticos OPEN da rede (abertos pela escola para a turma).
 * 2. Diagnósticos APPROVED da biblioteca SpeakFlow (networkId null, source SPEAKFLOW)
 *    para o gradeYear e subjectCode do aluno — reforço autônomo, sem depender da escola.
 *
 * O aluno não precisa que ninguém abra o diagnóstico para acessar o reforço.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ diagnosticos: [] });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  // Turma do aluno para saber gradeYear
  const enr = await P.eduEnrollment.findFirst({
    where: { studentId: ctx.studentId, status: "ACTIVE" },
    include: { class: { select: { gradeYear: true } } },
  });
  const gradeYear: number | null = enr?.class?.gradeYear ?? null;

  const now = new Date();

  // 1. Diagnósticos OPEN da rede (abertura pela escola)
  const whereOpen: Record<string, unknown> = {
    networkId: ctx.networkId,
    status: "OPEN",
    OR: [{ opensAt: null }, { opensAt: { lte: now } }],
    AND: [{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }],
  };
  if (gradeYear != null) whereOpen.gradeYear = gradeYear;

  const abertos = await P.eduDiagnostic.findMany({
    where: whereOpen,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, gradeYear: true, cycle: true, subjectCode: true, items: { select: { activityId: true } } },
  });

  // 2. Diagnósticos APPROVED da biblioteca (reforço autônomo)
  const whereLib: Record<string, unknown> = {
    networkId: null,
    source: "SPEAKFLOW",
    status: "APPROVED",
  };
  if (gradeYear != null) whereLib.gradeYear = gradeYear;

  const biblioteca = await P.eduDiagnostic.findMany({
    where: whereLib,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, gradeYear: true, cycle: true, subjectCode: true, items: { select: { activityId: true } } },
  });

  // Merge deduplicated por subjectCode + gradeYear (rede tem preferência sobre biblioteca)
  const todos = [...abertos];
  const codigosRede = new Set(abertos.map((d: { subjectCode: string | null; gradeYear: number | null }) => `${d.subjectCode}:${d.gradeYear}`));
  for (const d of biblioteca) {
    const chave = `${d.subjectCode}:${d.gradeYear}`;
    if (!codigosRede.has(chave)) todos.push(d);
  }

  // Filtra os que o aluno ainda não concluiu (cycle 1 = início, 2 = acompanhamento)
  const pendentes = [];
  for (const d of todos) {
    const sessoesCompletas = await P.eduAttemptSession.count({
      where: { studentId: ctx.studentId, diagnosticId: d.id, completedAt: { not: null } },
    });
    if (sessoesCompletas === 0) {
      pendentes.push({
        id: d.id,
        title: d.title,
        gradeYear: d.gradeYear,
        cycle: d.cycle,
        subjectCode: d.subjectCode,
        totalQuestoes: (d.items as Array<{ activityId: string }>).length,
      });
    }
  }

  return NextResponse.json({ diagnosticos: pendentes });
}
