/**
 * POST /api/escola/aluno/revisao/responder { cartaoId, versao, escolha, tentativa }
 * -> { correto, final, certa?, explicacao? }
 * 1ª tentativa errada: só "tente de novo" (sem revelar). Na final (acertou, ou errou
 * a 2ª), mostra a certa e a explicação para o aluno aprender, e espaça o cartão.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { versaoDaPergunta, depoisDeResponder, hojeSP, somarDias } from "@/lib/escola/revisao";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const schema = z.object({ cartaoId: z.string().min(1).max(64), versao: z.number().int().min(0).max(20), escolha: z.number().int().min(0).max(10), tentativa: z.number().int().min(1).max(2) });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const P = prismaEdu as any;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Resposta inválida" }, { status: 400 });
  const { cartaoId, versao, escolha, tentativa } = parsed.data;

  const c = await P.eduReviewCard.findFirst({ where: { id: cartaoId, networkId: ctx.networkId, studentId: ctx.studentId }, select: { id: true, questionId: true, box: true, reviews: true } });
  if (!c) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  const q = await P.eduQuizQuestion.findUnique({ where: { id: c.questionId }, select: { question: true, options: true, correctIndex: true, variants: true, explanation: true } });
  if (!q) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

  const { indice, v } = versaoDaPergunta(q, c.reviews);
  if (indice !== versao) return NextResponse.json({ error: "Essa pergunta mudou. Abra a revisão de novo." }, { status: 409 });
  const correto = escolha === v.correctIndex;
  if (!correto && tentativa === 1) return NextResponse.json({ correto: false, final: false });

  const hoje = hojeSP();
  const prox = tentativa === 1 ? depoisDeResponder(c.box, correto, hoje) : { box: correto ? Math.max(1, c.box) : 1, dueOn: somarDias(hoje, 1) };
  await P.eduReviewCard.update({ where: { id: c.id }, data: { ...prox, lastReviewedOn: hoje, reviews: { increment: 1 } } });
  return NextResponse.json({
    correto, final: true, certa: v.correctIndex,
    // A explicação foi escrita para a pergunta original
    explicacao: indice === 0 ? (q.explanation ?? null) : null,
    firmou: prox.box >= 6,
  });
}
