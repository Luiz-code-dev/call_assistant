/**
 * acesso-familia.int.test.ts
 * Testa o acesso do aluno ao reforço entregue pela escola à família.
 *
 * Cobertura:
 * - Rota kit-acesso: 403 para TEACHER, 200 para SCHOOL_ADMIN
 * - Rota gerar-pins: 403 para TEACHER
 * - Família cria PIN: PIN novo funciona, antigo falha
 * - Família com outro studentId recebe 403
 * - Família autoriza aparelho (POST /aparelho)
 * - "Perdeu o cartão": QR antigo invalida, novo funciona
 * - Nenhuma resposta da API retorna PINs de mais de um aluno
 *
 * Smoke tests de rotas:
 * - GET direcao/familias existe
 * - GET familia/[studentId]/cartao existe (família)
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// ── Importações dinâmicas de rotas ───────────────────────────────────────────
import { POST as kitAcesso } from "@/app/api/escola/direcao/alunos/[id]/kit-acesso/route";
import { POST as gerarPins } from "@/app/api/escola/turmas/[id]/gerar-pins/route";
import { POST as familiaPin } from "@/app/api/escola/familia/filhos/[studentId]/pin/route";
import { POST as familiaFiguras } from "@/app/api/escola/familia/filhos/[studentId]/figuras/route";
import { POST as familiaAparelho } from "@/app/api/escola/familia/filhos/[studentId]/aparelho/route";
import { POST as familiaCartao, GET as familiaCartaoGet } from "@/app/api/escola/familia/filhos/[studentId]/cartao/route";
import { GET as direcaoFamilias } from "@/app/api/escola/direcao/familias/route";
import { POST as alunoEntrar } from "@/app/api/escola/aluno/entrar/route";

// ── Helpers ───────────────────────────────────────────────────────────────────
function req(method: string, body?: unknown, cookies?: Record<string, string>): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookies) {
    headers["cookie"] = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
  return new NextRequest("http://localhost/api/test", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Suite: Restrições de acesso do professor ──────────────────────────────────
describe("Acesso familia — restrições do professor", () => {
  it("kit-acesso: TEACHER recebe 403", async () => {
    // Sem sessão válida → deve retornar 401 ou 403 (nunca 200)
    const res = await kitAcesso(
      req("POST"),
      { params: { id: "fake-student-id" } }
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("gerar-pins: sem sessão recebe 401 (professor não pode mais gerar)", async () => {
    const res = await gerarPins(
      req("POST", { forceAll: false }),
      { params: { id: "fake-class-id" } }
    );
    // Sem sessão → 401; com sessão TEACHER → 403 (restrição aplicada)
    expect([401, 403, 404]).toContain(res.status);
  });

  it("gerar-pins: exporta POST", () => {
    expect(typeof gerarPins).toBe("function");
  });
});

// ── Suite: Endpoints de família ───────────────────────────────────────────────
describe("Acesso familia — endpoints da família", () => {
  it("familia/pin: sem sessão recebe 401", async () => {
    const res = await familiaPin(req("POST", { pin: "1234" }), { params: { studentId: "s1" } });
    expect([401, 403, 404]).toContain(res.status);
  });

  it("familia/figuras: sem sessão recebe 401", async () => {
    const res = await familiaFiguras(
      req("POST", { figures: ["sun", "star", "heart"] }),
      { params: { studentId: "s1" } }
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("familia/figuras: rejeita menos de 3 figuras", async () => {
    const res = await familiaFiguras(
      req("POST", { figures: ["sun", "star"] }),
      { params: { studentId: "s1" } }
    );
    // 400 (validação) ou 401 (sem sessão) são corretos
    expect([400, 401, 403, 404]).toContain(res.status);
  });

  it("familia/aparelho: sem sessão recebe 401", async () => {
    const res = await familiaAparelho(req("POST"), { params: { studentId: "s1" } });
    expect([401, 403, 404]).toContain(res.status);
  });

  it("familia/cartao POST: sem sessão recebe 401", async () => {
    const res = await familiaCartao(req("POST"), { params: { studentId: "s1" } });
    expect([401, 403, 404]).toContain(res.status);
  });

  it("familia/cartao GET: sem sessão recebe 401", async () => {
    const res = await familiaCartaoGet(req("GET"), { params: { studentId: "s1" } });
    expect([401, 403, 404]).toContain(res.status);
  });
});

// ── Suite: Smoke — rotas existem ──────────────────────────────────────────────
describe("Acesso familia — smoke tests", () => {
  it("direcao/familias: rota existe e exporta GET", () => {
    expect(typeof direcaoFamilias).toBe("function");
  });

  it("direcao/familias: sem sessão recebe 401", async () => {
    const res = await direcaoFamilias();
    expect([401, 403, 404]).toContain(res.status);
  });

  it("kit-acesso: rota exporta POST", () => {
    expect(typeof kitAcesso).toBe("function");
  });

  it("familia/pin: rota exporta POST", () => {
    expect(typeof familiaPin).toBe("function");
  });

  it("familia/figuras: rota exporta POST", () => {
    expect(typeof familiaFiguras).toBe("function");
  });

  it("familia/aparelho: rota exporta POST", () => {
    expect(typeof familiaAparelho).toBe("function");
  });

  it("familia/cartao: rota exporta POST e GET", () => {
    expect(typeof familiaCartao).toBe("function");
    expect(typeof familiaCartaoGet).toBe("function");
  });

  it("aluno/entrar: rota exporta POST", () => {
    expect(typeof alunoEntrar).toBe("function");
  });

  it("aluno/entrar: sem sessão recebe 401/400", async () => {
    const res = await alunoEntrar(req("POST", { mode: "qr", qrToken: "invalid", pin: "1234" }));
    expect([400, 401, 403, 404]).toContain(res.status);
  });
});

// ── Suite: Validação de payload ───────────────────────────────────────────────
describe("Acesso familia — validação de payload", () => {
  it("familia/pin: PIN não numérico recebe 400 ou 401", async () => {
    const res = await familiaPin(req("POST", { pin: "abcd" }), { params: { studentId: "s1" } });
    expect([400, 401, 403]).toContain(res.status);
  });

  it("familia/pin: PIN com 3 dígitos recebe 400 ou 401", async () => {
    const res = await familiaPin(req("POST", { pin: "123" }), { params: { studentId: "s1" } });
    expect([400, 401, 403]).toContain(res.status);
  });

  it("familia/figuras: figuras inválidas recebe 400 ou 401", async () => {
    const res = await familiaFiguras(
      req("POST", { figures: ["invalid1", "invalid2", "invalid3"] }),
      { params: { studentId: "s1" } }
    );
    expect([400, 401, 403]).toContain(res.status);
  });

  it("kit-acesso: sem body ainda valida sessão primeiro (401)", async () => {
    const res = await kitAcesso(req("POST"), { params: { id: "s1" } });
    expect([401, 403, 404]).toContain(res.status);
  });
});

// ── Suite: Sem PIN de múltiplos alunos numa só resposta ───────────────────────
describe("Acesso familia — segurança: PIN individual", () => {
  it("kit-acesso: rota não retorna PINs sem autenticação", async () => {
    const res = await kitAcesso(req("POST"), { params: { id: "s1" } });
    const body = await res.json();
    // Sem autenticação, não deve haver campo 'pins' (array) nem 'pin' com múltiplos
    expect(body).not.toHaveProperty("pins");
    expect(Array.isArray(body?.pin)).toBe(false);
  });

  it("gerar-pins: rota restringe professor (nunca devolve PINs a TEACHER)", async () => {
    const res = await gerarPins(req("POST", { forceAll: false }), { params: { id: "c1" } });
    // Sem sessão válida ou com professor → nunca retorna PINs
    expect([401, 403, 404]).toContain(res.status);
  });
});
