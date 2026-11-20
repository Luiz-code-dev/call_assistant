/**
 * GET /api/escola/health
 * Sinal de vida para o balanceador: responde rápido e não toca em banco.
 *
 * GET /api/escola/health?completo=1  (Authorization: Bearer <CRON_SECRET>)
 * Conferência antes de virar o tráfego: catálogo, cada banco das redes ativas e o modo
 * desta instância. Só diz "ok" ou "falhou": não devolve endereço, usuário nem mensagem do banco.
 */
import { NextRequest, NextResponse } from "next/server";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { chamadaDoAgendador } from "@/lib/escola/cron-auth";
import { agendadoresInternos, apenasEscolas } from "@/lib/escola/escopo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const semCache = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("completo") !== "1") {
    return NextResponse.json({ ok: true }, { headers: semCache });
  }
  if (!chamadaDoAgendador(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401, headers: semCache });
  }

  const resultado: {
    ok: boolean; escolasLigado: boolean; escopo: string; agendadores: string;
    catalogo: "ok" | "falhou"; redes: { total: number; ok: number; falharam: string[] };
  } = {
    ok: true,
    escolasLigado: isEscolasEnabled(),
    escopo: apenasEscolas() ? "escolas" : "completo",
    agendadores: agendadoresInternos() ? "interno" : "externo",
    catalogo: "ok",
    redes: { total: 0, ok: 0, falharam: [] },
  };

  try {
    // Importação tardia: o sinal de vida simples não carrega nada de banco.
    const [{ catalogDb }, { getTenantDb }] = await Promise.all([import("@/lib/escola/catalogo"), import("@/lib/escola/tenant-db")]);
    const redes: Array<{ id: string }> = await catalogDb.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true }, orderBy: { id: "asc" } });
    resultado.redes.total = redes.length;
    for (const rede of redes) {
      try {
        const db = await getTenantDb(rede.id);
        // Passa pelo isolamento por rede (RLS): se o papel do banco estiver errado, falha aqui.
        await db.eduNetwork.findUnique({ where: { id: rede.id }, select: { id: true } });
        resultado.redes.ok++;
      } catch {
        resultado.redes.falharam.push(rede.id);
      }
    }
  } catch {
    resultado.catalogo = "falhou";
  }

  resultado.ok = resultado.catalogo === "ok" && resultado.redes.falharam.length === 0;
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 503, headers: semCache });
}
