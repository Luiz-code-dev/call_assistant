/**
 * POST /api/escola/cron/agenda
 * Lembrete da agenda de estudos, para quando os lembretes são disparados por um agendador
 * externo (ESCOLAS_AGENDADORES=externo). Chamar uma vez por minuto.
 *
 * É a mesma rotina que roda dentro do servidor. Chamar duas vezes, ou de dois lugares,
 * não avisa em dobro: cada horário é marcado no banco antes do envio.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { chamadaDoAgendador } from "@/lib/escola/cron-auth";
import { avisarAgenda } from "@/lib/escola/agenda-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  if (!chamadaDoAgendador(req.headers.get("authorization"))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const enviados = await avisarAgenda();
    return NextResponse.json({ ok: true, enviados });
  } catch (err) {
    console.error("[cron/agenda]", (err as Error).message);
    return NextResponse.json({ ok: false, error: "Falha ao enviar os lembretes da agenda." }, { status: 500 });
  }
}
