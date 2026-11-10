/**
 * Recados da família e agenda de estudos: regras comuns às rotas da família e do aluno.
 * Nada aqui vai para a IA.
 */
export const TIPOS_RECADO = ["ELOGIO", "LEMBRETE", "SUGESTAO"] as const;
export type TipoRecado = (typeof TIPOS_RECADO)[number];
export const MAX_RECADO = 240;
export const MAX_RECADOS_POR_DIA = 10;
export const MATERIAS_AGENDA = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI", "ER"] as const;

export function validarRecado(body: unknown): { kind: TipoRecado; text: string } | { erro: string } {
  const b = (body ?? {}) as { kind?: string; text?: string };
  const kind = (b.kind ?? "").toUpperCase() as TipoRecado;
  if (!TIPOS_RECADO.includes(kind)) return { erro: "Escolha elogio, lembrete ou sugestão." };
  const text = String(b.text ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 2) return { erro: "Escreva o recado." };
  if (text.length > MAX_RECADO) return { erro: `O recado pode ter até ${MAX_RECADO} letras.` };
  return { kind, text };
}

export interface ItemAgendaNovo { weekdays: number[]; time: string; subjectCode: string | null; minutes: number }

export function validarAgenda(body: unknown): ItemAgendaNovo | { erro: string } {
  const b = (body ?? {}) as { weekdays?: unknown; time?: unknown; subjectCode?: unknown; minutes?: unknown };
  const weekdays = Array.isArray(b.weekdays) ? Array.from(new Set(b.weekdays.map(Number))).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  if (!weekdays.length) return { erro: "Escolha pelo menos um dia." };
  const time = String(b.time ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { erro: "Horário inválido." };
  const code = b.subjectCode ? String(b.subjectCode).toUpperCase() : null;
  if (code && !(MATERIAS_AGENDA as readonly string[]).includes(code)) return { erro: "Matéria inválida." };
  const minutes = Number(b.minutes ?? 20);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 120) return { erro: "Duração entre 5 e 120 minutos." };
  return { weekdays: weekdays.sort(), time, subjectCode: code, minutes };
}

/** Primeiro nome de quem mandou, para o aluno ver "Recado do Luiz" */
export function primeiroNome(nome: string | null | undefined): string {
  const n = String(nome ?? "").trim().split(/\s+/)[0] ?? "";
  return /^fam[ií]lia$/i.test(n) ? "" : n;
}
