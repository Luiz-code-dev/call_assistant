import { describe, it, expect } from "vitest";
import { depoisDeResponder, versaoDaPergunta, perguntasErradas, somarDias, CAIXA_FIRMADO } from "./revisao";

describe("revisão espaçada", () => {
  it("acertou sobe de caixa e espaça", () => {
    expect(depoisDeResponder(1, true, "2026-11-11")).toEqual({ box: 2, dueOn: "2026-11-12" });
    expect(depoisDeResponder(3, true, "2026-11-11")).toEqual({ box: 4, dueOn: "2026-11-15" });
    expect(depoisDeResponder(5, true, "2026-11-11").box).toBe(CAIXA_FIRMADO);
  });
  it("errou volta para a caixa 1 e aparece amanhã", () => {
    expect(depoisDeResponder(4, false, "2026-11-30")).toEqual({ box: 1, dueOn: "2026-12-01" });
  });
  it("soma dias atravessando o mês", () => { expect(somarDias("2026-12-30", 3)).toBe("2027-01-02"); });
  it("alterna entre a pergunta original e as variantes", () => {
    const q = { question: "A", options: ["1", "2"], correctIndex: 0, variants: [{ question: "B", options: ["x", "y"], correctIndex: 1 }] };
    expect(versaoDaPergunta(q, 0).v.question).toBe("A");
    expect(versaoDaPergunta(q, 1).v.question).toBe("B");
    expect(versaoDaPergunta(q, 2).indice).toBe(0);
    expect(versaoDaPergunta({ ...q, variants: [{ lixo: 1 }] }, 1).v.question).toBe("A");
  });
  it("pega só as perguntas erradas do retorno", () => {
    expect(perguntasErradas({ quizDetail: [{ questionId: "q1", correct: true }, { questionId: "q2", correct: false }] })).toEqual(["q2"]);
    expect(perguntasErradas(null)).toEqual([]);
  });
});
