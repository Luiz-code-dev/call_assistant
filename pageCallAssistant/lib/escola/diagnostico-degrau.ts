/**
 * lib/escola/diagnostico-degrau.ts
 *
 * Lógica do "diagnóstico com degrau": quando um aluno fica em NOT_YET
 * numa habilidade do ano, o sistema adiciona itens do pré-requisito aprovado
 * de maior peso, até 2 degraus para trás.
 *
 * Limites:
 *   - Máx 2 degraus para trás
 *   - Máx 20 itens no diagnóstico (contando os já existentes)
 *   - Máx 25 minutos estimados no total
 *
 * Todas as funções são puras para facilitar testes.
 */

import { prismaEdu as db } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = db as any;

export interface DegrauInput {
  networkId: string;
  diagnosticId: string;  // EduDiagnostic.id
  studentId: string;     // para rastrear respostas já salvas
  skillCode: string;     // habilidade que ficou em NOT_YET
  currentItemCount: number;   // itens já no diagnóstico deste aluno
  currentMinutes: number;     // tempo estimado acumulado
  /** Nível do degrau que será criado (1 = primeiro passo atrás). Padrão 1. */
  nivel?: number;
  /** Atividades que já estão na sessão do aluno (não repetir). */
  excluirActivityIds?: string[];
}

export interface DegrauResult {
  /** Atividades adicionadas ao diagnóstico do aluno (podem ser 0 se já no limite) */
  added: Array<{ activityId: string; skillCode: string; degrau: number }>;
  /** Habilidades pré-requisito encontradas (mesmo que não adicionadas por limite) */
  prereqs: Array<{ skillCode: string; skillId: string; weight: number }>;
}

const MAX_ITENS = 20;
const MAX_MINUTOS = 25;
const MAX_DEGRAUS = 2;

/**
 * Busca pré-requisitos aprovados de uma habilidade, ordenados por peso desc.
 */
export async function getApprovedPrereqs(
  networkId: string,
  skillId: string
): Promise<Array<{ skillId: string; skillCode: string; weight: number }>> {
  const rows = await p.eduSkillPrerequisite.findMany({
    where: {
      skillId,
      status: "APPROVED",
      OR: [{ networkId: null }, { networkId }],
    },
    orderBy: { weight: "desc" },
    include: { prerequisiteSkill: { select: { id: true, code: true } } },
  });
  return rows.map((r: { weight: number; prerequisiteSkill: { id: string; code: string } }) => ({
    skillId: r.prerequisiteSkill.id,
    skillCode: r.prerequisiteSkill.code,
    weight: r.weight,
  }));
}

/**
 * Atividades de quiz para o degrau de uma habilidade de pré-requisito.
 *
 * Ordem de busca:
 *   1. itens DEGRAU_BANK do próprio diagnóstico, daquela habilidade;
 *   2. só depois, qualquer outra atividade de quiz publicada da habilidade
 *      (SpeakFlow ou da rede).
 * Nunca repete atividade que já está na sessão do aluno.
 */
export async function findDegrauActivities(
  networkId: string,
  skillId: string,
  diagnosticId: string,
  excluir: Set<string>,
  quantidade: number,
  apenasBanco = false
): Promise<Array<{ id: string; estMinutes: number }>> {
  const escolhidas: Array<{ id: string; estMinutes: number }> = [];
  if (quantidade <= 0) return escolhidas;

  const banco: Array<{ activityId: string; activity: { estMinutes: number | null } }> = await p.eduDiagnosticItem.findMany({
    where: { diagnosticId, skillId, role: "DEGRAU_BANK", isDegrauLegacy: false },
    orderBy: { order: "asc" },
    select: { activityId: true, activity: { select: { estMinutes: true } } },
  });
  for (const b of banco) {
    if (escolhidas.length >= quantidade) return escolhidas;
    if (excluir.has(b.activityId) || escolhidas.some((e) => e.id === b.activityId)) continue;
    escolhidas.push({ id: b.activityId, estMinutes: b.activity?.estMinutes ?? 2 });
  }
  if (escolhidas.length >= quantidade || apenasBanco) return escolhidas;

  const outras: Array<{ id: string; estMinutes: number | null }> = await p.eduActivity.findMany({
    where: {
      networkId: { in: [networkId, null] },
      skillIds: { has: skillId },
      type: "QUIZ",
      status: "PUBLISHED",
    },
    orderBy: { id: "asc" },
    select: { id: true, estMinutes: true },
    take: 20,
  });
  for (const a of outras) {
    if (escolhidas.length >= quantidade) break;
    if (excluir.has(a.id) || escolhidas.some((e) => e.id === a.id)) continue;
    escolhidas.push({ id: a.id, estMinutes: a.estMinutes ?? 2 });
  }
  return escolhidas;
}

/**
 * Um passo do degrau para uma habilidade que ficou em NOT_YET:
 * escolhe o pré-requisito APPROVED de maior peso e até 2 atividades dele.
 * Descer mais um nível é decisão de quem chama, depois que o aluno
 * responder o degrau (no máximo MAX_DEGRAUS).
 */
export async function calcularDegrau(input: DegrauInput): Promise<DegrauResult> {
  const { networkId, diagnosticId, skillCode, currentItemCount, currentMinutes } = input;
  const nivel = input.nivel ?? 1;
  const result: DegrauResult = { added: [], prereqs: [] };
  if (nivel > MAX_DEGRAUS || currentItemCount >= MAX_ITENS || currentMinutes >= MAX_MINUTOS) return result;

  const skill = await p.eduSkill.findUnique({ where: { code: skillCode }, select: { id: true } });
  if (!skill) return result;

  const prereqs = await getApprovedPrereqs(networkId, skill.id);
  const excluir = new Set(input.excluirActivityIds ?? []);
  const vagas = Math.min(2, MAX_ITENS - currentItemCount);

  // 1ª passada: o pré-requisito de maior peso que tem questões no banco do degrau
  //   (um pré-requisito do mesmo ano costuma já estar na sequência normal e não tem banco);
  // 2ª passada: o de maior peso com qualquer outra atividade de quiz.
  for (const apenasBanco of [true, false]) {
    for (const prereq of prereqs) {
      const acts = await findDegrauActivities(networkId, prereq.skillId, diagnosticId, excluir, vagas, apenasBanco);
      if (!acts.length) continue;
      result.prereqs.push(prereq);
      let minutos = currentMinutes;
      for (const act of acts) {
        if (minutos >= MAX_MINUTOS) break;
        result.added.push({ activityId: act.id, skillCode: prereq.skillCode, degrau: nivel });
        minutos += act.estMinutes;
      }
      return result;
    }
  }
  return result;
}

/**
 * Regra para descer um degrau a partir de uma resposta errada:
 * o aluno errou as 2 questões da habilidade, ou errou 1 marcando uma
 * alternativa com erro comum (misconceptionCode).
 */
export function deveDescerDegrau(input: {
  acertou: boolean;
  temErroComum: boolean;
  errosNaHabilidade: number;
  nivelAtual: number;
  jaDesceuDestaHabilidade: boolean;
}): boolean {
  if (input.acertou || input.jaDesceuDestaHabilidade) return false;
  if (input.nivelAtual >= MAX_DEGRAUS) return false;
  return input.errosNaHabilidade >= 2 || input.temErroComum;
}

/**
 * Grava os itens do degrau no EduDiagnosticItem e registra o nível do pré-requisito.
 * Chamado após calcularDegrau, na rota de submissão do diagnóstico.
 */
export async function aplicarDegrau(
  networkId: string,
  diagnosticId: string,
  studentId: string,
  degrauResult: DegrauResult,
  startOrder: number
): Promise<void> {
  if (!degrauResult.added.length) return;

  const now = new Date();
  for (let i = 0; i < degrauResult.added.length; i++) {
    const item = degrauResult.added[i];
    const id = `DEGRAU-${diagnosticId}-${studentId}-${item.activityId}`;
    await p.eduDiagnosticItem.upsert({
      where: { id },
      create: {
        id,
        diagnosticId,
        activityId: item.activityId,
        order: startOrder + i,
        createdAt: now,
      },
      update: {},
    });
  }
}
