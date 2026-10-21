import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { evaluateActivity, gradeQuiz } from "@/lib/escola/ai-gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { text, transcript, audioKey, quizAnswers } = body as {
    text?: string; transcript?: string; audioKey?: string; quizAnswers?: { questionId: string; selectedIndex: number }[];
  };

  const activity = await prismaEdu.eduActivity.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!activity || activity.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }
  if (activity.dueAt && activity.dueAt < new Date()) {
    return NextResponse.json({ error: "Prazo encerrado" }, { status: 409 });
  }

  // Conta tentativas usadas
  const usedAttempts = await prismaEdu.eduSubmission.count({
    where: { activityId: params.id, studentId: ctx.studentId, status: { not: "IN_PROGRESS" } },
  });
  if (usedAttempts >= activity.maxAttempts) {
    return NextResponse.json({ error: "Tentativas esgotadas" }, { status: 409 });
  }

  // Encontra ou cria submission IN_PROGRESS
  let submission = await prismaEdu.eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId, status: "IN_PROGRESS" },
    orderBy: { attempt: "desc" },
  });

  const attempt = submission?.attempt ?? usedAttempts + 1;

  if (!submission) {
    submission = await prismaEdu.eduSubmission.create({
      data: {
        networkId: ctx.networkId,
        activityId: params.id,
        studentId: ctx.studentId,
        attempt,
        status: "IN_PROGRESS",
        text: text ?? null,
        transcript: transcript ?? null,
        audioKey: audioKey ?? null,
        quizAnswers: quizAnswers ? JSON.stringify(quizAnswers) : null,
      },
    });
  } else {
    submission = await prismaEdu.eduSubmission.update({
      where: { id: submission.id },
      data: {
        text: text ?? submission.text,
        transcript: transcript ?? submission.transcript,
        audioKey: audioKey ?? submission.audioKey,
        quizAnswers: quizAnswers ? JSON.stringify(quizAnswers) : submission.quizAnswers,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });
  }

  // Marca como submetido imediatamente (entrega segura antes da avaliação)
  if (submission.status === "IN_PROGRESS") {
    await prismaEdu.eduSubmission.update({
      where: { id: submission.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
  }

  // Avaliação assíncrona pela IA (ou auto-correção para QUIZ)
  if (activity.type === "QUIZ") {
    try {
      const answers: { questionId: string; selectedIndex: number }[] =
        quizAnswers ?? (submission.quizAnswers ? JSON.parse(String(submission.quizAnswers)) : []);
      const result = gradeQuiz(activity.questions, answers, Number(activity.maxScore));
      const feedback = {
        score: result.score,
        porCriterio: [],
        acertos: result.perQuestion.filter((q) => q.correct).map((q) => `Questão ${activity.questions.findIndex((aq: { id: string }) => aq.id === q.questionId) + 1} correta`),
        melhorar: result.perQuestion.filter((q) => !q.correct).map((q) => q.explanation ?? `Questão ${activity.questions.findIndex((aq: { id: string }) => aq.id === q.questionId) + 1}: reveja o conteúdo`),
        exemplo: "",
        quizDetail: result.perQuestion,
      };
      await prismaEdu.eduSubmission.update({
        where: { id: submission.id },
        data: { status: "EVALUATED", aiScore: result.score, aiFeedback: feedback, evaluatedAt: new Date() },
      });
    } catch {
      // Quiz mantido como SUBMITTED se falhar (não deve acontecer)
    }
  } else {
    // Avaliação IA para WRITTEN/SPOKEN — assíncrona, falha segura
    const responseText = activity.type === "SPOKEN" ? transcript : text;
    if (responseText) {
      setImmediate(async () => {
        try {
          const rubric = activity.rubric as { criterios: { criterio: string; peso: number; descricao?: string }[] };
          const result = await evaluateActivity({
            studentId: ctx.studentId,
            activityPrompt: activity.prompt,
            rubric: { ...rubric, subjectName: undefined, gradeYear: undefined },
            response: responseText,
            maxScore: Number(activity.maxScore),
            activityType: activity.type as "WRITTEN" | "SPOKEN",
          });
          await prismaEdu.eduSubmission.update({
            where: { id: submission.id },
            data: {
              status: "EVALUATED",
              aiScore: result.feedback.score,
              aiFeedback: result.feedback,
              aiCostMs: result.costMs,
              aiCostTokens: result.costTokens,
              evaluatedAt: new Date(),
            },
          });
        } catch {
          // Se IA falhar: mantém SUBMITTED → "aguardando professor"
        }
      });
    }
  }

  return NextResponse.json({ submissionId: submission.id, status: "SUBMITTED" });
}
