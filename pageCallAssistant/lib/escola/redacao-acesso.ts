/**
 * Quem pode abrir e revisar propostas de redação de uma turma.
 *   - Professor: só turmas em que dá aula (tem componente na turma).
 *   - Direção e coordenação vinculadas a uma escola: turmas dessa escola.
 *   - Secretaria (e coordenação da rede): qualquer turma da rede.
 */
import type { EduContext } from "@/lib/escola/context";

export const PAPEIS_REDACAO = new Set(["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"]);

export interface TurmaDaRedacao { id: string; name: string; gradeYear: number; schoolId: string; schoolName: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
type Db = any;

function filtroDeTurmas(ctx: EduContext): Record<string, unknown> | null {
  const base = { networkId: ctx.networkId, isActive: true };
  if (ctx.role === "TEACHER") return { ...base, subjects: { some: { teacherId: ctx.userId } } };
  if (ctx.role === "SCHOOL_ADMIN") return ctx.schoolId ? { ...base, schoolId: ctx.schoolId } : null;
  if (ctx.role === "COORDINATOR") return ctx.schoolId ? { ...base, schoolId: ctx.schoolId } : base;
  if (ctx.role === "NETWORK_ADMIN") return base;
  return null;
}

/** Turmas em que esta pessoa pode abrir propostas. */
export async function turmasDaRedacao(db: Db, ctx: EduContext): Promise<TurmaDaRedacao[]> {
  const where = filtroDeTurmas(ctx);
  if (!where) return [];
  const turmas = await db.eduClass.findMany({
    where,
    select: { id: true, name: true, gradeYear: true, schoolId: true, school: { select: { name: true } } },
    orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
    take: 300,
  });
  return turmas.map((t: { id: string; name: string; gradeYear: number; schoolId: string; school?: { name?: string } }) => ({
    id: t.id, name: t.name, gradeYear: t.gradeYear, schoolId: t.schoolId, schoolName: t.school?.name ?? "",
  }));
}

/** A turma, se esta pessoa puder trabalhar com ela; senão null. */
export async function turmaPermitida(db: Db, ctx: EduContext, classId: string): Promise<TurmaDaRedacao | null> {
  const where = filtroDeTurmas(ctx);
  if (!where || !classId) return null;
  const t = await db.eduClass.findFirst({
    where: { ...where, id: classId },
    select: { id: true, name: true, gradeYear: true, schoolId: true, school: { select: { name: true } } },
  });
  return t ? { id: t.id, name: t.name, gradeYear: t.gradeYear, schoolId: t.schoolId, schoolName: t.school?.name ?? "" } : null;
}

/** A proposta, se esta pessoa puder ver a turma dela; senão null. */
export async function propostaPermitida(db: Db, ctx: EduContext, promptId: string) {
  const p = await db.eduEssayPrompt.findFirst({ where: { id: promptId, networkId: ctx.networkId } });
  if (!p) return null;
  const turma = await turmaPermitida(db, ctx, p.classId);
  return turma ? { proposta: p, turma } : null;
}
