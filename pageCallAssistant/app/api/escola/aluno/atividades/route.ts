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

  const classSubjectIds: string[] = await prismaEdu.eduClassSubject.findMany({
    where: { classId: ctx.classId },
    select: { id: true },
  }).then((rows: { id: string }[]) => rows.map((r) => r.id));

  if (classSubjectIds.length === 0) return NextResponse.json({ atividades: [] });

  const now = new Date();

  const whereBase = {
    classSubjectId: { in: classSubjectIds },
    status: "PUBLISHED",
    opensAt: { lte: now },
  };

  const activities = await prismaEdu.eduActivity.findMany({
    where: whereBase,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      classSubject: {
        include: { class: { select: { name: true } } },
      },
      questions: { orderBy: { order: "asc" }, select: { id: true, order: true, question: true, options: true, correctIndex: true, explanation: true } },
      submissions: {
        where: { studentId: ctx.studentId },
        orderBy: { attempt: "desc" },
        take: 1,
        select: { id: true, attempt: true, status: true, aiScore: true, teacherScore: true, aiFeedback: true, submittedAt: true, evaluatedAt: true },
      },
    },
  });

  // Enriquece com nome do componente curricular
  const subjectIds = [...new Set(activities.map((a: { classSubject: { subjectId: string } }) => a.classSubject.subjectId))];
  const subjects = subjectIds.length
    ? await prismaEdu.eduSubject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, color: true } })
    : [];
  const subjectMap = Object.fromEntries(subjects.map((s: { id: string; name: string; color: string | null }) => [s.id, s]));

  const result = activities
    .map((a: {
      id: string; title: string; type: string; status: string; prompt: string;
      rubric: unknown; maxScore: number; maxAttempts: number; maxAudioSec: number | null;
      dueAt: Date | null; opensAt: Date; createdAt: Date;
      classSubject: { id: string; subjectId: string; classId: string };
      questions: unknown[]; submissions: { id: string; attempt: number; status: string; aiScore: number | null; teacherScore: number | null; aiFeedback: unknown; submittedAt: Date | null; evaluatedAt: Date | null }[];
    }) => {
      const sub = a.submissions[0] ?? null;
      const subject = subjectMap[a.classSubject.subjectId] ?? null;
      const isDone = sub && ["SUBMITTED", "EVALUATED", "REVIEWED"].includes(sub.status);
      const isExpired = a.dueAt && a.dueAt < now && !sub;
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
    .filter((a: { isDone: boolean; isExpired: boolean | Date }) => {
      if (filter === "todo") return !a.isDone && !a.isExpired;
      if (filter === "feito") return a.isDone;
      return true; // historico
    });

  return NextResponse.json({ atividades: result });
}
