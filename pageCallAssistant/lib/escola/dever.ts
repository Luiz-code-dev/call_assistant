/**
 * Foto do dever da escola: o Flow lê só o enunciado do exercício e ajuda a pensar,
 * com as mesmas regras das atividades (nunca dá a resposta).
 *
 * Proteção de dados: o aluno recorta a foto antes de enviar; a IA é instruída a não
 * transcrever nomes nem dados pessoais; o servidor ainda apaga o nome do aluno, números
 * de documento e telefones do texto. A imagem não é guardada em lugar nenhum.
 */

export const PROMPT_LEITURA = `Você lê fotos de exercícios escolares para um ajudante de estudos de crianças.
Transcreva o exercício completo como está na página: os enunciados, as alternativas, os números e as lacunas.
- Mantenha as contas e lacunas do jeito que aparecem, com ___ no lugar dos espaços em branco (ex.: "___ + ___ + ___ = ___").
- Desenhos e figuras fazem parte do exercício: descreva entre colchetes o que mostram, de forma objetiva, com as quantidades que dá para ver (ex.: "[5 caixas, cada uma com uma placa: 10 laranjas]", "[34 chapéus desenhados]"). Não conclua nada a partir da figura.
- Se houver mais de um exercício, numere como na página.
REGRAS:
- Não resolva nada e não escreva respostas.
- Não transcreva o que o aluno escreveu à mão; no lugar, deixe a lacuna ___.
- Nunca transcreva nomes de pessoas, nome da escola, turma, matrícula, telefone, endereço, data de nascimento ou qualquer dado pessoal. Onde houver, escreva [nome].
- Se a imagem não for um exercício escolar, ou não der para ler, responda "materia": null e "enunciado": "NAO_E_EXERCICIO".
- Em "ano", estime o ano escolar do exercício (1 a 9) pelo conteúdo e pelo jeito do livro (ex.: letras maiúsculas e números até 100 = 1º ano).
Responda só JSON: {"enunciado": "...", "materia": "Matemática" | "Língua Portuguesa" | "Ciências" | "História" | "Geografia" | "Arte" | "Língua Inglesa" | null, "ano": 1..9 | null}`;

const MATERIAS = ["Matemática", "Língua Portuguesa", "Ciências", "História", "Geografia", "Arte", "Língua Inglesa"];

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Apaga o nome do aluno (cada parte com 3+ letras), CPFs, telefones e e-mails */
export function apagarDadosPessoais(texto: string, nomeDoAluno: string): string {
  let t = texto.normalize("NFC");
  const partes = nomeDoAluno.split(/\s+/).map((p) => p.trim()).filter((p) => p.length >= 3 && !/^(dos|das|de|da|do)$/i.test(p));
  for (const p of partes) {
    const alvo = semAcento(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // compara sem acento, preservando o resto do texto
    const base = semAcento(t);
    const re = new RegExp(`(^|[^\\p{L}])(${alvo})(?=[^\\p{L}]|$)`, "giu");
    let m: RegExpExecArray | null;
    const trocas: Array<[number, number]> = [];
    while ((m = re.exec(base))) trocas.push([m.index + m[1].length, m[2].length]);
    for (const [ini, len] of trocas.reverse()) t = t.slice(0, ini) + "[nome]" + t.slice(ini + len);
  }
  return t
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]")
    .replace(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[telefone]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail]");
}

export function lerResposta(saida: string): { enunciado: string; materia: string | null; ano: number | null } | null {
  let j: { enunciado?: unknown; materia?: unknown; ano?: unknown };
  try { j = JSON.parse(saida); } catch { return null; }
  const enunciado = typeof j.enunciado === "string" ? j.enunciado.trim() : "";
  if (!enunciado || enunciado === "NAO_E_EXERCICIO" || enunciado.length < 8) return null;
  const materia = typeof j.materia === "string" && MATERIAS.includes(j.materia) ? j.materia : null;
  const ano = typeof j.ano === "number" && Number.isInteger(j.ano) && j.ano >= 1 && j.ano <= 9 ? j.ano : null;
  return { enunciado: enunciado.slice(0, 3000), materia, ano };
}
