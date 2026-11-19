/**
 * lib/escola/aula-acoes.ts
 *
 * Leitura comum das três ações do painel da aula (retomar em sala, segunda chance e
 * enviar para reforço): quais alunos ficaram em "Praticando" nas atividades da aula.
 *
 * As entregas se ligam à aula pela atividade (EduActivity.lessonId). EduSubmission não
 * tem lessonId, level nem enrollmentId: as rotas antigas consultavam esses campos e
 * falhavam sempre.
 */
import { prismaEdu } from "@/lib/escola/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export interface EntregaPraticando {
  studentId: string;
  activityId: string;
  activityTitle: string;
  skillIds: string[];
}

/** Aula do professor (ou null se não existe / não é dele). */
export async function aulaDoProfessor(lessonId: string, networkId: string, teacherId: string) {
  return P.eduLesson.findFirst({
    where: { id: lessonId, networkId, teacherId },
    select: { id: true, title: true, skillIds: true },
  }) as Promise<{ id: string; title: string; skillIds: string[] } | null>;
}

/** Entregas das atividades da aula em que o aluno ficou em "Praticando" (NOT_YET). */
export async function entregasPraticando(lessonId: string, networkId: string, skillIdsDaAula: string[]): Promise<EntregaPraticando[]> {
  const subs: Array<{
    studentId: string; activityId: string; skillId: string | null;
    activity: { title: string; skillIds: string[] } | null;
  }> = await P.eduSubmission.findMany({
    where: { networkId, masteryLevel: "NOT_YET", activity: { lessonId } },
    select: { studentId: true, activityId: true, skillId: true, activity: { select: { title: true, skillIds: true } } },
  });
  return subs.map((s) => ({
    studentId: s.studentId,
    activityId: s.activityId,
    activityTitle: s.activity?.title ?? "Atividade",
    skillIds: s.skillId ? [s.skillId] : s.activity?.skillIds?.length ? s.activity.skillIds : skillIdsDaAula,
  }));
}
