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
 * Encontra uma atividade de diagnóstico publicada para a habilidade,
 * que ainda não foi respondida pelo aluno neste diagnóstico.
 */
async function findDiagnosticActivity(
  networkId: string,
  skillId: string,
  diagnosticId: string,
  studentId: string
): Promise<{ id: string; estMinutes: number } | null> {
  // Busca atividades de diagnóstico para a habilidade (conteúdo SpeakFlow ou da rede)
  const acts = await p.eduActivity.findMany({
    where: {
      networkId: networkId === "null" ? null : { in: [networkId, null] },
      skillIds: { has: skillId },
      type: { in: ["QUIZ", "WRITTEN"] },
      status: "PUBLISHED",
    },
    select: { id: true, estMinutes: true },
    take: 5,
  });
  if (!acts.length) return null;

  // Filtra as que o aluno já respondeu neste diagnóstico
  // (submissões existentes para qualquer atividade deste diagnóstico)
  const diagItems = await p.eduDiagnosticItem.findMany({
    where: { diagnosticId },
    select: { activityId: true },
  });
  const diagActIds = new Set(diagItems.map((i: { activityId: string }) => i.activityId));

  const subs = await p.eduSubmission.findMany({
    where: {
      studentId,
      networkId,
      activityId: { in: Array.from(diagActIds) },
      status: { not: "IN_PROGRESS" },
    },
    select: { activityId: true },
  });
  const doneIds = new Set(subs.map((s: { activityId: string }) => s.activityId));

  return acts.find((a: { id: string }) => !doneIds.has(a.id)) ?? null;
}

/**
 * Executa o degrau para uma habilidade que ficou em NOT_YET.
 * Retorna a lista de itens que devem ser adicionados ao diagnóstico do aluno.
 */
export async function calcularDegrau(input: DegrauInput): Promise<DegrauResult> {
  const { networkId, diagnosticId, studentId, skillCode, currentItemCount, currentMinutes } = input;

  const skill = await p.eduSkill.findUnique({ where: { code: skillCode }, select: { id: true } });
  if (!skill) return { added: [], prereqs: [] };

  const result: DegrauResult = { added: [], prereqs: [] };
  let itemCount = currentItemCount;
  let minutes = currentMinutes;
  let currentSkillId = skill.id;

  for (let degrau = 1; degrau <= MAX_DEGRAUS; degrau++) {
    if (itemCount >= MAX_ITENS || minutes >= MAX_MINUTOS) break;

    const prereqs = await getApprovedPrereqs(networkId, currentSkillId);
    if (!prereqs.length) break;

    const best = prereqs[0]; // maior peso
    result.prereqs.push(best);

    // Tenta adicionar 1 ou 2 itens do pré-requisito
    const toAdd = Math.min(2, MAX_ITENS - itemCount);
    let added = 0;
    for (let i = 0; i < toAdd && minutes < MAX_MINUTOS; i++) {
      const act = await findDiagnosticActivity(networkId, best.skillId, diagnosticId, studentId);
      if (!act) break;

      result.added.push({ activityId: act.id, skillCode: best.skillCode, degrau });
      itemCount++;
      minutes += act.estMinutes ?? 5;
      added++;
    }

    if (added === 0) break;
    currentSkillId = best.skillId; // próximo degrau parte daqui
  }

  return result;
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
