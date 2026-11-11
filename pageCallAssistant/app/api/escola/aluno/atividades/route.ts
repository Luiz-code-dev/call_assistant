import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { textosDasOpcoes } from "@/lib/escola/opcoes-aluno";
import { conferirEtapasFeitas } from "@/lib/escola/trilha-progresso";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "todo"; // todo | feito | historico

  // A6: isolamento — somente componentes da turma do aluno na sua rede
  const classSubjectIds: string[] = await (prismaEdu as any).eduClassSubject.findMany({
    where: { classId: ctx.classId, networkId: ctx.networkId },
    select: { id: true },
  }).then((rows: { id: string }[]) => rows.map((r) => r.id));

  // Sem componentes na turma ainda há o reforço (atividades de trilha da biblioteca):
  // não retornar vazio aqui.

  const now = new Date();

  // IDs de atividades referenciadas pelas trilhas ativas do aluno (biblioteca global)
  const activeAssignments = await (prismaEdu as any).eduTrackAssignment.findMany({
    where: {
      networkId: ctx.networkId,
      endedAt: null,
      OR: [{ classId: ctx.classId }, { studentId: ctx.studentId }],
      track: { status: "APPROVED" },
    },
    include: {
      track: { include: { items: { orderBy: { order: "asc" }, select: { id: true, activityId: true } } } },
      progress: { where: { studentId: ctx.studentId }, select: { completedItemIds: true, completedAt: true } },
    },
  });
  // Etapas já feitas que a trilha ainda não marcou: senão "A fazer" mostra de novo uma etapa feita
  await conferirEtapasFeitas(ctx, activeAssignments).catch((err: Error) => console.error("[aluno/atividades] conferir:", err.message));
  // A fazer: só a próxima etapa de cada trilha, para o aluno seguir a ordem
  // (antes vinham as 5 etapas juntas e dava para fazer "Explicar" antes de "Relembrar").
  // Feitas e histórico: todas as etapas da trilha.
  const libraryActivityIds: string[] = Array.from(new Set<string>(
    activeAssignments.flatMap((a: any) => {
      if (filter !== "todo") return a.track.items.map((i: any) => i.activityId as string);
      const feitos: string[] = a.progress?.[0]?.completedItemIds ?? [];
      const proximo = a.track.items.find((i: any) => !feitos.includes(i.id));
      return proximo ? [proximo.activityId as string] : [];
    })
  ));

  const ACTIVITY_INCLUDE = {
    classSubject: { select: { id: true, subjectId: true } },
    // A4: NUNCA retorna correctIndex/explanation antes da entrega
    questions: {
      orderBy: { order: "asc" as const },
      select: { id: true, order: true, question: true, options: true },
    },
    submissions: {
      where: { studentId: ctx.studentId },
      orderBy: { attempt: "desc" as const },
      take: 1,
      select: {
        id: true, attempt: true, status: true, aiStatus: true,
        aiScore: true, teacherScore: true, aiFeedback: true,
        submittedAt: true, evaluatedAt: true, masteryLevel: true,
      },
    },
  };

  // Atividades da turma (networkId + classSubjectId)
  const classActivities = classSubjectIds.length > 0
    ? await (prismaEdu as any).eduActivity.findMany({
        where: {
          classSubjectId: { in: classSubjectIds },
          networkId: ctx.networkId,
          status: "PUBLISHED",
          opensAt: { lte: now },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        include: ACTIVITY_INCLUDE,
      })
    : [];

  // Atividades de biblioteca (classSubjectId null) acessadas via trilha ativa
  const libraryActivities = libraryActivityIds.length > 0
    ? await (prismaEdu as any).eduActivity.findMany({
        where: {
          id: { in: libraryActivityIds },
          classSubjectId: null,
          status: "PUBLISHED",
        },
        include: ACTIVITY_INCLUDE,
      })
    : [];

  // IDs de atividades de turma para evitar duplicatas
  const classActivityIds = new Set(classActivities.map((a: any) => a.id as string));
  const activities = [
    ...classActivities,
    ...libraryActivities.filter((a: any) => !classActivityIds.has(a.id)),
  ];

  const subjectIds = Array.from(new Set(
    activities.flatMap((a: any) => a.classSubject?.subjectId ? [a.classSubject.subjectId as string] : [])
  ));
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
      const subject = a.classSubject?.subjectId ? (subjectMap[a.classSubject.subjectId] ?? null) : null;
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
        // Atividades da trilha (biblioteca) não têm componente da turma: a matéria vem do código (MA, LP...)
        subjectCode: a.subjectCode ?? null,
        classSubjectId: a.classSubject?.id ?? null,
        // Só o texto das alternativas: misconceptionCode e correctIndex ficam no servidor
        questions: a.type === "QUIZ"
          ? a.questions.map((q: { id: string; order: number; question: string; options: unknown }) => ({
              id: q.id, order: q.order, question: q.question, options: textosDasOpcoes(q.options),
            }))
          : [],
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
