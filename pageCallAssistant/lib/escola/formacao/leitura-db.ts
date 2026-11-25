/**
 * Leitura dos livros de formação no banco da rede (EduFormacaoLeitura).
 * Uma linha por pessoa e por livro. As regras estão em leitura.ts.
 */
import { progressoDoLivro, seloConquistado } from "./leitura";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

export interface LeituraDoLivro {
  livroSlug: string;
  capitulosLidos: string[];
  ultimoCapitulo: string | null;
  avaliacaoAcertos: number | null;
  avaliacaoTotal: number | null;
  concluidoEm: Date | null;
}

const CAMPOS = { livroSlug: true, capitulosLidos: true, ultimoCapitulo: true, avaliacaoAcertos: true, avaliacaoTotal: true, concluidoEm: true };

const VAZIA = (livroSlug: string): LeituraDoLivro => ({
  livroSlug, capitulosLidos: [], ultimoCapitulo: null, avaliacaoAcertos: null, avaliacaoTotal: null, concluidoEm: null,
});

/** Todas as leituras da pessoa, por livro. */
export async function leiturasDaPessoa(db: any, networkId: string, userId: string): Promise<Map<string, LeituraDoLivro>> {
  const linhas: LeituraDoLivro[] = await db.eduFormacaoLeitura.findMany({ where: { networkId, userId }, select: CAMPOS });
  return new Map(linhas.map((l) => [l.livroSlug, l]));
}

export async function leituraDoLivro(db: any, networkId: string, userId: string, livroSlug: string): Promise<LeituraDoLivro> {
  const linha: LeituraDoLivro | null = await db.eduFormacaoLeitura.findFirst({ where: { networkId, userId, livroSlug }, select: CAMPOS });
  return linha ?? VAZIA(livroSlug);
}

/** Quantos selos a pessoa já conquistou. */
export async function selosDaPessoa(db: any, networkId: string, userId: string): Promise<number> {
  return db.eduFormacaoLeitura.count({ where: { networkId, userId, concluidoEm: { not: null } } });
}

interface Chave { networkId: string; userId: string; livroSlug: string }

async function gravar(db: any, chave: Chave, dados: Partial<LeituraDoLivro>): Promise<LeituraDoLivro> {
  return db.eduFormacaoLeitura.upsert({
    where: { userId_livroSlug: { userId: chave.userId, livroSlug: chave.livroSlug } },
    create: { ...chave, ...dados },
    update: { ...dados, updatedAt: new Date() },
    select: CAMPOS,
  });
}

/** Marca ou desmarca um capítulo. O selo, uma vez conquistado, não é retirado. */
export async function marcarCapitulo(db: any, chave: Chave, idsDoLivro: string[], capituloId: string, lido: boolean): Promise<LeituraDoLivro> {
  const atual = await leituraDoLivro(db, chave.networkId, chave.userId, chave.livroSlug);
  const marcados = new Set(atual.capitulosLidos.filter((id) => idsDoLivro.includes(id)));
  if (lido) marcados.add(capituloId); else marcados.delete(capituloId);
  const capitulosLidos = idsDoLivro.filter((id) => marcados.has(id));
  const { leituraCompleta } = progressoDoLivro(idsDoLivro, capitulosLidos);
  const conquistou = seloConquistado(leituraCompleta, atual.avaliacaoAcertos, atual.avaliacaoTotal);
  return gravar(db, chave, {
    capitulosLidos,
    ultimoCapitulo: lido ? capituloId : atual.ultimoCapitulo,
    concluidoEm: atual.concluidoEm ?? (conquistou ? new Date() : null),
  });
}

/** Guarda o melhor resultado da avaliação final e, se for o caso, concede o selo. */
export async function registrarAvaliacao(db: any, chave: Chave, idsDoLivro: string[], acertos: number, total: number): Promise<LeituraDoLivro> {
  const atual = await leituraDoLivro(db, chave.networkId, chave.userId, chave.livroSlug);
  const melhor = Math.max(acertos, atual.avaliacaoTotal === total ? atual.avaliacaoAcertos ?? 0 : 0);
  const { leituraCompleta } = progressoDoLivro(idsDoLivro, atual.capitulosLidos);
  const conquistou = seloConquistado(leituraCompleta, melhor, total);
  return gravar(db, chave, {
    avaliacaoAcertos: melhor,
    avaliacaoTotal: total,
    concluidoEm: atual.concluidoEm ?? (conquistou ? new Date() : null),
  });
}
