import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Raiz do app: lib/escola -> ../../
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function arquivos(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome.startsWith(".")) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, achados);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

/** Únicos lugares que o profissional de apoio alcança. Aumentar esta lista é uma decisão de segurança. */
const LIBERADOS = [
  "app/(escola)/escola/formacao/livro/[slug]/page.tsx",
  "app/(escola)/escola/formacao/page.tsx",
  "app/(escola)/escola/layout.tsx",
  "app/(escola)/escola/not-found.tsx",
  "app/(escola)/escola/painel/page.tsx",
  "app/api/escola/apoio/resumo/route.ts",
  "app/api/escola/auth/me/route.ts",
  "lib/escola/apoio-equipe.ts",
  "lib/escola/formacao/acesso.ts",
];

describe("perfil de apoio: acesso fechado por padrão", () => {
  it("só os arquivos liberados reconhecem o profissional de apoio", () => {
    const comLiberacao = ["app", "lib", "components"]
      .flatMap((d) => arquivos(join(raiz, d)))
      .filter((f) => readFileSync(f, "utf8").includes("permitirApoio: true"))
      .map((f) => relative(raiz, f).split("\\").join("/"))
      .sort();
    expect(comLiberacao).toEqual(LIBERADOS);
  });
  it("o contexto recusa o perfil de apoio quando a chamada não pede", () => {
    const contexto = readFileSync(join(raiz, "lib/escola/context.ts"), "utf8");
    expect(contexto).toContain('membership.role === "SUPPORT" && !opts?.permitirApoio');
  });
});
