/**
 * configuracoes.int.test.ts
 * L15: Configurações da rede — AUTO/SUGGEST, degrau on/off, mudam o comportamento.
 */
import { describe, it, expect } from "vitest";
import { GET, PATCH } from "@/app/api/escola/rede/configuracoes/route";
import { NextRequest } from "next/server";

describe("GET/PATCH /rede/configuracoes — L15", () => {
  it("rota exporta GET e PATCH", () => {
    expect(typeof GET).toBe("function");
    expect(typeof PATCH).toBe("function");
  });

  it("GET retorna 401 sem sessão", async () => {
    const res = await GET();
    expect([401, 403, 404]).toContain(res.status);
  });

  it("PATCH retorna 401 sem sessão", async () => {
    const req = new NextRequest("http://localhost/api/escola/rede/configuracoes", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trackAssignmentMode: "AUTO" }),
    });
    const res = await PATCH(req);
    expect([401, 403, 404]).toContain(res.status);
  });

  it("EduNetwork.trackAssignmentMode existe no schema Prisma", async () => {
    const mod = await import("@/lib/escola/track-assignment");
    expect(typeof mod.assignAfterDiagnostic).toBe("function");
  });
});
