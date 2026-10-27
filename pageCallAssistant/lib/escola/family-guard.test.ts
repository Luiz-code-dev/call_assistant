import { describe, it, expect } from "vitest";
import { weekStartSaoPaulo, dayIndexSaoPaulo } from "./family-guard";

const iso = (d: Date) => d.toISOString();

describe("weekStartSaoPaulo", () => {
  it("segunda 00:00 SP = 03:00 UTC da segunda", () => {
    // Quarta 2026-10-28 09:00 SP
    const ws = weekStartSaoPaulo(new Date("2026-10-28T12:00:00.000Z"));
    expect(iso(ws)).toBe("2026-10-26T03:00:00.000Z");
  });
  it("domingo (SP) ainda pertence a semana que comecou na segunda anterior", () => {
    // Domingo 2026-11-01 09:00 SP
    const ws = weekStartSaoPaulo(new Date("2026-11-01T12:00:00.000Z"));
    expect(iso(ws)).toBe("2026-10-26T03:00:00.000Z");
  });
  it("segunda de madrugada SP fica na propria semana", () => {
    // Segunda 2026-11-02 01:00 SP
    const ws = weekStartSaoPaulo(new Date("2026-11-02T04:00:00.000Z"));
    expect(iso(ws)).toBe("2026-11-02T03:00:00.000Z");
  });
});

describe("dayIndexSaoPaulo", () => {
  it("segunda=0 ... domingo=6 no fuso SP", () => {
    expect(dayIndexSaoPaulo(new Date("2026-10-26T03:00:00.000Z"))).toBe(0); // seg 00:00 SP
    expect(dayIndexSaoPaulo(new Date("2026-10-28T12:00:00.000Z"))).toBe(2); // qua
    expect(dayIndexSaoPaulo(new Date("2026-11-01T12:00:00.000Z"))).toBe(6); // dom
  });
  it("entrega perto da meia-noite UTC cai no dia certo em SP", () => {
    // 2026-10-27T02:00Z = 2026-10-26 23:00 SP (ainda segunda)
    expect(dayIndexSaoPaulo(new Date("2026-10-27T02:00:00.000Z"))).toBe(0);
  });
});
