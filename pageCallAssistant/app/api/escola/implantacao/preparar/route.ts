/**
 * Implantação rápida (gestor da rede ou direção da escola).
 * GET: o que falta — ano letivo, matérias, aulas das turmas, aulas sem professor e os professores.
 * POST {acao:"preparar"}: cria o ano letivo (se não houver), as matérias da BNCC que o reforço usa
 *   (sem duplicar as que já existem) e as aulas de cada turma do ano letivo.
 * POST {acao:"atribuir", teacherId, schoolId?}: atribui esse professor às aulas sem professor
 *   das turmas da escola dele.
 * Só acrescenta: nunca apaga nem troca o professor de uma aula que já tem.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { MATERIAS_BNCC, materiasDoAno, codigoDoComponente, anoLetivoPadrao } from "@/lib/escola/implantacao-rapida";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
export const dynamic = "force-dynamic";

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, P: (ctx.db ?? prismaEdu) as any };
}

async function anoAtual(P: any, networkId: string) {
  return P.eduSchoolYear.findFirst({ where: { networkId, isCurrent: true }, include: { terms: true } });
}

async function situacao(P: any, ctx: { networkId: string; schoolId: string | null; role: string }) {
  const ano = await anoAtual(P, ctx.networkId);
  const materias: any[] = await P.eduSubject.findMany({ where: { networkId: ctx.networkId, isActive: true }, select: { id: true, name: true } });
  const codigos = new Set(materias.map((m) => codigoDoComponente(m.name)).filter(Boolean));
  const turmas: any[] = ano ? await P.eduClass.findMany({
    where: { networkId: ctx.networkId, schoolYearId: ano.id, isActive: true, ...(ctx.role === "SCHOOL_ADMIN" && ctx.schoolId ? { schoolId: ctx.schoolId } : {}) },
    select: { id: true, name: true, gradeYear: true, schoolId: true, subjects: { select: { id: true, teacherId: true } } },
  }) : [];
  const professores: any[] = await P.eduMembership.findMany({
    where: { networkId: ctx.networkId, role: "TEACHER", isActive: true, ...(ctx.role === "SCHOOL_ADMIN" && ctx.schoolId ? { schoolId: ctx.schoolId } : {}) },
    select: { schoolId: true, user: { select: { id: true, name: true, email: true } }, school: { select: { name: true } } },
  });
  return {
    anoLetivo: ano ? { year: ano.year, bimestres: ano.terms.length } : null,
    materiasBncc: MATERIAS_BNCC.length,
    materiasCadastradas: MATERIAS_BNCC.filter((m) => codigos.has(m.codigo)).length,
    turmas: turmas.length,
    turmasSemAulas: turmas.filter((t) => !t.subjects.length).length,
    aulas: turmas.reduce((a, t) => a + t.subjects.length, 0),
    aulasSemProfessor: turmas.reduce((a, t) => a + t.subjects.filter((s: any) => !s.teacherId).length, 0),
    professores: professores.map((p) => ({ id: p.user.id, nome: p.user.name, email: p.user.email, schoolId: p.schoolId, escola: p.school?.name ?? "" })),
    _turmas: turmas,
    _materias: materias,
  };
}

function publico(s: Awaited<ReturnType<typeof situacao>>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _turmas, _materias, ...resto } = s;
  return resto;
}

export async function GET() {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  return NextResponse.json(publico(await situacao(P, ctx!)));
}

export async function POST(req: Request) {
  const { ctx, P, erro } = await contexto();
  if (erro) return erro;
  const body = (await req.json().catch(() => ({}))) as { acao?: string; teacherId?: string };
  const networkId = ctx!.networkId;

  if (body.acao === "preparar") {
    let criouAno = false;
    let ano = await anoAtual(P, networkId);
    if (!ano && ctx!.role === "NETWORK_ADMIN") {
      const padrao = anoLetivoPadrao(new Date().getFullYear());
      const existente = await P.eduSchoolYear.findFirst({ where: { networkId, year: padrao.year } });
      if (existente) {
        ano = await P.eduSchoolYear.update({ where: { id: existente.id }, data: { isCurrent: true }, include: { terms: true } });
      } else {
        ano = await P.eduSchoolYear.create({
          data: { networkId, year: padrao.year, startsAt: padrao.startsAt, endsAt: padrao.endsAt, isCurrent: true, terms: { create: padrao.terms } },
          include: { terms: true },
        });
        criouAno = true;
      }
    }

    // Matérias da BNCC: só cria as que ainda não existem (pelo nome, sem acento e sem caixa)
    const atuais: any[] = await P.eduSubject.findMany({ where: { networkId }, select: { id: true, name: true, isActive: true } });
    const porCodigo = new Map<string, string>();
    for (const m of atuais) { const c = codigoDoComponente(m.name); if (c && !porCodigo.has(c)) porCodigo.set(c, m.id); }
    let materiasCriadas = 0;
    if (ctx!.role === "NETWORK_ADMIN") {
      for (const m of MATERIAS_BNCC) {
        if (porCodigo.has(m.codigo)) continue;
        const nova = await P.eduSubject.create({ data: { networkId, name: m.nome, area: m.area, color: m.cor } }).catch(() => null);
        if (nova) { porCodigo.set(m.codigo, nova.id); materiasCriadas++; }
      }
    }

    // Aulas de cada turma do ano letivo: uma por matéria do ano da turma
    let aulasCriadas = 0;
    const s = await situacao(P, ctx!);
    for (const t of s._turmas) {
      const ja: any[] = await P.eduClassSubject.findMany({ where: { classId: t.id }, select: { subjectId: true } });
      const tem = new Set(ja.map((x) => x.subjectId));
      for (const m of materiasDoAno(t.gradeYear)) {
        const subjectId = porCodigo.get(m.codigo);
        if (!subjectId || tem.has(subjectId)) continue;
        await P.eduClassSubject.create({ data: { networkId, classId: t.id, subjectId } }).then(() => { aulasCriadas++; }).catch(() => null);
      }
    }
    return NextResponse.json({ ok: true, criouAno, materiasCriadas, aulasCriadas, ...publico(await situacao(P, ctx!)) });
  }

  if (body.acao === "atribuir") {
    const s = await situacao(P, ctx!);
    const prof = s.professores.find((p) => p.id === body.teacherId);
    if (!prof) return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
    // Professor ligado a uma escola: só as turmas dela. Sem escola: todas as turmas da rede.
    const turmas = s._turmas.filter((t: any) => !prof.schoolId || t.schoolId === prof.schoolId);
    const ids = turmas.flatMap((t: any) => t.subjects.filter((x: any) => !x.teacherId).map((x: any) => x.id));
    const r = ids.length ? await P.eduClassSubject.updateMany({ where: { id: { in: ids }, networkId, teacherId: null }, data: { teacherId: prof.id } }) : { count: 0 };
    return NextResponse.json({ ok: true, atribuidas: r.count, ...publico(await situacao(P, ctx!)) });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
