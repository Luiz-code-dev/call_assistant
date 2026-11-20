/**
 * POST /api/escola/cron/avisos-familia
 * Aviso ao responsável de quem passou de 24 horas sem estudar, para quando os lembretes são
 * disparados por um agendador externo (ESCOLAS_AGENDADORES=externo). Chamar a cada 10 minutos.
 *
 * É a mesma rotina que roda dentro do servidor. Chamar duas vezes, ou de dois lugares,
 * não avisa em dobro: há no máximo um aviso de cada tipo por responsável, aluno e dia
 * (índice único no banco).
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { chamadaDoAgendador } from "@/lib/escola/cron-auth";
import { verificarSemEstudo } from "@/lib/escola/avisos-familia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  if (!chamadaDoAgendador(req.headers.get("authorization"))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const avisados = await verificarSemEstudo();
    return NextResponse.json({ ok: true, avisados });
  } catch (err) {
    console.error("[cron/avisos-familia]", (err as Error).message);
    return NextResponse.json({ ok: false, error: "Falha ao enviar os avisos à família." }, { status: 500 });
  }
}
