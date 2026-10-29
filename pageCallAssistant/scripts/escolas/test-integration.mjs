#!/usr/bin/env node
/**
 * scripts/escolas/test-integration.mjs
 *
 * Testes de integração do SpeakFlow Escolas com 3 Postgres reais.
 * Roda o preDeployCommand completo (migrações + seed) e verifica isolamento.
 *
 * Pré-requisito: docker compose -f docker-compose.test.yml up -d
 *
 * Variáveis esperadas no ambiente (ou definidas abaixo para localhost):
 *   ESCOLAS_CATALOG_URL  ESCOLAS_DB_01_URL  ESCOLAS_DB_02_URL
 */
import { execSync } from "child_process";
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";
import { PrismaClient as TenantsClient } from "@prisma/escolas";
import assert from "assert";

// Senha lida de variável de ambiente — nunca hardcode aqui.
// Defina ESCOLAS_TEST_PG_PASS no ambiente ou em .env.test (não commitado).
const PG_PASS = process.env.ESCOLAS_TEST_PG_PASS;
if (!PG_PASS && !process.env.ESCOLAS_CATALOG_URL) {
  console.error("Defina ESCOLAS_TEST_PG_PASS ou ESCOLAS_CATALOG_URL antes de rodar.");
  process.exit(1);
}
const CATALOG_URL = process.env.ESCOLAS_CATALOG_URL ??
  `postgresql://escolas:${PG_PASS}@localhost:5433/escolas_catalogo`;
const DB01_URL = process.env.ESCOLAS_DB_01_URL ??
  `postgresql://escolas:${PG_PASS}@localhost:5434/escolas_dados_01`;
const DB02_URL = process.env.ESCOLAS_DB_02_URL ??
  `postgresql://escolas:${PG_PASS}@localhost:5435/escolas_dados_02`;

// Injeta nas variáveis do processo para os scripts npm usarem
process.env.ESCOLAS_CATALOG_URL = CATALOG_URL;
process.env.ESCOLAS_DB_01_URL = DB01_URL;
process.env.ESCOLAS_DB_02_URL = DB02_URL;
process.env.ESCOLAS_SEED_DEMO = "true";

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  [OK] ${label}`);
  passed++;
}
function fail(label, err) {
  console.error(`  [FAIL] ${label}: ${err?.message ?? err}`);
  failed++;
}

async function run(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (e) {
    fail(label, e);
  }
}

console.log("\n=== SpeakFlow Escolas — testes de integração ===\n");

// ── 1. PreDeploy: migrações + bootstrap + seed ────────────────────────────────
console.log("[ Etapa 1 ] PreDeploy completo");
try {
  execSync("npx prisma@5 migrate deploy", { stdio: "pipe" });
  ok("prisma migrate deploy (SpeakFlow AI)");
} catch (e) { fail("prisma migrate deploy (SpeakFlow AI)", e); }

try {
  execSync("npx prisma@5 migrate deploy --schema prisma/escolas-catalogo/schema.prisma", { stdio: "pipe" });
  ok("prisma migrate deploy (catalogo)");
} catch (e) { fail("prisma migrate deploy (catalogo)", e); }

try {
  execSync("node scripts/escolas/bootstrap-catalogo.mjs", { stdio: "inherit" });
  ok("bootstrap-catalogo");
} catch (e) { fail("bootstrap-catalogo", e); }

try {
  execSync("node scripts/escolas/migrate-all.mjs", { stdio: "inherit" });
  ok("migrate-all (db01 + db02)");
} catch (e) { fail("migrate-all", e); }

try {
  execSync("node scripts/escolas/seed-demo.mjs", { stdio: "inherit" });
  ok("seed-demo");
} catch (e) { fail("seed-demo", e); }

// ── 2. Verificar catálogo ─────────────────────────────────────────────────────
console.log("\n[ Etapa 2 ] Catálogo");
const catalog = new CatalogClient({ datasources: { db: { url: CATALOG_URL } } });

await run("TenantDatabase db01 e db02 cadastrados", async () => {
  const dbs = await catalog.tenantDatabase.findMany();
  const keys = dbs.map(d => d.key);
  assert(keys.includes("db01"), "db01 ausente");
  assert(keys.includes("db02"), "db02 ausente");
});

let tenantA, tenantB;
await run("Rede Demo A em db01, Rede Demo B em db02", async () => {
  const tenants = await catalog.tenant.findMany();
  tenantA = tenants.find(t => t.dbKey === "db01" && t.name.includes("Demonstração"));
  tenantB = tenants.find(t => t.dbKey === "db02" && t.name.includes("Demonstração"));
  assert(tenantA, "Rede Demo A não encontrada em db01");
  assert(tenantB, "Rede Demo B não encontrada em db02");
});

await catalog.$disconnect();

// ── 3. Isolamento de rede ─────────────────────────────────────────────────────
console.log("\n[ Etapa 3 ] Isolamento");
const db01 = new TenantsClient({ datasources: { db: { url: DB01_URL } } });
const db02 = new TenantsClient({ datasources: { db: { url: DB02_URL } } });

if (tenantA && tenantB) {
  await run("Rede A: alunos existem em db01", async () => {
    const count = await db01.eduStudent.count({ where: { networkId: tenantA.id } });
    assert(count > 0, `Rede A tem ${count} alunos`);
  });

  await run("Rede B: alunos existem em db02", async () => {
    const count = await db02.eduStudent.count({ where: { networkId: tenantB.id } });
    assert(count > 0, `Rede B tem ${count} alunos`);
  });

  await run("Rede A não vê alunos da Rede B no db01", async () => {
    const count = await db01.eduStudent.count({ where: { networkId: tenantB.id } });
    assert(count === 0, `db01 tem ${count} aluno(s) da Rede B (vazamento!)`);
  });

  await run("Rede B não vê alunos da Rede A no db02", async () => {
    const count = await db02.eduStudent.count({ where: { networkId: tenantA.id } });
    assert(count === 0, `db02 tem ${count} aluno(s) da Rede A (vazamento!)`);
  });

  await run("RLS: consulta sem app.network_id volta vazia (db01)", async () => {
    // Consulta raw sem SET LOCAL — RLS deve bloquear todas as linhas
    const rows = await db01.$queryRaw`SELECT id FROM "EduStudent" LIMIT 1`;
    assert(Array.isArray(rows) && rows.length === 0,
      `RLS não bloqueou: ${rows.length} linha(s) retornadas sem contexto`);
  });
}

// ── 4. BNCC ───────────────────────────────────────────────────────────────────
console.log("\n[ Etapa 4 ] BNCC");
await run("db01 tem 1.304 habilidades BNCC", async () => {
  const count = await db01.eduSkill.count({ where: { networkId: null } });
  assert(count >= 1304, `Esperado >= 1304, encontrado ${count}`);
});

await run("db02 tem 1.304 habilidades BNCC", async () => {
  const count = await db02.eduSkill.count({ where: { networkId: null } });
  assert(count >= 1304, `Esperado >= 1304, encontrado ${count}`);
});

await db01.$disconnect();
await db02.$disconnect();

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===\n`);
if (failed > 0) process.exit(1);
