/**
 * lib/escola/cron-auth.ts
 * Confere a chamada de um agendador externo: Authorization: Bearer <CRON_SECRET>.
 * Sem CRON_SECRET configurada a rota fica fechada (nunca aberta por esquecimento).
 * Função pura.
 */
import { timingSafeEqual } from "node:crypto";

export function chamadaDoAgendador(authorization: string | null, segredo: string | undefined = process.env.CRON_SECRET): boolean {
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`, "utf8");
  const recebido = Buffer.from(authorization ?? "", "utf8");
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
