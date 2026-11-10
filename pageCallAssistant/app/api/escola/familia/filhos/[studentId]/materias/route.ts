/**
 * GET /api/escola/familia/filhos/[studentId]/materias
 *
 * Visão da família por matéria (formato FilhoMaterias do contrato com o v0):
 * semana de prática, e para cada matéria do ano do filho: diagnóstico feito,
 * o que está praticando agora, níveis, evolução das últimas 4 semanas e uma
 * dica para casa. A família só vê os próprios filhos (404 para outro aluno).
 * Nada de nota, porcentagem ou código BNCC.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent, weekStartSaoPaulo, dayIndexSaoPaulo } from "@/lib/escola/family-guard";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática, como nas outras rotas da família */
const P = prismaEdu as any;

type CodigoMateria = "LP" | "MA" | "CI" | "HI" | "GE" | "AR" | "EF" | "LI" | "ER";
const INICIAIS: CodigoMateria[] = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "ER"];
const FINAIS: CodigoMateria[] = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI", "ER"];
const NOMES: Record<CodigoMateria, string> = {
  LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia",
  AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso",
};
const RANK: Record<string, number> = { NOT_YET: 0, ALMOST: 1, MASTERED: 2 };
const DIA = 86_400_000;

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  if (!(await guardianOwnsStudent(ctx.guardianId, params.studentId))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  const studentId = params.studentId;

  try {
    const student = await P.eduStudent.findUnique({
      where: { id: studentId },
      select: {
        fullName: true,
        enrollments: {
          where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1,
          select: { class: { select: { gradeYear: true, school: { select: { name: true } } } } },
        },
      },
    });
    if (!student) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const primeiroNome = String(student.fullName).trim().split(/\s+/)[0];
    const ano: number = student.enrollments[0]?.class?.gradeYear ?? 6;
    const escola: string = student.enrollments[0]?.class?.school?.name ?? "";
    const codigos = ano <= 5 ? INICIAIS : FINAIS;

    // ── Semana (segunda a domingo, horário de São Paulo) ──
    const inicioSemana = weekStartSaoPaulo();
    const fimSemana = new Date(inicioSemana.getTime() + 7 * DIA);
    const [subsSemana, sessoesSemana] = await Promise.all([
      P.eduSubmission.findMany({
        where: { studentId, submittedAt: { gte: inicioSemana, lt: fimSemana }, status: { not: "IN_PROGRESS" } },
        select: { submittedAt: true, activityId: true },
      }),
      P.eduAttemptSession.findMany({
        where: { studentId, completedAt: { gte: inicioSemana, lt: fimSemana }, diagnosticId: { not: null } },
        select: { completedAt: true, diagnosticId: true, answers: true },
      }),
    ]);
    const praticou = [false, false, false, false, false, false, false];
    for (const s of subsSemana) if (s.submittedAt) praticou[dayIndexSaoPaulo(new Date(s.submittedAt))] = true;
    for (const s of sessoesSemana) if (s.completedAt) praticou[dayIndexSaoPaulo(new Date(s.completedAt))] = true;
    const dias = praticou.map((p, i) => ({ data: new Date(inicioSemana.getTime() + i * DIA).toISOString().slice(0, 10), praticou: p }));

    const actIds = Array.from(new Set<string>(subsSemana.map((s: any) => s.activityId)));
    const acts: Array<{ id: string; subjectCode: string | null; estMinutes: number }> = actIds.length
      ? await P.eduActivity.findMany({ where: { id: { in: actIds } }, select: { id: true, subjectCode: true, estMinutes: true } })
      : [];
    let minutos = acts.reduce((t, a) => t + (a.estMinutes ?? 5), 0);
    const materiasSemana = new Set<string>(acts.map((a) => a.subjectCode).filter(Boolean) as string[]);

    // ── Diagnósticos concluídos (todas as datas) ──
    const sessoes: Array<{ completedAt: Date; diagnosticId: string; answers: unknown }> = await P.eduAttemptSession.findMany({
      where: { studentId, completedAt: { not: null }, diagnosticId: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, diagnosticId: true, answers: true },
    });
    const diagIds = Array.from(new Set(sessoes.map((s) => s.diagnosticId)));
    const diags: Array<{ id: string; subjectCode: string | null }> = diagIds.length
      ? await P.eduDiagnostic.findMany({ where: { id: { in: diagIds } }, select: { id: true, subjectCode: true } })
      : [];
    const materiaDoDiag = new Map(diags.map((d) => [d.id, d.subjectCode]));
    for (const s of sessoesSemana) {
      const m = materiaDoDiag.get(s.diagnosticId);
      if (m) materiasSemana.add(m);
      minutos += Array.isArray(s.answers) ? (s.answers as unknown[]).length : 0; // cerca de 1 minuto por questão
    }

    // ── Habilidades: nível atual e eventos dos últimos 28 dias ──
    const masteries: Array<{ skillId: string; level: string; updatedAt: Date; skill: { subjectCode: string } }> =
      await P.eduSkillMastery.findMany({ where: { studentId }, select: { skillId: true, level: true, updatedAt: true, skill: { select: { subjectCode: true } } } });
    const eventos: Array<{ skillId: string; level: string; createdAt: Date; skill: { subjectCode: string } }> =
      await P.eduSkillMasteryEvent.findMany({ where: { studentId }, orderBy: { createdAt: "asc" }, select: { skillId: true, level: true, createdAt: true, skill: { select: { subjectCode: true } } } });
    const desde = new Date(Date.now() - 28 * DIA);
    const anterior = new Map<string, number>();
    const paraQuaseLa: Record<string, Set<string>> = {};
    const paraDomina: Record<string, Set<string>> = {};
    for (const e of eventos) {
      const atual = RANK[e.level] ?? 0;
      const prev = anterior.get(e.skillId);
      if (prev !== undefined && atual > prev && new Date(e.createdAt) >= desde) {
        const m = e.skill.subjectCode;
        if (atual === 1) (paraQuaseLa[m] ??= new Set()).add(e.skillId);
        if (atual === 2) (paraDomina[m] ??= new Set()).add(e.skillId);
      }
      anterior.set(e.skillId, atual);
    }

    // ── Trilhas ativas, com a etapa atual ──
    const atribuicoes: any[] = await P.eduTrackAssignment.findMany({
      where: { studentId, endedAt: null, track: { status: "APPROVED" } },
      orderBy: { startsAt: "desc" },
      include: {
        track: { select: { id: true, title: true, subjectCode: true, skillIds: true, items: { select: { id: true } } } },
        progress: { where: { studentId }, select: { completedItemIds: true, lastActivityAt: true } },
      },
    });

    // ── Erro comum mais frequente por matéria (das respostas dos diagnósticos) ──
    const errosPorMateria: Record<string, Record<string, { n: number; skillCode: string }>> = {};
    for (const s of sessoes) {
      const m = materiaDoDiag.get(s.diagnosticId);
      if (!m || !Array.isArray(s.answers)) continue;
      for (const a of s.answers as Array<{ misconceptionCode?: string | null; skillCode?: string | null }>) {
        if (!a.misconceptionCode || !a.skillCode) continue;
        const bucket = (errosPorMateria[m] ??= {});
        bucket[a.misconceptionCode] = { n: (bucket[a.misconceptionCode]?.n ?? 0) + 1, skillCode: a.skillCode };
      }
    }
    const codigosHabilidade = Array.from(new Set(Object.values(errosPorMateria).flatMap((b) => Object.values(b).map((v) => v.skillCode))));
    const fichas: Array<{ commonErrors: unknown; skill: { code: string } }> = codigosHabilidade.length
      ? await P.eduSkillGuide.findMany({
          where: { status: "APPROVED", networkId: null, skill: { code: { in: codigosHabilidade } } },
          select: { commonErrors: true, skill: { select: { code: true } } },
        })
      : [];
    const descricaoErro = (skillCode: string, code: string): string | null => {
      for (const f of fichas) {
        if (f.skill.code !== skillCode || !Array.isArray(f.commonErrors)) continue;
        const e = (f.commonErrors as Array<{ code?: string; description?: string }>).find((x) => x.code === code);
        if (e?.description) return e.description;
      }
      return null;
    };

    const materias = codigos.map((codigo) => {
      const doMateria = masteries.filter((x) => x.skill.subjectCode === codigo);
      const contagem = {
        domina: doMateria.filter((x) => x.level === "MASTERED").length,
        quaseLa: doMateria.filter((x) => x.level === "ALMOST").length,
        aindaNao: doMateria.filter((x) => x.level === "NOT_YET").length,
      };
      const sessaoMateria = sessoes.find((s) => materiaDoDiag.get(s.diagnosticId) === codigo);
      const atr = atribuicoes.find((a) => a.track?.subjectCode === codigo);
      const feitas = atr?.progress?.[0]?.completedItemIds?.length ?? 0;
      const total = atr?.track?.items?.length ?? 5;
      const trilhaAtual = atr && feitas < total
        ? { id: atr.track.id, titulo: String(atr.track.title).replace(/^Trilha:\s*/i, ""), etapaAtual: Math.min(feitas + 1, 5), totalEtapas: 5 as const }
        : undefined;

      let estado: "COMECAR" | "EM_TRILHA" | "REVISAR" | "AVANCAR" = "COMECAR";
      if (trilhaAtual) estado = "EM_TRILHA";
      else if (sessaoMateria && contagem.quaseLa > 0) estado = "REVISAR";
      else if (sessaoMateria) estado = "AVANCAR";

      const ultimas = [
        ...doMateria.map((x) => new Date(x.updatedAt).getTime()),
        ...(atr?.progress?.[0]?.lastActivityAt ? [new Date(atr.progress[0].lastActivityAt).getTime()] : []),
        ...(sessaoMateria ? [new Date(sessaoMateria.completedAt).getTime()] : []),
      ];

      const erros = Object.entries(errosPorMateria[codigo] ?? {}).sort((a, b) => b[1].n - a[1].n);
      const desc = erros.length ? descricaoErro(erros[0][1].skillCode, erros[0][0]) : null;
      const dica = desc
        ? `Converse com ${primeiroNome} sobre este ponto, que costuma confundir: ${desc.charAt(0).toLowerCase()}${desc.slice(1)}. Peça para explicar com as próprias palavras.`
        : sessaoMateria
          ? `Pergunte a ${primeiroNome} o que aprendeu em ${NOMES[codigo]} e peça para explicar com as próprias palavras.`
          : `Incentive ${primeiroNome} a começar ${NOMES[codigo]}: o diagnóstico leva cerca de 10 minutos.`;

      return {
        codigo,
        nome: NOMES[codigo],
        estado,
        ...(trilhaAtual ? { trilhaAtual } : {}),
        contagem,
        ...(ultimas.length ? { ultimaPraticaEm: new Date(Math.max(...ultimas)).toISOString() } : {}),
        ...(sessaoMateria ? { diagnosticoFeitoEm: new Date(sessaoMateria.completedAt).toISOString() } : {}),
        ...(trilhaAtual ? { praticandoAgora: trilhaAtual.titulo } : {}),
        evolucao4Semanas: { paraQuaseLa: paraQuaseLa[codigo]?.size ?? 0, paraDomina: paraDomina[codigo]?.size ?? 0 },
        dica,
      };
    });

    return NextResponse.json({
      filho: { primeiroNome, ano, escola },
      semana: { dias, minutos, materiasPraticadas: Array.from(materiasSemana) },
      materias,
    });
  } catch (err) {
    console.error(`[familia/materias] aluno=${studentId}:`, (err as Error).message);
    return NextResponse.json({ error: "Não foi possível carregar as matérias agora." }, { status: 500 });
  }
}
