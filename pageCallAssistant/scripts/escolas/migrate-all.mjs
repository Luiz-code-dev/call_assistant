#!/usr/bin/env node
/**
 * scripts/escolas/migrate-all.mjs
 *
 * Lê o catálogo e roda `prisma migrate deploy` em cada TenantDatabase ativo.
 * Idempotente e seguro para múltiplas réplicas: usa pg_advisory_lock no catálogo
 * para que só um processo migre por vez.
 *
 * Uso: node scripts/escolas/migrate-all.mjs
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/escolas-catalogo";

// Lock ID arbitrário e estável para migrate-all (escolher número que não colida com bncc-import)
const MIGRATE_LOCK_ID = 7891234561n;

const catalog = new PrismaClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

async function main() {
  // Adquire lock exclusivo na sessão: outras réplicas aguardam até este processo terminar.
  await catalog.$executeRaw`SELECT pg_advisory_lock(${MIGRATE_LOCK_ID})`;
  console.log("[migrate-all] Lock adquirido.");

  try {
    const dbs = await catalog.tenantDatabase.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    });

    if (dbs.length === 0) {
      console.log("[migrate-all] Nenhuma base ativa encontrada no catálogo.");
      return;
    }

    console.log(`[migrate-all] ${dbs.length} base(s) ativa(s) encontrada(s).`);

    for (const db of dbs) {
      const url = process.env[db.envVar];
      if (!url) {
        console.error(`[migrate-all] ERRO: variável '${db.envVar}' não definida (base: ${db.key})`);
        process.exit(1);
      }

      console.log(`[migrate-all] Migrando base: ${db.key} (${db.envVar}) ...`);
      try {
        // Usa 'prisma' (instalado na imagem) em vez de 'npx prisma@5' (requer download).
        execSync(
          `prisma migrate deploy --schema prisma/escolas/schema.prisma`,
          {
            env: { ...process.env, ESCOLAS_DB_URL: url },
            stdio: "inherit",
          }
        );
        console.log(`[migrate-all] OK: ${db.key}`);
      } catch (err) {
        console.error(`[migrate-all] FALHOU na base: ${db.key} (${db.envVar})`);
        console.error(err.message);
        process.exit(1);
      }
    }

    console.log("[migrate-all] Todas as bases migradas com sucesso.");
  } finally {
    // Libera o lock mesmo em caso de erro (a conexão também o libera ao fechar)
    await catalog.$executeRaw`SELECT pg_advisory_unlock(${MIGRATE_LOCK_ID})`.catch(() => null);
  }
}

main()
  .catch((err) => {
    console.error("[migrate-all] Erro fatal:", err);
    process.exit(1);
  })
  .finally(() => catalog.$disconnect());
