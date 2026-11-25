/** Capítulo de um livro de formação. O HTML é gerado pela equipe do produto. */
export interface CapituloDoLivro {
  id: string;
  titulo: string;
  html: string;
}

/** Questão da avaliação final. `correta` é o índice da alternativa certa. */
export interface QuestaoDaAvaliacao {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
}
