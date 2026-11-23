import { describe, it, expect } from "vitest";
import {
  PESO_ACERTO, PESO_ERRO, LIMIAR, MAX_POR_HABILIDADE,
  evidencia, probabilidadeDeDominar, decidir, precisaDeMaisQuestoes, nivelFinal, nivelDeDominio,
  taxasDaRegra, chaveDaQuestao, escolherQuestao,
} from "./diagnostico-sequencial";

const C = true, E = false;

describe("pesos da regra", () => {
  it("valores do modelo (chute 25%, descuido 10%, confiança 95%)", () => {
    expect(PESO_ACERTO).toBeCloseTo(Math.log(0.9 / 0.25), 10);
    expect(PESO_ERRO).toBeCloseTo(Math.log(0.1 / 0.75), 10);
    expect(LIMIAR).toBeCloseTo(Math.log(19), 10);
    expect(PESO_ACERTO).toBeCloseTo(1.2809, 3);
    expect(PESO_ERRO).toBeCloseTo(-2.0149, 3);
  });

  it("probabilidade de dominar a partir da evidência", () => {
    expect(probabilidadeDeDominar([])).toBeCloseTo(0.5, 10);
    expect(probabilidadeDeDominar([C, C, C])).toBeGreaterThan(0.95);
    expect(probabilidadeDeDominar([E, E])).toBeLessThan(0.05);
    expect(evidencia([C, E])).toBeCloseTo(PESO_ACERTO + PESO_ERRO, 10);
  });
});

describe("decisão questão a questão", () => {
  it("3 acertos seguidos: domina; 2 não bastam", () => {
    expect(decidir([C, C])).toBe("INDEFINIDO");
    expect(decidir([C, C, C])).toBe("DOMINA");
  });

  it("2 erros seguidos: não domina; 1 não basta", () => {
    expect(decidir([E])).toBe("INDEFINIDO");
    expect(decidir([E, E])).toBe("NAO_DOMINA");
  });

  it("respostas misturadas pedem mais questões", () => {
    expect(decidir([C, E])).toBe("INDEFINIDO");
    expect(decidir([C, E, C, C, C])).toBe("DOMINA");
    expect(decidir([C, C, E, E, E])).toBe("NAO_DOMINA");
    expect(precisaDeMaisQuestoes([C, E, C])).toBe(true);
  });

  it("para no limite e não volta atrás", () => {
    expect(decidir([E, E, C, C, C, C])).toBe("NAO_DOMINA");
    expect(decidir([C, C, C, E, E])).toBe("DOMINA");
  });

  it("no máximo 8 questões; indefinido no fim vira quase lá", () => {
    const oito = [C, E, C, E, C, E, C, E];
    expect(decidir(oito)).toBe("INDEFINIDO");
    expect(precisaDeMaisQuestoes(oito.slice(0, 7))).toBe(true);
    expect(precisaDeMaisQuestoes(oito)).toBe(false);
    expect(nivelFinal(oito)).toBe("QUASE_LA");
    expect(MAX_POR_HABILIDADE).toBe(8);
  });

  it("nível final e nível gravado no histórico", () => {
    expect(nivelFinal([])).toBeNull();
    expect(nivelFinal([C, C, C])).toBe("DOMINA");
    expect(nivelFinal([E, E])).toBe("AINDA_NAO");
    expect(nivelDeDominio("DOMINA")).toBe("MASTERED");
    expect(nivelDeDominio("QUASE_LA")).toBe("ALMOST");
    expect(nivelDeDominio("AINDA_NAO")).toBe("NOT_YET");
  });
});

describe("taxas de erro exatas da regra", () => {
  const t = taxasDaRegra();

  it("as probabilidades de cada grupo somam 1", () => {
    for (const g of [t.quemDomina, t.quemNaoDomina]) expect(g.domina + g.naoDomina + g.indefinido).toBeCloseTo(1, 10);
  });

  it("quem não domina e só chuta é dado como 'domina' em menos de 3% das vezes (exato: 2,55%)", () => {
    expect(t.quemNaoDomina.domina).toBeLessThan(0.03);
    expect(Math.abs(t.quemNaoDomina.domina - 0.0255) < 0.0005).toBe(true);
  });

  it("quem domina é dado como 'não domina' em menos de 2% das vezes (exato: 1,64%)", () => {
    expect(t.quemDomina.naoDomina).toBeLessThan(0.02);
  });

  it("quem domina é reconhecido em mais de 96% das vezes", () => {
    expect(t.quemDomina.domina).toBeGreaterThan(0.96);
  });

  it("quem não domina é identificado em mais de 94% das vezes", () => {
    expect(t.quemNaoDomina.naoDomina).toBeGreaterThan(0.94);
  });

  it("média de questões por habilidade fica entre 2 e 4", () => {
    expect(t.quemDomina.mediaQuestoes).toBeGreaterThan(2);
    expect(t.quemDomina.mediaQuestoes).toBeLessThan(4);
    expect(t.quemNaoDomina.mediaQuestoes).toBeGreaterThan(2);
    expect(t.quemNaoDomina.mediaQuestoes).toBeLessThan(4);
  });
});

describe("banco de questões", () => {
  const banco = [{ question: "Quanto é 2 + 2?" }, { question: "Quanto é 3 + 3?" }, { question: "Quanto é 4 + 4?" }];

  it("não repete questão já feita (ignora acento, maiúscula e espaço)", () => {
    const usadas = new Set([chaveDaQuestao("quanto é  2 + 2?"), chaveDaQuestao("QUANTO E 3 + 3?")]);
    expect(escolherQuestao(banco, usadas, 7)?.question).toBe("Quanto é 4 + 4?");
  });

  it("banco esgotado: null", () => {
    expect(escolherQuestao(banco, new Set(banco.map((b) => chaveDaQuestao(b.question))), 1)).toBeNull();
  });

  it("mesma semente, mesma escolha", () => {
    expect(escolherQuestao(banco, new Set(), 5)).toBe(escolherQuestao(banco, new Set(), 5));
  });
});
