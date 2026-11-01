/**
 * Worker de avaliação por IA.
 * Chamado a cada minuto por um cron job (Railway Cron, Vercel Cron, etc.).
 * Protegido por CRON_SECRET no header Authorization.
 *
 * Regras:
 * - Itera por rede (usa getTenantDb por networkId — sem prismaEdu global).
 * - Pega até 10 submissions com aiStatus=PENDING há mais de 30 segundos por rede.
 * - Marca como RUNNING, avalia, marca DONE ou incrementa aiAttempts.
 * - Após 3 falhas marca FAILED → professor revisa manualmente.
 */

import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { evaluateActivity, ModerationError } from "@/lib/escola/ai-gateway";
import { stageToAgeGroup } from "@/lib/escola/subject-lang";
import { recordMasteryEvent } from "@/lib/escola/mastery-event";
import { catalogDb } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

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

  // Busca todas as redes ativas do catálogo
  let networks: { id: string }[] = [];
  try {
    networks = await catalogDb.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      orderBy: { id: "asc" },
    });
  } catch (err) {
    console.error("[cron/evaluate] Erro ao buscar redes do catálogo:", err);
    return NextResponse.json({ error: "catalog_error" }, { status: 500 });
  }

  const allResults: { networkId: string; id: string; outcome: string }[] = [];

  for (const network of networks) {
    const networkId = network.id;
    let db: any;
    try {
      db = await getTenantDb(networkId);
    } catch {
      // Rede em manutenção ou suspensa — pula silenciosamente
      continue;
    }

    const since = new Date(Date.now() - PENDING_THRESHOLD_MS);

    let pending: any[];
    try {
      pending = await db.eduSubmission.findMany({
        where: {
          networkId,
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
    } catch {
      continue;
    }

    for (const sub of pending) {
      // Marca RUNNING atomicamente (evita processamento duplo)
      let claimed: { count: number };
      try {
        claimed = await db.eduSubmission.updateMany({
          where: { id: sub.id, aiStatus: "PENDING", networkId },
          data: { aiStatus: "RUNNING" },
        });
      } catch {
        continue;
      }
      if (claimed.count === 0) continue;

      try {
        const activity = sub.activity;
        const cs = activity.classSubject;

        const subjectData = await db.eduSubject.findUnique({
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
          maxScore: 10, // escala interna 0-10; nota oficial não é exibida ao aluno
          activityType: activity.type as "WRITTEN" | "SPOKEN",
        });

        const masteryLevel =
          result.feedback.score >= 0.7 ? "MASTERED"
          : result.feedback.score >= 0.4 ? "ALMOST"
          : "NOT_YET";

        await db.eduSubmission.update({
          where: { id: sub.id },
          data: {
            status: "EVALUATED",
            aiScore: result.feedback.score,
            aiFeedback: result.feedback,
            aiCostMs: result.costMs,
            aiCostTokens: result.costTokens,
            evaluatedAt: new Date(),
            aiStatus: "DONE",
            masteryLevel,
          },
        });

        // Grava evento de domínio por habilidade
        const skillIds: string[] = Array.isArray(activity.skillIds) ? activity.skillIds : [];
        const source = activity.lessonId ? "CLASS_ACTIVITY" : "TRACK";
        for (const skillId of skillIds) {
          await recordMasteryEvent({
            networkId: sub.networkId,
            studentId: sub.studentId,
            skillId,
            level: masteryLevel as "NOT_YET" | "ALMOST" | "MASTERED",
            source,
            submissionId: sub.id,
          }).catch(() => null);
        }
        allResults.push({ networkId, id: sub.id, outcome: "DONE" });
      } catch (err) {
        if (err instanceof ModerationError) {
          await db.eduSubmission.update({
            where: { id: sub.id },
            data: { aiStatus: "FAILED", aiAttempts: MAX_ATTEMPTS, aiLastError: err.message },
          });
          allResults.push({ networkId, id: sub.id, outcome: "MODERATION_FLAGGED" });
          continue;
        }
        const nextAttempts = (sub.aiAttempts ?? 0) + 1;
        await db.eduSubmission.update({
          where: { id: sub.id },
          data: {
            aiStatus: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
            aiAttempts: nextAttempts,
            aiLastError: err instanceof Error ? err.message : String(err),
          },
        });
        allResults.push({ networkId, id: sub.id, outcome: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "RETRY" });
      }
    }
  }

  return NextResponse.json({ processed: allResults.length, results: allResults });
}
