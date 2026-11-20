/**
 * GET /api/escola/integracao/v1/resultados/alunos
 * Degrau de cada aluno por habilidade da BNCC, para o sistema externo.
 *
 * Parâmetros: pagina (1..), porPagina (até 200), inep (filtra a escola), matricula (um aluno).
 * Identifica o aluno pela matrícula: nome, data de nascimento e PIN não saem por aqui.
 */
import { NextRequest, NextResponse } from "next/server";
import { autenticarIntegracao, registrarIntegracao } from "@/lib/escola/integracao/auth";
import { consolidate, type MasteryLevel } from "@/lib/escola/mastery-event";
import { observacoesDoPrimeiroDiagnostico, type ObservacaoDegrau } from "@/lib/escola/evolucao-degraus";

export const dynamic = "force-dynamic";

const NOME: Record<string, string> = { NOT_YET: "PRATICANDO", ALMOST: "QUASE_LA", MASTERED: "DOMINA" };

export async function GET(req: NextRequest) {
  const ctx = await autenticarIntegracao(req, "resultados:ler");
  if (ctx instanceof NextResponse) return ctx;
  const db = ctx.db;

  const q = new URL(req.url).searchParams;
  const pagina = Math.max(1, Number(q.get("pagina")) || 1);
  const porPagina = Math.min(200, Math.max(1, Number(q.get("porPagina")) || 100));
  const inep = q.get("inep")?.trim() || null;
  const matricula = q.get("matricula")?.trim() || null;

  const where: Record<string, unknown> = { networkId: ctx.networkId, status: "ACTIVE" };
  if (inep) where.class = { school: { inepCode: inep } };
  if (matricula) where.student = { enrollmentCode: matricula };

  const [total, matriculas]: [number, Array<{
    studentId: string;
    student: { enrollmentCode: string };
    class: { name: string; gradeYear: number; school: { name: string; inepCode: string | null } };
  }>] = await Promise.all([
    db.eduEnrollment.count({ where }),
    db.eduEnrollment.findMany({
      where,
      orderBy: [{ classId: "asc" }, { studentId: "asc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        studentId: true,
        student: { select: { enrollmentCode: true } },
        class: { select: { name: true, gradeYear: true, school: { select: { name: true, inepCode: true } } } },
      },
    }),
  ]);

  const ids = matriculas.map((m) => m.studentId);
  const [niveis, eventos]: [
    Array<{ studentId: string; skillId: string; level: string; updatedAt: Date; skill: { code: string } }>,
    Array<{ studentId: string; skillId: string; level: string; source: string; createdAt: Date }>,
  ] = ids.length
    ? await Promise.all([
        db.eduSkillMastery.findMany({
          where: { networkId: ctx.networkId, studentId: { in: ids } },
          select: { studentId: true, skillId: true, level: true, updatedAt: true, skill: { select: { code: true } } },
        }),
        db.eduSkillMasteryEvent.findMany({
          where: { networkId: ctx.networkId, studentId: { in: ids }, source: "DIAGNOSTIC" },
          orderBy: { createdAt: "asc" },
          select: { studentId: true, skillId: true, level: true, source: true, createdAt: true },
        }),
      ])
    : [[], []];

  // Ponto de partida: as questões do primeiro diagnóstico de cada conteúdo
  const porConteudo = new Map<string, ObservacaoDegrau[]>();
  for (const e of eventos) {
    const k = `${e.studentId}:${e.skillId}`;
    if (!porConteudo.has(k)) porConteudo.set(k, []);
    porConteudo.get(k)!.push(e);
  }
  const partida = (studentId: string, skillId: string): string | null => {
    const iniciais = observacoesDoPrimeiroDiagnostico(porConteudo.get(`${studentId}:${skillId}`) ?? []);
    return iniciais.length ? consolidate(iniciais as MasteryLevel[]) : null;
  };

  const alunos = matriculas.map((m) => ({
    matricula: m.student.enrollmentCode,
    turma: m.class.name,
    ano: m.class.gradeYear,
    escola: m.class.school.name,
    inep: m.class.school.inepCode,
    habilidades: niveis
      .filter((n) => n.studentId === m.studentId)
      .map((n) => {
        const inicio = partida(n.studentId, n.skillId);
        return {
          codigo: n.skill.code,
          nivel: NOME[n.level] ?? n.level,
          nivelInicial: inicio ? NOME[inicio] ?? inicio : null,
          atualizadoEm: n.updatedAt,
        };
      }),
  }));

  await registrarIntegracao(ctx, { direction: "OUT", resource: "resultados/alunos", status: "OK", received: alunos.length });
  return NextResponse.json(
    { pagina, porPagina, total, paginas: Math.max(1, Math.ceil(total / porPagina)), alunos },
    { headers: { "Cache-Control": "no-store" } },
  );
}
