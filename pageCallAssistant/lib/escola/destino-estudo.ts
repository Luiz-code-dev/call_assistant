/**
 * Para onde o aluno vai quando é hora de estudar (agenda e aviso da agenda):
 * - com matéria: a próxima etapa da trilha dessa matéria; sem trilha, o diagnóstico dela;
 * - sem matéria ("trilha do dia"): a próxima etapa da trilha mexida por último.
 */
import { tituloParaAluno } from "@/lib/escola/texto-aluno";
import { subjectInfo } from "@/lib/escola/subjects";

export interface Destino { titulo: string; materia: string | null; subjectCode: string | null; href: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function destinoDoEstudo(db: any, networkId: string, studentId: string, subjectCode: string | null): Promise<Destino> {
  const enr = await db.eduEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" }, orderBy: { startedAt: "desc" },
    select: { classId: true, class: { select: { gradeYear: true } } },
  });
  const atribs: Array<{ id: string; startsAt: Date; track: { title: string; subjectCode: string | null; items: Array<{ id: string; activityId: string; order: number }> }; progress: Array<{ completedItemIds: string[]; lastActivityAt: Date | null }> }> =
    await db.eduTrackAssignment.findMany({
      where: {
        networkId, endedAt: null, track: { status: "APPROVED", ...(subjectCode ? { subjectCode } : {}) },
        OR: [{ studentId }, ...(enr?.classId ? [{ classId: enr.classId }] : [])],
      },
      select: {
        id: true, startsAt: true,
        track: { select: { title: true, subjectCode: true, items: { orderBy: { order: "asc" }, select: { id: true, activityId: true, order: true } } } },
        progress: { where: { studentId }, select: { completedItemIds: true, lastActivityAt: true } },
      },
    });
  const abertas = atribs
    .map((a) => {
      const feitos = a.progress[0]?.completedItemIds ?? [];
      return { a, proximo: a.track.items.find((i) => !feitos.includes(i.id)), ultimo: a.progress[0]?.lastActivityAt ?? null };
    })
    .filter((x) => x.proximo)
    .sort((x, y) => (y.ultimo ? +new Date(y.ultimo) : 0) - (x.ultimo ? +new Date(x.ultimo) : 0) || +new Date(y.a.startsAt) - +new Date(x.a.startsAt));
  const escolhida = abertas[0];
  if (escolhida?.proximo) {
    const code = escolhida.a.track.subjectCode;
    return {
      titulo: tituloParaAluno(escolhida.a.track.title),
      materia: code ? subjectInfo(code).name : null, subjectCode: code,
      href: `/escola/aluno/atividades/${escolhida.proximo.activityId}?assignmentId=${escolhida.a.id}&itemId=${escolhida.proximo.id}`,
    };
  }
  if (subjectCode) {
    const diag = await db.eduDiagnostic.findFirst({
      where: { networkId: null, status: "APPROVED", subjectCode, ...(enr?.class?.gradeYear ? { gradeYear: enr.class.gradeYear } : {}) },
      orderBy: [{ cycle: "asc" }, { version: "desc" }], select: { id: true },
    }).catch(() => null);
    const materia = subjectInfo(subjectCode).name;
    return { titulo: `Diagnóstico de ${materia}`, materia, subjectCode, href: diag ? `/escola/aluno/diagnostico/${diag.id}` : "/escola/aluno" };
  }
  return { titulo: "Escolha uma matéria para praticar", materia: null, subjectCode: null, href: "/escola/aluno" };
}
