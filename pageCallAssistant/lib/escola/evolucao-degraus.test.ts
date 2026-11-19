import { describe, expect, it } from "vitest";
import { anoDoConteudo, fraseDoCaminho, passos, resumirEvolucao } from "./evolucao-degraus";

describe("anoDoConteudo", () => {
  it("lê o ano de um código de ano único", () => {
    expect(anoDoConteudo("EF05MA03")).toBe("5º ano");
    expect(anoDoConteudo("ef09ci01")).toBe("9º ano");
  });
  it("lê a faixa de anos dos códigos compartilhados", () => {
    expect(anoDoConteudo("EF35LP03")).toBe("3º ao 5º ano");
    expect(anoDoConteudo("EF15AR02")).toBe("1º ao 5º ano");
    expect(anoDoConteudo("EF67EF01")).toBe("6º e 7º ano");
    expect(anoDoConteudo("EF89LP04")).toBe("8º e 9º ano");
    expect(anoDoConteudo("EF69AR10")).toBe("6º ao 9º ano");
  });
  it("devolve null para código fora do padrão", () => {
    expect(anoDoConteudo("FRAC-01")).toBeNull();
    expect(anoDoConteudo(null)).toBeNull();
    expect(anoDoConteudo("EF00MA01")).toBeNull();
  });
});

describe("passos", () => {
  it("conta os degraus entre dois níveis", () => {
    expect(passos("NOT_YET", "MASTERED")).toBe(2);
    expect(passos("ALMOST", "ALMOST")).toBe(0);
    expect(passos("MASTERED", "ALMOST")).toBe(-1);
  });
  it("devolve null quando falta o ponto de partida", () => {
    expect(passos(null, "ALMOST")).toBeNull();
    expect(passos("NOT_YET", "X")).toBeNull();
  });
});

describe("resumirEvolucao", () => {
  it("separa quem subiu, manteve, desceu e quem não tem diagnóstico inicial", () => {
    const r = resumirEvolucao([
      { level: "ALMOST", levelInicial: "NOT_YET", levelSemana: "NOT_YET" },
      { level: "MASTERED", levelInicial: "NOT_YET", levelSemana: "MASTERED" },
      { level: "NOT_YET", levelInicial: "NOT_YET", levelSemana: null },
      { level: "ALMOST", levelInicial: "MASTERED" },
      { level: "NOT_YET", levelInicial: null },
    ]);
    expect(r).toEqual({ subiu: 2, manteve: 1, desceu: 1, semInicio: 1, atencao: 2, subiuNaSemana: 1 });
  });
});

describe("fraseDoCaminho", () => {
  it("explica a subida em degraus", () => {
    expect(fraseDoCaminho("NOT_YET", "ALMOST")).toBe("Começou em Praticando e está em Quase lá: subiu 1 degrau.");
    expect(fraseDoCaminho("NOT_YET", "MASTERED")).toBe("Começou em Praticando e está em Domina: subiu 2 degraus.");
  });
  it("não inventa ponto de partida", () => {
    expect(fraseDoCaminho(null, "ALMOST")).toContain("não passou pelo diagnóstico inicial");
  });
  it("explica quem manteve e quem desceu", () => {
    expect(fraseDoCaminho("MASTERED", "MASTERED")).toBe("Já dominava no diagnóstico e continua dominando.");
    expect(fraseDoCaminho("ALMOST", "ALMOST")).toBe("Começou em Quase lá e continua neste degrau.");
    expect(fraseDoCaminho("MASTERED", "ALMOST")).toContain("precisa retomar");
  });
});
