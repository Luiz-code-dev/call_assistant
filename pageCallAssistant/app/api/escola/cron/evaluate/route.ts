/**
 * B8: Worker de avaliação por IA.
 * Chamado a cada minuto por um cron job (Railway Cron, Vercel Cron, etc.).
 * Protegido por CRON_SECRET no header Authorization.
 *
 * Regras:
 * - Pega até 10 submissions com aiStatus=PENDING há mais de 30 segundos
 * - Marca como RUNNING, avalia, marca DONE ou incrementa aiAttempts
 * - Após 3 falhas marca FAILED → professor revisa manualmente
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { evaluateActivity, ModerationError } from "@/lib/escola/ai-gateway";
import { subjectToWhisperLang, stageToAgeGroup } from "@/lib/escola/subject-lang";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const PENDING_THRESHOLD_MS = 30_000;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ ok: false }, { status: 403 });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - PENDING_THRESHOLD_MS);

  // Pega submissions pendentes (PENDING, não RUNNING) com backoff por tentativa
  const pending = await (prismaEdu as any).eduSubmission.findMany({
    where: {
      aiStatus: "PENDING",
      aiAttempts: { lt: MAX_ATTEMPTS },
      submittedAt: { lt: since },
      status: "SUBMITTED",
    },
    take: 10,
    orderBy: { submittedAt: "asc" },
    include: {
      activity: {
        include: {
          classSubject: {
            include: { class: { select: { gradeYear: true, stage: true } } },
          },
        },
      },
    },
  });

  const results: { id: string; outcome: string }[] = [];

  for (const sub of pending) {
    // Marca RUNNING atomicamente (evita processamento duplo)
    const claimed = await (prismaEdu as any).eduSubmission.updateMany({
      where: { id: sub.id, aiStatus: "PENDING" },
      data: { aiStatus: "RUNNING" },
    });
    if (claimed.count === 0) continue; // já foi pego por outra instância

    try {
      const activity = sub.activity;
      const cs = activity.classSubject;

      // Deriva idioma e contexto do componente
      const subjectData = await (prismaEdu as any).eduSubject.findUnique({
        where: { id: cs.subjectId },
        select: { name: true },
      });
      const subjectName: string = subjectData?.name ?? "";
      const gradeYear: number = cs.class?.gradeYear ?? 0;
      const stage: string = cs.class?.stage ?? "ELEMENTARY_LATE";
      const ageGroup = stageToAgeGroup(stage as any, gradeYear);

      const responseText = activity.type === "SPOKEN" ? sub.transcript : sub.text;
      if (!responseText) throw new Error("Sem conteúdo para avaliar");

      const rubric = activity.rubric as { criterios: { criterio: string; peso: number; descricao?: string }[] };
      const result = await evaluateActivity({
        studentId: sub.studentId,
        activityPrompt: activity.prompt,
        rubric: { ...rubric, subjectName, gradeYear, ageGroup },
        response: responseText,
        maxScore: Number(activity.maxScore),
        activityType: activity.type as "WRITTEN" | "SPOKEN",
      });

      await (prismaEdu as any).eduSubmission.update({
        where: { id: sub.id },
        data: {
          status: "EVALUATED",
          aiScore: result.feedback.score,
          aiFeedback: result.feedback,
          aiCostMs: result.costMs,
          aiCostTokens: result.costTokens,
          evaluatedAt: new Date(),
          aiStatus: "DONE",
        },
      });
      results.push({ id: sub.id, outcome: "DONE" });
    } catch (err) {
      // B10: moderação flagrou o conteúdo — falha imediata, sem retry
      if (err instanceof ModerationError) {
        await (prismaEdu as any).eduSubmission.update({
          where: { id: sub.id },
          data: {
            aiStatus: "FAILED",
            aiAttempts: MAX_ATTEMPTS,
            aiLastError: err.message,
          },
        });
        results.push({ id: sub.id, outcome: "MODERATION_FLAGGED" });
        continue;
      }
      const nextAttempts = (sub.aiAttempts ?? 0) + 1;
      await (prismaEdu as any).eduSubmission.update({
        where: { id: sub.id },
        data: {
          aiStatus: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          aiAttempts: nextAttempts,
          aiLastError: err instanceof Error ? err.message : String(err),
        },
      });
      results.push({ id: sub.id, outcome: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "RETRY" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
