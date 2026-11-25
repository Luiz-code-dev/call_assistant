/**
 * Leitura dos livros de formação: progresso, avaliação final e Selo de Formação.
 *
 * Um livro está concluído, e o selo conquistado, quando a pessoa marcou todos
 * os capítulos como lidos e acertou ao menos 70% da avaliação final.
 * Funções puras: quem lê e grava no banco é leitura-db.ts.
 */
import type { QuestaoDaAvaliacao } from "./livros/tipos";

/** Fração mínima de acertos na avaliação final. */
export const NOTA_MINIMA = 0.7;

export const NOME_DO_SELO = "Selo de Formação";
export const TITULO_FORMACAO_COMPLETA = "Formação Completa";

export interface ProgressoDoLivro {
  lidos: number;
  total: number;
  /** Todos os capítulos foram lidos. */
  leituraCompleta: boolean;
  /** Primeiro capítulo ainda não lido, na ordem do livro. */
  proximo: string | null;
}

/** Ignora capítulos marcados que não existem mais no livro. */
export function progressoDoLivro(idsDoLivro: string[], lidos: string[]): ProgressoDoLivro {
  const marcados = new Set(lidos);
  const validos = idsDoLivro.filter((id) => marcados.has(id));
  return {
    lidos: validos.length,
    total: idsDoLivro.length,
    leituraCompleta: idsDoLivro.length > 0 && validos.length === idsDoLivro.length,
    proximo: idsDoLivro.find((id) => !marcados.has(id)) ?? null,
  };
}

/** Acertos necessários para ser aprovado em uma avaliação com `total` questões. */
export function acertosNecessarios(total: number): number {
  return Math.ceil(total * NOTA_MINIMA);
}

export function aprovado(acertos: number | null | undefined, total: number | null | undefined): boolean {
  if (typeof acertos !== "number" || typeof total !== "number" || total <= 0) return false;
  return acertos >= acertosNecessarios(total);
}

export interface CorrecaoDaQuestao {
  acertou: boolean;
  /** Índice da alternativa certa. */
  correta: number;
  explicacao: string;
}

export interface ResultadoDaAvaliacao {
  acertos: number;
  total: number;
  aprovado: boolean;
  correcoes: CorrecaoDaQuestao[];
}

/** Corrige a avaliação. Questão sem resposta, ou com resposta inválida, conta como erro. */
export function corrigirAvaliacao(avaliacao: QuestaoDaAvaliacao[], respostas: unknown[]): ResultadoDaAvaliacao {
  const correcoes = avaliacao.map((questao, i) => ({
    acertou: respostas[i] === questao.correta,
    correta: questao.correta,
    explicacao: questao.explicacao,
  }));
  const acertos = correcoes.filter((c) => c.acertou).length;
  return { acertos, total: avaliacao.length, aprovado: aprovado(acertos, avaliacao.length), correcoes };
}

/** O selo exige as duas coisas: leitura completa e avaliação aprovada. */
export function seloConquistado(leituraCompleta: boolean, acertos: number | null | undefined, total: number | null | undefined): boolean {
  return leituraCompleta && aprovado(acertos, total);
}

/** Frase curta para o perfil: quantos selos a pessoa tem. */
export function fraseDosSelos(conquistados: number, disponiveis: number): string {
  if (disponiveis > 0 && conquistados >= disponiveis) return TITULO_FORMACAO_COMPLETA;
  if (conquistados === 1) return "1 selo de formação";
  return `${conquistados} selos de formação`;
}
