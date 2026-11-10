/**
 * lib/escola/mastery-event.ts
 *
 * Grava EduSkillMasteryEvent e atualiza EduSkillMastery (regra das 3 últimas).
 * Usado por: trilha (concluir), diagnóstico, atividade da turma (CLASS_ACTIVITY).
 */

import { prismaEdu as db } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = db as any;

export type MasteryLevel = "NOT_YET" | "ALMOST" | "MASTERED";
export type MasterySource = "TRACK" | "DIAGNOSTIC" | "CLASS_ACTIVITY" | "TEACHER" | string;

const LEVEL_ORDER: Record<MasteryLevel, number> = { NOT_YET: 1, ALMOST: 2, MASTERED: 3 };

/**
 * Nível consolidado das observações de uma habilidade (da mais antiga para a mais recente).
 *
 * A observação mais recente decide a direção; as 3 últimas decidem até onde ir.
 * Antes era só a maioria das 3 últimas: o diagnóstico grava uma observação por questão,
 * então depois de 2 erros no diagnóstico um quiz da trilha todo certo continuava
 * "Ainda não" e a evolução parecia parada.
 *   - última Domina: Domina se 2 das 3 últimas forem Domina ou se o histórico já era
 *     Quase lá; senão Quase lá (avança um degrau por vez)
 *   - última Quase lá: Quase lá
 *   - última Ainda não: Ainda não se a maioria das 3 últimas for Ainda não; senão Quase lá
 */
export function consolidate(events: MasteryLevel[]): MasteryLevel {
  if (!events.length) return "NOT_YET";
  const last3 = events.slice(-3);
  const ultima = last3[last3.length - 1];
  const conta = (l: MasteryLevel) => last3.filter((x) => x === l).length;
  const anteriores = last3.slice(0, -1);
  const historicoBom = anteriores.length > 0 && anteriores.every((x) => LEVEL_ORDER[x] >= LEVEL_ORDER.ALMOST);
  if (ultima === "MASTERED") return conta("MASTERED") >= 2 || historicoBom || anteriores.length === 0 ? "MASTERED" : "ALMOST";
  if (ultima === "ALMOST") return "ALMOST";
  return conta("NOT_YET") >= 2 || anteriores.length === 0 ? "NOT_YET" : "ALMOST";
}

export async function recordMasteryEvent(opts: {
  networkId: string;
  studentId: string;
  skillId: string;
  level: MasteryLevel;
  source: MasterySource;
  submissionId?: string;
}): Promise<void> {
  const { networkId, studentId, skillId, level, source } = opts;

  // Grava o evento. EduSkillMasteryEvent não tem coluna submissionId: enviá-la
  // fazia o Prisma recusar o create e nenhum evento de domínio era gravado.
  await p.eduSkillMasteryEvent.create({
    data: { networkId, studentId, skillId, level, source },
  });

  // Recalcula o nível consolidado a partir das últimas 3 observações
  const events = await p.eduSkillMasteryEvent.findMany({
    where: { networkId, studentId, skillId },
    orderBy: { createdAt: "asc" },
    select: { level: true },
  });
  const levels: MasteryLevel[] = events.map((e: { level: string }) => e.level as MasteryLevel);
  const consolidated = consolidate(levels);

  // Upsert no EduSkillMastery
  await p.eduSkillMastery.upsert({
    where: { studentId_skillId: { studentId, skillId } },
    create: { networkId, studentId, skillId, level: consolidated, source, updatedAt: new Date() },
    update: { level: consolidated, source, updatedAt: new Date() },
  });
}

/**
 * Grava erros comuns: para cada resposta incorreta com misconceptionCode,
 * incrementa o contador em EduSubmission.
 * O payload de misconceptionCodes já vem pré-computado no gradeQuiz.
 */
export function extractMisconceptionCodes(
  questions: Array<{ id: string; options: unknown; correctIndex: number; misconceptionCode?: string | null }>,
  answers: Array<{ questionId: string; selectedIndex: number }>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const ans of answers) {
    const q = questions.find(q => q.id === ans.questionId);
    if (!q) continue;
    if (ans.selectedIndex === q.correctIndex) continue; // acertou — sem misconception
    // Tenta extrair misconceptionCode da opção selecionada (campo no JSON de options)
    const opts = Array.isArray(q.options) ? q.options : [];
    const selectedOpt = opts[ans.selectedIndex] as Record<string, unknown> | undefined;
    const code = (selectedOpt?.misconceptionCode as string | undefined)
      ?? q.misconceptionCode
      ?? null;
    if (code) result[q.id] = code;
  }
  return result;
}
