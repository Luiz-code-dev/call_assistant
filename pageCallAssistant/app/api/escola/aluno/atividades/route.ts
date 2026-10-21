import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "todo"; // todo | feito | historico

  // A6: isolamento — somente componentes da turma do aluno na sua rede
  const classSubjectIds: string[] = await (prismaEdu as any).eduClassSubject.findMany({
    where: { classId: ctx.classId, networkId: ctx.networkId },
    select: { id: true },
  }).then((rows: { id: string }[]) => rows.map((r) => r.id));

  if (classSubjectIds.length === 0) return NextResponse.json({ atividades: [] });

  const now = new Date();

  const activities = await (prismaEdu as any).eduActivity.findMany({
    where: {
      classSubjectId: { in: classSubjectIds },
      networkId: ctx.networkId,   // A6: network guard
      status: "PUBLISHED",
      opensAt: { lte: now },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      classSubject: { select: { id: true, subjectId: true } },
      // A4: NUNCA retorna correctIndex/explanation antes da entrega
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, question: true, options: true },
      },
      submissions: {
        where: { studentId: ctx.studentId },
        orderBy: { attempt: "desc" },
        take: 1,
        select: {
          id: true, attempt: true, status: true, aiStatus: true,
          aiScore: true, teacherScore: true, aiFeedback: true,
          submittedAt: true, evaluatedAt: true,
        },
      },
    },
  });

  const subjectIds = [...new Set(activities.map((a: any) => a.classSubject.subjectId as string))];
  const subjects = subjectIds.length
    ? await (prismaEdu as any).eduSubject.findMany({
        where: { id: { in: subjectIds }, networkId: ctx.networkId },
        select: { id: true, name: true, color: true },
      })
    : [];
  const subjectMap = Object.fromEntries(subjects.map((s: any) => [s.id, s]));

  const result = activities
    .map((a: any) => {
      const sub = a.submissions[0] ?? null;
      const subject = subjectMap[a.classSubject.subjectId] ?? null;
      const isDone = sub && ["SUBMITTED", "EVALUATED", "REVIEWED"].includes(sub.status);
      const isExpired = a.dueAt && new Date(a.dueAt) < now && !sub;
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        prompt: a.prompt,
        rubric: a.rubric,
        maxScore: a.maxScore,
        maxAttempts: a.maxAttempts,
        maxAudioSec: a.maxAudioSec,
        dueAt: a.dueAt,
        opensAt: a.opensAt,
        subject: subject ? { id: subject.id, name: subject.name, color: subject.color } : null,
        classSubjectId: a.classSubject.id,
        questions: a.type === "QUIZ" ? a.questions : [],
        submission: sub,
        isDone,
        isExpired,
        attemptsUsed: sub?.attempt ?? 0,
        canRetry: !isDone || ((sub?.attempt ?? 0) < a.maxAttempts && sub?.status === "EVALUATED"),
      };
    })
    .filter((a: any) => {
      if (filter === "todo") return !a.isDone && !a.isExpired;
      if (filter === "feito") return a.isDone;
      return true;
    });

  return NextResponse.json({ atividades: result });
}
