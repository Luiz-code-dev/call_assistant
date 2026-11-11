/**
 * Revisão de 2 minutos: leitura e gravação dos cartões (EduReviewCard).
 */
import { perguntasErradas, hojeSP, CAIXA_FIRMADO, somarDias } from "@/lib/escola/revisao";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

/** Cria cartões para as perguntas erradas dos quizzes dos últimos 60 dias (sem duplicar) */
export async function semearCartoes(P: any, ctx: { networkId: string; studentId: string }, now = new Date()): Promise<number> {
  const desde = new Date(`${somarDias(hojeSP(now), -60)}T03:00:00Z`);
  const entregas: Array<{ activityId: string; aiFeedback: unknown; activity: { type: string; subjectCode: string | null } }> = await P.eduSubmission.findMany({
    where: { studentId: ctx.studentId, submittedAt: { gte: desde }, activity: { type: "QUIZ" } },
    select: { activityId: true, aiFeedback: true, activity: { select: { type: true, subjectCode: true } } },
    orderBy: { submittedAt: "desc" }, take: 200,
  }).catch(() => []);
  const vistos = new Set<string>();
  const novos: Array<{ questionId: string; activityId: string; subjectCode: string | null }> = [];
  for (const e of entregas) {
    for (const q of perguntasErradas(e.aiFeedback)) {
      if (vistos.has(q)) continue;
      vistos.add(q);
      novos.push({ questionId: q, activityId: e.activityId, subjectCode: e.activity.subjectCode ?? null });
    }
  }
  if (!novos.length) return 0;
  const existem: Array<{ id: string }> = await P.eduQuizQuestion.findMany({ where: { id: { in: novos.map((n) => n.questionId) } }, select: { id: true } }).catch(() => []);
  const ok = new Set(existem.map((x) => x.id));
  const hoje = hojeSP(now);
  const r = await P.eduReviewCard.createMany({
    data: novos.filter((n) => ok.has(n.questionId)).map((n) => ({ networkId: ctx.networkId, studentId: ctx.studentId, ...n, box: 1, dueOn: hoje })),
    skipDuplicates: true,
  }).catch((err: Error) => { console.error("[revisao] semear:", err.message); return { count: 0 }; });
  return r.count ?? 0;
}

export async function situacaoDaRevisao(P: any, ctx: { networkId: string; studentId: string }, now = new Date()) {
  const hoje = hojeSP(now);
  const [pendentes, feitasHoje, firmados] = await Promise.all([
    P.eduReviewCard.count({ where: { networkId: ctx.networkId, studentId: ctx.studentId, box: { lt: CAIXA_FIRMADO }, dueOn: { lte: hoje } } }).catch(() => 0),
    P.eduReviewCard.count({ where: { networkId: ctx.networkId, studentId: ctx.studentId, lastReviewedOn: hoje } }).catch(() => 0),
    P.eduReviewCard.count({ where: { networkId: ctx.networkId, studentId: ctx.studentId, box: { gte: CAIXA_FIRMADO } } }).catch(() => 0),
  ]);
  return { pendentes: pendentes as number, feitasHoje: feitasHoje as number, firmados: firmados as number };
}
