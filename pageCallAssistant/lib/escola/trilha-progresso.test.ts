import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/escola/db", () => ({ prismaEdu: {} }));
vi.mock("@/lib/escola/track-assignment", () => ({ assignTrackToStudents: vi.fn() }));

import { entregaContaComoFeita } from "./trilha-progresso";

describe("entregaContaComoFeita", () => {
  it("quiz em Domina ou Quase lá conta", () => {
    expect(entregaContaComoFeita({ type: "QUIZ", masteryLevel: "MASTERED", attempt: 1, maxAttempts: 3 })).toBe(true);
    expect(entregaContaComoFeita({ type: "QUIZ", masteryLevel: "ALMOST", attempt: 1, maxAttempts: 3 })).toBe(true);
  });
  it("quiz em Praticando só conta quando acabaram as tentativas", () => {
    expect(entregaContaComoFeita({ type: "QUIZ", masteryLevel: "NOT_YET", attempt: 1, maxAttempts: 3 })).toBe(false);
    expect(entregaContaComoFeita({ type: "QUIZ", masteryLevel: "NOT_YET", attempt: 3, maxAttempts: 3 })).toBe(true);
  });
  it("escrita e fala contam no envio", () => {
    expect(entregaContaComoFeita({ type: "WRITTEN", masteryLevel: null, attempt: 1, maxAttempts: 3 })).toBe(true);
    expect(entregaContaComoFeita({ type: "SPOKEN", masteryLevel: null, attempt: 1, maxAttempts: 3 })).toBe(true);
  });
});
