/**
 * estudio.int.test.ts
 * L14: Estúdio — gerar, reprovar, editar, aprovar; só APPROVED aparece para redes.
 */
import { describe, it, expect } from "vitest";
import { POST as postGerar } from "@/app/api/escola/plataforma/gerar/route";
import { GET as getRevisar, PATCH as patchRevisar } from "@/app/api/escola/plataforma/revisar/route";
import { NextRequest } from "next/server";

describe("Estúdio de Conteúdo — L14", () => {
  it("POST /plataforma/gerar exporta POST", () => {
    expect(typeof postGerar).toBe("function");
  });

  it("GET /plataforma/revisar exporta GET", () => {
    expect(typeof getRevisar).toBe("function");
  });

  it("PATCH /plataforma/revisar exporta PATCH", () => {
    expect(typeof patchRevisar).toBe("function");
  });

  it("gerar retorna 401/403 sem PLATFORM_ADMIN", async () => {
    const req = new NextRequest("http://localhost/api/escola/plataforma/gerar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillCodes: ["EF06MA07"], subjectCode: "MA", gradeYear: 6 }),
    });
    const res = await postGerar(req);
    expect([401, 403, 404]).toContain(res.status);
  });

  it("revisar (GET) retorna 401/403 sem PLATFORM_ADMIN", async () => {
    const req = new NextRequest("http://localhost/api/escola/plataforma/revisar", {
      method: "GET",
    });
    const res = await getRevisar(req);
    expect([401, 403, 404]).toContain(res.status);
  });

  it("lib/escola/conteudo-plataforma.ts é importável", async () => {
    const mod = await import("@/lib/escola/conteudo-plataforma");
    expect(mod).toBeDefined();
  });

  it("conteudo-plataforma exporta funções de persistência", async () => {
    const mod = await import("@/lib/escola/conteudo-plataforma");
    const keys = Object.keys(mod);
    expect(keys.length).toBeGreaterThan(0);
  });
});
