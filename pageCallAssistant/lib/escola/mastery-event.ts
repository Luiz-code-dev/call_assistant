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
 * Retorna o nível consolidado baseado nas 3 últimas observações de uma habilidade.
 * Regra: maioria simples dos 3 últimos eventos.
 */
function consolidate(events: MasteryLevel[]): MasteryLevel {
  const last3 = events.slice(-3);
  const counts: Record<MasteryLevel, number> = { NOT_YET: 0, ALMOST: 0, MASTERED: 0 };
  for (const l of last3) if (l in counts) counts[l]++;
  // Nível mais alto com maioria, ou simplesmente o mais alto entre os últimos 3
  const sorted = (Object.keys(counts) as MasteryLevel[]).sort(
    (a, b) => counts[b] - counts[a] || LEVEL_ORDER[b] - LEVEL_ORDER[a]
  );
  return sorted[0];
}

export async function recordMasteryEvent(opts: {
  networkId: string;
  studentId: string;
  skillId: string;
  level: MasteryLevel;
  source: MasterySource;
  submissionId?: string;
}): Promise<void> {
  const { networkId, studentId, skillId, level, source, submissionId } = opts;

  // Grava o evento
  await p.eduSkillMasteryEvent.create({
    data: { networkId, studentId, skillId, level, source, submissionId: submissionId ?? null },
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
