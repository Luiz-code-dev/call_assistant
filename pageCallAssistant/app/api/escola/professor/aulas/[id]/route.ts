import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lesson = await prismaEdu.eduLesson.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: { objectives: { orderBy: { order: "asc" } } },
  });
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  if (ctx.role === "TEACHER" && lesson.teacherId !== ctx.userId)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Resultado da aula: contagem de submissões por objetivo
  const submissions = await prismaEdu.eduSubmission.findMany({
    where: { networkId: ctx.networkId, activity: { lessonId: params.id } },
    select: { masteryLevel: true, quizAnswers: true, status: true, studentId: true },
  });

  const totalStudents = await prismaEdu.eduEnrollment.count({
    where: {
      networkId: ctx.networkId,
      classId: (
        await prismaEdu.eduClassSubject.findFirst({
          where: { id: lesson.classSubjectId },
          select: { classId: true },
        })
      )?.classId,
      status: "ACTIVE",
    },
  });

  const done = new Set(submissions.map((s: { studentId: string }) => s.studentId)).size;
  const notDone = Math.max(0, totalStudents - done);
  const byLevel = { MASTERED: 0, ALMOST: 0, NOT_YET: 0 };
  for (const s of submissions) {
    if (s.masteryLevel) byLevel[s.masteryLevel as keyof typeof byLevel]++;
  }

  return NextResponse.json({ lesson, result: { totalStudents, done, notDone, byLevel } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Somente professores" }, { status: 403 });

  const lesson = await prismaEdu.eduLesson.findFirst({
    where: { id: params.id, networkId: ctx.networkId, teacherId: ctx.userId },
  });
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

  const body = await req.json();
  const { status, dueAt } = body;

  const updated = await prismaEdu.eduLesson.update({
    where: { id: params.id },
    data: {
      ...(status ? { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined } : {}),
      ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
    },
    include: { objectives: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ lesson: updated });
}
