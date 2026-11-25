/**
 * POST /api/escola/formacao/livros/[slug]/leitura
 * Marca ou desmarca um capítulo como lido. Corpo: { capituloId, lido }.
 */
import { NextResponse } from "next/server";
import { acessoAoLivro } from "@/lib/escola/formacao/acesso";
import { capitulosDoLivro } from "@/lib/escola/formacao/livros/indice";
import { marcarCapitulo } from "@/lib/escola/formacao/leitura-db";
import { progressoDoLivro } from "@/lib/escola/formacao/leitura";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const acesso = await acessoAoLivro(params.slug);
  if ("erro" in acesso) return acesso.erro;

  const corpo = (await req.json().catch(() => null)) as { capituloId?: unknown; lido?: unknown } | null;
  const capitulos = await capitulosDoLivro(acesso.livro.slug);
  const ids = (capitulos ?? []).map((c) => c.id);
  if (!corpo || typeof corpo.capituloId !== "string" || typeof corpo.lido !== "boolean" || !ids.includes(corpo.capituloId)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    const leitura = await marcarCapitulo(acesso.db, acesso.chave, ids, corpo.capituloId, corpo.lido);
    return NextResponse.json({
      capitulosLidos: leitura.capitulosLidos,
      progresso: progressoDoLivro(ids, leitura.capitulosLidos),
      selo: !!leitura.concluidoEm,
    });
  } catch (err) {
    console.error("[escolas/formacao] leitura:", (err as Error).message);
    return NextResponse.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
