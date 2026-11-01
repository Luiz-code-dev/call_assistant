#!/usr/bin/env node
/**
 * scripts/escolas/test-db-setup.mjs
 *
 * Cria os bancos e o role escolas_app no Postgres de teste (porta 55432).
 * Executar UMA VEZ antes de sh scripts/start.sh.
 *
 * Uso:
 *   export ESCOLAS_TEST_PG_PASS="postgres"   # superusuário do docker
 *   export ESCOLAS_APP_DB_PASSWORD="@#%'/!"  # senha com caracteres especiais
 *   node scripts/escolas/test-db-setup.mjs
 */
import pg from "pg";

const SU_URL = `postgresql://postgres:${encodeURIComponent(process.env.ESCOLAS_TEST_PG_PASS ?? "postgres")}@localhost:55432/postgres`;

async function run(sql, url = SU_URL) {
  const client = new pg.Client(url);
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
}

async function dbExists(name) {
  const client = new pg.Client(SU_URL);
  await client.connect();
  try {
    const r = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]);
    return r.rowCount > 0;
  } finally { await client.end(); }
}

async function main() {
  const appPwd = process.env.ESCOLAS_APP_DB_PASSWORD;
  if (!appPwd) { console.error("ESCOLAS_APP_DB_PASSWORD ausente"); process.exit(1); }

  for (const db of ["ai", "catalogo", "db01", "db02"]) {
    if (await dbExists(db)) {
      console.log(`  banco '${db}' já existe.`);
    } else {
      await run(`CREATE DATABASE ${db}`);
      console.log(`  banco '${db}' criado.`);
    }
  }

  // Role escolas_app (idempotente)
  const escaped = pg.escapeLiteral(appPwd);
  for (const db of ["ai", "db01", "db02"]) {
    const url = `postgresql://postgres:${encodeURIComponent(process.env.ESCOLAS_TEST_PG_PASS ?? "postgres")}@localhost:55432/${db}`;
    const client = new pg.Client(url);
    await client.connect();
    try {
      await client.query(`
        DO $$BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='escolas_app') THEN
            CREATE ROLE escolas_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD ${escaped};
          ELSE
            ALTER ROLE escolas_app WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD ${escaped};
          END IF;
        END$$;
      `);
      console.log(`  escolas_app em '${db}' OK`);
    } finally { await client.end(); }
  }
  console.log("\nSetup concluido. Rode: sh scripts/start.sh");
}

main().catch(e => { console.error(e.message); process.exit(1); });
