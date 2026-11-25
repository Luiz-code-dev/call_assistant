/**
 * POST /api/escola/formacao/livros/[slug]/avaliacao
 * Corrige a avaliação final do livro. Corpo: { respostas: number[] }.
 * Só aceita depois de todos os capítulos lidos. O gabarito nunca sai antes da resposta.
 */
import { NextResponse } from "next/server";
import { acessoAoLivro } from "@/lib/escola/formacao/acesso";
import { avaliacaoDoLivro, capitulosDoLivro } from "@/lib/escola/formacao/livros/indice";
import { leituraDoLivro, registrarAvaliacao } from "@/lib/escola/formacao/leitura-db";
import { corrigirAvaliacao, progressoDoLivro } from "@/lib/escola/formacao/leitura";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const acesso = await acessoAoLivro(params.slug);
  if ("erro" in acesso) return acesso.erro;

  const [capitulos, avaliacao] = await Promise.all([capitulosDoLivro(acesso.livro.slug), avaliacaoDoLivro(acesso.livro.slug)]);
  if (!capitulos || !avaliacao || avaliacao.length === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ids = capitulos.map((c) => c.id);

  const corpo = (await req.json().catch(() => null)) as { respostas?: unknown } | null;
  if (!corpo || !Array.isArray(corpo.respostas) || corpo.respostas.length !== avaliacao.length) {
    return NextResponse.json({ error: "Responda a todas as questões." }, { status: 400 });
  }

  try {
    const { chave } = acesso;
    const leitura = await leituraDoLivro(acesso.db, chave.networkId, chave.userId, chave.livroSlug);
    if (!progressoDoLivro(ids, leitura.capitulosLidos).leituraCompleta) {
      return NextResponse.json({ error: "Marque todos os capítulos como lidos antes de fazer a avaliação." }, { status: 409 });
    }
    const resultado = corrigirAvaliacao(avaliacao, corpo.respostas);
    const gravada = await registrarAvaliacao(acesso.db, chave, ids, resultado.acertos, resultado.total);
    return NextResponse.json({ ...resultado, selo: !!gravada.concluidoEm });
  } catch (err) {
    console.error("[escolas/formacao] avaliação:", (err as Error).message);
    return NextResponse.json({ error: "Não foi possível corrigir. Tente de novo." }, { status: 500 });
  }
}
