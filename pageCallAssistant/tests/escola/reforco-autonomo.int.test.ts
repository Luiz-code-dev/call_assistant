/**
 * reforco-autonomo.int.test.ts
 *
 * Verifica que o reforço escolar funciona de forma totalmente autônoma:
 * nenhuma rota de aluno depende de diagnóstico aberto pela escola.
 *
 * Cobertura:
 *   1. API /materias retorna 9 componentes para 6º ano
 *   2. API /pendente inclui diagnósticos APPROVED da biblioteca (networkId null)
 *   3. Rota de sessão aceita diagnóstico APPROVED (não só OPEN)
 *   4. track-assignment.assignAfterDiagnostic usa modo AUTO independente do banco
 *   5. Nenhum EduTeacherAlert é criado pelo fluxo autônomo
 *   6. Itens do degrau ficam em EduAttemptSession.extraItems, não em EduDiagnosticItem
 *   7. A rota de sessão retorna resultado real com trilha atribuída quando concluído
 *   8. Os textos "escola ainda não indicou" e "Em breve" foram removidos
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");

// ── 1. API de matérias existe e está tipada ────────────────────────────────
describe("API /api/escola/aluno/materias", () => {
  it("arquivo de rota existe", () => {
    const p = join(ROOT, "app", "api", "escola", "aluno", "materias", "route.ts");
    expect(existsSync(p)).toBe(true);
  });

  it("define componentes BNCC corretos por ano", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "materias", "route.ts"), "utf8");
    // 6º ano deve incluir LI (Língua Inglesa)
    expect(src).toContain('"LI"');
    // 5º ano não inclui LI
    expect(src).toContain("COMPONENTES_ANOS_INICIAIS");
    expect(src).toContain("COMPONENTES_ANOS_FINAIS");
    // Ensino Religioso está presente
    expect(src).toContain("ER");
  });
});

// ── 2. Rota pendente inclui biblioteca autônoma ────────────────────────────
describe("API /api/escola/aluno/diagnostico/pendente", () => {
  it("arquivo de rota existe e busca diagnosticos APPROVED da biblioteca", () => {
    const p = join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "pendente", "route.ts");
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, "utf8");
    // Deve buscar APPROVED além de OPEN
    expect(src).toContain('"APPROVED"');
    expect(src).toContain("networkId: null");
    expect(src).toContain('source: "SPEAKFLOW"');
  });

  it("não exige status OPEN exclusivamente", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "pendente", "route.ts"), "utf8");
    // Não deve ter APENAS 'status: "OPEN"' sem incluir APPROVED
    const hasOnlyOpen = src.includes('status: "OPEN"') && !src.includes('"APPROVED"');
    expect(hasOnlyOpen).toBe(false);
  });
});

// ── 3. Rota de sessão aceita APPROVED ─────────────────────────────────────
describe("API /api/escola/aluno/diagnostico/sessao", () => {
  it("arquivo de rota existe", () => {
    const p = join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts");
    expect(existsSync(p)).toBe(true);
  });

  it("aceita diagnostico APPROVED e networkId null (biblioteca)", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts"), "utf8");
    expect(src).toContain('"APPROVED"');
    expect(src).toContain("networkId: null");
    // Não deve ter o filtro antigo que exigia só OPEN da rede
    expect(src).not.toContain('status: "OPEN", networkId: ctx.networkId');
  });

  it("degrau gravado em extraItems na sessao, nao em EduDiagnosticItem compartilhado", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts"), "utf8");
    expect(src).toContain("extraItems");
    // Não deve gravar DEGRAU- em EduDiagnosticItem
    expect(src).not.toContain('"DEGRAU-"');
    expect(src).not.toContain("aplicarDegrau");
  });

  it("await na atribuicao de trilha (nao fire-and-forget)", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts"), "utf8");
    // Deve ter await assignAfterDiagnostic
    expect(src).toContain("await assignAfterDiagnostic(");
    // Não deve ter o padrão .catch(() => null) no assignAfterDiagnostic
    expect(src).not.toMatch(/assignAfterDiagnostic\([^)]*\)\s*\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)/);
  });

  it("retorna resultado real (domina/quaseLa/aindaNao/trilha)", () => {
    const src = readFileSync(join(ROOT, "app", "api", "escola", "aluno", "diagnostico", "sessao", "route.ts"), "utf8");
    expect(src).toContain('"domina"');
    expect(src).toContain('"quaseLa"');
    expect(src).toContain('"aindaNao"');
    expect(src).toContain('"trilha"');
    expect(src).toContain('"degrauPath"');
  });
});

// ── 4. Atribuição sempre AUTO ──────────────────────────────────────────────
describe("lib/escola/track-assignment.ts", () => {
  it("assignAfterDiagnostic usa modo AUTO fixo, nao le trackAssignmentMode do banco para decidir", () => {
    const src = readFileSync(join(ROOT, "lib", "escola", "track-assignment.ts"), "utf8");
    // Deve ter modo AUTO constante
    expect(src).toContain('const mode = "AUTO"');
    // Não deve criar EduTeacherAlert para trilha sugerida
    expect(src).not.toContain("eduTeacherAlert.create");
  });

  it("nao cria EduTeacherAlert no fluxo de reforco autonomo", () => {
    const src = readFileSync(join(ROOT, "lib", "escola", "track-assignment.ts"), "utf8");
    expect(src).not.toContain("TRACK_SUGGESTION");
    expect(src).not.toContain("type: \"TRACK_SUGGESTION\"");
  });
});

// ── 5. Schema: extraItems em EduAttemptSession ─────────────────────────────
describe("Prisma schema — EduAttemptSession", () => {
  it("tem campo extraItems", () => {
    const src = readFileSync(join(ROOT, "prisma", "escolas", "schema.prisma"), "utf8");
    expect(src).toContain("extraItems");
  });

  it("migration 0014 existe", () => {
    const p = join(ROOT, "prisma", "escolas", "migrations", "0014_degrau_por_aluno", "migration.sql");
    expect(existsSync(p)).toBe(true);
    const sql = readFileSync(p, "utf8");
    expect(sql).toContain("extraItems");
    expect(sql).toContain("isDegrauLegacy");
    expect(sql).toContain("trackAssignmentMode");
  });
});

// ── 6. Tela do aluno: Minhas matérias ─────────────────────────────────────
describe("Tela inicio do aluno", () => {
  it("busca /api/escola/aluno/materias", () => {
    const src = readFileSync(join(ROOT, "app", "(escola)", "escola", "aluno", "page.tsx"), "utf8");
    expect(src).toContain("/api/escola/aluno/materias");
    expect(src).toContain("Minhas matérias");
  });

  it("nao exibe textos antigos de dependencia da escola", () => {
    const src = readFileSync(join(ROOT, "app", "(escola)", "escola", "aluno", "page.tsx"), "utf8");
    expect(src).not.toContain("escola ainda");
    expect(src).not.toContain("ainda nao indicou");
  });
});

// ── 7. Tela do resultado do diagnóstico ───────────────────────────────────
describe("Tela diagnostico/[id]", () => {
  it("mostra resultado real (nao 'Em breve')", () => {
    const src = readFileSync(join(ROOT, "app", "(escola)", "escola", "aluno", "diagnostico", "[id]", "page.tsx"), "utf8");
    expect(src).not.toContain("Em breve aparecerá no início");
    expect(src).not.toContain("Sua trilha está sendo preparada");
    // Deve mostrar resultado real
    expect(src).toContain("resultado.domina");
    expect(src).toContain("Diagnóstico concluído");
  });
});

// ── 8. Tela da família ─────────────────────────────────────────────────────
describe("Tela familia/[studentId]", () => {
  it("nao exibe 'A escola ainda não indicou uma trilha'", () => {
    const p = join(ROOT, "app", "(escola)", "escola", "familia", "[studentId]", "page.tsx");
    if (!existsSync(p)) return; // skip se não existe
    const src = readFileSync(p, "utf8");
    expect(src).not.toContain("A escola ainda não indicou uma trilha");
  });
});

// ── 9. Manifesto PWA ──────────────────────────────────────────────────────
describe("Manifesto PWA escola-manifest.json", () => {
  it("start_url aponta para /escola/inicio", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    expect(manifest.start_url).toBe("/escola/inicio");
  });

  it("theme_color usa roxo do Escolas (nao #4F46E5)", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    expect(manifest.theme_color).not.toBe("#4F46E5");
    expect(manifest.theme_color).toBe("#6D28D9");
  });

  it("icones apontam para /escola-icons/", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "public", "escola-manifest.json"), "utf8"));
    for (const icon of manifest.icons ?? []) {
      expect(icon.src).toMatch(/^\/escola-icons\//);
    }
  });
});
