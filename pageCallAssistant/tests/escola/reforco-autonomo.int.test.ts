/**
 * reforco-autonomo.int.test.ts
 *
 * Verifica que o reforço escolar funciona de forma completamente autônoma.
 * Nenhuma rota de aluno exige diagnóstico aberto pela escola.
 *
 * Padrão: chama os handlers diretamente como os outros testes deste diretório
 * (NextRequest → handler → res.status / res.json()).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

// ── Importa os handlers diretamente ───────────────────────────────────────
import { GET as getMaterias } from "@/app/api/escola/aluno/materias/route";
import { GET as getDiagPendente } from "@/app/api/escola/aluno/diagnostico/pendente/route";
import { POST as postSessao } from "@/app/api/escola/aluno/diagnostico/sessao/route";

const ROOT = join(__dirname, "..", "..");
const TRILHAS_DIR = join(ROOT, "prisma", "data", "conteudo", "trilhas");
const DIAG_DIR    = join(ROOT, "prisma", "data", "conteudo", "diagnosticos");

// ── 1. Sem sessão — rotas autônomas retornam 401 (não 500) ────────────────
describe("Reforço autônomo — sem sessão da escola logada", () => {
  it("GET /materias: 401 sem cookie de aluno (nunca 500)", async () => {
    const req = new NextRequest("http://localhost/api/escola/aluno/materias");
    const res = await getMaterias(req);
    expect(res.status).not.toBe(500);
    expect([401, 403]).toContain(res.status);
  });

  it("GET /diagnostico/pendente: 401 sem sessão (nunca 500)", async () => {
    const req = new NextRequest("http://localhost/api/escola/aluno/diagnostico/pendente");
    const res = await getDiagPendente(req);
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

// ── 2. Cobertura de conteúdo por arquivo JSON ─────────────────────────────
describe("Cobertura de conteúdo — 5º ano", () => {
  const COMPS_5 = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "ER"];

  for (const comp of COMPS_5) {
    it(`${comp} 5º: arquivo de trilhas existe com 4 trilhas`, () => {
      // MA usa FRAC.json (8 trilhas) ou MA-05.json
      const f1 = join(TRILHAS_DIR, `${comp}-05.json`);
      const f2 = comp === "MA" ? join(TRILHAS_DIR, "FRAC.json") : null;
      const f3 = comp === "LP" ? join(TRILHAS_DIR, "LP-05.json") : null;
      const path = existsSync(f1) ? f1 : (f2 && existsSync(f2)) ? f2 : f3;
      expect(path, `Arquivo de trilhas ${comp} 5º não encontrado`).toBeTruthy();
      if (!path) return;
      const data = JSON.parse(readFileSync(path, "utf8"));
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(4);
    });

    it(`${comp} 5º: diagnóstico APPROVED com banco de degrau`, () => {
      const fileName = comp === "MA"
        ? "DIAG-FRAC-5A.json"
        : comp === "LP"
          ? "DIAG-LP-5A.json"
          : `DIAG-${comp}-5A.json`;
      const path = join(DIAG_DIR, fileName);
      expect(existsSync(path), `Diagnóstico ${fileName} não encontrado`).toBe(true);
      const diag = JSON.parse(readFileSync(path, "utf8"));
      expect(diag.status).toBe("APPROVED");
      const degrauItems = diag.items.filter((i: { role?: string }) => i.role === "DEGRAU_BANK");
      expect(degrauItems.length, `${fileName}: sem banco de degrau`).toBeGreaterThan(0);
    });
  }
});

describe("Cobertura de conteúdo — 6º ano", () => {
  const COMPS_6 = ["LP", "MA", "CI", "HI", "GE", "AR", "EF", "LI", "ER"];

  for (const comp of COMPS_6) {
    it(`${comp} 6º: arquivo de trilhas existe com 4 trilhas`, () => {
      const f1 = join(TRILHAS_DIR, `${comp}-06.json`);
      const f2 = comp === "MA" ? join(TRILHAS_DIR, "FRAC.json") : null;
      const path = existsSync(f1) ? f1 : (f2 && existsSync(f2)) ? f2 : null;
      expect(path, `Arquivo de trilhas ${comp} 6º não encontrado`).toBeTruthy();
      if (!path) return;
      const data = JSON.parse(readFileSync(path, "utf8"));
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(4);
    });

    it(`${comp} 6º: diagnóstico APPROVED com banco de degrau`, () => {
      const fileName = comp === "MA"
        ? "DIAG-FRAC-6A-INICIO.json"
        : `DIAG-${comp}-6A.json`;
      const path = join(DIAG_DIR, fileName);
      expect(existsSync(path), `Diagnóstico ${fileName} não encontrado`).toBe(true);
      const diag = JSON.parse(readFileSync(path, "utf8"));
      expect(diag.status).toBe("APPROVED");
      const degrauItems = diag.items.filter((i: { role?: string }) => i.role === "DEGRAU_BANK");
      expect(degrauItems.length, `${fileName}: sem banco de degrau`).toBeGreaterThan(0);
    });
  }
});

// ── 3. Estrutura dos diagnósticos ─────────────────────────────────────────
describe("Estrutura dos diagnósticos — skillId em todo item", () => {
  const diagFiles = existsSync(DIAG_DIR)
    ? require("fs").readdirSync(DIAG_DIR).filter((f: string) => f.endsWith(".json"))
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
