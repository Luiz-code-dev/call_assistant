/**
 * GET /api/escola/aluno/revisao -> { cartoes[], pendentes, feitasHoje, firmados }
 * Revisão de 2 minutos: até 5 cartões vencidos, das perguntas que o aluno errou.
 * Nunca envia a alternativa certa nem a explicação antes de responder.
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { textosDasOpcoes } from "@/lib/escola/opcoes-aluno";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";
import { subjectInfo } from "@/lib/escola/subjects";
import { versaoDaPergunta, hojeSP, CAIXA_FIRMADO, POR_SESSAO } from "@/lib/escola/revisao";
import { semearCartoes, situacaoDaRevisao } from "@/lib/escola/revisao-db";

export const dynamic = "force-dynamic";
/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const P = prismaEdu as any;

  await semearCartoes(P, ctx);
  const hoje = hojeSP();
  const vencidos: Array<{ id: string; questionId: string; subjectCode: string | null; reviews: number; box: number }> = await P.eduReviewCard.findMany({
    where: { networkId: ctx.networkId, studentId: ctx.studentId, box: { lt: CAIXA_FIRMADO }, dueOn: { lte: hoje } },
    orderBy: [{ box: "asc" }, { dueOn: "asc" }], take: POR_SESSAO,
    select: { id: true, questionId: true, subjectCode: true, reviews: true, box: true },
  }).catch(() => []);
  const perguntas: Array<{ id: string; question: string; options: unknown; correctIndex: number; variants: unknown; activity: { title: string; subjectCode: string | null } }> =
    vencidos.length ? await P.eduQuizQuestion.findMany({
      where: { id: { in: vencidos.map((c) => c.questionId) } },
      select: { id: true, question: true, options: true, correctIndex: true, variants: true, activity: { select: { title: true, subjectCode: true } } },
    }).catch(() => []) : [];
  const porId = new Map(perguntas.map((q) => [q.id, q]));

  const cartoes = vencidos.flatMap((c) => {
    const q = porId.get(c.questionId);
    if (!q) return [];
    const { indice, v } = versaoDaPergunta(q, c.reviews);
    const code = c.subjectCode ?? q.activity?.subjectCode ?? null;
    return [{
      cartaoId: c.id, versao: indice, pergunta: v.question, opcoes: textosDasOpcoes(v.options),
      materia: code ? subjectInfo(code).name : null, subjectCode: code,
      assunto: q.activity?.title ? tituloParaAluno(q.activity.title) : null,
    }];
  });
  return NextResponse.json({ cartoes, ...(await situacaoDaRevisao(P, ctx)) });
}
