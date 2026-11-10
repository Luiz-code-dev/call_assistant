/**
 * Avaliação por IA de uma entrega escrita ou falada.
 *
 * Usada no envio (o aluno recebe o retorno na hora) e pelo cron (o que ficar pendente).
 * Antes só o cron avaliava, e ele quebrava em atividade da biblioteca (sem componente
 * da turma: classSubject nulo) e em rubrica do pacote (campo "criteria", não "criterios").
 * O aluno ficava preso em "Analisando sua resposta...".
 */
import { evaluateActivity, ModerationError } from "@/lib/escola/ai-gateway";
import { stageToAgeGroup } from "@/lib/escola/subject-lang";
import { recordMasteryEvent } from "@/lib/escola/mastery-event";
import { subjectInfo } from "@/lib/escola/subjects";

export const MAX_TENTATIVAS_IA = 3;

type Criterio = { criterio: string; peso: number; descricao?: string };

/** Rubrica no formato da IA, a partir do formato antigo (criterios) ou do pacote (criteria) */
export function rubricaParaIA(rubric: unknown): { criterios: Criterio[] } {
  const r = (rubric ?? {}) as { criterios?: Criterio[]; criteria?: Array<{ code?: string; name?: string; description?: string; weight?: number }> };
  if (Array.isArray(r.criterios) && r.criterios.length) return { criterios: r.criterios };
  if (Array.isArray(r.criteria) && r.criteria.length) {
    return {
      criterios: r.criteria.map((c, i) => ({
        criterio: c.name ?? c.code ?? `criterio-${i + 1}`,
        peso: typeof c.weight === "number" && c.weight > 0 ? c.weight : 1,
        descricao: c.description,
      })),
    };
  }
  return {
    criterios: [
      { criterio: "compreensao", peso: 2, descricao: "Mostra que entendeu o conteúdo pedido no enunciado" },
      { criterio: "clareza", peso: 1, descricao: "Explica com clareza, com as próprias palavras" },
    ],
  };
}

/**
 * Avalia a entrega (aiStatus PENDING). Devolve o nível, ou null se não avaliou agora
 * (outra execução pegou, falhou e volta para a fila, ou moderação).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function avaliarEntrega(db: any, submissionId: string): Promise<"MASTERED" | "ALMOST" | "NOT_YET" | null> {
  const claimed = await db.eduSubmission.updateMany({
    where: { id: submissionId, aiStatus: "PENDING" },
    data: { aiStatus: "RUNNING" },
  });
  if (claimed.count === 0) return null;

  const sub = await db.eduSubmission.findUnique({
    where: { id: submissionId },
    include: { activity: { include: { classSubject: { include: { class: { select: { gradeYear: true, stage: true } } } } } } },
  });
  try {
    const activity = sub.activity;
    const cs = activity.classSubject;
    let subjectName = "";
    let gradeYear = 0;
    let stage = "ELEMENTARY_LATE";
    if (cs) {
      const s = await db.eduSubject.findUnique({ where: { id: cs.subjectId }, select: { name: true } });
      subjectName = s?.name ?? "";
      gradeYear = cs.class?.gradeYear ?? 0;
      stage = cs.class?.stage ?? stage;
    } else {
      // Atividade da biblioteca: matéria pelo código e ano pela turma do aluno
      subjectName = activity.subjectCode ? subjectInfo(activity.subjectCode).name : "";
      const enr = await db.eduEnrollment.findFirst({
        where: { studentId: sub.studentId, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
        include: { class: { select: { gradeYear: true, stage: true } } },
      });
      gradeYear = enr?.class?.gradeYear ?? (Array.isArray(activity.gradeYears) ? activity.gradeYears[0] ?? 0 : 0);
      stage = enr?.class?.stage ?? stage;
    }
    const ageGroup = stageToAgeGroup(stage as never, gradeYear);

    const responseText = activity.type === "SPOKEN" ? sub.transcript : sub.text;
    if (!responseText) throw new Error("Sem conteúdo para avaliar");

    const result = await evaluateActivity({
      studentId: sub.studentId,
      activityPrompt: activity.prompt,
      rubric: { ...rubricaParaIA(activity.rubric), subjectName, gradeYear, ageGroup },
      response: responseText,
      maxScore: 10, // escala interna 0-10; nota não é exibida ao aluno
      activityType: activity.type as "WRITTEN" | "SPOKEN",
    });

    // score vem na escala 0-10 (maxScore): normalizar antes de comparar
    const frac = Number(result.feedback.score) / 10;
    const masteryLevel = frac >= 0.7 ? "MASTERED" : frac >= 0.4 ? "ALMOST" : "NOT_YET";

    await db.eduSubmission.update({
      where: { id: sub.id },
      data: {
        status: "EVALUATED",
        aiScore: result.feedback.score,
        aiFeedback: result.feedback,
        aiCostMs: result.costMs,
        aiCostTokens: result.costTokens,
        evaluatedAt: new Date(),
        aiStatus: "DONE",
        masteryLevel,
      },
    });

    const skillIds: string[] = Array.isArray(activity.skillIds) ? activity.skillIds : [];
    const source = activity.lessonId ? "CLASS_ACTIVITY" : "TRACK";
    for (const skillId of skillIds) {
      await recordMasteryEvent({
        networkId: sub.networkId, studentId: sub.studentId, skillId,
        level: masteryLevel, source, submissionId: sub.id,
      }).catch(() => null);
    }
    return masteryLevel;
  } catch (err) {
    if (err instanceof ModerationError) {
      await db.eduSubmission.update({
        where: { id: sub.id },
        data: { aiStatus: "FAILED", aiAttempts: MAX_TENTATIVAS_IA, aiLastError: err.message },
      });
      throw err;
    }
    const next = (sub.aiAttempts ?? 0) + 1;
    await db.eduSubmission.update({
      where: { id: sub.id },
      data: {
        aiStatus: next >= MAX_TENTATIVAS_IA ? "FAILED" : "PENDING",
        aiAttempts: next,
        aiLastError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
