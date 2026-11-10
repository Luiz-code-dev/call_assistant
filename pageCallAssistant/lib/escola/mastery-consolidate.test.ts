import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/escola/db", () => ({ prismaEdu: {} }));
import { consolidate } from "@/lib/escola/mastery-event";

describe("consolidate: a evolução acompanha o que o aluno acabou de fazer", () => {
  it("diagnóstico errado e depois trilha certa: sobe para Quase lá, depois Domina", () => {
    expect(consolidate(["NOT_YET", "NOT_YET", "MASTERED"])).toBe("ALMOST");
    expect(consolidate(["NOT_YET", "NOT_YET", "MASTERED", "MASTERED"])).toBe("MASTERED");
  });
  it("uma observação só vale como está", () => {
    expect(consolidate(["MASTERED"])).toBe("MASTERED");
    expect(consolidate(["NOT_YET"])).toBe("NOT_YET");
  });
  it("errar depois de dominar desce só um degrau", () => {
    expect(consolidate(["MASTERED", "MASTERED", "NOT_YET"])).toBe("ALMOST");
    expect(consolidate(["MASTERED", "NOT_YET", "NOT_YET"])).toBe("NOT_YET");
  });
  it("Quase lá no histórico e Domina agora: Domina", () => {
    expect(consolidate(["ALMOST", "MASTERED"])).toBe("MASTERED");
  });
  it("sem observações: Ainda não", () => {
    expect(consolidate([])).toBe("NOT_YET");
  });
});
