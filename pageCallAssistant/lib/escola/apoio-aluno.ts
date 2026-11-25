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

// ── Equipe de apoio: função e escolas atendidas ─────────────────────────────

export const FUNCOES_APOIO = ["ASSISTENTE_SOCIAL", "PSICOLOGO", "INDICADO"] as const;
export type FuncaoApoio = (typeof FUNCOES_APOIO)[number];
export const ROTULO_FUNCAO: Record<FuncaoApoio, string> = {
  ASSISTENTE_SOCIAL: "Assistente social",
  PSICOLOGO: "Psicólogo(a)",
  INDICADO: "Profissional indicado",
};
export function funcaoValida(v: unknown): v is FuncaoApoio {
  return typeof v === "string" && (FUNCOES_APOIO as readonly string[]).includes(v);
}

/** Lista vazia de escolas = a pessoa atende a rede toda. */
export function atendeAEscola(schoolIds: string[] | null | undefined, schoolId: string | null | undefined): boolean {
  if (!schoolIds?.length) return true;
  return !!schoolId && schoolIds.includes(schoolId);
}

// ── Desfecho e comunicação aos órgãos de proteção ───────────────────────────

export const DESFECHOS = ["ATENDIDO", "NAO_PROCEDE"] as const;
export type Desfecho = (typeof DESFECHOS)[number];
export const ROTULO_DESFECHO: Record<Desfecho, string> = {
  ATENDIDO: "Atendido",
  NAO_PROCEDE: "Não procede (brincadeira ou engano)",
};
export function desfechoValido(v: unknown): v is Desfecho {
  return typeof v === "string" && (DESFECHOS as readonly string[]).includes(v);
}

export const ORGAOS = ["CONSELHO_TUTELAR", "POLICIA", "MINISTERIO_PUBLICO", "ASSISTENCIA_SOCIAL", "SAUDE"] as const;
export type Orgao = (typeof ORGAOS)[number];
export const ROTULO_ORGAO: Record<Orgao, string> = {
  CONSELHO_TUTELAR: "Conselho Tutelar",
  POLICIA: "Polícia ou delegacia",
  MINISTERIO_PUBLICO: "Ministério Público",
  ASSISTENCIA_SOCIAL: "Assistência social (CRAS ou CREAS)",
  SAUDE: "Saúde (UBS, CAPS ou hospital)",
};
export function orgaosValidos(v: unknown): Orgao[] | null {
  if (!Array.isArray(v)) return null;
  const lista = Array.from(new Set(v.filter((x): x is Orgao => typeof x === "string" && (ORGAOS as readonly string[]).includes(x))));
  return lista.length === v.length ? lista : null;
}

/**
 * Orientação para a equipe, por assunto. Texto de apoio, não substitui o protocolo
 * do município nem a avaliação do profissional.
 */
export const ORIENTACAO: Record<AssuntoApoio, { titulo: string; passos: string[] }> = {
  CONVERSAR: {
    titulo: "Quando o aluno quer conversar",
    passos: [
      "Procure o aluno em lugar reservado, sem chamar na frente da turma.",
      "Escute sem pressa e sem julgar. Não diga que é bobagem nem compare com outros casos.",
      "Se ele falar em se machucar ou em não querer viver, não o deixe sozinho e acione a saúde do município no mesmo dia (UBS, CAPS ou SAMU 192).",
      "Avise a família só quando ela for parte do cuidado, e combine antes com o aluno o que será dito.",
    ],
  },
  MACHUCANDO: {
    titulo: "Quando o aluno diz que alguém o machuca ou causa medo",
    passos: [
      "Acolha e acredite. Agradeça por ele ter contado e diga que a culpa não é dele.",
      "Não peça detalhes nem que ele repita o relato para várias pessoas. A escuta detalhada é de profissional preparado (Lei 13.431/2017).",
      "Não confronte nem avise a pessoa apontada, mesmo que seja da família ou da escola.",
      "Não prometa segredo. Explique que, para protegê-lo, outros adultos precisam saber.",
      "Comunique o Conselho Tutelar (ECA, art. 13). Se houver risco imediato, ligue 190.",
    ],
  },
  CASA: {
    titulo: "Quando algo ruim acontece em casa",
    passos: [
      "Não avise a família antes de avaliar o risco: quem causa o sofrimento pode estar em casa.",
      "Converse em lugar reservado e deixe o aluno contar do jeito dele, sem conduzir as respostas.",
      "Havendo suspeita de violência ou negligência, comunique o Conselho Tutelar (ECA, art. 13).",
      "Situações de fome, falta de moradia ou de cuidado pedem a assistência social do município (CRAS ou CREAS).",
    ],
  },
  ESCOLA: {
    titulo: "Quando algo ruim acontece na escola",
    passos: [
      "Não exponha quem contou: trate o assunto sem citar o aluno para colegas ou para a turma.",
      "Se envolve colegas, acione a coordenação para agir contra a intimidação (Lei 13.185/2015), protegendo o aluno.",
      "Se envolve um adulto da escola, não avise o envolvido nem a direção local: leve direto à Secretaria e ao Conselho Tutelar.",
      "Acompanhe o aluno nos dias seguintes para saber se a situação parou.",
    ],
  },
  OUTRO: {
    titulo: "Quando o aluno preferiu não dizer o assunto",
    passos: [
      "Procure o aluno em lugar reservado e diga que ele pode contar no tempo dele.",
      "Não pressione. Às vezes o primeiro pedido é só para saber se será levado a sério.",
      "Conforme o que ele contar, siga a orientação do assunto correspondente.",
    ],
  },
};

/** Antes de marcar como "não procede". */
export const ORIENTACAO_NAO_PROCEDE = [
  "Só marque depois de conversar pessoalmente com o aluno.",
  "Um pedido que parece brincadeira pode ser um teste para ver se alguém escuta. Não trate como indisciplina e não aplique punição.",
  "Se ficar alguma dúvida, mantenha em acompanhamento.",
];

// ── Indicadores ─────────────────────────────────────────────────────────────

export interface PedidoParaContar {
  assunto: string; status: string; desfecho: string | null; comunicadoA: string[];
  createdAt: Date; vistoAt: Date | null; concluidoEm: Date | null;
}

const FUSO = "America/Sao_Paulo";
function partes(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const [ano, mes, dia] = f.split("-");
  return { ano, mes, dia, chaveDia: f, chaveMes: `${ano}-${mes}` };
}
/** Segunda-feira da semana, no calendário de Brasília. */
function chaveSemana(d: Date): string {
  const { chaveDia } = partes(d);
  const base = new Date(`${chaveDia}T12:00:00Z`);
  const diaDaSemana = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diaDaSemana);
  return base.toISOString().slice(0, 10);
}
function serie(pedidos: PedidoParaContar[], chave: (d: Date) => string, chaves: string[]) {
  const total = new Map<string, number>(chaves.map((c) => [c, 0]));
  for (const p of pedidos) { const c = chave(p.createdAt); if (total.has(c)) total.set(c, (total.get(c) ?? 0) + 1); }
  return chaves.map((c) => ({ periodo: c, total: total.get(c) ?? 0 }));
}
function mediaEmHoras(pares: [Date, Date | null][]): number | null {
  const horas = pares.filter((p): p is [Date, Date] => !!p[1]).map(([a, b]) => (b.getTime() - a.getTime()) / 3_600_000).filter((h) => h >= 0);
  return horas.length ? Math.round((horas.reduce((s, h) => s + h, 0) / horas.length) * 10) / 10 : null;
}

/** Números para o painel da equipe. Só contagens: nenhum nome, nenhum texto. */
export function indicadores(pedidos: PedidoParaContar[], agora: Date = new Date()) {
  const conta = (lista: readonly string[], de: (p: PedidoParaContar) => string | null) =>
    Object.fromEntries(lista.map((k) => [k, pedidos.filter((p) => de(p) === k).length]));

  const dias: string[] = [], semanas: string[] = [], meses: string[] = [];
  for (let i = 13; i >= 0; i--) dias.push(partes(new Date(agora.getTime() - i * 86_400_000)).chaveDia);
  for (let i = 11; i >= 0; i--) { const c = chaveSemana(new Date(agora.getTime() - i * 7 * 86_400_000)); if (!semanas.includes(c)) semanas.push(c); }
  const hoje = partes(agora);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(Number(hoje.ano), Number(hoje.mes) - 1 - i, 15, 12));
    meses.push(partes(d).chaveMes);
  }
  const anos = Array.from(new Set(pedidos.map((p) => partes(p.createdAt).ano).concat(hoje.ano))).sort();

  return {
    total: pedidos.length,
    porStatus: conta(STATUS_APOIO, (p) => p.status),
    porAssunto: conta(ASSUNTOS_APOIO, (p) => p.assunto),
    porDesfecho: conta(DESFECHOS, (p) => (p.status === "CONCLUIDO" ? p.desfecho ?? "ATENDIDO" : null)),
    comunicados: pedidos.filter((p) => p.comunicadoA.length > 0).length,
    porOrgao: Object.fromEntries(ORGAOS.map((o) => [o, pedidos.filter((p) => p.comunicadoA.includes(o)).length])),
    horasAteLeitura: mediaEmHoras(pedidos.map((p) => [p.createdAt, p.vistoAt])),
    horasAteConclusao: mediaEmHoras(pedidos.filter((p) => p.status === "CONCLUIDO").map((p) => [p.createdAt, p.concluidoEm])),
    porDia: serie(pedidos, (d) => partes(d).chaveDia, dias),
    porSemana: serie(pedidos, chaveSemana, semanas),
    porMes: serie(pedidos, (d) => partes(d).chaveMes, meses),
    porAno: serie(pedidos, (d) => partes(d).ano, anos),
  };
}
