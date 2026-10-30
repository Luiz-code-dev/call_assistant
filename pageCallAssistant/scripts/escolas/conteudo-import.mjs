#!/usr/bin/env node
/**
 * scripts/escolas/conteudo-import.mjs
 *
 * Importa dados de referência SpeakFlow (pré-requisitos, fichas pedagógicas,
 * trilhas e diagnósticos) em todas as bases tenant ativas.
 * Idempotente e com pg_advisory_lock para evitar importações simultâneas.
 *
 * Controle de idempotência: id estável por item (ex.: SF-PREREQ-EF06MA07-EF05MA07).
 * Nada passa a APPROVED sem aprovação humana no Estúdio.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/escolas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(ROOT, "prisma", "data", "conteudo");
const LOCK_ID = 2002; // pg_advisory_lock id único

function tenantDb(envVar) {
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável de ambiente ausente: ${envVar}`);
  return new PrismaClient({ datasources: { db: { url } } });
}

function listTenantEnvVars() {
  const vars = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/^ESCOLAS_DB_\d+_URL$/.test(k) && v) vars.push(k);
  }
  if (vars.length === 0 && process.env.ESCOLAS_DB_URL) vars.push("ESCOLAS_DB_URL");
  return vars.sort();
}

// ── Importar pré-requisitos ───────────────────────────────────────────────────
async function importPrerequisitos(db) {
  const file = join(DATA_DIR, "prerequisitos.json");
  if (!existsSync(file)) return;
  const items = JSON.parse(readFileSync(file, "utf8"));

  // Pré-carrega o mapa code → id das habilidades
  const codes = [...new Set([...items.map(i => i.skillCode), ...items.map(i => i.prerequisiteCode)])];
  const skills = await db.eduSkill.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const codeMap = Object.fromEntries(skills.map(s => [s.code, s.id]));

  let n = 0;
  for (const item of items) {
    const skillId = codeMap[item.skillCode];
    const prereqId = codeMap[item.prerequisiteCode];
    if (!skillId || !prereqId) continue; // habilidade ainda não importada

    // Upsert com id estável
    const id = `SF-PREREQ-${item.skillCode}-${item.prerequisiteCode}`;
    await db.eduSkillPrerequisite.upsert({
      where: { id },
      create: {
        id,
        skillId,
        prerequisiteSkillId: prereqId,
        weight: item.weight ?? 1,
        networkId: null,
        source: item.source ?? "SPEAKFLOW",
        status: item.status ?? "DRAFT",
      },
      update: { weight: item.weight ?? 1, status: item.status ?? "DRAFT" },
    });
    n++;
  }
  console.log(`  [prereq] ${n} pré-requisitos importados.`);
}

// ── Importar fichas pedagógicas ───────────────────────────────────────────────
async function importFichas(db) {
  const fichasDir = join(DATA_DIR, "fichas");
  if (!existsSync(fichasDir)) return;

  const files = readdirSync(fichasDir).filter(f => f.endsWith(".json"));
  let n = 0;

  for (const file of files) {
    const fichas = JSON.parse(readFileSync(join(fichasDir, file), "utf8"));
    for (const ficha of fichas) {
      const skill = await db.eduSkill.findUnique({ where: { code: ficha.skillCode }, select: { id: true } });
      if (!skill) continue;

      const id = `SF-FICHA-${ficha.skillCode}`;
      await db.eduSkillGuide.upsert({
        where: { id },
        create: {
          id,
          skillId: skill.id,
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
          recommendedTypes: ficha.recommendedTypes ?? [],
          ageNotes: ficha.ageNotes ?? null,
          networkId: null,
          source: ficha.source ?? "SPEAKFLOW",
          status: ficha.status ?? "DRAFT",
        },
        update: {
          whatStudentDoes: ficha.whatStudentDoes,
          commonErrors: ficha.commonErrors ?? [],
          recommendedTypes: ficha.recommendedTypes ?? [],
          ageNotes: ficha.ageNotes ?? null,
          status: ficha.status ?? "DRAFT",
        },
      });
      n++;
    }
  }
  console.log(`  [fichas] ${n} fichas importadas.`);
}

// ── Processar uma base ────────────────────────────────────────────────────────
async function processBase(envVar) {
  const db = tenantDb(envVar);
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(${LOCK_ID})`;
    console.log(`  [conteudo] Processando ${envVar}...`);
    await importPrerequisitos(db);
    await importFichas(db);
    await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID})`;
  } catch (err) {
    console.error(`  [conteudo] Erro em ${envVar}:`, err.message);
    try { await db.$executeRaw`SELECT pg_advisory_unlock(${LOCK_ID})`; } catch {}
    throw err;
  } finally {
    await db.$disconnect();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const vars = listTenantEnvVars();
  if (vars.length === 0) {
    console.log("[conteudo] Nenhuma base tenant configurada. Pulando.");
    return;
  }
  console.log(`[conteudo] ${vars.length} base(s) encontrada(s).`);
  for (const v of vars) {
    await processBase(v);
  }
  console.log("[conteudo] Concluido.");
}

main().catch(err => { console.error(err); process.exit(1); });
