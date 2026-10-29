#!/usr/bin/env node
/**
 * scripts/escolas/bncc-import.mjs
 *
 * Importa as 1.304 habilidades BNCC (Ensino Fundamental) em cada base tenant ativa.
 * Idempotente: upsert por code; pula se a contagem já estiver completa.
 * Usa pg_advisory_lock no catálogo para ser seguro com múltiplas réplicas.
 *
 * Fonte: prisma/data/bncc-ef.csv
 * Colunas: code,subjectCode,stage,gradeYears,description,shortLabel
 *          gradeYears = anos separados por ";" ex.: "1;2;3;4;5"
 */
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

// Lock ID estável (diferente do migrate-all para não bloquear um ao outro)
const BNCC_LOCK_ID = 7891234562n;

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/escolas"));
} catch {
  throw new Error("Cliente escolas não gerado. Execute: npm run db:generate:escolas");
}

const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

/** Lê o CSV e devolve array de skills */
function loadBnccFromCsv() {
  const csvPath = join(ROOT, "prisma/data/bncc-ef.csv");
  if (!existsSync(csvPath)) {
    throw new Error(`CSV BNCC não encontrado em ${csvPath}`);
  }
  const lines = readFileSync(csvPath, "utf8").split("\n").filter(Boolean);
  const [_header, ...rows] = lines;
  return rows.map((line) => {
    // Respeita aspas no CSV (campos com vírgula interna)
    const cols = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const [code, subjectCode, stage, gradeYearsRaw, description, shortLabel] = cols;
    const gradeYears = gradeYearsRaw
      ? gradeYearsRaw.split(";").map(Number).filter((n) => !isNaN(n) && n > 0)
      : [];
    return { code: code.trim(), subjectCode: subjectCode.trim(), stage: stage.trim(), gradeYears, description: description.trim(), shortLabel: shortLabel?.trim() || null };
  }).filter((s) => s.code);
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
      create: { code: s.code, subjectCode: s.subjectCode, stage: s.stage, gradeYears: s.gradeYears, description: s.description, shortLabel: s.shortLabel, networkId: null },
      update: { description: s.description, gradeYears: s.gradeYears, subjectCode: s.subjectCode },
    });
    imported++;
  }
  console.log(`  [bncc] ${imported} habilidades importadas/atualizadas.`);
}

async function main() {
  const skills = loadBnccFromCsv();
  console.log(`[bncc] ${skills.length} habilidades BNCC carregadas do CSV.`);

  // Adquire lock exclusivo na sessão para evitar corrida entre réplicas
  await catalog.$executeRaw`SELECT pg_advisory_lock(${BNCC_LOCK_ID})`;
  console.log("[bncc] Lock adquirido.");

  try {
    const dbs = await catalog.tenantDatabase.findMany({ where: { isActive: true } });
    console.log(`[bncc] ${dbs.length} base(s) ativa(s).`);

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
  } finally {
    await catalog.$executeRaw`SELECT pg_advisory_unlock(${BNCC_LOCK_ID})`.catch(() => null);
  }
}

main()
  .catch((e) => { console.error("[bncc] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
