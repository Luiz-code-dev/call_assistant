import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { alunoPodeAbrirAtividade } from "@/lib/escola/atividade-acesso";
import { baseAtribuida } from "@/lib/escola/trilha-progresso";
import { avaliarEntrega } from "@/lib/escola/avaliar-entrega";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  // A6: isolamento — atividade deve pertencer à rede e turma do aluno
  if (!(await alunoPodeAbrirAtividade(ctx, params.id))) {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: {
      id: params.id,
      OR: [{ networkId: ctx.networkId }, { networkId: null }],
    },
    select: { id: true, title: true, prompt: true, maxScore: true, maxAttempts: true, type: true },
  });
  if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  let submission = await (prismaEdu as any).eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId, networkId: ctx.networkId },
    orderBy: { attempt: "desc" },
  });

  // Entrega escrita/falada ainda na fila (sem cron rodando, ou falha passageira): avalia agora
  if (submission?.aiStatus === "PENDING" && submission.status === "SUBMITTED" &&
      submission.submittedAt && Date.now() - new Date(submission.submittedAt).getTime() > 15_000) {
    await avaliarEntrega(prismaEdu, submission.id).catch(() => null);
    submission = await (prismaEdu as any).eduSubmission.findUnique({ where: { id: submission.id } });
  }

  if (!submission) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

  // Tentativas esgotadas em "Ainda não": a tela mostra a trilha da base que foi atribuída
  const base = submission.masteryLevel === "NOT_YET" && submission.attempt >= activity.maxAttempts
    ? await baseAtribuida(ctx, params.id).catch(() => null)
    : null;

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
    base,
  });
}
