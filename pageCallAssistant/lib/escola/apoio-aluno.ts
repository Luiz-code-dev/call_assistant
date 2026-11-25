/**
 * Canal de apoio ao aluno (SpeakFlow Escolas).
 *
 * O aluno pede para conversar com um adulto ou conta algo que o preocupa. Quem lê é só a equipe
 * que a secretaria indicou por nome. Família, professor e direção não veem, e nenhuma IA lê.
 * A plataforma é só a ponte: o atendimento (psicólogo, serviço social, Conselho Tutelar) é do município.
 *
 * Cuidados que valem para todo o código deste canal:
 * - o aparelho do aluno nunca mostra de volta o que ele escreveu ou gravou;
 * - nenhum aviso (celular, e-mail) carrega nome do aluno ou conteúdo;
 * - o aluno conta com as palavras dele, sem perguntas que conduzam o relato.
 */

export const ASSUNTOS_APOIO = ["CONVERSAR", "MACHUCANDO", "CASA", "ESCOLA", "OUTRO"] as const;
export type AssuntoApoio = (typeof ASSUNTOS_APOIO)[number];

/** Como o aluno lê cada opção: sem rótulo técnico, sem palavra que assuste ou acuse. */
export const ASSUNTO_PARA_O_ALUNO: Record<AssuntoApoio, string> = {
  CONVERSAR: "Estou triste ou preocupado e quero conversar",
  MACHUCANDO: "Alguém está me machucando ou me deixando com medo",
  CASA: "Está acontecendo algo ruim na minha casa",
  ESCOLA: "Está acontecendo algo ruim na escola",
  OUTRO: "É outra coisa, ou prefiro não dizer agora",
};

/** Como a equipe de apoio lê o mesmo assunto. */
export const ASSUNTO_PARA_A_EQUIPE: Record<AssuntoApoio, string> = {
  CONVERSAR: "Quer conversar (tristeza ou preocupação)",
  MACHUCANDO: "Diz que alguém o machuca ou causa medo",
  CASA: "Algo ruim em casa",
  ESCOLA: "Algo ruim na escola",
  OUTRO: "Outro assunto ou preferiu não dizer",
};

export const STATUS_APOIO = ["RECEBIDO", "EM_ACOMPANHAMENTO", "ENCAMINHADO", "CONCLUIDO"] as const;
export type StatusApoio = (typeof STATUS_APOIO)[number];

export const STATUS_PARA_A_EQUIPE: Record<StatusApoio, string> = {
  RECEBIDO: "Novo",
  EM_ACOMPANHAMENTO: "Em acompanhamento",
  ENCAMINHADO: "Encaminhado à rede de proteção",
  CONCLUIDO: "Concluído",
};

/** O aluno só vê duas situações, sempre neutras. */
export function statusParaOAluno(status: string): string {
  return status === "RECEBIDO" ? "Seu pedido chegou" : status === "CONCLUIDO" ? "Pedido atendido" : "Um adulto está cuidando do seu pedido";
}

export const MAX_TEXTO_APOIO = 2000;
export const MAX_AUDIO_SEGUNDOS = 120;
export const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
export const MAX_PEDIDOS_POR_DIA = 5;
export const MAX_OBSERVACAO = 2000;
export const ANOS_POSSIVEIS = [6, 7, 8, 9] as const;

export function assuntoValido(v: unknown): v is AssuntoApoio {
  return typeof v === "string" && (ASSUNTOS_APOIO as readonly string[]).includes(v);
}
export function statusValido(v: unknown): v is StatusApoio {
  return typeof v === "string" && (STATUS_APOIO as readonly string[]).includes(v);
}

/** O canal aparece para o aluno quando a rede ligou e o ano dele é igual ou maior que o mínimo. */
export function canalDisponivel(rede: { apoioAtivo?: boolean | null; apoioAnoMinimo?: number | null } | null | undefined, anoDoAluno: number | null | undefined): boolean {
  if (!rede?.apoioAtivo) return false;
  if (typeof anoDoAluno !== "number") return false;
  return anoDoAluno >= (rede.apoioAnoMinimo ?? 7);
}

export interface PedidoNovo { assunto: AssuntoApoio; text: string | null }

/**
 * O aluno pode mandar só o assunto: escrever e gravar são opcionais, para ninguém
 * precisar explicar mais do que consegue.
 */
export function validarPedido(body: { assunto?: unknown; text?: unknown }): PedidoNovo | { erro: string } {
  if (!assuntoValido(body.assunto)) return { erro: "Escolha uma das opções." };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length > MAX_TEXTO_APOIO) return { erro: `O texto pode ter até ${MAX_TEXTO_APOIO} letras.` };
  return { assunto: body.assunto, text: text || null };
}

/** Tipos de áudio aceitos do gravador do navegador. */
export function audioAceito(mime: string, bytes: number): boolean {
  return /^audio\/(webm|mp4|mpeg|ogg|aac|x-m4a)/.test(mime) && bytes > 0 && bytes <= MAX_AUDIO_BYTES;
}

/** E-mail para a equipe: sem nome do aluno, sem assunto, sem conteúdo. */
export function emailNovoPedido(siteBase: string): { subject: string; text: string } {
  return {
    subject: "Há um novo pedido de apoio de aluno para ler",
    text: `Um aluno enviou um pedido de apoio.\n\nPor segurança, este e-mail não traz o nome nem o conteúdo. Entre no sistema para ler:\n${siteBase}/escola/apoio\n\nVocê recebe este aviso porque a Secretaria de Educação indicou você para a equipe de apoio ao aluno.`,
  };
}
