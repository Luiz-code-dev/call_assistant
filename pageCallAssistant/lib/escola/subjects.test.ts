import { describe, it, expect } from "vitest";
import { subjectInfo } from "./subjects";

describe("subjectInfo", () => {
  it("aceita codigo de 3 letras", () => {
    expect(subjectInfo("MAT").name).toBe("Matemática");
    expect(subjectInfo("POR").name).toBe("Língua Portuguesa");
  });
  it("aceita letras BNCC de 2 chars", () => {
    expect(subjectInfo("MA").name).toBe("Matemática");
    expect(subjectInfo("LP").name).toBe("Língua Portuguesa");
  });
  it("extrai o componente de um codigo BNCC completo", () => {
    expect(subjectInfo("EF06MA07").name).toBe("Matemática");
    expect(subjectInfo("EF05LP12").name).toBe("Língua Portuguesa");
  });
  it("e case-insensitive", () => {
    expect(subjectInfo("mat").name).toBe("Matemática");
  });
  it("codigo desconhecido vira o proprio texto com cor neutra", () => {
    const r = subjectInfo("XYZ");
    expect(r.name).toBe("XYZ");
    expect(r.color).toBe("#5B5470");
  });
});
