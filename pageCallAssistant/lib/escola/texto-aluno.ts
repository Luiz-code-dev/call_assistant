/**
 * Textos que o aluno e a família leem: nunca o código BNCC nem o prefixo "Trilha:".
 * "Trilha: Comparar e ordenar frações (EF06MA07)" -> "Comparar e ordenar frações"
 */
export function tituloParaAluno(titulo: string | null | undefined): string {
  return String(titulo ?? "")
    .replace(/^Trilha:\s*/i, "")
    .replace(/\s*[(\[]?\bEF\d{2}[A-Z]{2}\d{2}\b[)\]]?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
