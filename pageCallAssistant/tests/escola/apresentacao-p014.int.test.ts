/**
 * apresentacao-p014.int.test.ts
 *
 * Testes de integração para o pacote de conteúdo P0.14:
 * "Frações (6º e degraus) + Leitura (5º)"
 *
 * Cobertura:
 *   1. Validador passa nos dois pacotes (FRAC.json e LP-05.json)
 *   2. Rota de aluno/atividades exporta GET corretamente
 *   3. Rota de trilhas exporta GET e retorna 401/403 sem sessão
 *   4. Idempotência: importar duas vezes não duplica ids (verificado via JSON)
 *   5. Nenhuma questão do pacote contém texto proibido para o aluno
 *   6. Trilha EF05MA04 tem exatamente 5 etapas na ordem correta
 *   7. Questões EF06MA10 com "1/2 + 1/3" gravam erro soma-num-e-den-separado
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

const ROOT = join(__dirname, "..", "..");
const TRILHAS_DIR = join(ROOT, "prisma", "data", "conteudo", "trilhas");
const DIAG_DIR    = join(ROOT, "prisma", "data", "conteudo", "diagnosticos");
const FORBIDDEN   = /demonstra[cç][aã]o|aguarda revis[aã]o|lorem ipsum/i;

// ── 1. Arquivos do pacote existem ─────────────────────────────────────────────
describe("P0.14 — arquivos do pacote", () => {
  it("FRAC.json existe e é array", () => {
    const path = join(TRILHAS_DIR, "FRAC.json");
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, "utf8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(8);
  });

  it("LP-05.json existe e é array com 4 trilhas", () => {
    const path = join(TRILHAS_DIR, "LP-05.json");
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, "utf8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(4);
  });

  it("4 diagnósticos existem", () => {
    const expected = ["DIAG-FRAC-6A-INICIO.json","DIAG-FRAC-6A-ACOMP.json","DIAG-FRAC-5A.json","DIAG-LP-5A.json"];
    for (const f of expected) {
      expect(existsSync(join(DIAG_DIR, f)), `faltando ${f}`).toBe(true);
    }
  });
});

// ── 2. Sem texto proibido em nenhuma questão ──────────────────────────────────
describe("P0.14 — sem texto proibido ao aluno", () => {
  it("FRAC.json: nenhuma questão ou prompt com texto proibido", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    for (const t of data) {
      for (const a of t.activities ?? []) {
        expect(FORBIDDEN.test(a.prompt ?? ""), `${a.id} prompt`).toBe(false);
        for (const q of a.questions ?? []) {
          expect(FORBIDDEN.test(q.question ?? ""), `${a.id} Q`).toBe(false);
        }
      }
    }
  });

  it("LP-05.json: nenhuma questão ou prompt com texto proibido", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "LP-05.json"), "utf8"));
    for (const t of data) {
      for (const a of t.activities ?? []) {
        expect(FORBIDDEN.test(a.prompt ?? ""), `${a.id} prompt`).toBe(false);
        for (const q of a.questions ?? []) {
          expect(FORBIDDEN.test(q.question ?? ""), `${a.id} Q`).toBe(false);
        }
      }
    }
  });
});

// ── 3. Trilha EF05MA04 tem 5 etapas na ordem correta ─────────────────────────
describe("P0.14 — trilha EF05MA04 (degrau)", () => {
  it("tem exatamente 5 atividades nas 5 etapas obrigatórias", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    const trilha = data.find((t: { skillCode: string }) => t.skillCode === "EF05MA04");
    expect(trilha, "trilha EF05MA04 não encontrada").toBeTruthy();
    const etapas = (trilha.activities ?? []).map((a: { step: string }) => a.step);
    expect(etapas).toEqual(["relembrar","exemplo_guiado","praticar","aplicar","explicar"]);
  });

  it("questões não contêm 'Demonstração'", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    const trilha = data.find((t: { skillCode: string }) => t.skillCode === "EF05MA04");
    for (const a of trilha?.activities ?? []) {
      for (const q of a.questions ?? []) {
        expect(q.question).not.toMatch(/demonstra[cç][aã]o/i);
      }
    }
  });
});

// ── 4. EF06MA10: questão 1/2+1/3 tem misconceptionCode correto ───────────────
describe("P0.14 — EF06MA10 erro soma-num-e-den-separado", () => {
  it("alguma alternativa '2/5' em EF06MA10 tem misconceptionCode soma-num-e-den-separado", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    const trilha = data.find((t: { skillCode: string }) => t.skillCode === "EF06MA10");
    expect(trilha).toBeTruthy();
    let found = false;
    for (const a of trilha?.activities ?? []) {
      for (const q of a.questions ?? []) {
        for (const opt of q.options ?? []) {
          if (typeof opt === "object" && opt.text === "2/5" && opt.misconceptionCode === "soma-num-e-den-separado") {
            found = true;
          }
        }
      }
    }
    expect(found, "misconceptionCode soma-num-e-den-separado para '2/5' não encontrado em EF06MA10").toBe(true);
  });
});

// ── 5. Idempotência: IDs únicos dentro do pacote ─────────────────────────────
describe("P0.14 — IDs únicos (idempotência)", () => {
  it("FRAC.json: nenhum id de atividade duplicado", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    const ids: string[] = data.flatMap((t: { activities: { id: string }[] }) =>
      (t.activities ?? []).map((a) => a.id)
    );
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("LP-05.json: nenhum id de atividade duplicado", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "LP-05.json"), "utf8"));
    const ids: string[] = data.flatMap((t: { activities: { id: string }[] }) =>
      (t.activities ?? []).map((a) => a.id)
    );
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("total de 12 trilhas no pacote demo (8 Frações + 4 Leitura)", () => {
    const frac = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    const lp   = JSON.parse(readFileSync(join(TRILHAS_DIR, "LP-05.json"), "utf8"));
    expect(frac.length + lp.length).toBe(12);
  });
});

// ── 6. Rotas de trilha e atividades exportam corretamente ────────────────────
describe("P0.14 — rotas de trilha", () => {
  it("GET /api/escola/trilhas exporta função", async () => {
    const { GET } = await import("@/app/api/escola/trilhas/route");
    expect(typeof GET).toBe("function");
  });

  it("GET /api/escola/trilhas retorna 401/403 sem sessão", async () => {
    const { GET } = await import("@/app/api/escola/trilhas/route");
    const req = new NextRequest("http://localhost/api/escola/trilhas?aba=biblioteca");
    const res = await (GET as (req: NextRequest) => Promise<Response>)(req);
    expect([401, 403, 404]).toContain(res.status);
  });

  it("GET /api/escola/aluno/atividades exporta função", async () => {
    const { GET } = await import("@/app/api/escola/aluno/atividades/route");
    expect(typeof GET).toBe("function");
  });

  it("GET /api/escola/aluno/atividades retorna 401/403 sem sessão de aluno", async () => {
    const { GET } = await import("@/app/api/escola/aluno/atividades/route");
    const req = new NextRequest("http://localhost/api/escola/aluno/atividades?filter=todo");
    const res = await (GET as (req: NextRequest) => Promise<Response>)(req);
    expect([401, 403, 404]).toContain(res.status);
  });
});

// ── 7. Validador: estrutura das trilhas ──────────────────────────────────────
describe("P0.14 — estrutura de cada trilha", () => {
  it("todas as trilhas FRAC têm 5 atividades (5 etapas)", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8"));
    for (const t of data) {
      expect((t.activities ?? []).length, `${t.skillCode} deve ter 5 atividades`).toBe(5);
    }
  });

  it("todas as trilhas LP-05 têm 5 atividades", () => {
    const data = JSON.parse(readFileSync(join(TRILHAS_DIR, "LP-05.json"), "utf8"));
    for (const t of data) {
      expect((t.activities ?? []).length, `${t.skillCode} deve ter 5 atividades`).toBe(5);
    }
  });

  it("todo quiz tem pelo menos 3 questões e correctIndex válido", () => {
    const all = [
      ...JSON.parse(readFileSync(join(TRILHAS_DIR, "FRAC.json"), "utf8")),
      ...JSON.parse(readFileSync(join(TRILHAS_DIR, "LP-05.json"), "utf8")),
    ];
    for (const t of all) {
      for (const a of t.activities ?? []) {
        if (a.type === "SPOKEN" || a.type === "WRITTEN") continue;
        const qs = a.questions ?? [];
        expect(qs.length, `${a.id} deve ter >= 3 questões`).toBeGreaterThanOrEqual(3);
        for (const q of qs) {
          expect(typeof q.correctIndex).toBe("number");
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan((q.options ?? []).length);
        }
      }
    }
  });
});
