#!/usr/bin/env node
/**
 * scripts/escolas/bncc-import.mjs
 *
 * Importa as 1.304 habilidades BNCC em cada base ativa (networkId = null).
 * Idempotente: usa upsert por code.
 *
 * Uso: node scripts/escolas/bncc-import.mjs
 */
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/escolas"));
} catch {
  throw new Error("Cliente escolas não gerado. Execute: npm run db:generate:escolas");
}

const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

async function loadBncc() {
  // Tenta carregar do JSON pré-gerado
  const jsonPath = join(ROOT, "data/bncc-habilidades.json");
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  }
  // Fallback: gera a partir do script CSV se existir
  console.warn("[bncc] data/bncc-habilidades.json não encontrado. Execute scripts/escolas/gerar-bncc.mjs");
  return [];
}

async function importIntoDB(db, skills) {
  const count = await db.eduSkill.count({ where: { networkId: null } });
  if (count >= skills.length) {
    console.log(`  [bncc] ${count}/${skills.length} habilidades já presentes, pulando.`);
    return;
  }
  let imported = 0;
  for (const s of skills) {
    await db.eduSkill.upsert({
      where: { code: s.code },
      create: {
        code: s.code,
        description: s.description,
        shortLabel: s.shortLabel ?? s.code,
        stage: s.stage,
        gradeYear: s.gradeYear ?? null,
        subjectId: s.subjectId ?? null,
        networkId: null,
      },
      update: { description: s.description },
    });
    imported++;
  }
  console.log(`  [bncc] ${imported} habilidades importadas/atualizadas.`);
}

async function main() {
  const skills = await loadBncc();
  if (skills.length === 0) {
    console.warn("[bncc] Nenhuma habilidade carregada. Pulando importação BNCC.");
    return;
  }

  const dbs = await catalog.tenantDatabase.findMany({ where: { isActive: true } });
  console.log(`[bncc] ${dbs.length} base(s) ativa(s); ${skills.length} habilidades BNCC.`);

  for (const dbMeta of dbs) {
    const url = process.env[dbMeta.envVar];
    if (!url) {
      console.warn(`[bncc] Variável ${dbMeta.envVar} não definida — pulando ${dbMeta.key}.`);
      continue;
    }
    console.log(`[bncc] Importando em ${dbMeta.key}...`);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await importIntoDB(db, skills);
    } finally {
      await db.$disconnect();
    }
  }
  console.log("[bncc] Concluído.");
}

main()
  .catch((e) => { console.error("[bncc] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
