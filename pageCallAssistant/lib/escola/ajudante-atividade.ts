/**
 * Carrega a atividade que o aluno pode ver, no formato que o Flow usa (sem gabarito).
 * Só atividades publicadas da turma dele ou da biblioteca do reforço.
 */
import { prismaEdu } from "@/lib/escola/db";
import { textosDasOpcoes } from "@/lib/escola/opcoes-aluno";
import type { AtividadeParaAjudante } from "@/lib/escola/ajudante";

export const NOMES_MATERIA: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia",
  AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso",
};

export async function atividadeDoAluno(
  ctx: { networkId: string; classId: string },
  activityId: string,
): Promise<(AtividadeParaAjudante & { id: string; subjectCode: string | null }) | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const P = prismaEdu as any;
  const classSubjectIds: string[] = await P.eduClassSubject.findMany({
    where: { classId: ctx.classId, networkId: ctx.networkId }, select: { id: true },
  }).then((r: { id: string }[]) => r.map((x) => x.id)).catch(() => []);
  const act = await P.eduActivity.findFirst({
    where: {
      id: activityId, status: "PUBLISHED",
      OR: [{ classSubjectId: null }, ...(classSubjectIds.length ? [{ classSubjectId: { in: classSubjectIds }, networkId: ctx.networkId }] : [])],
    },
    select: {
      id: true, title: true, prompt: true, type: true, subjectCode: true,
      classSubject: { select: { subject: { select: { name: true } } } },
      questions: { orderBy: { order: "asc" }, select: { question: true, options: true } },
    },
  }).catch(() => null);
  if (!act) return null;
  const turma = await P.eduClass.findUnique({ where: { id: ctx.classId }, select: { gradeYear: true } }).catch(() => null);
  return {
    id: act.id,
    subjectCode: act.subjectCode ?? null,
    titulo: act.title,
    enunciado: act.prompt ?? "",
    tipo: act.type,
    materia: act.classSubject?.subject?.name ?? (act.subjectCode ? NOMES_MATERIA[act.subjectCode] ?? null : null),
    anoEscolar: turma?.gradeYear ?? null,
    perguntas: act.type === "QUIZ"
      ? act.questions.map((q: { question: string; options: unknown }) => ({ pergunta: q.question, opcoes: textosDasOpcoes(q.options) }))
      : [],
  };
}

export async function anoDaTurma(ctx: { classId: string }): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const t = await (prismaEdu as any).eduClass.findUnique({ where: { id: ctx.classId }, select: { gradeYear: true } }).catch(() => null);
  return t?.gradeYear ?? null;
}
