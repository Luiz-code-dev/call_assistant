import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Busca a matrícula ativa do aluno para saber a turma
  const enrollment = await prismaEdu.eduEnrollment.findFirst({
    where: { studentId: ctx.studentId, networkId: ctx.networkId, status: "ACTIVE" },
    select: { classId: true },
  });

  if (!enrollment) return NextResponse.json({ lessons: [] });

  // Aulas publicadas para a turma do aluno
  const classSubjects = await prismaEdu.eduClassSubject.findMany({
    where: { classId: enrollment.classId, networkId: ctx.networkId },
    select: { id: true },
  });
  const classSubjectIds = classSubjects.map((cs: { id: string }) => cs.id);

  const lessons = await prismaEdu.eduLesson.findMany({
    where: {
      networkId: ctx.networkId,
      classSubjectId: { in: classSubjectIds },
      status: "PUBLISHED",
    },
    include: { objectives: { orderBy: { order: "asc" } } },
    orderBy: { date: "desc" },
    take: 30,
  });

  // Para cada aula, verificar se o aluno já fez (tem submissão)
  const doneLessons = new Set<string>();
  if (lessons.length > 0) {
    const lessonIds = lessons.map((l: { id: string }) => l.id);
    // Busca atividades das aulas e verifica submissões avaliadas
    const lessonActivities = await prismaEdu.eduActivity.findMany({
      where: { networkId: ctx.networkId, lessonId: { in: lessonIds } },
      select: { id: true, lessonId: true },
    });
    if (lessonActivities.length > 0) {
      const actIds = lessonActivities.map((a: { id: string }) => a.id);
      const subs = await prismaEdu.eduSubmission.findMany({
        where: { networkId: ctx.networkId, studentId: ctx.studentId, activityId: { in: actIds }, status: "EVALUATED" },
        select: { activityId: true },
      });
      const doneActIds = new Set(subs.map((s: { activityId: string }) => s.activityId));
      for (const a of lessonActivities) {
        if (doneActIds.has(a.id) && a.lessonId) doneLessons.add(a.lessonId);
      }
    }
  }

  const now = new Date();
  const result = lessons.map((l: { id: string; dueAt: Date | null }) => ({
    ...l,
    done: doneLessons.has(l.id),
    overdue: l.dueAt ? l.dueAt < now && !doneLessons.has(l.id) : false,
  }));

  return NextResponse.json({ lessons: result });
}
