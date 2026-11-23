/**
 * GET /api/escola/aluno/redacoes/[id] -> proposta, versões do aluno com o retorno e se pode escrever
 * PUT /api/escola/aluno/redacoes/[id] { texto } -> guarda o rascunho (abre a reescrita quando liberada)
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext, type StudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import {
  GENEROS, generoValido, contarPalavras, dividirParagrafos, normalizarTexto, podeEscrever, visaoDoAluno,
  type RetornoRedacao, type RevisaoProfessor,
} from "@/lib/escola/redacao";

export const runtime = "nodejs";

async function propostaDoAluno(ctx: StudentContext, id: string) {
  return ctx.db.eduEssayPrompt.findFirst({ where: { id, networkId: ctx.networkId, classId: ctx.classId } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const p = await propostaDoAluno(ctx, params.id);
  if (!p) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

  const versoes = await ctx.db.eduEssay.findMany({
    where: { networkId: ctx.networkId, promptId: p.id, studentId: ctx.studentId },
    orderBy: { version: "asc" },
  });
  const ultima = versoes[versoes.length - 1] ?? null;
  const aberta = p.isOpen && (!p.dueAt || new Date(p.dueAt).getTime() > Date.now());

  return NextResponse.json({
    proposta: {
      id: p.id, titulo: p.title, enunciado: p.instructions,
      genero: generoValido(p.genre) ? GENEROS[p.genre] : "", generoId: p.genre,
      minPalavras: p.minWords, maxPalavras: p.maxWords, maxVersoes: p.maxVersions, prazo: p.dueAt, aberta,
    },
    podeEscrever: podeEscrever({ aberta, maxVersoes: p.maxVersions }, ultima ? { versao: ultima.version, status: ultima.status } : null),
    versoes: versoes.map((v: { version: number; status: string; text: string; wordCount: number; submittedAt: Date | null; aiFeedback: unknown; teacherReview: unknown }) => ({
      versao: v.version,
      status: v.status,
      texto: v.status === "DRAFT" ? v.text : null,
      paragrafos: v.status === "DRAFT" ? [] : dividirParagrafos(v.text),
      palavras: v.wordCount,
      enviadoEm: v.submittedAt,
      // Rascunho não tem retorno; aguardando o professor também não
      retorno: v.status === "FEEDBACK" || v.status === "REVIEWED"
        ? visaoDoAluno(v.aiFeedback as RetornoRedacao | null, v.status === "REVIEWED" ? (v.teacherReview as RevisaoProfessor | null) : null)
        : null,
    })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const p = await propostaDoAluno(ctx, params.id);
  if (!p) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

  const b = (await req.json().catch(() => null)) as { texto?: unknown } | null;
  if (typeof b?.texto !== "string") return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  const texto = normalizarTexto(b.texto);
  const aberta = p.isOpen && (!p.dueAt || new Date(p.dueAt).getTime() > Date.now());

  const ultima = await ctx.db.eduEssay.findFirst({
    where: { networkId: ctx.networkId, promptId: p.id, studentId: ctx.studentId },
    orderBy: { version: "desc" },
  });
  if (!podeEscrever({ aberta, maxVersoes: p.maxVersions }, ultima ? { versao: ultima.version, status: ultima.status } : null)) {
    return NextResponse.json({ error: aberta ? "Aguarde o retorno antes de escrever de novo." : "Esta proposta está encerrada." }, { status: 409 });
  }

  const dados = { text: texto, wordCount: contarPalavras(texto) };
  if (ultima?.status === "DRAFT") {
    await ctx.db.eduEssay.update({ where: { id: ultima.id }, data: dados });
    return NextResponse.json({ ok: true, versao: ultima.version });
  }
  const versao = (ultima?.version ?? 0) + 1;
  try {
    await ctx.db.eduEssay.create({ data: { networkId: ctx.networkId, promptId: p.id, studentId: ctx.studentId, version: versao, status: "DRAFT", ...dados } });
  } catch {
    // Duas abas salvando ao mesmo tempo: a outra já criou a versão
    return NextResponse.json({ error: "Seu texto foi aberto em outra tela. Recarregue a página." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, versao });
}
