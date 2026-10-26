import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { NAV_BY_ROLE } from "./navigation";
import type { EduRole } from "./types";

// Raiz do app: lib/escola -> ../../ = pageCallAssistant
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const escolaDir = resolve(appRoot, "app", "(escola)");

describe("NAV_BY_ROLE: todo item do menu tem pagina", () => {
  for (const role of Object.keys(NAV_BY_ROLE) as EduRole[]) {
    for (const item of NAV_BY_ROLE[role]) {
      it(`${role} · ${item.label} (${item.href}) tem page.tsx`, () => {
        // href comeca com /escola, e o grupo (escola) e transparente:
        // app/(escola)/escola/<...>/page.tsx
        const pagePath = resolve(escolaDir, "." + item.href, "page.tsx");
        expect(existsSync(pagePath), `faltando: ${pagePath}`).toBe(true);
      });
    }
  }
});
