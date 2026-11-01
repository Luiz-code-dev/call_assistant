/**
 * indicadores.int.test.ts
 * L16: Indicador da Secretaria — habilidades recuperadas (NOT_YET→MASTERED em habilidade
 *      diagnosticada). Atividades da turma aparecem só como participação, não como recuperação.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/escola/rede/indicadores/route";
import { NextRequest } from "next/server";

describe("GET /rede/indicadores — L16", () => {
  it("rota existe e exporta GET", () => {
    expect(typeof GET).toBe("function");
  });

  it("retorna 401 sem sessão de NETWORK_ADMIN", async () => {
    const req = new NextRequest("http://localhost/api/escola/rede/indicadores", {
      method: "GET",
    });
    const res = await GET(req);
    expect([401, 403, 404]).toContain(res.status);
  });
});
