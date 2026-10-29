#!/usr/bin/env node
/**
 * scripts/escolas/migrate-all.mjs
 *
 * Lê o catálogo e roda `prisma migrate deploy` em cada TenantDatabase ativo.
 * Para no primeiro erro e mostra qual base falhou.
 *
 * Uso: node scripts/escolas/migrate-all.mjs
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/escolas-catalogo";

const catalog = new PrismaClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

async function main() {
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
      console.error(`[migrate-all] ERRO: variável de ambiente '${db.envVar}' não definida (base: ${db.key})`);
      process.exit(1);
    }

    console.log(`[migrate-all] Migrando base: ${db.key} (${db.envVar}) ...`);
    try {
      execSync(
        `npx prisma@5 migrate deploy --schema prisma/escolas/schema.prisma`,
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
}

main()
  .catch((err) => {
    console.error("[migrate-all] Erro fatal:", err);
    process.exit(1);
  })
  .finally(() => catalog.$disconnect());
