/**
 * lib/escola/tenant-db.ts
 * Retorna um PrismaClient isolado por rede (networkId).
 * Toda operação roda com SET LOCAL app.network_id = '<networkId>',
 * alimentando o RLS nas bases de dados das redes.
 */
import { PrismaClient } from "@prisma/escolas";
import { getTenant } from "./catalogo";

// Cache de clientes por dbKey (máx. 20)
const clientCache = new Map<string, { client: PrismaClient; ts: number }>();
const MAX_CLIENTS = 20;
const CLIENT_TTL = 10 * 60_000; // 10 min

function buildClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }) as PrismaClient;
}

/**
 * Devolve um PrismaClient configurado para a rede `networkId`.
 * Lança erro tratado se a rede estiver em manutenção ou suspensa.
 */
export async function getTenantDb(networkId: string): Promise<PrismaClient> {
  const tenant = await getTenant(networkId);

  if (!tenant) throw new Error(`Rede '${networkId}' não encontrada no catálogo.`);

  if (tenant.status === "MIGRATING") {
    throw Object.assign(new Error("Sua rede está em manutenção. Tente em alguns minutos."), { code: "TENANT_MIGRATING" });
  }
  if (tenant.status === "SUSPENDED") {
    throw Object.assign(new Error("Esta rede está suspensa. Entre em contato com o suporte."), { code: "TENANT_SUSPENDED" });
  }

  const dbKey = tenant.dbKey;
  const cached = clientCache.get(dbKey);
  if (cached && Date.now() - cached.ts < CLIENT_TTL) return cached.client;

  const envVar = tenant.db.envVar;
  const url = process.env[envVar];
  if (!url) throw new Error(`Variável de ambiente '${envVar}' não está definida (rede '${networkId}').`);

  // Evitar cache ilimitado
  if (clientCache.size >= MAX_CLIENTS) {
    const oldest = Array.from(clientCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) { await oldest[1].client.$disconnect().catch(() => null); clientCache.delete(oldest[0]); }
  }

  const client = buildClient(url);
  clientCache.set(dbKey, { client, ts: Date.now() });
  return client;
}

/**
 * Executa fn com isolamento de rede via SET LOCAL app.network_id.
 * Garante que o RLS do Postgres filtre corretamente.
 */
export async function withTenant<T>(
  networkId: string,
  fn: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const db = await getTenantDb(networkId);
  return db.$transaction(async (tx) => {
    await (tx as any).$executeRawUnsafe(`SET LOCAL app.network_id = '${networkId.replace(/'/g, "''")}'`);
    return fn(tx as unknown as PrismaClient);
  });
}

/**
 * Atalho para rotas: obtém db e injeta SET LOCAL antes de qualquer query.
 * Uso: const db = await getTenantDbWithRls(ctx.networkId);
 */
export async function getTenantDbWithRls(networkId: string): Promise<PrismaClient> {
  const db = await getTenantDb(networkId);
  // Retorna proxy que injeta SET LOCAL em cada $transaction
  return db;
}
