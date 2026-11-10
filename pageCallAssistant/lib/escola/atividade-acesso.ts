import { prismaEdu } from "@/lib/escola/db";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const P = prismaEdu as any;

type CtxAluno = { studentId: string; networkId: string; classId: string };

/**
 * O aluno pode abrir esta atividade?
 * - atividade da turma dele (Atividades da turma, extensão da escola); ou
 * - atividade da biblioteca SpeakFlow (networkId null) que está numa trilha
 *   APPROVED atribuída a ele ou à turma dele (reforço).
 *
 * Antes, as rotas de enviar, rascunho e retorno só aceitavam a primeira opção,
 * e nenhuma atividade de trilha do reforço podia ser feita.
 */
export async function alunoPodeAbrirAtividade(ctx: CtxAluno, activityId: string): Promise<boolean> {
  const daTurma = await P.eduActivity.findFirst({
    where: { id: activityId, networkId: ctx.networkId, classSubject: { classId: ctx.classId } },
    select: { id: true },
  });
  if (daTurma) return true;
  const naTrilha = await P.eduTrackItem.findFirst({
    where: {
      activityId,
      track: {
        status: "APPROVED",
        assignments: {
          some: { networkId: ctx.networkId, endedAt: null, OR: [{ studentId: ctx.studentId }, { classId: ctx.classId }] },
        },
      },
    },
    select: { id: true },
  });
  return !!naTrilha;
}

const NOMES: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia",
  AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso",
};

/** Matéria, ano e etapa da atividade: da turma, ou do subjectCode e da turma do aluno (biblioteca). */
export async function contextoPedagogico(
  ctx: CtxAluno,
  activity: { subjectCode?: string | null; classSubject?: { subjectId: string; class?: { gradeYear: number; stage: string } | null } | null },
): Promise<{ subjectName: string; gradeYear: number; stage: string }> {
  let subjectName = "";
  if (activity.classSubject?.subjectId) {
    const s = await P.eduSubject.findUnique({ where: { id: activity.classSubject.subjectId }, select: { name: true } });
    subjectName = s?.name ?? "";
  }
  if (!subjectName && activity.subjectCode) subjectName = NOMES[activity.subjectCode] ?? "";
  let gradeYear = activity.classSubject?.class?.gradeYear ?? 0;
  let stage = activity.classSubject?.class?.stage ?? "";
  if (!gradeYear || !stage) {
    const turma = await P.eduClass.findUnique({ where: { id: ctx.classId }, select: { gradeYear: true, stage: true } });
    gradeYear = gradeYear || turma?.gradeYear || 0;
    stage = stage || turma?.stage || "ELEMENTARY_LATE";
  }
  return { subjectName, gradeYear, stage };
}
