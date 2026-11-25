/**
 * Acesso comum às rotas de leitura dos livros de formação: confere a sessão,
 * o perfil e se o livro pertence ao perfil de quem pede.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { livroDoPerfil, type Livro } from "./livros/indice";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

interface Acesso {
  db: any;
  livro: Livro;
  chave: { networkId: string; userId: string; livroSlug: string };
}

export async function acessoAoLivro(slug: string): Promise<{ erro: NextResponse } | Acesso> {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext({ permitirApoio: true });
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const livro = livroDoPerfil(slug, ctx.role);
  // Sem rede (administração da plataforma) não há leitura a registrar
  if (!livro || !ctx.networkId || !ctx.userId) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { db: (ctx.db ?? prismaEdu) as any, livro, chave: { networkId: ctx.networkId, userId: ctx.userId, livroSlug: livro.slug } };
}
