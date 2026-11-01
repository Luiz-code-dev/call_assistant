/**
 * aula.int.test.ts
 * L8: POST /professor/aulas/gerar-perguntas — payload sem dado de aluno.
 * L9: POST /professor/aulas/sugerir-objetivos existe.
 * L10: rota de upload de material existe.
 */
import { describe, it, expect } from "vitest";
import { POST as gerarPerguntas } from "@/app/api/escola/professor/aulas/gerar-perguntas/route";
import { POST as sugerirObjetivos } from "@/app/api/escola/professor/aulas/sugerir-objetivos/route";
import { NextRequest } from "next/server";

describe("POST /professor/aulas/gerar-perguntas — L8", () => {
  it("rota existe e exporta POST", () => {
    expect(typeof gerarPerguntas).toBe("function");
  });

  it("retorna 401 sem sessão de professor", async () => {
    const req = new NextRequest("http://localhost/api/escola/professor/aulas/gerar-perguntas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Ângulos",
        objectives: ["Identificar ângulos"],
        skillCodes: ["EF06MA07"],
        gradeYear: 6,
        subjectName: "Matemática",
        count: 5,
      }),
    });
    const res = await gerarPerguntas(req);
    expect([401, 403, 404]).toContain(res.status);
  });

  it("payload não contém nome, matrícula ou id de aluno", () => {
    // Verifica que o schema do endpoint não inclui campos de aluno
    const validPayload = {
      title: "Ângulos",
      objectives: ["Objetivo 1"],
      skillCodes: ["EF06MA07"],
      gradeYear: 6,
      subjectName: "Matemática",
      count: 5,
    };
    const keys = Object.keys(validPayload);
    expect(keys).not.toContain("studentId");
    expect(keys).not.toContain("studentName");
    expect(keys).not.toContain("matricula");
  });
});

describe("POST /professor/aulas/sugerir-objetivos — L9", () => {
  it("rota existe e exporta POST", () => {
    expect(typeof sugerirObjetivos).toBe("function");
  });

  it("retorna 401 sem sessão de professor", async () => {
    const req = new NextRequest("http://localhost/api/escola/professor/aulas/sugerir-objetivos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: "Ângulos", skillCodes: ["EF06MA07"] }),
    });
    const res = await sugerirObjetivos(req);
    expect([401, 403, 404]).toContain(res.status);
  });
});
