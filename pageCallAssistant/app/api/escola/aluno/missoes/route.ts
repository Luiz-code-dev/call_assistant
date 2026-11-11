/**
 * GET /api/escola/aluno/missoes -> { missoes[], feitas, total }
 * Missões do dia do Flow (lib/escola/missoes.ts). Sem IA, sem nota.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { destinoDoEstudo } from "@/lib/escola/destino-estudo";
import { dayIndexSaoPaulo } from "@/lib/escola/family-guard";
import { subjectInfo } from "@/lib/escola/subjects";
import { hojeSP, somarDias, MINIMO_PARA_MISSAO } from "@/lib/escola/revisao";
import { semearCartoes, situacaoDaRevisao } from "@/lib/escola/revisao-db";
import { materiaQueMaisPrecisa, montarMissoes } from "@/lib/escola/missoes";

export const dynamic = "force-dynamic";
/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const P = prismaEdu as any;

  const hoje = hojeSP();
  const inicioHoje = new Date(`${hoje}T03:00:00Z`);
  const desde = new Date(`${somarDias(hoje, -30)}T03:00:00Z`);
  const recentes: Array<{ submittedAt: Date | null; masteryLevel: string | null; activity: { subjectCode: string | null } }> = await P.eduSubmission.findMany({
    where: { studentId: ctx.studentId, submittedAt: { gte: desde } },
    select: { submittedAt: true, masteryLevel: true, activity: { select: { subjectCode: true } } },
    orderBy: { submittedAt: "desc" }, take: 300,
  }).catch(() => []);
  const deHoje = recentes.filter((r) => r.submittedAt && new Date(r.submittedAt) >= inicioHoje);
  const fracaCode = materiaQueMaisPrecisa(recentes.map((r) => ({ subjectCode: r.activity?.subjectCode ?? null, masteryLevel: r.masteryLevel })));

  const destino = await destinoDoEstudo(P, ctx.networkId, ctx.studentId, fracaCode).catch(() => null)
    ?? { titulo: "Escolha uma matéria para praticar", materia: null, subjectCode: null, href: "/escola/aluno" };

  await semearCartoes(P, ctx).catch(() => 0);
  const revisao = await situacaoDaRevisao(P, ctx);

  const item = await P.eduStudyPlanItem.findFirst({
    where: { networkId: ctx.networkId, studentId: ctx.studentId, isActive: true, weekday: dayIndexSaoPaulo(new Date()) },
    orderBy: { time: "asc" }, select: { time: true, subjectCode: true, minutes: true },
  }).catch(() => null);
  const agendaHoje = item ? {
    time: item.time, minutes: item.minutes, subjectCode: item.subjectCode ?? null,
    materia: item.subjectCode ? subjectInfo(item.subjectCode).name : null,
    href: (await destinoDoEstudo(P, ctx.networkId, ctx.studentId, item.subjectCode ?? null).catch(() => null))?.href ?? "/escola/aluno/trilha",
  } : null;

  const missoes = montarMissoes({
    fraca: { materia: destino.materia, titulo: destino.titulo, href: destino.href, subjectCode: destino.subjectCode },
    estudouHojeEm: new Set(deHoje.map((r) => r.activity?.subjectCode ?? null)),
    estudouHoje: deHoje.length > 0,
    revisao, agendaHoje, minimoRevisao: MINIMO_PARA_MISSAO,
  });
  return NextResponse.json({ missoes, feitas: missoes.filter((m) => m.feita).length, total: missoes.length });
}
