/**
 * Lembrete da agenda de estudos: a cada minuto, para cada rede, avisa o aluno cujo
 * horário de hoje chegou (até 15 minutos de atraso) e ainda não foi avisado hoje.
 * Iniciado em instrumentation.ts; não depende de cron externo.
 */
import { catalogDb } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { enviarAviso, avisoDeAgenda, avisosConfigurados } from "@/lib/escola/avisos";

const JANELA_MIN = 15;
let iniciado = false;
let rodando = false;

/** Agora no fuso de São Paulo (UTC-3): dia da semana (0 = segunda), data e minutos do dia */
export function agoraSaoPaulo(now = new Date()) {
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    weekday: (sp.getUTCDay() + 6) % 7,
    dia: sp.toISOString().slice(0, 10),
    minutos: sp.getUTCHours() * 60 + sp.getUTCMinutes(),
  };
}

export function horaEmMinutos(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** O horário entra no lembrete agora? (chegou e não passou da janela) */
export function horaDeAvisar(time: string, minutosAgora: number): boolean {
  const alvo = horaEmMinutos(time);
  return minutosAgora >= alvo && minutosAgora - alvo <= JANELA_MIN;
}

export async function avisarAgenda(now = new Date()): Promise<number> {
  if (!avisosConfigurados()) return 0;
  const { weekday, dia, minutos } = agoraSaoPaulo(now);
  const redes: Array<{ id: string }> = await catalogDb.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  let enviados = 0;
  for (const rede of redes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any;
    try { db = await getTenantDb(rede.id); } catch { continue; }
    const itens: Array<{ id: string; studentId: string; time: string; subjectCode: string | null; minutes: number }> =
      await db.eduStudyPlanItem.findMany({
        where: { networkId: rede.id, isActive: true, weekday, OR: [{ lastNotifiedOn: null }, { lastNotifiedOn: { not: dia } }] },
        select: { id: true, studentId: true, time: true, subjectCode: true, minutes: true },
      }).catch(() => []);
    for (const item of itens.filter((i) => horaDeAvisar(i.time, minutos))) {
      // Marca antes de enviar: se houver duas instâncias, só uma avisa
      const marcado = await db.eduStudyPlanItem.updateMany({
        where: { id: item.id, OR: [{ lastNotifiedOn: null }, { lastNotifiedOn: { not: dia } }] },
        data: { lastNotifiedOn: dia },
      }).catch(() => ({ count: 0 }));
      if (!marcado.count) continue;
      enviados += await enviarAviso(db, rede.id, item.studentId, avisoDeAgenda(item)).catch(() => 0);
    }
  }
  return enviados;
}

export function iniciarAvisosDaAgenda() {
  if (iniciado || !isEscolasEnabled()) return;
  iniciado = true;
  setInterval(async () => {
    if (rodando) return;
    rodando = true;
    try { await avisarAgenda(); } catch (err) { console.error("[escolas/agenda-avisos]", (err as Error).message); }
    finally { rodando = false; }
  }, 60_000);
  console.log("[escolas/agenda-avisos] lembretes da agenda ativos (a cada minuto)");
}
