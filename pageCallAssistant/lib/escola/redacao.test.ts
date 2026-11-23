import { describe, it, expect } from "vitest";
import {
  dividirParagrafos, contarPalavras, erroDoEnvio, normalizarTexto,
  perguntaSegura, fraseSegura, trechoDoParagrafo, lerRetorno, retornoPorRegras,
  visaoDoAluno, lerRevisao, marcarTrechos, podeEscrever, situacaoDaVersao,
  promptDaRedacao, textoParaIA, nomeDoCriterio, generoValido,
} from "./redacao";

const TEXTO = [
  "Eu acho que a escola deveria ter mais aulas de esporte. Os alunos ficam mais felizes e aprendem a trabalhar em grupo.",
  "Na minha escola nós jogamos futebol so na sexta feira e todo mundo espera a semana toda por esse dia porque e o melhor dia.",
  "Por isso a escola precisa mudar.",
].join("\n");
const PARAGRAFOS = dividirParagrafos(TEXTO);

describe("texto do aluno", () => {
  it("divide em parágrafos por linha e ignora linhas vazias", () => {
    expect(dividirParagrafos("Primeiro.\r\n\r\n\r\nSegundo   parágrafo.\n  \nTerceiro.")).toEqual(["Primeiro.", "Segundo parágrafo.", "Terceiro."]);
    expect(PARAGRAFOS).toHaveLength(3);
  });

  it("conta palavras com acento, hífen e número", () => {
    expect(contarPalavras("Água-viva é 1 animal, não é?")).toBe(6);
    expect(contarPalavras("")).toBe(0);
  });

  it("normaliza e limita o tamanho", () => {
    expect(normalizarTexto("a".repeat(9000)).length).toBe(8000);
    expect(normalizarTexto(null)).toBe("");
  });

  it("confere limites antes de enviar", () => {
    const lim = { minPalavras: 10, maxPalavras: 40 };
    expect(erroDoEnvio("", lim)).toMatch(/Escreva/);
    expect(erroDoEnvio("Texto curto demais.", lim)).toMatch(/pelo menos 10/);
    expect(erroDoEnvio("palavra ".repeat(41), lim)).toMatch(/limite de 40/);
    expect(erroDoEnvio("Uma frase com palavras suficientes para o envio do texto do aluno.", lim)).toBeNull();
    expect(erroDoEnvio(Array.from({ length: 16 }, () => "linha").join("\n"), { minPalavras: 1, maxPalavras: 100 })).toMatch(/15 parágrafos/);
  });
});

describe("trava contra reescrita", () => {
  it("aceita perguntas que fazem pensar", () => {
    expect(perguntaSegura("Leia esta frase em voz alta: onde você faria uma pausa?", TEXTO)).toBeTruthy();
    expect(perguntaSegura("Com quem esse verbo está combinando?", TEXTO)).toBeTruthy();
  });

  it("recusa a correção pronta", () => {
    const casos = [
      "O certo é 'só', com acento. Você percebeu?",
      "Troque 'so' por 'só'?",
      "Reescreva assim: a escola precisa mudar urgentemente?",
      "A forma correta seria com vírgula?",
      "so → só, entendeu?",
      "Você poderia usar \"além disso, os estudantes melhoram a saúde\"?",
      "Deveria ser 'é' com acento?",
    ];
    for (const c of casos) expect(perguntaSegura(c, TEXTO), c).toBeNull();
  });

  it("pergunta tem de ser pergunta", () => {
    expect(perguntaSegura("Use mais conectivos no texto.", TEXTO)).toBeNull();
    expect(perguntaSegura("Por quê?", TEXTO)).toBeNull();
  });

  it("aceita citar o próprio texto do aluno entre aspas", () => {
    expect(fraseSegura("Gostei de \"trabalhar em grupo\": é uma boa razão.", TEXTO)).toBeTruthy();
    expect(fraseSegura("Gostei de \"trabalhar em equipe com alegria\".", TEXTO)).toBeNull();
  });

  it("trecho só vale se estiver no parágrafo", () => {
    expect(trechoDoParagrafo("jogamos futebol so na sexta feira", PARAGRAFOS[1])).toBe("jogamos futebol so na sexta feira");
    expect(trechoDoParagrafo("jogamos futebol só na sexta-feira", PARAGRAFOS[1])).toBe("");
    expect(trechoDoParagrafo(123, PARAGRAFOS[1])).toBe("");
  });
});

describe("leitura do retorno da IA", () => {
  const saida = JSON.stringify({
    geral: { pontoForte: "Você deu sua opinião logo no começo.", foco: "Que exemplos mostrariam que o esporte ajuda a aprender?" },
    paragrafos: [
      { p: 1, pontoForte: "Opinião clara.", apontamentos: [{ criterio: "ARGUMENTACAO", trecho: "Os alunos ficam mais felizes", pergunta: "Como você sabe que eles ficam mais felizes?" }] },
      { p: 2, pontoForte: null, apontamentos: [
        { criterio: "GRAMATICA", trecho: "so na sexta feira", pergunta: "Releia: falta algum acento em alguma palavra deste trecho?" },
        { criterio: "GRAMATICA", trecho: "só na sexta-feira", pergunta: "O certo é 'só', percebeu?" },
        { criterio: "INVENTADO", trecho: "", pergunta: "Isso vale?" },
      ] },
      { p: 9, apontamentos: [] },
      { p: 2, apontamentos: [] },
    ],
    niveis: { PROPOSTA: 3, COESAO: 2, ARGUMENTACAO: 9, GRAMATICA: 2 },
    atencao: false,
  });

  it("aproveita só o que é seguro", () => {
    const r = lerRetorno(saida, PARAGRAFOS)!;
    expect(r.origem).toBe("ia");
    expect(r.paragrafos.map((p) => p.indice)).toEqual([0, 1]);
    expect(r.paragrafos[1].apontamentos).toHaveLength(1);
    const a = r.paragrafos[1].apontamentos[0];
    expect([a.id, a.criterio, a.trecho]).toEqual(["p2-a1", "GRAMATICA", "so na sexta feira"]);
    expect(r.niveis).toEqual({ PROPOSTA: 3, COESAO: 2, GRAMATICA: 2 });
    expect(r.geral.foco.endsWith("?")).toBe(true);
  });

  it("JSON inválido ou vazio: null", () => {
    expect(lerRetorno("não é json", PARAGRAFOS)).toBeNull();
    expect(lerRetorno(JSON.stringify({ paragrafos: [] }), PARAGRAFOS)).toBeNull();
  });

  it("foco que entrega a resposta vira o padrão", () => {
    const r = lerRetorno(JSON.stringify({ geral: { foco: "Reescreva o último parágrafo assim: 'a escola deve mudar já'?" }, paragrafos: [{ p: 1, apontamentos: [] }] }), PARAGRAFOS)!;
    expect(r.geral.foco).not.toMatch(/Reescreva/);
  });

  it("atenção só quando a IA marca true", () => {
    const r = lerRetorno(JSON.stringify({ paragrafos: [{ p: 1, apontamentos: [] }], atencao: "sim" }), PARAGRAFOS)!;
    expect(r.atencao).toBe(false);
  });
});

describe("retorno sem IA", () => {
  it("faz perguntas sem dar a correção", () => {
    const longo = "a escola " + "e muito legal e todos gostam dela e vão todos os dias ".repeat(5);
    const r = retornoPorRegras([longo, "Curto."], "DISSERTATIVO");
    expect(r.origem).toBe("regras");
    const todas = r.paragrafos.flatMap((p) => p.apontamentos);
    expect(todas.length).toBeGreaterThan(0);
    for (const a of todas) expect(a.pergunta.endsWith("?")).toBe(true);
    expect(r.niveis).toEqual({});
  });
});

describe("o que o aluno vê", () => {
  const r = lerRetorno(JSON.stringify({
    geral: { pontoForte: "Bom começo.", foco: "O que mais?" },
    paragrafos: [{ p: 1, apontamentos: [
      { criterio: "COESAO", trecho: "", pergunta: "Que palavra liga estas ideias?" },
      { criterio: "GRAMATICA", trecho: "", pergunta: "Onde termina esta frase?" },
    ] }],
    niveis: { COESAO: 2 },
  }), PARAGRAFOS)!;

  it("sem níveis, sem ocultos e com os comentários do professor", () => {
    const v = visaoDoAluno(r, { comentarioGeral: " Muito bem! ", porParagrafo: { "0": "Gostei.", "2": "Desenvolva mais." }, ocultos: ["p1-a2"] })!;
    expect(JSON.stringify(v)).not.toContain("niveis");
    expect(v.paragrafos[0].apontamentos.map((a) => a.id)).toEqual(["p1-a1"]);
    expect(v.paragrafos.map((p) => p.indice)).toEqual([0, 2]);
    expect(v.paragrafos[1].comentarioProfessor).toBe("Desenvolva mais.");
    expect(v.comentarioGeralProfessor).toBe("Muito bem!");
  });

  it("sem retorno e sem revisão: null", () => {
    expect(visaoDoAluno(null, null)).toBeNull();
  });

  it("revisão do professor com limites", () => {
    const rev = lerRevisao({ comentarioGeral: "x".repeat(3000), porParagrafo: { "0": "ok", "99": "não", abc: "não", "1": "  " }, ocultos: ["p1-a1", "inventado", "p1-a1"] }, ["p1-a1", "p1-a2"]);
    expect(rev.comentarioGeral.length).toBe(2000);
    expect(rev.porParagrafo).toEqual({ "0": "ok" });
    expect(rev.ocultos).toEqual(["p1-a1"]);
    expect(lerRevisao(null, [])).toEqual({ comentarioGeral: "", porParagrafo: {}, ocultos: [] });
  });
});

describe("marcar trechos", () => {
  it("marca cada trecho e mantém o texto inteiro", () => {
    const p = "Na minha escola nós jogamos futebol so na sexta feira.";
    const ped = marcarTrechos(p, [{ id: "a", trecho: "so na sexta feira" }, { id: "b", trecho: "minha escola" }, { id: "c", trecho: "não existe" }, { id: "d", trecho: "" }]);
    expect(ped.map((x) => x.texto).join("")).toBe(p);
    expect(ped.filter((x) => x.marca).map((x) => x.marca)).toEqual(["b", "a"]);
  });

  it("ignora trechos sobrepostos", () => {
    const ped = marcarTrechos("abc def ghi", [{ id: "a", trecho: "abc def" }, { id: "b", trecho: "def ghi" }]);
    expect(ped.filter((x) => x.marca).map((x) => x.marca)).toEqual(["a"]);
  });
});

describe("situação e reescrita", () => {
  it("pode escrever conforme a última versão", () => {
    const p = { aberta: true, maxVersoes: 2 };
    expect(podeEscrever(p, null)).toBe(true);
    expect(podeEscrever(p, { versao: 1, status: "DRAFT" })).toBe(true);
    expect(podeEscrever(p, { versao: 1, status: "SUBMITTED" })).toBe(false);
    expect(podeEscrever(p, { versao: 1, status: "FEEDBACK" })).toBe(true);
    expect(podeEscrever(p, { versao: 2, status: "REVIEWED" })).toBe(false);
    expect(podeEscrever({ aberta: false, maxVersoes: 3 }, null)).toBe(false);
  });

  it("situação para a lista", () => {
    expect(situacaoDaVersao(null)).toBe("nova");
    expect(situacaoDaVersao("DRAFT")).toBe("rascunho");
    expect(situacaoDaVersao("SUBMITTED")).toBe("aguardando");
    expect(situacaoDaVersao("FEEDBACK")).toBe("com-retorno");
    expect(situacaoDaVersao("REVIEWED")).toBe("revisada");
  });
});

describe("prompt", () => {
  it("traz as regras e nunca o nome do aluno", () => {
    const s = promptDaRedacao({ titulo: "Esporte na escola", enunciado: "Escreva sua opinião.", genero: "DISSERTATIVO", anoEscolar: 7 });
    expect(s).toContain("Nunca reescreva");
    expect(s).toContain("Dissertativo");
    expect(textoParaIA(["Um.", "Dois."])).toBe("=== TEXTO DO ALUNO ===\n[P1] Um.\n[P2] Dois.\n=== FIM DO TEXTO ===");
  });

  it("nomes de critério e gêneros", () => {
    expect(nomeDoCriterio("ARGUMENTACAO", "DISSERTATIVO")).toBe("Argumentação");
    expect(nomeDoCriterio("ARGUMENTACAO", "NARRATIVO")).toBe("Desenvolvimento das ideias");
    expect(generoValido("CARTA")).toBe(true);
    expect(generoValido("toString")).toBe(false);
  });
});
