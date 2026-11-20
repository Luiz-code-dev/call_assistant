import { describe, it, expect } from "vitest";
import { chamadaDoAgendador } from "./cron-auth";

describe("chamada do agendador externo", () => {
  it("sem segredo configurado a rota fica fechada", () => {
    expect(chamadaDoAgendador("Bearer qualquer", undefined)).toBe(false);
    expect(chamadaDoAgendador(null, "")).toBe(false);
  });
  it("aceita só o segredo exato", () => {
    expect(chamadaDoAgendador("Bearer s3gr3do", "s3gr3do")).toBe(true);
    expect(chamadaDoAgendador("Bearer s3gr3dO", "s3gr3do")).toBe(false);
    expect(chamadaDoAgendador("Bearer s3gr3do ", "s3gr3do")).toBe(false);
    expect(chamadaDoAgendador("s3gr3do", "s3gr3do")).toBe(false);
    expect(chamadaDoAgendador(null, "s3gr3do")).toBe(false);
  });
});
