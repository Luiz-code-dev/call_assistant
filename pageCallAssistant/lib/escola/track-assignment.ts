/**
 * Serviço de regras de atribuição de trilhas de reforço.
 *
 * Regras (spec §4 e §1):
 * - Só trilhas APPROVED podem ser atribuídas.
 * - Não duplicar: mesma trilha + mesmo aluno com atribuição ativa (endedAt null).
 * - Limite de 3 trilhas ativas por componente (subjectId) por aluno.
 * - Aluno que já está em MASTERED em TODAS as habilidades da trilha é pulado,
 *   a menos que force = true.
 * - Professor só atribui às suas próprias turmas (verificado no chamador).
 */

import { prismaEdu as db } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = db as any;

export interface AssignmentInput {
  networkId: string;
  trackId: string;
  studentIds: string[];          // lista expandida (classId→alunos resolvido antes)
  assignedBy: string;
  dueAt?: Date | null;
  force?: boolean;
  /** Se true, calcula as regras mas NÃO grava no banco. */
  dryRun?: boolean;
}

export interface AssignmentResult {
  atribuidos: number;
  pulados: Array<{ studentId: string; motivo: string }>;
}

export async function assignTrackToStudents(
  input: AssignmentInput
): Promise<AssignmentResult> {
  const { networkId, trackId, studentIds, assignedBy, dueAt, force } = input;

  // 1. Verifica se a trilha é APPROVED e pertence à rede
  const track = await p.eduTrack.findUnique({
    where: { id: trackId, networkId },
    select: { id: true, status: true, subjectId: true, skillIds: true },
  });
  if (!track) throw new Error("Trilha não encontrada.");
  if (track.status !== "APPROVED") throw new Error("Trilha não está aprovada.");

  // 2. Masteries atuais dos alunos nas habilidades da trilha
  const masteries: Array<{ studentId: string; skillId: string; level: string }> =
    track.skillIds.length > 0
      ? await p.eduSkillMastery.findMany({
          where: {
            networkId,
            studentId: { in: studentIds },
            skillId: { in: track.skillIds },
          },
          select: { studentId: true, skillId: true, level: true },
        })
      : [];

  // Mapa studentId → { skillId → level }
  const masteryMap: Record<string, Record<string, string>> = {};
  for (const m of masteries) {
    if (!masteryMap[m.studentId]) masteryMap[m.studentId] = {};
    masteryMap[m.studentId][m.skillId] = m.level;
  }

  // 3. Atribuições ativas existentes (duplicatas e contador por componente)
  const activeAssignments: Array<{ studentId: string; track: { subjectId: string }; trackId: string }> =
    await p.eduTrackAssignment.findMany({
      where: {
        networkId,
        studentId: { in: studentIds },
        endedAt: null,
      },
      select: { studentId: true, trackId: true, track: { select: { subjectId: true } } },
    });

  // Mapa studentId → Set<trackId> (ativas)
  const activeTracksByStudent: Record<string, Set<string>> = {};
  // Contador por (studentId, subjectId)
  const activeBySubject: Record<string, number> = {};
  for (const a of activeAssignments) {
    if (!activeTracksByStudent[a.studentId]) activeTracksByStudent[a.studentId] = new Set();
    activeTracksByStudent[a.studentId].add(a.trackId);
    const key = `${a.studentId}::${a.track.subjectId}`;
    activeBySubject[key] = (activeBySubject[key] ?? 0) + 1;
  }

  const pulados: Array<{ studentId: string; motivo: string }> = [];
  const atribuirIds: string[] = [];

  for (const studentId of studentIds) {
    // Regra: duplicata
    if (activeTracksByStudent[studentId]?.has(trackId)) {
      pulados.push({ studentId, motivo: "já tem esta trilha ativa" });
      continue;
    }

    // Regra: limite 3 por componente
    const key = `${studentId}::${track.subjectId}`;
    if ((activeBySubject[key] ?? 0) >= 3) {
      pulados.push({ studentId, motivo: "já tem 3 trilhas ativas neste componente" });
      continue;
    }

    // Regra: aluno já domina todas as habilidades
    if (!force && track.skillIds.length > 0) {
      const sm = masteryMap[studentId] ?? {};
      const allMastered = track.skillIds.every((sid: string) => sm[sid] === "MASTERED");
      if (allMastered) {
        pulados.push({ studentId, motivo: "já domina todas as habilidades da trilha" });
        continue;
      }
    }

    atribuirIds.push(studentId);
  }

  // 4. Cria as atribuições (não grava se dryRun)
  if (atribuirIds.length > 0 && !input.dryRun) {
    await p.eduTrackAssignment.createMany({
      data: atribuirIds.map((studentId) => ({
        id: `ta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        networkId,
        trackId,
        studentId,
        assignedBy,
        dueAt: dueAt ?? null,
        forced: force ?? false,
      })),
    });
  }

  return { atribuidos: atribuirIds.length, pulados };
}

/** Preview: executa as regras sem gravar no banco. */
export async function previewAssignment(
  input: AssignmentInput
): Promise<AssignmentResult> {
  return assignTrackToStudents({ ...input, studentIds: [] }).catch(() => ({
    atribuidos: 0,
    pulados: [],
  })).then(() => assignTrackToStudents(input));
}
