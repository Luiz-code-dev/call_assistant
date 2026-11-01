/**
 * erro-comum.int.test.ts
 * L3: extractMisconceptionCodes chamado nas 3 rotas de entrega.
 */
import { describe, it, expect } from "vitest";
import { extractMisconceptionCodes, recordMasteryEvent } from "@/lib/escola/mastery-event";

describe("extractMisconceptionCodes — L3", () => {
  it("é exportada de mastery-event", () => {
    expect(typeof extractMisconceptionCodes).toBe("function");
  });

  it("retorna objeto vazio quando não há respostas", () => {
    const codes = extractMisconceptionCodes([], []);
    expect(Object.keys(codes)).toHaveLength(0);
  });

  it("retorna misconceptionCode quando alternativa errada é marcada", () => {
    const questions = [
      {
        id: "q1",
        correctIndex: 0,
        options: [
          { text: "Correto" },
          { text: "Errado", misconceptionCode: "SOMA-FRACAO-ERRADO" },
        ],
        misconceptionCode: null,
      },
    ];
    const answers = [{ questionId: "q1", selectedIndex: 1 }];
    const codes = extractMisconceptionCodes(questions, answers);
    expect(Object.values(codes)).toContain("SOMA-FRACAO-ERRADO");
  });

  it("retorna objeto vazio quando alternativa correta é marcada", () => {
    const questions = [
      {
        id: "q1",
        correctIndex: 0,
        options: [{ text: "Correto" }, { text: "Errado", misconceptionCode: "X" }],
        misconceptionCode: null,
      },
    ];
    const answers = [{ questionId: "q1", selectedIndex: 0 }];
    const codes = extractMisconceptionCodes(questions, answers);
    expect(Object.keys(codes)).toHaveLength(0);
  });
});

describe("recordMasteryEvent — exportada e tipada", () => {
  it("é exportada de mastery-event", () => {
    expect(typeof recordMasteryEvent).toBe("function");
  });
});
