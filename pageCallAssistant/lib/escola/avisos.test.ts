import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/escola/catalogo", () => ({ catalogDb: {} }));
vi.mock("@/lib/escola/tenant-db", () => ({ getTenantDb: vi.fn() }));
import { avisoDeRecado, avisoDeAgenda } from "@/lib/escola/avisos";
import { horaDeAvisar, agoraSaoPaulo } from "@/lib/escola/agenda-avisos";

describe("avisos: um por tipo", () => {
  it("elogio, lembrete e sugestão têm título, ícone, vibração e grupo diferentes", () => {
    const a = [avisoDeRecado("ELOGIO", "Parabéns!", "Luiz"), avisoDeRecado("LEMBRETE", "Hora de estudar", "Luiz"), avisoDeRecado("SUGESTAO", "Tente Ciências", "")];
    expect(new Set(a.map((x) => x.icon)).size).toBe(3);
    expect(new Set(a.map((x) => x.tag)).size).toBe(3);
    expect(new Set(a.map((x) => JSON.stringify(x.vibrate))).size).toBe(3);
    expect(a[0].title).toBe("Um elogio de Luiz");
    expect(a[2].title).toBe("Uma sugestão da sua família");
  });
  it("agenda: título com a matéria e ícone próprio", () => {
    const a = avisoDeAgenda({ time: "18:30", subjectCode: "MA", minutes: 20 });
    expect(a.title).toBe("Hora de estudar Matemática");
    expect(a.body).toContain("18:30");
    expect(a.icon).toContain("agenda");
    expect(avisoDeAgenda({ time: "18:30", subjectCode: null, minutes: 20 }).url).toBe("/escola/aluno/trilha");
  });
  it("recado longo é cortado para caber no aviso", () => {
    expect(avisoDeRecado("ELOGIO", "a".repeat(240), "").body.length).toBeLessThanOrEqual(140);
  });
});

describe("agenda: hora de avisar", () => {
  it("avisa na hora e até 15 minutos depois; não antes", () => {
    expect(horaDeAvisar("18:30", 18 * 60 + 29)).toBe(false);
    expect(horaDeAvisar("18:30", 18 * 60 + 30)).toBe(true);
    expect(horaDeAvisar("18:30", 18 * 60 + 45)).toBe(true);
    expect(horaDeAvisar("18:30", 18 * 60 + 46)).toBe(false);
  });
  it("usa o fuso de São Paulo: 21:30 UTC de segunda é 18:30 de segunda", () => {
    const r = agoraSaoPaulo(new Date("2026-11-09T21:30:00Z"));
    expect(r).toEqual({ weekday: 0, dia: "2026-11-09", minutos: 18 * 60 + 30 });
  });
});
