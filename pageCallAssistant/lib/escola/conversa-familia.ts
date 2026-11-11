/**
 * "Para conversar com o seu filho": o que ele estudou na semana e 3 perguntas para o pai
 * puxar conversa em casa. A IA recebe só os assuntos e o ano escolar (nunca nome nem
 * matrícula); sem IA, usa perguntas prontas.
 */
export type Assunto = { materia: string; assunto: string; situacao: "indo_bem" | "quase" | "praticando" };

type Entrega = { quando: Date; materia: string | null; titulo: string; nivel: string | null };

/** Até 5 assuntos da semana, os mais recentes primeiro, sem repetir */
export function assuntosDaSemana(entregas: Entrega[], nomeMateria: (c: string) => string, limpar: (t: string) => string): Assunto[] {
  const vistos = new Map<string, Assunto>();
  for (const e of [...entregas].sort((a, b) => +b.quando - +a.quando)) {
    const assunto = limpar(e.titulo).replace(/^(relembrar|exemplo guiado|praticar|aplicar|explicar)\s*:\s*/i, "").trim();
    if (!assunto) continue;
    const chave = assunto.toLowerCase();
    const situacao = e.nivel === "MASTERED" ? "indo_bem" : e.nivel === "ALMOST" ? "quase" : e.nivel === "NOT_YET" ? "praticando" : "indo_bem";
    const atual = vistos.get(chave);
    if (atual) { if (situacao === "praticando") atual.situacao = "praticando"; continue; }
    vistos.set(chave, { materia: e.materia ? nomeMateria(e.materia) : "Reforço", assunto, situacao });
    if (vistos.size >= 5) break;
  }
  return Array.from(vistos.values());
}

export function perguntasSemIA(assuntos: Assunto[], nome: string): string[] {
  const p: string[] = [];
  const praticando = assuntos.find((a) => a.situacao !== "indo_bem");
  const bem = assuntos.find((a) => a.situacao === "indo_bem");
  if (bem) p.push(`${nome}, me explica o que você aprendeu sobre ${bem.assunto}, como se eu fosse o aluno?`);
  if (praticando) p.push(`O que ainda está difícil em ${praticando.assunto}? Vamos pensar juntos num exemplo aqui de casa?`);
  for (const a of assuntos) {
    if (p.length >= 3) break;
    p.push(`Onde a gente vê ${a.assunto} no nosso dia a dia?`);
  }
  if (!p.length) p.push(`${nome}, o que foi mais legal de estudar esta semana?`);
  return p.slice(0, 3);
}

export function promptDaConversa(assuntos: Assunto[], ano: number | null): string {
  return `Você ajuda pais a conversar com os filhos sobre o que eles estudaram no reforço escolar.
Escreva EXATAMENTE 3 perguntas curtas que o pai ou a mãe pode fazer ao filho em casa${ano ? ` (aluno do ${ano}º ano)` : ""}.
Regras: perguntas abertas, simples, ligadas ao dia a dia da casa (cozinha, mercado, rua, TV); que façam a criança explicar com as próprias palavras; nada de prova, nota ou cobrança; uma pergunta por linha, sem numeração, sem emojis, em português do Brasil. Inclua pelo menos uma pergunta sobre um assunto marcado como "praticando" ou "quase", se houver.
Assuntos da semana:
${assuntos.map((a) => `- ${a.materia}: ${a.assunto} (${a.situacao === "indo_bem" ? "indo bem" : a.situacao})`).join("\n")}`;
}

/** Limpa a saída da IA: 3 linhas que terminam com "?", sem numeração */
export function limparPerguntas(saida: string): string[] {
  return saida.split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)-]|[-•*])\s*/, "").trim())
    .filter((l) => l.length > 8 && l.length < 220 && l.endsWith("?"))
    .slice(0, 3);
}
