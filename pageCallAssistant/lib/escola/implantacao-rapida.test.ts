import { describe, it, expect } from "vitest";
import { materiasDoAno, codigoDoComponente, anoLetivoPadrao, MATERIAS_BNCC } from "./implantacao-rapida";

describe("implantação rápida", () => {
  it("inglês só a partir do 6º ano", () => {
    expect(materiasDoAno(1).map((m) => m.codigo)).not.toContain("LI");
    expect(materiasDoAno(7).map((m) => m.codigo)).toContain("LI");
    expect(materiasDoAno(7)).toHaveLength(MATERIAS_BNCC.length);
  });
  it("reconhece a matéria que já existe pelo nome, para não duplicar", () => {
    expect(codigoDoComponente("MATEMÁTICA")).toBe("MA");
    expect(codigoDoComponente("Português")).toBe("LP");
    expect(codigoDoComponente("Língua Inglesa")).toBe("LI");
    expect(codigoDoComponente("Robótica")).toBeNull();
  });
  it("todas as matérias da BNCC têm código reconhecido", () => {
    for (const m of MATERIAS_BNCC) expect(codigoDoComponente(m.nome)).toBe(m.codigo);
  });
  it("ano letivo padrão com 4 bimestres em ordem", () => {
    const a = anoLetivoPadrao(2026);
    expect(a.terms.map((t) => t.order)).toEqual([1, 2, 3, 4]);
    expect(a.startsAt < a.endsAt).toBe(true);
    for (let i = 1; i < 4; i++) expect(a.terms[i].startsAt > a.terms[i - 1].endsAt).toBe(true);
  });
});
