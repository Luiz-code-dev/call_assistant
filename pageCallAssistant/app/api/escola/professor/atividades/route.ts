import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { suggestActivity } from "@/lib/escola/ai-gateway";

export const runtime = "nodejs";

// GET — lista atividades do professor nessa turma/componente
export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classSubjectId = searchParams.get("classSubjectId");

  const activities = await prismaEdu.eduActivity.findMany({
    where: {
      createdById: ctx.userId,
      networkId: ctx.networkId,
      ...(classSubjectId ? { classSubjectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: { where: { status: { not: "IN_PROGRESS" } } } } },
      questions: { select: { id: true }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ atividades: activities });
}

// POST — cria nova atividade
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();

  // Sugestão IA (retorna sugestão sem salvar)
  if (body.action === "sugerir") {
    const suggestion = await suggestActivity({
      subjectName: body.subjectName ?? "Português",
      gradeYear: body.gradeYear ?? 6,
      topicTitle: body.topicTitle,
      activityType: body.type ?? "WRITTEN",
    });
    return NextResponse.json({ suggestion });
  }

  const { classSubjectId, type, title, prompt, rubric, maxScore, maxAttempts, maxAudioSec, dueAt, topicId, assessmentId, status, questions } = body;
  if (!classSubjectId || !type || !title || !prompt || !rubric) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // Valida que o classSubject pertence à rede do professor
  const cs = await prismaEdu.eduClassSubject.findFirst({
    where: { id: classSubjectId },
    include: { class: { select: { networkId: true, schoolId: true } } },
  });
  if (!cs || cs.class.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  }

  const activity = await prismaEdu.eduActivity.create({
    data: {
      networkId: ctx.networkId,
      classSubjectId,
      topicId: topicId ?? null,
      assessmentId: assessmentId ?? null,
      type,
      title,
      prompt,
      rubric,
      maxScore: maxScore ?? 10,
      maxAttempts: maxAttempts ?? 2,
      maxAudioSec: maxAudioSec ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status ?? "DRAFT",
      createdById: ctx.userId,
    },
  });

  if (type === "QUIZ" && Array.isArray(questions) && questions.length > 0) {
    await prismaEdu.eduQuizQuestion.createMany({
      data: questions.map((q: { question: string; options: string[]; correctIndex: number; explanation?: string }, i: number) => ({
        activityId: activity.id,
        order: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
      })),
    });
  }

  return NextResponse.json({ activity }, { status: 201 });
}
