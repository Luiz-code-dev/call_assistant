#!/usr/bin/env node
/**
 * Conta o que os arquivos do pacote devem publicar: "trilhas diagnósticos fichas".
 * Usado pelo CI para conferir o importador sem números fixos no workflow.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "prisma", "data", "conteudo");
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const trilhas = new Set();
for (const f of readdirSync(join(DATA, "trilhas")).filter((x) => x.endsWith(".json") && x !== "MA-06.json")) for (const t of json(join(DATA, "trilhas", f))) trilhas.add(t.skillCode);
const diags = new Set();
for (const f of readdirSync(join(DATA, "diagnosticos")).filter((x) => x.endsWith(".json") && x.startsWith("DIAG-"))) diags.add(json(join(DATA, "diagnosticos", f)).id);
const fichas = new Set();
for (const f of readdirSync(join(DATA, "fichas")).filter((x) => x.endsWith(".json") && x !== "MA-06.json")) for (const x of json(join(DATA, "fichas", f))) fichas.add(x.skillCode);
console.log(`${trilhas.size} ${diags.size} ${fichas.size}`);
