/**
 * POST /api/escola/aluno/redacoes/[id]/enviar -> envia o rascunho e devolve o retorno do Flow.
 * O retorno aponta trechos e faz perguntas; nunca reescreve o texto nem dá nota.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { criarLimite } from "@/lib/escola/ajudante";
import { erroDoEnvio, visaoDoAluno } from "@/lib/escola/redacao";
import { avaliarRedacao } from "@/lib/escola/redacao-ia";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 6 envios por hora por aluno */
const dentroDoLimite = criarLimite(6, 60 * 60 * 1000);

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const db = ctx.db;

  const p = await db.eduEssayPrompt.findFirst({ where: { id: params.id, networkId: ctx.networkId, classId: ctx.classId } });
  if (!p) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  if (!p.isOpen || (p.dueAt && new Date(p.dueAt).getTime() <= Date.now())) return NextResponse.json({ error: "Esta proposta está encerrada." }, { status: 409 });

  const rascunho = await db.eduEssay.findFirst({
    where: { networkId: ctx.networkId, promptId: p.id, studentId: ctx.studentId },
    orderBy: { version: "desc" },
  });
  if (!rascunho || rascunho.status !== "DRAFT") return NextResponse.json({ error: "Não há texto para enviar." }, { status: 409 });
  const erro = erroDoEnvio(rascunho.text, { minPalavras: p.minWords, maxPalavras: p.maxWords });
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });
  if (!dentroDoLimite(ctx.studentId)) return NextResponse.json({ error: "Você já enviou muitos textos nesta hora. Tente de novo mais tarde." }, { status: 429 });

  // Trava o rascunho antes de chamar a IA: dois cliques não geram dois retornos
  const travado = await db.eduEssay.updateMany({ where: { id: rascunho.id, status: "DRAFT" }, data: { status: "SUBMITTED", submittedAt: new Date() } });
  if (travado.count !== 1) return NextResponse.json({ error: "Este texto já foi enviado." }, { status: 409 });

  const turma = await db.eduClass.findFirst({ where: { id: p.classId }, select: { gradeYear: true } });
  const aluno = await db.eduStudent.findFirst({ where: { id: ctx.studentId }, select: { fullName: true } });
  const r = await avaliarRedacao(
    { titulo: p.title, enunciado: p.instructions, genero: p.genre, anoEscolar: turma?.gradeYear ?? null },
    rascunho.text,
    aluno?.fullName ?? "",
  );

  if (r.status === "FLAGGED") {
    // Fica com o professor: ele lê antes de qualquer retorno
    await db.eduEssay.update({ where: { id: rascunho.id }, data: { aiStatus: "FLAGGED", aiError: r.erro } });
    return NextResponse.json({ ok: true, status: "SUBMITTED", retorno: null });
  }
  await db.eduEssay.update({
    where: { id: rascunho.id },
    data: { status: "FEEDBACK", aiStatus: r.status, aiFeedback: r.retorno, aiError: r.erro, aiTokens: r.tokens, feedbackAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "FEEDBACK", retorno: visaoDoAluno(r.retorno, null) });
}
