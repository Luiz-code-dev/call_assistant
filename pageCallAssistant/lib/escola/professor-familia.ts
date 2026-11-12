/**
 * Professor e família conversando (pacote de extensão de aula):
 * - o professor indica reforço numa matéria para a turma toda ou para alguns alunos,
 *   e a família recebe na tela dela com o botão de pôr na agenda;
 * - a família manda um retorno sobre o professor, que chega para a coordenação.
 * Só aparece quando a escola tem professores atribuídos às turmas (extensão de aula).
 * Nada aqui passa pela IA.
 */
import { MATERIAS_AGENDA } from "@/lib/escola/recados";
import type { Aviso } from "@/lib/escola/avisos";

export const MAX_TEXTO_INDICACAO = 300;
export const MAX_ALUNOS_POR_ENVIO = 60;
/** Envios do professor por dia (cada envio pode ser a turma toda) */
export const MAX_ENVIOS_POR_DIA = 30;

export const TIPOS_RETORNO = ["ELOGIO", "SUGESTAO", "PREOCUPACAO"] as const;
export type TipoRetorno = (typeof TIPOS_RETORNO)[number];
export const ROTULO_RETORNO: Record<TipoRetorno, string> = { ELOGIO: "Elogio", SUGESTAO: "Sugestão", PREOCUPACAO: "Preocupação" };
export const MAX_TEXTO_RETORNO = 600;
export const MAX_RETORNOS_POR_DIA = 5;

function limpar(t: unknown): string {
  return String(t ?? "").replace(/\s+/g, " ").trim();
}

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const NOME_PARA_CODIGO: Record<string, string> = {
  "lingua portuguesa": "LP", portugues: "LP", "lingua portugues": "LP",
  matematica: "MA", ciencias: "CI", historia: "HI", geografia: "GE", arte: "AR", artes: "AR",
  "educacao fisica": "EF", ingles: "LI", "lingua inglesa": "LI", "ensino religioso": "ER",
};

/** Código da matéria na agenda da família ("Matemática" -> "MA"), ou null se não houver */
export function codigoAgendaDaMateria(nome: string | null | undefined): string | null {
  const n = semAcento(String(nome ?? ""));
  if (!n) return null;
  const direto = n.toUpperCase();
  if ((MATERIAS_AGENDA as readonly string[]).includes(direto)) return direto;
  return NOME_PARA_CODIGO[n] ?? null;
}

export interface IndicacaoNova { classSubjectId: string; todos: boolean; studentIds: string[]; text: string }

export function validarIndicacao(body: unknown): IndicacaoNova | { erro: string } {
  const b = (body ?? {}) as { classSubjectId?: unknown; todos?: unknown; studentIds?: unknown; text?: unknown };
  const classSubjectId = limpar(b.classSubjectId);
  if (!classSubjectId) return { erro: "Escolha a turma e a matéria." };
  const todos = b.todos === true;
  const studentIds = Array.isArray(b.studentIds)
    ? Array.from(new Set(b.studentIds.map((x) => limpar(x)).filter(Boolean))).slice(0, MAX_ALUNOS_POR_ENVIO + 1)
    : [];
  if (!todos && !studentIds.length) return { erro: "Escolha a turma toda ou pelo menos um aluno." };
  if (studentIds.length > MAX_ALUNOS_POR_ENVIO) return { erro: `Escolha até ${MAX_ALUNOS_POR_ENVIO} alunos por vez.` };
  const text = limpar(b.text);
  if (text.length < 5) return { erro: "Escreva o que o aluno precisa reforçar." };
  if (text.length > MAX_TEXTO_INDICACAO) return { erro: `A mensagem pode ter até ${MAX_TEXTO_INDICACAO} letras.` };
  return { classSubjectId, todos, studentIds: todos ? [] : studentIds, text };
}

export interface RetornoNovo { classSubjectId: string; kind: TipoRetorno; text: string }

export function validarRetorno(body: unknown): RetornoNovo | { erro: string } {
  const b = (body ?? {}) as { classSubjectId?: unknown; kind?: unknown; text?: unknown };
  const classSubjectId = limpar(b.classSubjectId);
  if (!classSubjectId) return { erro: "Escolha o professor." };
  const kind = limpar(b.kind).toUpperCase() as TipoRetorno;
  if (!TIPOS_RETORNO.includes(kind)) return { erro: "Escolha elogio, sugestão ou preocupação." };
  const text = limpar(b.text);
  if (text.length < 5) return { erro: "Escreva o seu retorno." };
  if (text.length > MAX_TEXTO_RETORNO) return { erro: `O retorno pode ter até ${MAX_TEXTO_RETORNO} letras.` };
  return { classSubjectId, kind, text };
}

/** Nome para a família ver: "Prof. Ana Souza" (primeiro e último nome) */
export function nomeDoProfessor(nome: string | null | undefined): string {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Professor(a)";
  return `Prof. ${partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0]}`;
}

/** Aviso no celular e no e-mail da família quando o professor indica reforço */
export function avisoIndicacaoDoProfessor(nomeAluno: string, materia: string, professor: string, texto: string, studentId: string): Aviso {
  const n = String(nomeAluno ?? "").trim().split(/\s+/)[0] || "Seu filho";
  return {
    tipo: "familia-indicacao-professor",
    title: `${professor} indicou reforço em ${materia} para ${n}`,
    body: texto.length > 140 ? texto.slice(0, 140).replace(/\s+\S*$/, "") + "..." : texto,
    url: `/escola/familia/${studentId}#professor`,
    icon: "/escola-icons/aviso-sugestao.png", badge: "/escola-icons/aviso-badge.png",
    tag: `familia-indicacao-${studentId}`, vibrate: [150, 100, 150],
  };
}
