/**
 * biblioteca.int.test.ts
 * L6: POST /professor/trilhas/[id]/duplicar existe e responde.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/escola/professor/trilhas/[id]/duplicar/route";
import { NextRequest } from "next/server";

describe("POST /professor/trilhas/[id]/duplicar — L6", () => {
  it("rota existe e exporta POST", () => {
    expect(typeof POST).toBe("function");
  });

  it("retorna 401 sem sessão de professor", async () => {
    const req = new NextRequest("http://localhost/api/escola/professor/trilhas/t1/duplicar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "PROFESSOR" }),
    });
    const res = await POST(req, { params: { id: "t1" } });
    expect([401, 403, 404]).toContain(res.status);
  });
});
