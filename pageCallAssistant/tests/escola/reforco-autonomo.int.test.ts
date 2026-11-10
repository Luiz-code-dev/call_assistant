/**
 * reforco-autonomo.int.test.ts
 *
 * Verifica que o reforço escolar funciona de forma completamente autônoma.
 * Nenhuma rota de aluno exige diagnóstico aberto pela escola.
 *
 * Padrão: chama os handlers diretamente como os outros testes deste diretório
 * (NextRequest → handler → res.status / res.json()).
 */

import { describe, it, expect, vi } from "vitest";

// Sem request real: simula uma requisição sem cookie e sem Authorization (aluno não logado)
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: () => new Headers(),
}));
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

// ── Importa os handlers diretamente ───────────────────────────────────────
import { GET as getMaterias } from "@/app/api/escola/aluno/materias/route";
import { GET as getDiagPendente } from "@/app/api/escola/aluno/diagnostico/pendente/route";
import { POST as postSessao } from "@/app/api/escola/aluno/diagnostico/sessao/route";

const ROOT = join(__dirname, "..", "..");
const DIAG_DIR    = join(ROOT, "prisma", "data", "conteudo", "diagnosticos");

// ── 1. Sem sessão — rotas autônomas retornam 401 (não 500) ────────────────
describe("Reforço autônomo — sem sessão da escola logada", () => {
  it("GET /materias: 401 sem cookie de aluno (nunca 500)", async () => {
    // GET sem parâmetros
    const res = await getMaterias();
    expect(res.status).not.toBe(500);
    expect([401, 403]).toContain(res.status);
  });

  it("GET /diagnostico/pendente: 401 sem sessão (nunca 500)", async () => {
    // GET sem parâmetros
    const res = await getDiagPendente();
    expect(res.status).not.toBe(500);
    expect([401, 403]).toContain(res.status);
  });

  it("POST /diagnostico/sessao: 401 sem sessão (nunca 500)", async () => {
    const req = new NextRequest("http://localhost/api/escola/aluno/diagnostico/sessao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "iniciar", diagnosticId: "qualquer" }),
    });
    const res = await postSessao(req);
    expect(res.status).not.toBe(500);
    expect([401, 403, 404]).toContain(res.status);
  });
});

// ── 2. Cobertura de conteúdo nos arquivos do pacote ───────────────────────
// Para cada componente obrigatório do 5º e do 6º ano: diagnóstico APPROVED com
// 2 habilidades e, no 6º, banco do degrau. Língua Inglesa só existe no 6º.
// (A mesma regra é conferida no banco, depois da importação, em pacote-materias.int.test.ts.)
type ItemDiag = { skillCode: string; role?: string };
type Diag = { id: string; status: string; subjectCode?: string; gradeYear?: number; items: ItemDiag[] };
const diagnosticosDoPacote: Diag[] = existsSync(DIAG_DIR)
  ? readdirSync(DIAG_DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(DIAG_DIR, f), "utf8")))
  : [];

for (const [ano, comps] of [[5, ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "ER"]], [6, ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI", "ER"]]] as const) {
  describe(`Cobertura de conteúdo — ${ano}º ano`, () => {
    for (const comp of comps) {
      it(`${comp} ${ano}º: diagnóstico APPROVED com 2 habilidades${ano === 6 ? " e banco do degrau" : ""}`, () => {
        const candidatos = diagnosticosDoPacote.filter((d) => d.status === "APPROVED" && d.subjectCode === comp && d.gradeYear === ano);
        const ok = candidatos.some((d) => {
          const normais = new Set(d.items.filter((i) => (i.role ?? "NORMAL") === "NORMAL").map((i) => i.skillCode));
          const banco = d.items.filter((i) => i.role === "DEGRAU_BANK").length;
          return normais.size >= 2 && (ano === 5 || banco > 0);
        });
        expect(ok, `${comp} ${ano}º: ${candidatos.map((d) => d.id).join(", ") || "nenhum diagnóstico"}`).toBe(true);
      });
    }
  });
}

// ── 3. Estrutura dos diagnósticos ─────────────────────────────────────────
describe("Estrutura dos diagnósticos — skillId em todo item", () => {
  const diagFiles = existsSync(DIAG_DIR)
    ? readdirSync(DIAG_DIR).filter((f: string) => f.endsWith(".json"))
    : [];

  for (const file of diagFiles) {
    it(`${file}: todo item tem skillId ou skillCode`, () => {
      const diag = JSON.parse(readFileSync(join(DIAG_DIR, file), "utf8"));
      for (const item of diag.items ?? []) {
        const hasSkill = item.skillId || item.skillCode;
        expect(hasSkill, `${file} item ${item.id ?? "??"}: sem skillId nem skillCode`).toBeTruthy();
      }
    });
  }
});

// ── 4. Rotas existem e exportam o método correto ──────────────────────────
describe("Rotas de reforço autônomo — exports corretos", () => {
  it("GET /materias exporta função", () => {
    expect(typeof getMaterias).toBe("function");
  });

  it("GET /diagnostico/pendente exporta função", () => {
    expect(typeof getDiagPendente).toBe("function");
  });

  it("POST /diagnostico/sessao exporta função", () => {
    expect(typeof postSessao).toBe("function");
  });
});

// ── 5. track-assignment: sem alert de sugestão ────────────────────────────
describe("track-assignment — modo AUTO, sem EduTeacherAlert", () => {
  it("assignAfterDiagnostic usa modo AUTO fixo", () => {
    const src = readFileSync(join(ROOT, "lib", "escola", "track-assignment.ts"), "utf8");
    expect(src).toContain('const mode = "AUTO"');
    expect(src).not.toContain('"TRACK_SUGGESTION"');
  });

  it("sessao/route: await na atribuição (não fire-and-forget)", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts"), "utf8");
    expect(src).toContain("await assignAfterDiagnostic(");
    expect(src).not.toMatch(/assignAfterDiagnostic\([^)]*\)\s*\.catch\(\s*\(\s*\)\s*=>\s*null/);
  });
});

// ── 6. Manifesto PWA ──────────────────────────────────────────────────────
describe("Manifesto PWA", () => {
  it("start_url = /escola/inicio", () => {
    const m = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    expect(m.start_url).toBe("/escola/inicio");
  });

  it("theme_color = #6D28D9 (não #4F46E5)", () => {
    const m = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    expect(m.theme_color).toBe("#6D28D9");
  });

  it("ícones apontam para /escola-icons/", () => {
    const m = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    for (const icon of m.icons ?? []) {
      expect(icon.src).toMatch(/^\/escola-icons\//);
    }
  });

  it("arquivos de ícone existem em public/escola-icons/", () => {
    const expected = ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon.ico"];
    for (const f of expected) {
      expect(existsSync(join(ROOT, "public", "escola-icons", f)), `faltando ${f}`).toBe(true);
    }
  });
});
