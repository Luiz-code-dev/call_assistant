import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // A6: isolamento — atividade deve pertencer à rede e turma do aluno
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: {
      id: params.id,
      networkId: ctx.networkId,
      classSubject: { classId: ctx.classId },
    },
    select: { id: true, title: true, prompt: true, maxScore: true, maxAttempts: true, type: true },
  });
  if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  const submission = await (prismaEdu as any).eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId, networkId: ctx.networkId },
    orderBy: { attempt: "desc" },
  });

  if (!submission) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

  return NextResponse.json({
    submissionId: submission.id,
    attempt: submission.attempt,
    status: submission.status,
    aiStatus: submission.aiStatus,
    aiScore: submission.aiScore,
    masteryLevel: submission.masteryLevel ?? null,
    aiFeedback: submission.aiFeedback,
    teacherScore: submission.teacherScore,
    teacherNote: submission.teacherNote,
    transcript: submission.transcript,
    submittedAt: submission.submittedAt,
    evaluatedAt: submission.evaluatedAt,
    reviewedAt: submission.reviewedAt,
    activity,
  });
}
