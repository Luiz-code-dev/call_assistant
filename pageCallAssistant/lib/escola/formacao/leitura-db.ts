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
export async function selosDaPessoa(db: any, networkId: string, userId: string, slugsDoPerfil?: string[]): Promise<number> {
  // Quem troca de perfil não leva para o novo os selos de livros que não são dele
  const doPerfil = slugsDoPerfil ? { livroSlug: { in: slugsDoPerfil } } : {};
  return db.eduFormacaoLeitura.count({ where: { networkId, userId, concluidoEm: { not: null }, ...doPerfil } });
}

interface Chave { networkId: string; userId: string; livroSlug: string }

const TENTATIVAS = 5;

/**
 * Lê, calcula e grava sem perder o que outra gravação fez no meio do caminho.
 * A atualização só vale se a linha ainda estiver como foi lida; se mudou, lê de novo e refaz a conta.
 */
async function atualizar(db: any, chave: Chave, calcular: (atual: LeituraDoLivro) => Partial<LeituraDoLivro>): Promise<LeituraDoLivro> {
  const onde = { networkId: chave.networkId, userId: chave.userId, livroSlug: chave.livroSlug };
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const linha: LeituraDoLivro | null = await db.eduFormacaoLeitura.findFirst({ where: onde, select: CAMPOS });
    const dados = calcular(linha ?? VAZIA(chave.livroSlug));
    if (!linha) {
      try {
        return await db.eduFormacaoLeitura.create({ data: { ...chave, ...dados }, select: CAMPOS });
      } catch {
        continue; // outra gravação criou a linha primeiro: lê e tenta de novo
      }
    }
    const r = await db.eduFormacaoLeitura.updateMany({
      where: { ...onde, capitulosLidos: { equals: linha.capitulosLidos }, avaliacaoAcertos: linha.avaliacaoAcertos, avaliacaoTotal: linha.avaliacaoTotal },
      data: { ...dados, updatedAt: new Date() },
    });
    if (r.count === 1) return { ...linha, ...dados };
  }
  throw new Error("Não foi possível gravar a leitura: muitas alterações ao mesmo tempo.");
}

/** Marca ou desmarca um capítulo. O selo, uma vez conquistado, não é retirado. */
export async function marcarCapitulo(db: any, chave: Chave, idsDoLivro: string[], capituloId: string, lido: boolean): Promise<LeituraDoLivro> {
  return atualizar(db, chave, (atual) => {
    const marcados = new Set(atual.capitulosLidos.filter((id) => idsDoLivro.includes(id)));
    if (lido) marcados.add(capituloId); else marcados.delete(capituloId);
    const capitulosLidos = idsDoLivro.filter((id) => marcados.has(id));
    const { leituraCompleta } = progressoDoLivro(idsDoLivro, capitulosLidos);
    const conquistou = seloConquistado(leituraCompleta, atual.avaliacaoAcertos, atual.avaliacaoTotal);
    return {
      capitulosLidos,
      ultimoCapitulo: lido ? capituloId : atual.ultimoCapitulo,
      concluidoEm: atual.concluidoEm ?? (conquistou ? new Date() : null),
    };
  });
}

/** Guarda o melhor resultado da avaliação final e, se for o caso, concede o selo. */
export async function registrarAvaliacao(db: any, chave: Chave, idsDoLivro: string[], acertos: number, total: number): Promise<LeituraDoLivro> {
  return atualizar(db, chave, (atual) => {
    const melhor = Math.max(acertos, atual.avaliacaoTotal === total ? atual.avaliacaoAcertos ?? 0 : 0);
    const { leituraCompleta } = progressoDoLivro(idsDoLivro, atual.capitulosLidos);
    const conquistou = seloConquistado(leituraCompleta, melhor, total);
    return {
      avaliacaoAcertos: melhor,
      avaliacaoTotal: total,
      concluidoEm: atual.concluidoEm ?? (conquistou ? new Date() : null),
    };
  });
}
