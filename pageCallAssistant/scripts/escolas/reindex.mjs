#!/usr/bin/env node
/**
 * scripts/escolas/reindex.mjs  —  npm run escolas:reindex
 *
 * Reconstrói os índices do catálogo (LoginIndex e CodeIndex) a partir das
 * bases de cada rede ativa. Idempotente (upsert). Roda à noite via cron e
 * pode ser executado manualmente.
 */
import { PrismaClient as CatalogClient } from "../../prisma/escolas-catalogo/generated/index.js";

let PrismaClient;
try {
  ({ PrismaClient } = await import("../../prisma/escolas/generated/index.js"));
} catch {
  throw new Error("Cliente escolas não gerado. Execute: npm run db:generate:escolas");
}

const catalog = new CatalogClient({
  datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } },
});

async function reindexDb(tenantId, db) {
  // STAFF: todos os EduUser com membership ativa
  const users = await db.eduUser.findMany({ where: { isActive: true } });
  for (const u of users) {
    await catalog.loginIndex.upsert({
      where: { kind_identifier_tenantId: { kind: "STAFF", identifier: u.email.toLowerCase(), tenantId } },
      create: { kind: "STAFF", identifier: u.email.toLowerCase(), tenantId },
      update: {},
    });
  }

  // GUARDIAN: todos os EduGuardian com email
  const guardians = await db.eduGuardian.findMany({ where: { isActive: true } });
  for (const g of guardians) {
    if (!g.email) continue;
    await catalog.loginIndex.upsert({
      where: { kind_identifier_tenantId: { kind: "GUARDIAN", identifier: g.email.toLowerCase(), tenantId } },
      create: { kind: "GUARDIAN", identifier: g.email.toLowerCase(), tenantId },
      update: {},
    });
  }

  // CLASS_ACCESS: código de acesso das turmas
  const classes = await db.eduClass.findMany({ where: { isActive: true }, select: { accessCode: true } });
  for (const c of classes) {
    if (!c.accessCode) continue;
    await catalog.codeIndex.upsert({
      where: { code: c.accessCode.toUpperCase() },
      create: { code: c.accessCode.toUpperCase(), kind: "CLASS_ACCESS", tenantId },
      update: { tenantId },
    });
  }

  // CLASS_SESSION: sessões de aula ativas
  const sessions = await db.eduClassSession.findMany({
    where: { expiresAt: { gt: new Date() } },
    select: { code: true, expiresAt: true },
  });
  for (const s of sessions) {
    await catalog.codeIndex.upsert({
      where: { code: s.code.toUpperCase() },
      create: { code: s.code.toUpperCase(), kind: "CLASS_SESSION", tenantId, expiresAt: s.expiresAt },
      update: { expiresAt: s.expiresAt, tenantId },
    });
  }

  // FAMILY_CODE
  const familyCodes = await db.eduFamilyCode.findMany({ select: { code: true, expiresAt: true } }).catch(() => []);
  for (const fc of familyCodes) {
    await catalog.codeIndex.upsert({
      where: { code: fc.code.toUpperCase() },
      create: { code: fc.code.toUpperCase(), kind: "FAMILY_CODE", tenantId, expiresAt: fc.expiresAt ?? null },
      update: { expiresAt: fc.expiresAt ?? null, tenantId },
    });
  }
}

async function main() {
  const tenants = await catalog.tenant.findMany({ where: { status: "ACTIVE" } });
  const dbMetas = await catalog.tenantDatabase.findMany({ where: { isActive: true } });
  const dbMap = Object.fromEntries(dbMetas.map((d) => [d.key, d]));

  for (const tenant of tenants) {
    const meta = dbMap[tenant.dbKey];
    if (!meta) { console.warn(`[reindex] Sem TenantDatabase para ${tenant.id}`); continue; }
    const url = process.env[meta.envVar];
    if (!url) { console.warn(`[reindex] Variável ${meta.envVar} não definida`); continue; }
    console.log(`[reindex] ${tenant.name} (${meta.key})`);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await reindexDb(tenant.id, db);
    } finally {
      await db.$disconnect();
    }
  }
  console.log("[reindex] Concluído.");
}

main()
  .catch((e) => { console.error("[reindex] Erro:", e.message); process.exit(1); })
  .finally(() => catalog.$disconnect());
