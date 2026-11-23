/**
 * GET   /api/escola/professor/redacoes/[id]/textos/[textoId] -> texto, retorno completo do Flow e revisão
 * PATCH /api/escola/professor/redacoes/[id]/textos/[textoId] { comentarioGeral, porParagrafo, ocultos }
 *       -> salva a revisão do professor; o aluno passa a ver os comentários e pode reescrever.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { PAPEIS_REDACAO, propostaPermitida } from "@/lib/escola/redacao-acesso";
import { dividirParagrafos, lerRevisao, type RetornoRedacao } from "@/lib/escola/redacao";

export const runtime = "nodejs";

async function carregar(params: { id: string; textoId: string }) {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!PAPEIS_REDACAO.has(ctx.role)) return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  const db = ctx.db ?? prismaEdu;
  const achada = await propostaPermitida(db, ctx, params.id);
  if (!achada) return { erro: NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 }) };
  const texto = await db.eduEssay.findFirst({ where: { id: params.textoId, promptId: achada.proposta.id, networkId: ctx.networkId } });
  if (!texto) return { erro: NextResponse.json({ error: "Texto não encontrado" }, { status: 404 }) };
  return { ctx, db, ...achada, texto };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string; textoId: string } }) {
  const c = await carregar(params);
  if (c.erro) return c.erro;
  const { db, ctx, proposta, turma, texto } = c;
  const aluno = await db.eduStudent.findFirst({ where: { id: texto.studentId, networkId: ctx.networkId }, select: { fullName: true } });
  const versoes = await db.eduEssay.findMany({
    where: { promptId: proposta.id, studentId: texto.studentId, networkId: ctx.networkId },
    select: { id: true, version: true, status: true, submittedAt: true },
    orderBy: { version: "asc" },
  });
  return NextResponse.json({
    proposta: { id: proposta.id, titulo: proposta.title, enunciado: proposta.instructions, genero: proposta.genre },
    turma,
    aluno: { nome: aluno?.fullName ?? "Aluno" },
    versoes: versoes.map((v: { id: string; version: number; status: string; submittedAt: Date | null }) => ({ id: v.id, versao: v.version, status: v.status, enviadoEm: v.submittedAt })),
    texto: {
      id: texto.id, versao: texto.version, status: texto.status, palavras: texto.wordCount, enviadoEm: texto.submittedAt,
      paragrafos: dividirParagrafos(texto.text),
      origem: texto.aiStatus,
      retorno: texto.aiFeedback as RetornoRedacao | null,
      revisao: texto.teacherReview,
      revisadoEm: texto.reviewedAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; textoId: string } }) {
  const c = await carregar(params);
  if (c.erro) return c.erro;
  const { db, ctx, texto } = c;
  if (texto.status === "DRAFT") return NextResponse.json({ error: "Este texto ainda não foi enviado pelo aluno." }, { status: 409 });
  const retorno = texto.aiFeedback as RetornoRedacao | null;
  const ids = (retorno?.paragrafos ?? []).flatMap((p) => p.apontamentos.map((a) => a.id));
  const revisao = lerRevisao(await req.json().catch(() => null), ids);
  await db.eduEssay.update({
    where: { id: texto.id },
    data: { teacherReview: revisao, status: "REVIEWED", reviewedAt: new Date(), reviewedById: ctx.userId },
  });
  return NextResponse.json({ ok: true, revisao });
}
