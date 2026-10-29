/**
 * Testes de integridade da área escolar.
 * Roda com: npx vitest run lib/escola/rotas.test.ts
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const APP  = path.join(ROOT, "app/(escola)");
const SCAN = [APP, path.join(ROOT, "components/escola"), path.join(ROOT, "lib/escola")];

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(f.name) && !f.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const pages = walk(APP)
  .filter(p => p.endsWith("page.tsx"))
  .map(p => p.slice(APP.length).replace(/\\/g, "/").replace(/\/page\.tsx$/, "") || "/");

const matchers = pages.map(
  r => new RegExp("^" + r.replace(/\[[^\]]+\]/g, "[^/]+") + "$"),
);

describe("área escolar", () => {
  const files = SCAN.flatMap(d => (fs.existsSync(d) ? walk(d) : []));

  it("todo link /escola/... aponta para uma página que existe", () => {
    const quebrados: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of Array.from(src.matchAll(/["'`](\/escola\/[^"'`?#\s]*)/g))) {
        const href = m[1].replace(/\$\{[^}]+\}/g, "x").replace(/\/$/, "");
        if (!matchers.some(rx => rx.test(href))) {
          quebrados.push(`${path.relative(ROOT, f)} → ${href}`);
        }
      }
    }
    expect(quebrados).toEqual([]);
  });

  it("nenhum emoji nas telas", () => {
    const comEmoji = files
      .filter(f => {
        const src = fs.readFileSync(f, "utf8");
        return Array.from(src).some(ch => {
          const cp = ch.codePointAt(0) ?? 0;
          return (cp >= 0x1F300 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF) || (cp >= 0x1F000 && cp <= 0x1FFFF);
        });
      })
      .map(f => path.relative(ROOT, f));
    expect(comEmoji).toEqual([]);
  });

  it("nenhum item de menu comentado", () => {
    const nav = fs.readFileSync(path.join(ROOT, "lib/escola/navigation.ts"), "utf8");
    expect(nav).not.toMatch(/\/\/\s*\{\s*label:/);
  });

  it("nenhum prompt/alert/confirm do navegador", () => {
    // Ignora: `function confirmarImportacao` e referências a campos `.prompt` em interfaces/objetos
    const usam = files
      .filter(f => {
        const src = fs.readFileSync(f, "utf8");
        // Remove linhas de comment e strings que contêm "prompt" como campo de objeto (type, interface)
        const linhas = src.split("\n").filter(l => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"));
        return linhas.some(l => /\b(window\.)?(prompt|alert|confirm)\(/.test(l) && !/confirmarImportacao/.test(l));
      })
      .map(f => path.relative(ROOT, f));
    expect(usam).toEqual([]);
  });
});
