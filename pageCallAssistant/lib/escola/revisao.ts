/**
 * Revisão de 2 minutos do Flow (repetição espaçada).
 *
 * - Cartões nascem das perguntas de quiz que o aluno errou (aiFeedback.quizDetail).
 * - Caixas 1..5: acertou, sobe e volta em 1, 2, 4, 7 ou 15 dias; errou, volta para a caixa 1
 *   e aparece amanhã. Passou da caixa 5 = firmado (caixa 6), não volta mais.
 * - Usa uma variante da pergunta quando existe, para o aluno não decorar a ordem.
 * - O navegador nunca recebe a alternativa certa antes de responder.
 */
import { diaSaoPaulo } from "@/lib/escola/semana-filho";

export const INTERVALO_DIAS = [0, 1, 2, 4, 7, 15]; // índice = caixa depois de acertar
export const CAIXA_FIRMADO = 6;
export const POR_SESSAO = 5;
export const MINIMO_PARA_MISSAO = 3;

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function depoisDeResponder(caixa: number, correto: boolean, hoje: string): { box: number; dueOn: string } {
  if (!correto) return { box: 1, dueOn: somarDias(hoje, 1) };
  const nova = Math.min(caixa + 1, CAIXA_FIRMADO);
  if (nova >= CAIXA_FIRMADO) return { box: CAIXA_FIRMADO, dueOn: "9999-12-31" };
  return { box: nova, dueOn: somarDias(hoje, INTERVALO_DIAS[nova - 1] || 1) };
}

export type Variante = { question: string; options: unknown; correctIndex: number };

/** Qual versão da pergunta mostrar: 0 = original, 1.. = variantes, alternando pelas revisões */
export function versaoDaPergunta(q: { question: string; options: unknown; correctIndex: number; variants: unknown }, revisoes: number): { indice: number; v: Variante } {
  const vs = Array.isArray(q.variants) ? (q.variants as Variante[]).filter((v) => v && typeof v.question === "string" && Array.isArray(v.options) && typeof v.correctIndex === "number") : [];
  const todas: Variante[] = [{ question: q.question, options: q.options, correctIndex: q.correctIndex }, ...vs];
  const indice = revisoes % todas.length;
  return { indice, v: todas[indice] };
}

export function hojeSP(now = new Date()): string { return diaSaoPaulo(now); }

/** IDs das perguntas erradas numa entrega de quiz */
export function perguntasErradas(aiFeedback: unknown): string[] {
  const d = (aiFeedback as { quizDetail?: Array<{ questionId?: string; correct?: boolean }> } | null)?.quizDetail;
  return Array.isArray(d) ? d.filter((x) => x && x.correct === false && typeof x.questionId === "string").map((x) => x.questionId as string) : [];
}
