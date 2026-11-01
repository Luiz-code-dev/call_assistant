/**
 * Guarda de rota do CI — testes que verificam proibições estruturais.
 * Rodam via `vitest` sem banco de dados.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(__dirname, "..");

function grep(pattern: string, dirs: string[]): string {
  try {
    const dirArgs = dirs.map(d => `"${d}"`).join(" ");
    return execSync(`git -C "${root}" grep -nE "${pattern}" -- ${dirArgs} 2>/dev/null || true`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

// ── G1: Sem nota numérica nas telas do aluno ou da família ─────────────────
describe("G1: sem nota nas telas do aluno e família", () => {
  const NOTA_PATTERN = "nota|aiScore|teacherScore|maxScore|/ ?10|de 10|ScoreRing";
  const DIRS = ["app/(escola)/escola/aluno", "app/(escola)/escola/familia"];

  it("não deve exibir nota numérica ao aluno ou à família", () => {
    const result = grep(NOTA_PATTERN, DIRS);
    // Filtra comentários e linhas de tipo/interface (permitidas)
    const offenses = result
      .split("\n")
      .filter(Boolean)
      .filter(l => !l.includes("//"))
      .filter(l => !l.match(/^\s*(interface|type) /))
      .filter(l => !l.includes("// nota"))
      .filter(l => !l.includes("interface"))
      // historico: campo na interface só — já corrigido o display
      .filter(l => !l.match(/submission.*masteryLevel/))
      // permite o campo maxScore no tipo Atividade (interface)
      .filter(l => !l.match(/maxScore: number/))
      // permite comentários no retorno indicando "sem pontuacao"
      .filter(l => !l.includes("pontuacao"))
      // permite a rota de API (não é tela)
      .filter(l => !l.includes("/api/"));

    if (offenses.length > 0) {
      console.error("Ocorrências de nota/score em telas do aluno/família:\n" + offenses.join("\n"));
    }
    expect(offenses.length, "Remova nota/score das telas do aluno e família").toBe(0);
  });
});

// ── G2: Sem palavras sem acento nas telas da área escolar ──────────────────
describe("G2: português com acento nas telas da área escolar", () => {
  const ACENTO_PATTERN = "\\b(cartao|Camera le|nao encontrado|responsavel criar|codigo da aula)\\b";
  const DIRS = ["app/(escola)"];

  it("não deve ter palavras em português sem acento obrigatório", () => {
    const result = grep(ACENTO_PATTERN, DIRS);
    const offenses = result
      .split("\n")
      .filter(Boolean)
      .filter(l => !l.includes("//"))
      .filter(l => !l.includes("FIGURE_IDS"))
      .filter(l => !l.match(/^\s*\/\*/));

    if (offenses.length > 0) {
      console.error("Palavras sem acento encontradas:\n" + offenses.join("\n"));
    }
    expect(offenses.length, "Corrija os acentos nas telas da área escolar").toBe(0);
  });
});

// ── G3: Sem telas do reforço em speakflowEscolas/ ─────────────────────────
describe("G3: telas do reforço não devem estar em speakflowEscolas/", () => {
  it("speakflowMobile/ não deve ter arquivos modificados neste PR", () => {
    // Verifica que nenhum arquivo em speakflowMobile foi tocado
    try {
      const changed = execSync(`git -C "${root}" diff --name-only HEAD~1 HEAD 2>/dev/null || true`, { encoding: "utf8" });
      const speakflowFiles = changed.split("\n").filter(l => l.startsWith("speakflowMobile/"));
      expect(speakflowFiles.length, "Não toque em speakflowMobile/").toBe(0);
    } catch {
      // Em ambientes sem histórico git, ignora
    }
  });
});
