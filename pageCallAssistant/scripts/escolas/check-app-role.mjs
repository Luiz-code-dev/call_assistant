#!/usr/bin/env node
/**
 * scripts/escolas/check-app-role.mjs
 *
 * Verifica que a aplicação conecta às bases tenant como escolas_app
 * (NOSUPERUSER, NOBYPASSRLS). Se conectar como superusuário, o RLS
 * não será respeitado e o servidor não sobe.
 *
 * Executado em scripts/start.sh APÓS migrate-all.mjs.
 * Se ESCOLAS_APP_DB_PASSWORD não estiver definido, apenas emite aviso
 * (compatibilidade com ambientes de desenvolvimento).
 */
import { PrismaClient as CatalogClient } from "@prisma/escolas-catalogo";
import { PrismaClient } from "@prisma/escolas";

const appPwd = process.env.ESCOLAS_APP_DB_PASSWORD;

if (!appPwd) {
  console.warn("[check-role] AVISO: ESCOLAS_APP_DB_PASSWORD não definido.");
  console.warn("[check-role] Conectando como superusuário — RLS NÃO está sendo aplicado.");
  console.warn("[check-role] Defina ESCOLAS_APP_DB_PASSWORD em produção.");
  process.exit(0);
}

function buildAppUrl(superuserUrl) {
  try {
    const u = new URL(superuserUrl);
    u.username = "escolas_app";
    u.password = encodeURIComponent(appPwd);
    return u.toString();
  } catch {
    return superuserUrl;
  }
}

function listTenantEnvVars() {
  const vars = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/^ESCOLAS_DB_\d+_URL$/.test(k) && v) vars.push({ k, v });
  }
  if (vars.length === 0 && process.env.ESCOLAS_DB_URL)
    vars.push({ k: "ESCOLAS_DB_URL", v: process.env.ESCOLAS_DB_URL });
  return vars;
}

async function checkBase(envVar, superuserUrl) {
  const appUrl = buildAppUrl(superuserUrl);
  const db = new PrismaClient({ datasources: { db: { url: appUrl } } });
  try {
    const rows = await db.$queryRaw`
      SELECT current_user AS u, rolsuper, rolbypassrls
      FROM pg_roles WHERE rolname = current_user
    `;
    const row = rows[0];
    console.log(`[check-role] ${envVar}: usuario=${row.u} super=${row.rolsuper} bypassrls=${row.rolbypassrls}`);
    if (row.rolsuper || row.rolbypassrls) {
      console.error(`[check-role] ERRO FATAL: ${envVar} conecta como superusuário ou com BYPASSRLS.`);
      console.error("[check-role] O RLS não está sendo aplicado. Corrija ESCOLAS_APP_DB_PASSWORD e o papel escolas_app.");
      process.exit(1);
    }
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const vars = listTenantEnvVars();
  if (vars.length === 0) {
    console.log("[check-role] Nenhuma base tenant configurada. Pulando verificação.");
    return;
  }
  for (const { k, v } of vars) {
    await checkBase(k, v);
  }
  console.log("[check-role] Verificação concluída: todas as bases usam escolas_app sem BYPASSRLS.");
}

main().catch(err => { console.error("[check-role] Erro:", err.message); process.exit(1); });
