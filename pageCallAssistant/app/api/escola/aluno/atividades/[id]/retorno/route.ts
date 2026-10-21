import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const submission = await prismaEdu.eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId },
    orderBy: { attempt: "desc" },
    include: {
      activity: {
        select: { id: true, title: true, prompt: true, maxScore: true, maxAttempts: true, type: true },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

  return NextResponse.json({
    submissionId: submission.id,
    attempt: submission.attempt,
    status: submission.status,
    aiScore: submission.aiScore,
    aiFeedback: submission.aiFeedback,
    teacherScore: submission.teacherScore,
    teacherNote: submission.teacherNote,
    transcript: submission.transcript,
    submittedAt: submission.submittedAt,
    evaluatedAt: submission.evaluatedAt,
    reviewedAt: submission.reviewedAt,
    activity: submission.activity,
  });
}
