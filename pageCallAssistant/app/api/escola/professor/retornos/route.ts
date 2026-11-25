/**
 * GET /api/escola/professor/retornos
 * Lista submissões que precisam de retorno do professor (com flag ou abertas para revisão)
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

const P = prismaEdu as any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Até 3 frases curtas do retorno do Flow */
function frases(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 3);
}

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const flagged = searchParams.get("flagged") === "true";

  // Busca turmas do professor
  const classSubjects = await P.eduClassSubject.findMany({
    where: { teacherId: ctx.userId, networkId: ctx.networkId },
    select: { id: true, classId: true, class: { select: { name: true } }, subject: { select: { name: true } } },
  }).catch(() => []);
  const classIds: string[] = Array.from(new Set((classSubjects as { classId: string }[]).map(cs => cs.classId)));
  const ofertaPorId = new Map<string, { turma: string; materia: string }>(
    (classSubjects as { id: string; class: { name: string } | null; subject: { name: string } | null }[])
      .map(cs => [cs.id, { turma: cs.class?.name ?? "", materia: cs.subject?.name ?? "" }])
  );

  if (classIds.length === 0) return NextResponse.json({ submissions: [] });

  // Busca matrículas dessas turmas
  const enrollments = await P.eduEnrollment.findMany({
    where: { classId: { in: classIds }, status: "ACTIVE" },
    select: { studentId: true, student: { select: { fullName: true } } },
  }).catch(() => []);
  const studentIds: string[] = (enrollments as { studentId: string }[]).map(e => e.studentId);
  const studentNameMap = new Map<string, string>(
    (enrollments as { studentId: string; student: { fullName: string } }[]).map(e => [e.studentId, e.student.fullName])
  );

  const where: Record<string, unknown> = {
    networkId: ctx.networkId,
    studentId: { in: studentIds },
    status: { not: "IN_PROGRESS" },
    // Só as atividades que este professor passou nas suas turmas
    activity: { classSubjectId: { in: Array.from(ofertaPorId.keys()) } },
  };
  // "Sinalizado" = a correção automática falhou e a entrega precisa do olhar do professor.
  // (EduSubmission não tem coluna "flagged"; a consulta antiga falhava e a tela ficava sempre vazia.)
  if (flagged) where.aiStatus = "FAILED";

  const subs = await P.eduSubmission.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: {
      id: true,
      studentId: true,
      activityId: true,
      masteryLevel: true,
      aiStatus: true,
      status: true,
      aiFeedback: true,
      teacherNote: true,
      submittedAt: true,
      activity: { select: { title: true, classSubjectId: true } },
    },
  }).catch(() => []);

  const submissions = (subs as {
    id: string; studentId: string; activityId: string; masteryLevel: string | null;
    aiStatus: string | null; submittedAt: string | Date; status: string; teacherNote: string | null;
    aiFeedback: { acertos?: unknown; melhorar?: unknown } | null;
    activity: { title: string; classSubjectId: string | null } | null;
  }[]).map(s => ({
    id: s.id,
    activityId: s.activityId,
    status: s.status,
    turma: ofertaPorId.get(s.activity?.classSubjectId ?? "")?.turma ?? "",
    materia: ofertaPorId.get(s.activity?.classSubjectId ?? "")?.materia ?? "",
    acertos: frases(s.aiFeedback?.acertos),
    melhorar: frases(s.aiFeedback?.melhorar),
    observacao: s.teacherNote,
    studentName: studentNameMap.get(s.studentId) ?? "Aluno",
    activityTitle: s.activity?.title ?? "Atividade",
    masteryLevel: s.masteryLevel,
    flagged: s.aiStatus === "FAILED",
    submittedAt: s.submittedAt,
  }));

  return NextResponse.json({ submissions });
}
