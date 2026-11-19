/**
 * lib/escola/evolucao-degraus.ts
 *
 * Regras de leitura da evolução para o responsável e para o aluno: em que degrau o
 * aluno começou em cada conteúdo, em que degrau está e o que mudou. Funções puras.
 */

export type Degrau = "NOT_YET" | "ALMOST" | "MASTERED";

export const ORDEM_DEGRAU: Record<Degrau, number> = { NOT_YET: 0, ALMOST: 1, MASTERED: 2 };

export function ehDegrau(v: unknown): v is Degrau {
  return v === "NOT_YET" || v === "ALMOST" || v === "MASTERED";
}

/**
 * Ano escolar de um conteúdo a partir do código da BNCC.
 * EF05MA03 → "5º ano"; EF35LP03 → "3º ao 5º ano"; EF67EF01 → "6º e 7º ano".
 * Devolve null quando o código não segue o padrão.
 */
export function anoDoConteudo(code: string | null | undefined): string | null {
  const m = /^EF(\d)(\d)[A-Z]{2}\d+/.exec(String(code ?? "").trim().toUpperCase());
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 && b >= 1 && b <= 9) return `${b}º ano`;
  if (a >= 1 && b > a && b <= 9) return b - a === 1 ? `${a}º e ${b}º ano` : `${a}º ao ${b}º ano`;
  return null;
}

/** Quantos degraus o aluno andou entre dois níveis (positivo = subiu). null se faltar um dos dois. */
export function passos(de: string | null | undefined, para: string | null | undefined): number | null {
  if (!ehDegrau(de) || !ehDegrau(para)) return null;
  return ORDEM_DEGRAU[para] - ORDEM_DEGRAU[de];
}

export interface ConteudoEvolucao {
  level: string;
  levelInicial: string | null;
  levelSemana?: string | null;
}

export interface ResumoEvolucao {
  /** Conteúdos em que o nível de hoje está acima do primeiro diagnóstico. */
  subiu: number;
  /** Conteúdos em que o nível de hoje é igual ao do primeiro diagnóstico. */
  manteve: number;
  /** Conteúdos em que o nível de hoje está abaixo do primeiro diagnóstico. */
  desceu: number;
  /** Conteúdos sem diagnóstico inicial (não dá para dizer de onde partiu). */
  semInicio: number;
  /** Conteúdos que hoje estão no primeiro degrau (Praticando). */
  atencao: number;
  /** Conteúdos que subiram de degrau nos últimos 7 dias. */
  subiuNaSemana: number;
}

export function resumirEvolucao(conteudos: ConteudoEvolucao[]): ResumoEvolucao {
  const r: ResumoEvolucao = { subiu: 0, manteve: 0, desceu: 0, semInicio: 0, atencao: 0, subiuNaSemana: 0 };
  for (const c of conteudos) {
    const p = passos(c.levelInicial, c.level);
    if (p === null) r.semInicio++;
    else if (p > 0) r.subiu++;
    else if (p < 0) r.desceu++;
    else r.manteve++;
    if (c.level === "NOT_YET") r.atencao++;
    const s = passos(c.levelSemana, c.level);
    if (s !== null && s > 0) r.subiuNaSemana++;
  }
  return r;
}

const NOME: Record<Degrau, string> = { NOT_YET: "Praticando", ALMOST: "Quase lá", MASTERED: "Domina" };

/** Frase curta que explica o caminho do aluno num conteúdo, sem nota e sem código. */
export function fraseDoCaminho(levelInicial: string | null | undefined, level: string): string {
  if (!ehDegrau(level)) return "";
  if (!ehDegrau(levelInicial)) return `Está em ${NOME[level]}. Este conteúdo não passou pelo diagnóstico inicial.`;
  const p = ORDEM_DEGRAU[level] - ORDEM_DEGRAU[levelInicial];
  if (p > 0) return `Começou em ${NOME[levelInicial]} e está em ${NOME[level]}: subiu ${p} ${p === 1 ? "degrau" : "degraus"}.`;
  if (p < 0) return `Começou em ${NOME[levelInicial]} e está em ${NOME[level]}: precisa retomar este conteúdo.`;
  if (level === "MASTERED") return "Já dominava no diagnóstico e continua dominando.";
  return `Começou em ${NOME[levelInicial]} e continua neste degrau.`;
}
