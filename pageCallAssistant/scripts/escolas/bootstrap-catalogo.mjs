#!/usr/bin/env node
/**
 * scripts/escolas/bootstrap-catalogo.mjs
 *
 * Roda ANTES do migrate-all no preDeployCommand.
 * Idempotente: garante que TenantDatabase existe no catálogo para cada
 * variável ESCOLAS_DB_<KEY>_URL presente no ambiente.
 * Nunca grava a URL — só o nome da variável de ambiente.
 *
 * Convenção de nomenclatura:
 *   ESCOLAS_DB_01_URL  → key "db01", isShared = true
 *   ESCOLAS_DB_02_URL  → key "db02", isShared = false
 *   ESCOLAS_DB_<X>_URL → key = X em minúsculas, isShared determinado por presença de "01" no nome
 */
import { PrismaClient } from "@prisma/escolas-catalogo";

const catalog = new PrismaClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

async function main() {
  const knownDbs = [];

  // Varrer todas as variáveis ESCOLAS_DB_*_URL
  for (const [varName, value] of Object.entries(process.env)) {
    const m = varName.match(/^ESCOLAS_DB_(.+)_URL$/);
    if (!m || !value) continue;
    const rawKey = m[1];
    const key = rawKey.toLowerCase().replace(/_/g, "");   // "01" → "db01" handled below
    const dbKey = key.startsWith("db") ? key : `db${key}`;
    const isShared = dbKey === "db01";

    knownDbs.push({ key: dbKey, envVar: varName, isShared });
  }

  if (knownDbs.length === 0) {
    console.warn("[bootstrap] Nenhuma variável ESCOLAS_DB_*_URL encontrada. Verifique as variáveis de ambiente.");
    return;
  }

  for (const db of knownDbs) {
    await catalog.tenantDatabase.upsert({
      where: { key: db.key },
      create: {
        key: db.key,
        envVar: db.envVar,
        region: process.env.RAILWAY_REGION ?? "railway-us",
        isShared: db.isShared,
        isActive: true,
      },
      update: {
        envVar: db.envVar,
        isActive: true,
      },
    });
    console.log(`[bootstrap] TenantDatabase upserted: ${db.key} (${db.envVar}, shared=${db.isShared})`);
  }

  console.log(`[bootstrap] Catálogo iniciado com ${knownDbs.length} base(s).`);
}

main()
  .catch((e) => { console.error("[bootstrap]", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
