/**
 * lib/escola/catalogo.ts
 * Acesso ao banco de catálogo do SpeakFlow Escolas.
 * Roteamento de redes, índices de login e de código.
 */
import { PrismaClient } from "@prisma/escolas-catalogo";

let _catalog: PrismaClient | null = null;

function getCatalogDb(): PrismaClient {
  if (_catalog) return _catalog;
  if (!process.env.ESCOLAS_CATALOG_URL) {
    throw new Error("ESCOLAS_CATALOG_URL não está definida");
  }
  _catalog = new PrismaClient({ datasources: { db: { url: process.env.ESCOLAS_CATALOG_URL } } });
  return _catalog;
}

/** Acesso direto ao cliente do catálogo (para uso em Server Components). */
export const catalogDb = { get tenant() { return getCatalogDb().tenant; }, get tenantDatabase() { return getCatalogDb().tenantDatabase; }, get loginIndex() { return getCatalogDb().loginIndex; }, get codeIndex() { return getCatalogDb().codeIndex; }, get platformAdmin() { return getCatalogDb().platformAdmin; } };

// Cache de tenant por networkId (60 s)
const tenantCache = new Map<string, { data: import("@prisma/escolas-catalogo").Tenant & { db: import("@prisma/escolas-catalogo").TenantDatabase }; ts: number }>();
const CACHE_TTL = 60_000;

export async function getTenant(networkId: string) {
  const cached = tenantCache.get(networkId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const db = getCatalogDb();
  const tenant = await db.tenant.findUnique({
    where: { id: networkId },
    include: { db: true },
  });
  if (!tenant) return null;
  tenantCache.set(networkId, { data: tenant, ts: Date.now() });
  return tenant;
}

export function invalidateTenantCache(networkId: string) {
  tenantCache.delete(networkId);
}

export async function findTenantsByLogin(kind: import("@prisma/escolas-catalogo").LoginKind, identifier: string) {
  const db = getCatalogDb();
  const indexes = await db.loginIndex.findMany({
    where: { kind, identifier: identifier.toLowerCase().trim() },
  });
  return indexes.map(i => i.tenantId);
}

export async function findTenantByCode(code: string) {
  const db = getCatalogDb();
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  const idx = await db.codeIndex.findUnique({ where: { code: normalized } });
  if (!idx) return null;
  if (idx.expiresAt && idx.expiresAt < new Date()) return null;
  return idx.tenantId;
}

export async function registerLogin(
  kind: import("@prisma/escolas-catalogo").LoginKind,
  identifier: string,
  tenantId: string,
) {
  const db = getCatalogDb();
  const norm = identifier.toLowerCase().trim();
  await db.loginIndex.upsert({
    where: { kind_identifier_tenantId: { kind, identifier: norm, tenantId } },
    create: { kind, identifier: norm, tenantId },
    update: {},
  });
}

export async function unregisterLogin(
  kind: import("@prisma/escolas-catalogo").LoginKind,
  identifier: string,
  tenantId: string,
) {
  const db = getCatalogDb();
  const norm = identifier.toLowerCase().trim();
  await db.loginIndex.deleteMany({ where: { kind, identifier: norm, tenantId } }).catch(() => null);
}

export async function registerCode(
  kind: import("@prisma/escolas-catalogo").CodeKind,
  code: string,
  tenantId: string,
  expiresAt?: Date,
) {
  const db = getCatalogDb();
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  await db.codeIndex.upsert({
    where: { code: normalized },
    create: { code: normalized, kind, tenantId, expiresAt: expiresAt ?? null },
    update: { kind, tenantId, expiresAt: expiresAt ?? null },
  });
}

export async function unregisterCode(code: string) {
  const db = getCatalogDb();
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  await db.codeIndex.delete({ where: { code: normalized } }).catch(() => null);
}

export async function findPlatformAdmin(email: string) {
  const db = getCatalogDb();
  return db.platformAdmin.findUnique({ where: { email: email.toLowerCase().trim() } });
}

/** Registra token de convite no catálogo para permitir lookup sem contexto. */
export async function registerInvite(kind: "STAFF_INVITE" | "FAMILY_INVITE", tokenHash: string, tenantId: string, expiresAt: Date) {
  const db = getCatalogDb();
  await db.codeIndex.upsert({
    where: { code: tokenHash },
    create: { code: tokenHash, kind, tenantId, expiresAt },
    update: { kind, tenantId, expiresAt },
  });
}

/** Remove convite do catálogo (após aceite ou expiração). */
export async function unregisterInvite(tokenHash: string) {
  const db = getCatalogDb();
  await db.codeIndex.delete({ where: { code: tokenHash } }).catch(() => null);
}

/** Resolve rede pelo hash do token de convite. */
export async function findTenantByInviteHash(tokenHash: string) {
  const db = getCatalogDb();
  return db.codeIndex.findUnique({ where: { code: tokenHash } });
}
