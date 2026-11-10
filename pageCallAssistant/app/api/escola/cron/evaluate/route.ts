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
import { ModerationError } from "@/lib/escola/ai-gateway";
import { avaliarEntrega, MAX_TENTATIVAS_IA } from "@/lib/escola/avaliar-entrega";
import { catalogDb } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

export const runtime = "nodejs";
export const maxDuration = 300;

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
          aiAttempts: { lt: MAX_TENTATIVAS_IA },
          submittedAt: { lt: since },
          status: "SUBMITTED",
        },
        take: 10,
        orderBy: { submittedAt: "asc" },
        select: { id: true },
      });
    } catch {
      continue;
    }

    for (const sub of pending) {
      try {
        const nivel = await avaliarEntrega(db, sub.id);
        if (nivel) allResults.push({ networkId, id: sub.id, outcome: "DONE" });
      } catch (err) {
        allResults.push({ networkId, id: sub.id, outcome: err instanceof ModerationError ? "MODERATION_FLAGGED" : "RETRY" });
      }
    }
  }

  return NextResponse.json({ processed: allResults.length, results: allResults });
}
