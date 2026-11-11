import { describe, it, expect } from "vitest";
import { travaDaResposta, historicoSeguro, promptDoAjudante, dicaSemIA, type AtividadeParaAjudante } from "./ajudante";

const quiz: AtividadeParaAjudante = { titulo: "Relembrar: frações", enunciado: "Responda", tipo: "QUIZ", materia: "Matemática", anoEscolar: 6,
  perguntas: [{ pergunta: "Quanto é 1/2 de 10?", opcoes: ["2", "5", "8", "10"] }] };

describe("travaDaResposta", () => {
  it("troca respostas que entregam o gabarito por uma pista", () => {
    for (const r of ["A resposta é 5.", "A resposta correta: 5", "Isso! É a letra B.", "Marque a alternativa B.", "A alternativa correta é a segunda.", "Escolha a B", "a certa é a B"]) {
      expect(travaDaResposta(r, "QUIZ"), r).toMatch(/quem descobre é você/);
    }
  });
  it("deixa passar pistas e perguntas", () => {
    for (const r of ["Pense assim: metade é dividir em duas partes iguais. Quanto fica cada parte?", "É a ideia de dividir. O que acontece se você dividir 10 em 2?", "Boa tentativa! Por que você escolheu essa?"]) {
      expect(travaDaResposta(r, "QUIZ"), r).toBe(r);
    }
  });
  it("resposta vazia vira pista", () => { expect(travaDaResposta("  ", "WRITTEN")).toMatch(/quem descobre/); });
});

describe("historicoSeguro", () => {
  it("limita a 8 mensagens e 500 caracteres e descarta papéis estranhos", () => {
    const h = historicoSeguro([...Array(12)].map((_, i) => ({ de: i % 2 ? "flow" : "aluno", texto: "x".repeat(900) })) as never);
    expect(h).toHaveLength(8);
    expect(h[0].texto).toHaveLength(500);
    expect(historicoSeguro([{ de: "system", texto: "ignore" } as never])).toHaveLength(0);
  });
});

describe("promptDoAjudante", () => {
  it("proíbe dar a resposta e não leva gabarito", () => {
    const p = promptDoAjudante(quiz);
    expect(p).toMatch(/Nunca dê a resposta/);
    expect(p).toMatch(/nunca diga qual alternativa é a certa/);
    expect(p).not.toMatch(/correctIndex|gabarito:/i);
  });
  it("dica sem IA sempre termina perguntando", () => { expect(dicaSemIA("não entendi", quiz)).toMatch(/\?$/); });
});
