import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

// GET — lista todas as entregas de uma atividade
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const activity = await prismaEdu.eduActivity.findUnique({ where: { id: params.id } });
  if (!activity || activity.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }

  // Busca alunos da turma/componente
  const cs = await prismaEdu.eduClassSubject.findUnique({
    where: { id: activity.classSubjectId },
    include: {
      class: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
  });

  const enrolledStudents = cs?.class.enrollments.map((e: { student: { id: string; fullName: string } }) => e.student) ?? [];

  const submissions = await prismaEdu.eduSubmission.findMany({
    where: { activityId: params.id },
    orderBy: [{ studentId: "asc" }, { attempt: "desc" }],
  });

  // Agrupa por aluno (última tentativa por aluno)
  const byStudent = new Map<string, unknown>();
  for (const sub of submissions) {
    if (!byStudent.has(sub.studentId)) byStudent.set(sub.studentId, sub);
  }

  const result = enrolledStudents.map((student: { id: string; fullName: string }) => ({
    studentId: student.id,
    studentName: student.fullName,
    submission: byStudent.get(student.id) ?? null,
  }));

  return NextResponse.json({ entregas: result, activity });
}

// PATCH — professor confirma ou ajusta nota + comentário
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { submissionId, teacherScore, teacherNote, confirmAll } = await req.json();

  const activity = await prismaEdu.eduActivity.findUnique({ where: { id: params.id } });
  if (!activity || activity.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }

  // Confirmar todas as notas sugeridas de uma vez
  if (confirmAll === true) {
    await prismaEdu.eduSubmission.updateMany({
      where: { activityId: params.id, status: "EVALUATED", teacherScore: null },
      data: { status: "REVIEWED", reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true, action: "confirmAll" });
  }

  if (!submissionId) return NextResponse.json({ error: "submissionId obrigatório" }, { status: 400 });

  const sub = await prismaEdu.eduSubmission.findUnique({ where: { id: submissionId } });
  if (!sub || sub.activityId !== params.id) {
    return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
  }

  await prismaEdu.eduSubmission.update({
    where: { id: submissionId },
    data: {
      teacherScore: teacherScore ?? null,
      teacherNote: teacherNote ?? null,
      status: "REVIEWED",
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
