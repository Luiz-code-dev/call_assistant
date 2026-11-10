import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/escola/ai-gateway", () => ({ evaluateActivity: vi.fn(), ModerationError: class extends Error {} }));
vi.mock("@/lib/escola/mastery-event", () => ({ recordMasteryEvent: vi.fn() }));
vi.mock("@/lib/escola/db", () => ({ prismaEdu: {} }));
import { rubricaParaIA } from "@/lib/escola/avaliar-entrega";

describe("rubricaParaIA", () => {
  it("rubrica do pacote (criteria com code/description) vira criterios", () => {
    const r = rubricaParaIA({ type: "WRITTEN", criteria: [{ code: "transformacao", description: "Cita duas transformações" }] });
    expect(r.criterios).toEqual([{ criterio: "transformacao", peso: 1, descricao: "Cita duas transformações" }]);
  });
  it("rubrica antiga continua igual", () => {
    const c = [{ criterio: "coesao", peso: 2 }];
    expect(rubricaParaIA({ criterios: c }).criterios).toBe(c);
  });
  it("sem rubrica: critérios padrão, nunca vazio", () => {
    expect(rubricaParaIA(null).criterios.length).toBeGreaterThan(0);
    expect(rubricaParaIA({ type: "WRITTEN", criteria: [] }).criterios.length).toBeGreaterThan(0);
  });
});
