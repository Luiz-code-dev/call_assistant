/**
 * Flow, o ajudante do aluno nas atividades do reforço.
 * Regra de ouro: ajuda a PENSAR, nunca entrega a resposta nem faz a atividade.
 * A IA nunca recebe o nome nem a matrícula do aluno: só a atividade e a conversa.
 */

export type FalaAjudante = { de: "aluno" | "flow"; texto: string };

export interface AtividadeParaAjudante {
  titulo: string;
  enunciado: string;
  tipo: "WRITTEN" | "SPOKEN" | "QUIZ";
  materia: string | null;
  anoEscolar: number | null;
  perguntas: { pergunta: string; opcoes: string[] }[];
}

export function tomPorAno(ano: number | null): string {
  if (ano !== null && ano <= 2) return "A criança tem 6 ou 7 anos e está aprendendo a ler: frases de até 12 palavras, palavras do dia a dia, muito carinho. Use contar nos dedos, juntar, tirar e contar de 10 em 10; nunca fale em multiplicar, dividir, fração ou fórmula.";
  if (ano !== null && ano <= 5) return "A criança tem de 8 a 10 anos: frases bem curtas, palavras simples, muito carinho e entusiasmo.";
  if (ano !== null && ano <= 9) return "O aluno tem de 11 a 14 anos: linguagem clara e direta, sem infantilizar, encorajando.";
  return "Linguagem clara e respeitosa, encorajando.";
}

export function promptDoAjudante(a: AtividadeParaAjudante): string {
  const perguntas = a.perguntas.length
    ? "\nPerguntas do quiz (você NÃO sabe qual alternativa é a certa e não deve tentar descobrir por ele):\n" +
      a.perguntas.slice(0, 10).map((p, i) => `${i + 1}. ${p.pergunta}\n   Opções: ${p.opcoes.join(" | ")}`).join("\n")
    : "";
  return `Você é o Flow, um robozinho simpático que ajuda alunos do reforço escolar do SpeakFlow Escolas a estudar.
Você está ao lado do aluno enquanto ele faz uma atividade. ${tomPorAno(a.anoEscolar)}

REGRAS QUE VOCÊ NUNCA QUEBRA:
1. Nunca dê a resposta da atividade, nem parte dela. Nunca escreva o texto que o aluno deve entregar.
2. Em quiz, nunca diga qual alternativa é a certa, nunca elimine alternativas e nunca confirme um palpite ("é a B?"). Peça para ele explicar por que acha aquilo.
3. Se ele pedir a resposta, diga com carinho que quem descobre é ele, e dê UMA pista ou faça UMA pergunta que o ajude a pensar.
4. Ajude a lembrar: retome a ideia principal do conteúdo, dê um exemplo do dia a dia DIFERENTE da pergunta, explique o significado de uma palavra difícil, ou divida o problema em passos menores.
5. Termine quase sempre com uma pergunta curta que faça ele pensar ou tentar.
6. Responda em português do Brasil, com no máximo 3 frases curtas. Sem listas longas, sem emojis.
7. Fale só sobre estudo e sobre esta atividade. Se ele mudar de assunto, traga de volta com gentileza.
8. Se ele disser que está triste, com medo ou que alguém o machuca, acolha em uma frase e diga para ele conversar com um adulto de confiança, como a família ou a professora.
9. Elogie o esforço quando ele tentar, mesmo que esteja errado. Nunca dê nota.
10. Siga o mesmo caminho que a atividade mostra. Se ela usa soma (10 + 10 + ...), contagem ou desenho, ajude por esse caminho. Nunca traga um método mais avançado do que o da atividade, como multiplicação para quem está somando.
11. Se o aluno propõe um caminho que funciona (como "contar de 10 em 10"), elogie e continue por ele. Não troque pelo seu.
12. Nunca invente números, quantidades ou informações que não estão no enunciado. Se precisar de algo que você não vê (como quantos objetos há no desenho), peça para o aluno contar ou olhar a figura.

ATIVIDADE${a.materia ? ` DE ${a.materia.toUpperCase()}` : ""}${a.anoEscolar ? ` (${a.anoEscolar}º ano)` : ""}
Título: ${a.titulo}
Enunciado: ${a.enunciado.slice(0, 1500)}${perguntas}`;
}

/** Limpa e limita o histórico que vai para a IA */
export function historicoSeguro(mensagens: FalaAjudante[]): FalaAjudante[] {
  return mensagens
    .filter((m) => m && (m.de === "aluno" || m.de === "flow") && typeof m.texto === "string" && m.texto.trim())
    .slice(-8)
    .map((m) => ({ de: m.de, texto: m.texto.trim().slice(0, 500) }));
}

const PISTA_PADRAO = "Essa resposta quem descobre é você! Leia a pergunta de novo, devagar: qual parte você já entendeu?";

/**
 * Trava de segurança depois da IA: se a resposta parecer entregar o gabarito
 * (alternativa certa, "a resposta é..."), troca por uma pista neutra.
 */
export function travaDaResposta(resposta: string, tipo: AtividadeParaAjudante["tipo"]): string {
  const t = resposta.trim();
  if (!t) return PISTA_PADRAO;
  const n = t.toLowerCase();
  const entrega = [
    /a resposta (certa |correta )?(é|seria)(\s|:)/,
    /resposta (certa|correta)\s*[:é]/,
    /(alternativa|opção|letra)\s+(certa|correta)\b/,
    /(^|\s)(a certa|a correta) (é|seria)(\s|:)/,
    /\bo gabarito\b/,
  ];
  const confirmaLetra = tipo === "QUIZ" && /\b(isso|sim|exato|correto|acertou)[,!. ]+.{0,20}\b(letra|alternativa|opção)\s+[a-e]\b/.test(n);
  const marcaLetra = tipo === "QUIZ" && /(^|\s)(marque|escolha|é a)\s+(a\s+)?(letra|alternativa|opção)?\s*[a-e]([).,!]|\s|$)/.test(n);
  if (entrega.some((r) => r.test(n)) || confirmaLetra || marcaLetra) return PISTA_PADRAO;
  return t.length > 600 ? t.slice(0, 600).replace(/\s+\S*$/, "") + "..." : t;
}

/** Dicas sem IA (sem chave configurada ou falha): ainda ajuda a pensar */
export function dicaSemIA(pedido: string, a: AtividadeParaAjudante): string {
  const p = pedido.toLowerCase();
  if (/signific|palavra|o que é|o que quer dizer/.test(p)) return "Boa pergunta! Tente achar a palavra na frase e veja o que vem antes e depois dela. Que ideia você acha que ela passa?";
  if (/começ|início|inicio/.test(p)) return "Vamos por partes. Primeiro, diga com as suas palavras o que a atividade está pedindo. Qual é a primeira coisa que você precisa fazer?";
  if (/não entendi|nao entendi|entendi nada/.test(p)) return `Tudo bem! A atividade "${a.titulo}" pede para você pensar sobre um assunto. Leia o enunciado em voz alta, devagar. Qual parte ficou difícil?`;
  return "Você consegue! Pense num exemplo do seu dia a dia que tenha a ver com essa pergunta. O que você lembra sobre esse assunto?";
}

/** Limite de uso por aluno numa janela (memória do processo). */
export function criarLimite(max: number, janelaMs: number) {
  const uso = new Map<string, number[]>();
  return (chave: string, agora = Date.now()): boolean => {
    const recentes = (uso.get(chave) ?? []).filter((t) => agora - t < janelaMs);
    if (recentes.length >= max) { uso.set(chave, recentes); return false; }
    recentes.push(agora);
    uso.set(chave, recentes);
    return true;
  };
}

const HORA = 60 * 60 * 1000;
/** Conversa com o Flow: 40 mensagens por hora */
export const dentroDoLimiteAjudante = criarLimite(40, HORA);
/** "Flow, olha meu texto": 3 revisões por atividade a cada 6 horas */
export const dentroDoLimiteRevisao = criarLimite(3, 6 * HORA);
/** Voz para texto: 30 gravações por hora */
export const dentroDoLimiteVoz = criarLimite(30, HORA);
/** Foto do dever: 10 fotos por hora */
export const dentroDoLimiteFoto = criarLimite(10, HORA);
/** Avisar a família pelo Flow: 3 por hora (o aviso em si é 1 por dia) */
export const dentroDoLimiteAvisar = criarLimite(3, HORA);

// ── Revisar o texto antes de enviar ─────────────────────────────────────────

export function promptDaRevisao(a: AtividadeParaAjudante): string {
  return `Você é o Flow, o robozinho do reforço escolar do SpeakFlow Escolas. O aluno escreveu uma resposta e pediu para você olhar ANTES de enviar. ${tomPorAno(a.anoEscolar)}

REGRAS QUE VOCÊ NUNCA QUEBRA:
1. Dê UMA dica de melhoria só, a mais importante: explicar o porquê, dar um exemplo, completar a ideia, responder o que a pergunta pede ou deixar a frase mais clara.
2. Nunca reescreva o texto dele, nunca escreva frases prontas para ele copiar e nunca complete a resposta.
3. Nunca diga se está certo ou errado e nunca dê nota.
4. Comece elogiando algo concreto que ele fez, depois a dica, e termine com uma pergunta curta que o ajude a melhorar sozinho.
5. No máximo 3 frases curtas, em português do Brasil, sem listas e sem emojis.
6. Não corrija ortografia letra por letra; se houver muitos erros, diga só para ele reler com calma.

ATIVIDADE${a.materia ? ` DE ${a.materia.toUpperCase()}` : ""}${a.anoEscolar ? ` (${a.anoEscolar}º ano)` : ""}
Título: ${a.titulo}
Enunciado: ${a.enunciado.slice(0, 1500)}`;
}

const DICA_REVISAO_PADRAO = "Você já começou bem! Leia o enunciado de novo e confira: você respondeu tudo o que ele pede? O que você pode explicar melhor com as suas palavras?";

/**
 * Trava da revisão: além do gabarito, barra trechos longos entre aspas ou prontos para
 * copiar (o Flow reescrevendo o texto do aluno).
 */
export function travaDaRevisao(dica: string, textoDoAluno: string): string {
  const t = travaDaResposta(dica, "WRITTEN");
  if (/quem descobre é você/.test(t) && !/quem descobre é você/.test(dica)) return DICA_REVISAO_PADRAO;
  const n = t.toLowerCase();
  const citacoes = t.match(/["“”«»]([^"“”«»]{0,400})["“”«»]/g) ?? [];
  const aluno = textoDoAluno.toLowerCase();
  const reescreveu = citacoes.some((c) => {
    const dentro = c.slice(1, -1).trim();
    return dentro.split(/\s+/).length > 6 && !aluno.includes(dentro.toLowerCase());
  });
  const pronto = /(você pode escrever|escreva assim|tente escrever|poderia ficar|ficaria assim|sugestão de texto|por exemplo:)/.test(n);
  if (reescreveu || pronto) return DICA_REVISAO_PADRAO;
  return t;
}

export function dicaDaRevisaoSemIA(texto: string): string {
  const t = texto.toLowerCase();
  const palavras = t.split(/\s+/).filter(Boolean).length;
  if (palavras < 12) return "Bom começo! Seu texto ainda está curtinho. Que tal explicar com mais detalhes o que você pensou?";
  if (!/porque|pois|por isso|já que/.test(t)) return "Você explicou a sua ideia! Agora conte o porquê: por que isso acontece?";
  if (!/exemplo|como quando|por exemplo/.test(t)) return "Você explicou bem o porquê! Que tal dar um exemplo do seu dia a dia para mostrar a sua ideia?";
  return DICA_REVISAO_PADRAO;
}
