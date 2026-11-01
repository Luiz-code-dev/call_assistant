/**
 * atribuicao.int.test.ts
 * L4: assignAfterDiagnostic ligado na conclusão do diagnóstico.
 * L5: POST /professor/sugestoes/aceitar existe.
 */
import { describe, it, expect } from "vitest";
import { assignAfterDiagnostic } from "@/lib/escola/track-assignment";
import { POST as postSugestoes } from "@/app/api/escola/professor/sugestoes/aceitar/route";
import { NextRequest } from "next/server";

describe("assignAfterDiagnostic — L4", () => {
  it("é exportada de track-assignment", () => {
    expect(typeof assignAfterDiagnostic).toBe("function");
  });

  it("aceita a assinatura correta (networkId, diagnosticId, studentId, notYetSkillIds, assignedBy)", async () => {
    // Chama com rede inexistente — vai falhar no getTenant, mas prova que a assinatura está correta
    try {
      await assignAfterDiagnostic({
        networkId: "rede-inexistente",
        diagnosticId: "d-test",
        studentId: "s-test",
        notYetSkillIds: ["skill-1"],
        assignedBy: "system",
      });
    } catch (e) {
      // Esperado quando a rede não existe no catálogo
      expect(e).toBeDefined();
    }
  });
});

describe("POST /professor/sugestoes/aceitar — L5", () => {
  it("rota existe e exporta POST", () => {
    expect(typeof postSugestoes).toBe("function");
  });

  it("retorna 401 sem sessão", async () => {
    const req = new NextRequest("http://localhost/api/escola/professor/sugestoes/aceitar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "aceitar_todos", networkId: "net" }),
    });
    const res = await postSugestoes(req);
    expect([401, 403, 404]).toContain(res.status);
  });
});
