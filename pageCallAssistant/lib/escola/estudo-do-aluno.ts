/**
 * O que conta como "estudar" e há quantos dias o aluno não estuda.
 *
 * Fonte única para o aviso ao responsável (celular e e-mail) e para o painel da
 * família: os dois precisam dizer a mesma coisa. Conta como estudo:
 *   - uma atividade entregue (EduSubmission enviada);
 *   - um diagnóstico em que o aluno respondeu ao menos uma questão.
 * Abrir um diagnóstico sem responder não conta.
 *
 * Os dias são dias do calendário de São Paulo, e não blocos de 24 horas: quem
 * estudou ontem à noite "não estuda desde ontem", quem estudou há uma semana
 * "está há 7 dias sem estudar".
 */
import { diaSaoPaulo } from "@/lib/escola/semana-filho";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

/** Entrega enviada (rascunho não conta) */
const ENTREGA_ENVIADA = { submittedAt: { not: null }, status: { not: "IN_PROGRESS" } };

/** Diagnóstico com ao menos uma resposta */
const DIAGNOSTICO_RESPONDIDO = { OR: [{ currentQuestion: { gt: 0 } }, { completedAt: { not: null } }] };

/** Último momento em que o aluno estudou, ou null se ainda não estudou */
export async function ultimoEstudo(db: any, studentId: string): Promise<Date | null> {
  const [sub, sess] = await Promise.all([
    db.eduSubmission.findFirst({ where: { studentId, ...ENTREGA_ENVIADA }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } }),
    db.eduAttemptSession.findFirst({ where: { studentId, ...DIAGNOSTICO_RESPONDIDO }, orderBy: { lastActivityAt: "desc" }, select: { lastActivityAt: true } }),
  ]);
  const ts = [sub?.submittedAt, sess?.lastActivityAt].filter((d): d is Date => !!d).map((d) => new Date(d).getTime());
  return ts.length ? new Date(Math.max(...ts)) : null;
}

/** Diagnósticos respondidos a partir de uma data: quando foi a última resposta e de qual atividade */
export async function diagnosticosRespondidos(db: any, studentId: string, desde: Date): Promise<Array<{ quando: Date; activityId: string }>> {
  const sessoes: Array<{ lastActivityAt: Date; activityId: string }> = await db.eduAttemptSession.findMany({
    where: { studentId, lastActivityAt: { gte: desde }, ...DIAGNOSTICO_RESPONDIDO },
    select: { lastActivityAt: true, activityId: true },
  });
  return sessoes.map((s) => ({ quando: new Date(s.lastActivityAt), activityId: s.activityId }));
}

/** Dias do calendário de São Paulo entre o último estudo e agora. 0 = estudou hoje. */
export function diasSemEstudar(ultimo: Date, now = new Date()): number {
  const de = Date.parse(`${diaSaoPaulo(ultimo)}T00:00:00Z`);
  const ate = Date.parse(`${diaSaoPaulo(now)}T00:00:00Z`);
  return Math.max(0, Math.round((ate - de) / 86_400_000));
}

/**
 * Frase única sobre a falta de estudo, usada no aviso e no painel.
 * `dias` nulo = o aluno ainda não estudou. Devolve null quando estudou hoje.
 */
export function fraseSemEstudo(primeiroNome: string, dias: number | null): string | null {
  if (dias === null) return `${primeiroNome} ainda não começou a estudar`;
  if (dias <= 0) return null;
  if (dias === 1) return `${primeiroNome} não estuda desde ontem`;
  return `${primeiroNome} está há ${dias} dias sem estudar`;
}
