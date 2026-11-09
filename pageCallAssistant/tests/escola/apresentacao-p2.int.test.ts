/**
 * apresentacao-p2.int.test.ts
 * Testes de integração para os itens P2 do fix/apresentacao-investidor.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// P2 — notas removidas: rede/page deve existir sem quebrar importação
describe("P2 — Notas removidas da área da rede", () => {
  it("rede/page não contém 'Notas do período' nem 'Notas lançadas'", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/rede/page.tsx", "utf8");
    expect(src).not.toContain("Notas do período");
    expect(src).not.toContain("Notas lançadas");
  });
  it("rede/page contém 'Habilidades recuperadas' e 'Praticaram na semana'", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/rede/page.tsx", "utf8");
    expect(src).toContain("Habilidades recuperadas");
    expect(src).toContain("Praticaram na semana");
  });
});

// P2 — PIN: aluno/entrar não deve mencionar professor para PIN
describe("P2 — Mensagem de PIN não cita professor", () => {
  it("aluno/entrar não contém 'Peca ao professor'", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/aluno/entrar/page.tsx", "utf8");
    expect(src).not.toMatch(/peca ao professor/i);
  });
  it("aluno/entrar cita responsável para PIN", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/aluno/entrar/page.tsx", "utf8");
    expect(src).toMatch(/responsável/i);
  });
});

// P2 — teclado físico no código da aula
describe("P2 — Teclado físico no código da aula", () => {
  it("aluno/entrar tem useEffect de keydown para aula-code", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/aluno/entrar/page.tsx", "utf8");
    expect(src).toContain("keydown");
    expect(src).toContain("aula-code");
    expect(src).toContain("Backspace");
  });
});

// P2 — modo sala: data completa para sessões 2099
describe("P2 — Modo sala: exibe data completa para sessões demo", () => {
  it("professor/aula tem lógica farFuture para exibir data completa", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/professor/aula/page.tsx", "utf8");
    expect(src).toContain("farFuture");
    expect(src).toContain("getFullYear");
  });
  it("professor/aula não exibe 'sem turma' quando já há aula aberta", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/professor/aula/page.tsx", "utf8");
    // A mensagem de sem turma agora só aparece quando sessions.length === 0 também
    expect(src).toContain("sessions.length === 0");
  });
});

// P2 — API rede/indicadores existe e requer autenticação
describe("P2 — /api/escola/rede/indicadores", () => {
  it("exporta GET", async () => {
    const { GET } = await import("@/app/api/escola/rede/indicadores/route");
    expect(typeof GET).toBe("function");
  });
  it("retorna 401/403 sem sessão", async () => {
    const { GET } = await import("@/app/api/escola/rede/indicadores/route");
    const req = new NextRequest("http://localhost/api/escola/rede/indicadores");
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });
});

// P2 — acentos obrigatórios ausentes nos arquivos alterados
describe("P3 — Acentos obrigatórios presentes", () => {
  const checks: [string, string[]][] = [
    [
      "app/(escola)/escola/aluno/page.tsx",
      ["DIAGNÓSTICO DISPONÍVEL", "questões", "Começar", "Evolução"],
    ],
    [
      "app/(escola)/escola/aluno/diagnostico/[id]/page.tsx",
      ["diagnóstico", "DIAGNÓSTICO", "questão", "atenção"],
    ],
    [
      "app/(escola)/escola/coordenacao/diagnosticos/page.tsx",
      ["Diagnósticos", "DIAGNÓSTICOS SPEAKFLOW", "pré-elaborados"],
    ],
  ];

  for (const [file, words] of checks) {
    for (const word of words) {
      it(`${file.split("/").pop()} contém "${word}"`, async () => {
        const fs = await import("fs");
        const src = fs.readFileSync(file, "utf8");
        expect(src).toContain(word);
      });
    }
  }
});

// P3 — kit modal scroll
describe("P3 — Modal do kit: título visível e scroll interno", () => {
  it("direcao/cartoes tem flex flex-col max-h-[90vh] no modal", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/direcao/cartoes/page.tsx", "utf8");
    expect(src).toContain("max-h-[90vh]");
    expect(src).toContain("overflow-y-auto");
    expect(src).toContain("shrink-0");
  });
});

// P3 — família: sem "ele(a)"
describe("P3 — Família: pronome neutro", () => {
  it("familia/[studentId]/page.tsx não contém 'ele(a)'", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/familia/[studentId]/page.tsx", "utf8");
    expect(src).not.toContain("ele(a)");
  });
  it("familia/[studentId]/evolucao/page.tsx não contém 'ele(a)'", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/(escola)/escola/familia/[studentId]/evolucao/page.tsx", "utf8");
    expect(src).not.toContain("ele(a)");
  });
});
