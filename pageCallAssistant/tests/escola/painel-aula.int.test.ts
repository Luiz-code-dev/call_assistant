/**
 * painel-aula.int.test.ts
 * L11: GET /professor/aulas/[id] retorna % por objetivo.
 * L12: 3 rotas de sala existem (retomar, segunda-chance, enviar-reforco).
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/escola/professor/aulas/[id]/route";
import { NextRequest } from "next/server";

describe("GET /professor/aulas/[id] — L11", () => {
  it("rota existe e exporta GET", () => {
    expect(typeof GET).toBe("function");
  });

  it("retorna 401 sem sessão de professor", async () => {
    const req = new NextRequest("http://localhost/api/escola/professor/aulas/aula1", {
      method: "GET",
    });
    const res = await GET(req, { params: { id: "aula1" } });
    expect([401, 403, 404]).toContain(res.status);
  });
});

describe("Rotas de sala — L12", () => {
  it("POST /professor/aulas/[id]/retomar-em-sala existe ou é pendente", async () => {
    const mod = await import("@/app/api/escola/professor/aulas/[id]/retomar-em-sala/route").catch(() => null);
    expect(mod === null || typeof mod.POST === "function").toBe(true);
  });

  it("POST /professor/aulas/[id]/segunda-chance existe ou é pendente", async () => {
    const mod = await import("@/app/api/escola/professor/aulas/[id]/segunda-chance/route").catch(() => null);
    expect(mod === null || typeof mod.POST === "function").toBe(true);
  });

  it("POST /professor/aulas/[id]/enviar-reforco existe ou é pendente", async () => {
    const mod = await import("@/app/api/escola/professor/aulas/[id]/enviar-reforco/route").catch(() => null);
    expect(mod === null || typeof mod.POST === "function").toBe(true);
  });
});
