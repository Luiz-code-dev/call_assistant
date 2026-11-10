/**
 * Alternativas que vão para o navegador do aluno.
 *
 * No banco, cada alternativa pode ser uma string ou { text, misconceptionCode }.
 * O misconceptionCode (e o correctIndex) ficam só no servidor: quem vê qual
 * alternativa não tem código descobre a certa.
 */
export type OpcaoGravada = string | { text: string; misconceptionCode?: string | null };

function texto(o: unknown): string {
  if (typeof o === "string") return o;
  if (o && typeof o === "object" && typeof (o as { text?: unknown }).text === "string") return (o as { text: string }).text;
  return "";
}

/** Lista de textos, para a tela de atividade (options: string[]). */
export function textosDasOpcoes(opts: unknown): string[] {
  return Array.isArray(opts) ? opts.map(texto) : [];
}

/** Lista de { text }, para a tela de diagnóstico. */
export function opcoesParaAluno(opts: unknown): Array<{ text: string }> {
  return textosDasOpcoes(opts).map((text) => ({ text }));
}

/** Questão pronta para o aluno: sem correctIndex, explanation nem misconceptionCode. */
export function questaoParaAluno(q: { id: string; question: string; options: unknown }) {
  return { id: q.id, question: q.question, options: opcoesParaAluno(q.options) };
}
