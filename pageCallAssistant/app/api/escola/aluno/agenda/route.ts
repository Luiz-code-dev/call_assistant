/**
 * Agenda de estudos que a família montou para o aluno.
 * GET: { hoje: itens de hoje com o destino (trilha e etapa), semana: todos os itens ativos, hojeIndex }
 * (0 = segunda, fuso de São Paulo)
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { dayIndexSaoPaulo } from "@/lib/escola/family-guard";
import { destinoDoEstudo } from "@/lib/escola/destino-estudo";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const P = prismaEdu as any;
// Sempre do banco: o aluno precisa ver o recado que acabou de chegar
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const semana = await P.eduStudyPlanItem.findMany({
    where: { networkId: ctx.networkId, studentId: ctx.studentId, isActive: true },
    orderBy: [{ weekday: "asc" }, { time: "asc" }],
    select: { id: true, weekday: true, time: true, subjectCode: true, minutes: true },
  });
  const hojeIndex = dayIndexSaoPaulo(new Date());
  // Cada horário de hoje leva direto à trilha dele (ou ao diagnóstico da matéria)
  const hoje = await Promise.all(semana.filter((i: any) => i.weekday === hojeIndex).map(async (i: any) => ({
    ...i, destino: await destinoDoEstudo(P, ctx.networkId, ctx.studentId, i.subjectCode ?? null).catch(() => null),
  })));
  return NextResponse.json({ hojeIndex, hoje, semana });
}
