/**
 * Progresso da trilha de reforço, decidido no servidor a cada entrega.
 *
 * Antes, nada marcava a etapa como feita depois do envio: a trilha ficava em
 * "0 de 5" para sempre. Regras:
 * - a etapa conta como feita quando o aluno chega a Domina ou Quase lá;
 * - em "Ainda não", a etapa espera nova tentativa;
 * - esgotadas as tentativas em "Ainda não", a etapa conta como feita (a trilha segue)
 *   e o aluno recebe a trilha da base (o pré-requisito de maior peso), se houver;
 * - escrita e fala (corrigidas depois pela IA) contam no envio;
 * - nada disso depende de professor e nenhum aviso ao professor é criado.
 */
import { prismaEdu } from "@/lib/escola/db";
import { assignTrackToStudents } from "@/lib/escola/track-assignment";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

type Ctx = { studentId: string; networkId: string; classId?: string | null };

export interface ResultadoEtapa {
  etapasMarcadas: number;
  trilhaConcluida: boolean;
  base: { trackId: string; titulo: string } | null;
}

/** Atribuições ativas do aluno (dele ou da turma) cuja trilha tem esta atividade */
async function atribuicoesComAtividade(ctx: Ctx, activityId: string) {
  return p.eduTrackAssignment.findMany({
    where: {
      networkId: ctx.networkId,
      endedAt: null,
      OR: [{ studentId: ctx.studentId }, ...(ctx.classId ? [{ classId: ctx.classId }] : [])],
      track: { status: "APPROVED", items: { some: { activityId } } },
    },
    include: {
      track: { select: { id: true, skillIds: true, subjectCode: true, items: { select: { id: true, activityId: true } } } },
      progress: { where: { studentId: ctx.studentId } },
    },
  });
}

export async function registrarEtapa(
  ctx: Ctx,
  activityId: string,
  opcoes: { nivel: "MASTERED" | "ALMOST" | "NOT_YET" | null; tentativasRestantes: number },
): Promise<ResultadoEtapa> {
  const resultado: ResultadoEtapa = { etapasMarcadas: 0, trilhaConcluida: false, base: null };
  const esgotou = opcoes.tentativasRestantes <= 0;
  const conta = opcoes.nivel === null || opcoes.nivel === "MASTERED" || opcoes.nivel === "ALMOST" || esgotou;
  if (!conta) return resultado;

  const atribs = await atribuicoesComAtividade(ctx, activityId);
  const now = new Date();
  for (const a of atribs) {
    const itens = a.track.items.filter((i: { activityId: string }) => i.activityId === activityId).map((i: { id: string }) => i.id);
    const prog = a.progress[0];
    const antes: string[] = prog?.completedItemIds ?? [];
    const depois = Array.from(new Set([...antes, ...itens]));
    const concluida = depois.length >= a.track.items.length;
    if (depois.length !== antes.length) resultado.etapasMarcadas++;
    if (concluida) resultado.trilhaConcluida = true;
    await p.eduTrackProgress.upsert({
      where: { assignmentId_studentId: { assignmentId: a.id, studentId: ctx.studentId } },
      create: {
        networkId: ctx.networkId, assignmentId: a.id, studentId: ctx.studentId,
        completedItemIds: depois, lastActivityAt: now, completedAt: concluida ? now : null,
      },
      update: { completedItemIds: depois, lastActivityAt: now, ...(concluida && !prog?.completedAt ? { completedAt: now } : {}) },
    });
  }

  if (opcoes.nivel === "NOT_YET" && esgotou && atribs.length) {
    resultado.base = await atribuirBase(ctx, atribs[0].track.skillIds ?? []);
  }
  return resultado;
}

/** Trilha da base: pré-requisito de maior peso com trilha da biblioteca aprovada */
async function atribuirBase(ctx: Ctx, skillIds: string[]): Promise<{ trackId: string; titulo: string } | null> {
  if (!skillIds.length) return null;
  const prereqs: Array<{ prerequisiteSkillId: string; weight: number }> = await p.eduSkillPrerequisite.findMany({
    where: { skillId: { in: skillIds }, status: "APPROVED", OR: [{ networkId: null }, { networkId: ctx.networkId }] },
    orderBy: { weight: "desc" },
    select: { prerequisiteSkillId: true, weight: true },
  });
  for (const pr of prereqs) {
    const track = await p.eduTrack.findFirst({
      where: { status: "APPROVED", networkId: null, skillIds: { has: pr.prerequisiteSkillId } },
      select: { id: true, title: true },
    });
    if (!track) continue;
    const ja = await p.eduTrackAssignment.findFirst({
      where: { networkId: ctx.networkId, studentId: ctx.studentId, trackId: track.id, endedAt: null },
      select: { id: true },
    });
    if (!ja) {
      const r = await assignTrackToStudents({
        networkId: ctx.networkId, trackId: track.id, studentIds: [ctx.studentId], assignedBy: "system", ignorarLimite: true,
      }).catch(() => null);
      if (!r?.atribuidos) continue;
    }
    return { trackId: track.id, titulo: tituloParaAluno(track.title) };
  }
  return null;
}

/** Para a tela de retorno: a trilha da base já atribuída depois desta atividade, se houver */
export async function baseAtribuida(ctx: Ctx, activityId: string): Promise<{ titulo: string } | null> {
  const atribs = await atribuicoesComAtividade(ctx, activityId);
  const skillIds: string[] = atribs[0]?.track.skillIds ?? [];
  if (!skillIds.length) return null;
  const prereqs: Array<{ prerequisiteSkillId: string }> = await p.eduSkillPrerequisite.findMany({
    where: { skillId: { in: skillIds }, status: "APPROVED", OR: [{ networkId: null }, { networkId: ctx.networkId }] },
    orderBy: { weight: "desc" },
    select: { prerequisiteSkillId: true },
  });
  for (const pr of prereqs) {
    const a = await p.eduTrackAssignment.findFirst({
      where: { networkId: ctx.networkId, studentId: ctx.studentId, endedAt: null, track: { status: "APPROVED", networkId: null, skillIds: { has: pr.prerequisiteSkillId } } },
      include: { track: { select: { title: true } } },
    });
    if (a) return { titulo: tituloParaAluno(a.track.title) };
  }
  return null;
}
