/**
 * apresentacao-p0.int.test.ts
 * Testes de integração para os 13 itens P0 corrigidos no fix/apresentacao-investidor.
 * Cada item verifica: (a) exportação da rota, (b) status 401/403 sem sessão.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

// P0.1 — diagnóstico/sessão (relação activity agora existe no schema)
describe("P0.1 — POST /api/escola/aluno/diagnostico/sessao", () => {
  it("exporta POST", async () => {
    const { POST } = await import("@/app/api/escola/aluno/diagnostico/sessao/route");
    expect(typeof POST).toBe("function");
  });
  it("retorna 401/403 sem sessão de aluno", async () => {
    const { POST } = await import("@/app/api/escola/aluno/diagnostico/sessao/route");
    const req = new NextRequest("http://localhost/api/escola/aluno/diagnostico/sessao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ diagnosticId: "fake", action: "iniciar" }),
    });
    const res = await POST(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.4 — professor/atividades
describe("P0.4 — GET /api/escola/professor/atividades", () => {
  it("exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/professor/atividades/route");
    expect(typeof GET).toBe("function");
  });
  it("retorna 401/403 sem sessão de professor", async () => {
    const { GET } = await import("@/app/api/escola/professor/atividades/route");
    const req = new NextRequest("http://localhost/api/escola/professor/atividades");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.5 — professor/turmas-componentes (não usa mais EduClass.network inexistente)
describe("P0.5 — GET /api/escola/professor/turmas-componentes", () => {
  it("exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/professor/turmas-componentes/route");
    expect(typeof GET).toBe("function");
  });
  it("retorna 401/403 sem sessão de professor", async () => {
    const { GET } = await import("@/app/api/escola/professor/turmas-componentes/route") as { GET: RouteHandler };
    const req = new NextRequest("http://localhost/api/escola/professor/turmas-componentes");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.6 — coordenacao/escolas (usa EduClass, não eduOffering inexistente)
describe("P0.6 — GET /api/escola/coordenacao/escolas", () => {
  it("exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/coordenacao/escolas/route");
    expect(typeof GET).toBe("function");
  });
  it("retorna 401/403 sem sessão de coordenação", async () => {
    const { GET } = await import("@/app/api/escola/coordenacao/escolas/route");
    const req = new NextRequest("http://localhost/api/escola/coordenacao/escolas");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.7 — coordenacao/turmas (rota nova, antes era 404)
describe("P0.7 — GET /api/escola/coordenacao/turmas", () => {
  it("exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/coordenacao/turmas/route");
    expect(typeof GET).toBe("function");
  });
  it("retorna 401/403 sem sessão", async () => {
    const { GET } = await import("@/app/api/escola/coordenacao/turmas/route") as { GET: RouteHandler };
    const req = new NextRequest("http://localhost/api/escola/coordenacao/turmas");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.8 — diagnosticos/[id] (usa EduAttemptSession, não EduSubmission)
describe("P0.8 — GET /api/escola/diagnosticos/[id]", () => {
  it("exporta GET e PATCH", async () => {
    const mod = await import("@/app/api/escola/diagnosticos/[id]/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
  });
  it("retorna 401/403 sem sessão", async () => {
    const { GET } = await import("@/app/api/escola/diagnosticos/[id]/route");
    const req = new NextRequest("http://localhost/api/escola/diagnosticos/fake-id");
    const res = await GET(req, { params: { id: "fake-id" } });
    expect([401, 403]).toContain(res.status);
  });
});

// P0.9 — plataforma/conteudo e plataforma/revisar (usa getContentReadDb para PLATFORM_ADMIN)
describe("P0.9 — /api/escola/plataforma/conteudo e /revisar", () => {
  it("conteudo exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/plataforma/conteudo/route");
    expect(typeof GET).toBe("function");
  });
  it("conteudo retorna 401/403 sem PLATFORM_ADMIN", async () => {
    const { GET } = await import("@/app/api/escola/plataforma/conteudo/route") as { GET: RouteHandler };
    const req = new NextRequest("http://localhost/api/escola/plataforma/conteudo");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
  it("revisar exporta GET e PATCH", async () => {
    const mod = await import("@/app/api/escola/plataforma/revisar/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
  });
  it("revisar retorna 401/403 sem PLATFORM_ADMIN", async () => {
    const { GET } = await import("@/app/api/escola/plataforma/revisar/route");
    const req = new NextRequest("http://localhost/api/escola/plataforma/revisar");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.10 — prerequisitos studio (campo prerequisiteSkill renomeado na resposta)
describe("P0.10 — /api/escola/plataforma/prerequisitos", () => {
  it("exporta GET e PATCH", async () => {
    const mod = await import("@/app/api/escola/plataforma/prerequisitos/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
  });
  it("retorna 401/403 sem PLATFORM_ADMIN", async () => {
    const { GET } = await import("@/app/api/escola/plataforma/prerequisitos/route");
    const req = new NextRequest("http://localhost/api/escola/plataforma/prerequisitos");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P0.2 — atribuicoes: POST criado para EduClassSubject
describe("P0.2 — POST /api/escola/escolas/[id]/atribuicoes", () => {
  it("exporta GET e POST", async () => {
    const mod = await import("@/app/api/escola/escolas/[id]/atribuicoes/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
  it("POST retorna 401/403 sem sessão", async () => {
    const { POST } = await import("@/app/api/escola/escolas/[id]/atribuicoes/route");
    const req = new NextRequest("http://localhost/api/escola/escolas/fake-id/atribuicoes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subjectId: "s1", teacherId: "t1", classId: "c1" }),
    });
    const res = await POST(req, { params: { id: "fake-id" } });
    expect([401, 403]).toContain(res.status);
  });
});

// P0.11 — painel: redireciona por papel via rotaDoPapel
describe("P0.11 — /escola/painel redireciona por papel", () => {
  it("escola/painel/page exporta default", async () => {
    const mod = await import("@/app/(escola)/escola/painel/page");
    expect(mod.default).toBeDefined();
  });
});

// Migração 0011 e 0012 — arquivos existem
describe("Migrações 0011 e 0012", () => {
  it("migração 0011 (EduDiagnosticItem.activity) existe", async () => {
    const fs = await import("fs");
    const path = "prisma/escolas/migrations/0011_diagnostic_item_activity_relation/migration.sql";
    expect(fs.existsSync(path)).toBe(true);
  });
  it("migração 0012 (EduClassSubject.subject FK) existe", async () => {
    const fs = await import("fs");
    const path = "prisma/escolas/migrations/0012_classsubject_relations/migration.sql";
    expect(fs.existsSync(path)).toBe(true);
  });
});
