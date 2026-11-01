#!/usr/bin/env node
/**
 * scripts/escolas/migrate-all.mjs
 *
 * Lê o catálogo e roda `prisma migrate deploy` em cada TenantDatabase ativo.
 * Depois, cria (de forma idempotente) o papel escolas_app com os privilégios
 * mínimos necessários para que a aplicação conecte sem BYPASSRLS.
 *
 * Idempotente e seguro para múltiplas réplicas: usa pg_advisory_lock no catálogo.
 */
import { execSync } from "child_process";
import pkg from "pg";
const { Client } = pkg;
import { PrismaClient } from "@prisma/escolas-catalogo";

const MIGRATE_LOCK_ID = 7891234561n;

const catalog = new PrismaClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

/**
 * Cria o papel escolas_app de forma idempotente e concede os privilégios mínimos.
 * A senha vem de ESCOLAS_APP_DB_PASSWORD.
 * Se a variável não estiver definida ou qualquer passo falhar, lança erro fatal.
 * Nunca imprime a senha nem a URL com credenciais no log.
 */
async function provisionAppRole(superuserUrl, dbKey) {
  const appPwd = process.env.ESCOLAS_APP_DB_PASSWORD;
  if (!appPwd) {
    throw new Error(`[migrate-all] ESCOLAS_APP_DB_PASSWORD não definido. Base: ${dbKey}. Defina a variável antes de iniciar.`);
  }

  const pg = new Client({ connectionString: superuserUrl });
  let step = "conectar";
  try {
    await pg.connect();

    // Cria o papel se não existir (idempotente)
    step = "CREATE ROLE";
    await pg.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'escolas_app') THEN
          CREATE ROLE escolas_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
        END IF;
      END $$;
    `);

    // Atualiza a senha — usa escapeLiteral para evitar injeção, sem parâmetro $1
    step = "ALTER ROLE PASSWORD";
    await pg.query(`ALTER ROLE escolas_app WITH LOGIN PASSWORD ${pg.escapeLiteral(appPwd)}`);

    // CONNECT + USAGE no schema public
    step = "GRANT CONNECT";
    const dbName = new URL(superuserUrl.replace(/^postgres(?:ql)?:\/\//, "http://")).pathname.slice(1).split("?")[0];
    await pg.query(`GRANT CONNECT ON DATABASE "${dbName}" TO escolas_app`);

    step = "GRANT USAGE SCHEMA";
    await pg.query(`GRANT USAGE ON SCHEMA public TO escolas_app`);

    // DML em todas as tabelas existentes
    step = "GRANT DML TABLES";
    await pg.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO escolas_app`);

    // Sequências
    step = "GRANT SEQUENCES";
    await pg.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO escolas_app`);

    // Tabelas futuras (criadas em migrations posteriores)
    step = "ALTER DEFAULT PRIVILEGES TABLES";
    await pg.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO escolas_app`);

    step = "ALTER DEFAULT PRIVILEGES SEQUENCES";
    await pg.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO escolas_app`);

    console.log(`[migrate-all] escolas_app provisionado em '${dbKey}' (base: ${dbName}).`);
  } catch (err) {
    // Nunca imprima a senha nem a URL com credenciais
    throw new Error(`[migrate-all] Falha ao provisionar escolas_app em '${dbKey}' (passo: ${step}): ${err.message}`);
  } finally {
    await pg.end().catch(() => null);
  }
}

async function main() {
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
        execSync(
          `prisma migrate deploy --schema prisma/escolas/schema.prisma`,
          { env: { ...process.env, ESCOLAS_DB_URL: url }, stdio: "inherit" }
        );
        console.log(`[migrate-all] OK: ${db.key}`);
      } catch (err) {
        console.error(`[migrate-all] FALHOU na base: ${db.key} (${db.envVar})`);
        console.error(err.message);
        process.exit(1);
      }

      // Provisiona escolas_app com o superusuário (URL original) — falha fatal
      await provisionAppRole(url, db.key);
    }

    console.log("[migrate-all] Todas as bases migradas com sucesso.");
  } finally {
    await catalog.$executeRaw`SELECT pg_advisory_unlock(${MIGRATE_LOCK_ID})`.catch(() => null);
  }
}

main()
  .catch((err) => { console.error("[migrate-all] Erro fatal:", err); process.exit(1); })
  .finally(() => catalog.$disconnect());
