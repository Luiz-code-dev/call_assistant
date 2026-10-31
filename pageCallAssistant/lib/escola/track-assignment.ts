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

// ── Atribuição pós-diagnóstico (AUTO / SUGGEST) ────────────────────────────

export interface PostDiagnosticInput {
  networkId: string;
  diagnosticId: string;
  studentId: string;
  /** Habilidades em NOT_YET (mais básica primeiro) */
  notYetSkillIds: string[];
  assignedBy: string; // userId do acionador (sistema = "system")
}

export interface PostDiagnosticResult {
  mode: "AUTO" | "SUGGEST";
  atribuidos: number;
  sugeridos: number;
  detalhes: Array<{ skillId: string; trackId: string | null; acao: string }>;
}

/**
 * Após um diagnóstico, para cada habilidade em NOT_YET:
 *   - Busca a trilha publicada da habilidade (ou do pré-requisito mais básico).
 *   - Se EduNetwork.trackAssignmentMode = AUTO → atribui direto (até 3/componente).
 *   - Se SUGGEST → cria EduTeacherAlert com sugestão.
 */
export async function assignAfterDiagnostic(
  input: PostDiagnosticInput
): Promise<PostDiagnosticResult> {
  const { networkId, studentId, notYetSkillIds, assignedBy } = input;

  // Lê configuração da rede
  const network = await p.eduNetwork.findUnique({
    where: { id: networkId },
    select: { trackAssignmentMode: true },
  });
  const mode: "AUTO" | "SUGGEST" = network?.trackAssignmentMode === "AUTO" ? "AUTO" : "SUGGEST";

  const detalhes: PostDiagnosticResult["detalhes"] = [];
  let atribuidos = 0;
  let sugeridos = 0;

  // Limita a 3 habilidades por componente (as mais básicas primeiro)
  const handled = new Set<string>();
  for (const skillId of notYetSkillIds.slice(0, 3)) {
    if (handled.has(skillId)) continue;
    handled.add(skillId);

    // Busca trilha aprovada que cobre a habilidade (preferência: networkId própria, depois null)
    const track = await p.eduTrack.findFirst({
      where: {
        status: "APPROVED",
        skillIds: { has: skillId },
        OR: [{ networkId }, { networkId: null }],
      },
      orderBy: [{ networkId: "asc" }, { createdAt: "desc" }],
      select: { id: true, networkId: true, subjectId: true },
    });

    if (!track) {
      detalhes.push({ skillId, trackId: null, acao: "sem_trilha" });
      continue;
    }

    if (mode === "AUTO") {
      try {
        const res = await assignTrackToStudents({
          networkId,
          trackId: track.id,
          studentIds: [studentId],
          assignedBy,
        });
        atribuidos += res.atribuidos;
        detalhes.push({ skillId, trackId: track.id, acao: res.atribuidos > 0 ? "atribuido" : `pulado:${res.pulados[0]?.motivo}` });
      } catch (e) {
        detalhes.push({ skillId, trackId: track.id, acao: `erro:${(e as Error).message}` });
      }
    } else {
      // SUGGEST: cria alerta para o professor
      const enrollment = await p.eduEnrollment.findFirst({
        where: { studentId, networkId },
        select: { classId: true },
      });
      if (enrollment) {
        const classSubject = await p.eduClassSubject.findFirst({
          where: { classId: enrollment.classId, subjectId: track.subjectId, networkId },
          select: { teacherId: true },
        });
        if (classSubject?.teacherId) {
          await p.eduTeacherAlert.create({
            data: {
              networkId,
              teacherId: classSubject.teacherId,
              studentId,
              type: "TRACK_SUGGESTION",
              message: `Diagnóstico: aluno precisa de reforço. Trilha sugerida para a habilidade.`,
              metadata: { trackId: track.id, skillId, source: "DIAGNOSTIC" },
            },
          }).catch(() => null); // não falha o fluxo se o alerta não criar
          sugeridos++;
          detalhes.push({ skillId, trackId: track.id, acao: "sugerido" });
          continue;
        }
      }
      detalhes.push({ skillId, trackId: track.id, acao: "sugestao_sem_professor" });
    }
  }

  return { mode, atribuidos, sugeridos, detalhes };
}
