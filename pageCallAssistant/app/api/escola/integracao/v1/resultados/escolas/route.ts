/**
 * GET /api/escola/integracao/v1/resultados/escolas
 * Resumo por escola: alunos ativos e quantos conteúdos estão em cada degrau.
 * Só números agregados: nenhum dado de aluno.
 */
import { NextRequest, NextResponse } from "next/server";
import { autenticarIntegracao, registrarIntegracao } from "@/lib/escola/integracao/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await autenticarIntegracao(req, "resultados:ler");
  if (ctx instanceof NextResponse) return ctx;
  const db = ctx.db;

  const [escolas, matriculas]: [
    Array<{ id: string; name: string; inepCode: string | null }>,
    Array<{ studentId: string; class: { schoolId: string } }>,
  ] = await Promise.all([
    db.eduSchool.findMany({ where: { networkId: ctx.networkId, isActive: true }, select: { id: true, name: true, inepCode: true }, orderBy: { name: "asc" } }),
    db.eduEnrollment.findMany({ where: { networkId: ctx.networkId, status: "ACTIVE" }, select: { studentId: true, class: { select: { schoolId: true } } } }),
  ]);

  const escolaDoAluno = new Map<string, string>();
  for (const m of matriculas) escolaDoAluno.set(m.studentId, m.class.schoolId);

  const grupos: Array<{ studentId: string; level: string; _count: { _all: number } }> = escolaDoAluno.size
    ? await db.eduSkillMastery.groupBy({
        by: ["studentId", "level"],
        where: { networkId: ctx.networkId },
        _count: { _all: true },
      })
    : [];

  const resumo = new Map<string, { alunos: Set<string>; comResultado: Set<string>; PRATICANDO: number; QUASE_LA: number; DOMINA: number }>();
  for (const e of escolas) resumo.set(e.id, { alunos: new Set(), comResultado: new Set(), PRATICANDO: 0, QUASE_LA: 0, DOMINA: 0 });
  escolaDoAluno.forEach((schoolId, studentId) => resumo.get(schoolId)?.alunos.add(studentId));
  for (const g of grupos) {
    const r = resumo.get(escolaDoAluno.get(g.studentId) ?? "");
    if (!r) continue;
    r.comResultado.add(g.studentId);
    if (g.level === "NOT_YET") r.PRATICANDO += g._count._all;
    else if (g.level === "ALMOST") r.QUASE_LA += g._count._all;
    else if (g.level === "MASTERED") r.DOMINA += g._count._all;
  }

  const saida = escolas.map((e) => {
    const r = resumo.get(e.id)!;
    return {
      escola: e.name, inep: e.inepCode,
      alunosAtivos: r.alunos.size, alunosComResultado: r.comResultado.size,
      conteudos: { praticando: r.PRATICANDO, quaseLa: r.QUASE_LA, domina: r.DOMINA },
    };
  });

  await registrarIntegracao(ctx, { direction: "OUT", resource: "resultados/escolas", status: "OK", received: saida.length });
  return NextResponse.json({ escolas: saida }, { headers: { "Cache-Control": "no-store" } });
}
