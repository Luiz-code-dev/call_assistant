import { describe, it, expect } from "vitest";
import { materiaQueMaisPrecisa, montarMissoes } from "./missoes";

describe("missões do dia", () => {
  it("escolhe a matéria com mais Praticando e ignora as que domina", () => {
    expect(materiaQueMaisPrecisa([{ subjectCode: "MA", masteryLevel: "NOT_YET" }, { subjectCode: "CI", masteryLevel: "ALMOST" }, { subjectCode: "CI", masteryLevel: "MASTERED" }])).toBe("MA");
    expect(materiaQueMaisPrecisa([{ subjectCode: "MA", masteryLevel: "MASTERED" }])).toBeNull();
  });
  const base = { fraca: { materia: "Matemática", titulo: "Frações", href: "/x", subjectCode: "MA" }, estudouHojeEm: new Set<string | null>(), estudouHoje: false, revisao: { pendentes: 4, feitasHoje: 0 }, agendaHoje: { materia: "Ciências", subjectCode: "CI", time: "15:00", minutes: 20, href: "/y" }, minimoRevisao: 3 };
  it("monta até 3 missões e marca as feitas", () => {
    const m = montarMissoes(base);
    expect(m.map((x) => x.id)).toEqual(["etapa", "revisao", "agenda"]);
    expect(m.every((x) => !x.feita)).toBe(true);
    const f = montarMissoes({ ...base, estudouHoje: true, estudouHojeEm: new Set(["MA", "CI"]), revisao: { pendentes: 1, feitasHoje: 3 } });
    expect(f.every((x) => x.feita)).toBe(true);
  });
  it("não repete a agenda quando é a mesma matéria da etapa e esconde a revisão sem cartões", () => {
    const m = montarMissoes({ ...base, revisao: { pendentes: 0, feitasHoje: 0 }, agendaHoje: { ...base.agendaHoje, subjectCode: "MA" } });
    expect(m.map((x) => x.id)).toEqual(["etapa"]);
  });
});
