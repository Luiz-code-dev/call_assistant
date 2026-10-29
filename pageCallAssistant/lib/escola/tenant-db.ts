/**
 * lib/escola/tenant-db.ts
 * Retorna um PrismaClient isolado por rede (networkId).
 *
 * ARQUITETURA:
 *   - clientCache: um PrismaClient base por dbKey (shared entre redes do mesmo banco)
 *   - extendedCache: um cliente estendido por networkId (injeta SET LOCAL em cada query)
 *   - Cada operação no cliente estendido roda num $transaction com:
 *       SET LOCAL app.network_id = '<networkId>'
 *     alimentando o RLS no Postgres.
 */
import { PrismaClient } from "@prisma/escolas";
import { getTenant } from "./catalogo";

// ── Cache base por dbKey ─────────────────────────────────────────────────────
const baseCache = new Map<string, { client: PrismaClient; ts: number }>();
// ── Cache estendido por networkId ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extendedCache = new Map<string, { client: any; ts: number }>();

const MAX_CLIENTS = 20;
const CLIENT_TTL = 10 * 60_000; // 10 min

function buildBaseClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * buildExtendedClient — adiciona extensão que injeta SET LOCAL antes de cada query.
 * Cada operação roda assim:
 *   BEGIN
 *     SET LOCAL app.network_id = '<networkId>';
 *     <query original>
 *   COMMIT
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildExtendedClient(base: PrismaClient, networkId: string): any {
  const safeNid = networkId.replace(/'/g, "''");
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: { args: any; query: (a: any) => Promise<any> }) {
          // Use the batch form so both statements share the same connection:
          // [0] SET LOCAL app.network_id — sets the RLS variable for this connection
          // [1] query(args)              — the actual model operation sees the variable
          // The array form of $transaction guarantees a single implicit transaction
          // on one connection, unlike the callback form where query(args) runs on
          // the outer client (different connection).
          const [, result] = await (base as any).$transaction([
            base.$executeRawUnsafe(`SELECT set_config('app.network_id', '${safeNid}', true)`),
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

/**
 * Devolve um cliente Prisma com RLS ativo para a rede `networkId`.
 * Toda operação injeta automaticamente SET LOCAL app.network_id.
 * Lança erro tratado se a rede estiver em manutenção ou suspensa.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTenantDb(networkId: string): Promise<any> {
  const tenant = await getTenant(networkId);

  if (!tenant) throw new Error(`Rede '${networkId}' não encontrada no catálogo.`);

  if (tenant.status === "MIGRATING") {
    throw Object.assign(
      new Error("Sua rede está em manutenção. Tente em alguns minutos."),
      { code: "TENANT_MIGRATING" }
    );
  }
  if (tenant.status === "SUSPENDED") {
    throw Object.assign(
      new Error("Esta rede está suspensa. Entre em contato com o suporte."),
      { code: "TENANT_SUSPENDED" }
    );
  }

  // Verifica cache do cliente estendido por networkId
  const cachedExt = extendedCache.get(networkId);
  if (cachedExt && Date.now() - cachedExt.ts < CLIENT_TTL) return cachedExt.client;

  // Verifica (ou cria) cliente base por dbKey
  const dbKey = tenant.dbKey;
  let base: PrismaClient;
  const cachedBase = baseCache.get(dbKey);
  if (cachedBase && Date.now() - cachedBase.ts < CLIENT_TTL) {
    base = cachedBase.client;
  } else {
    const envVar = tenant.db.envVar;
    const url = process.env[envVar];
    if (!url) throw new Error(`Variável de ambiente '${envVar}' não está definida (rede '${networkId}').`);

    // Evitar cache ilimitado
    if (baseCache.size >= MAX_CLIENTS) {
      const oldest = Array.from(baseCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) { await oldest[1].client.$disconnect().catch(() => {}); baseCache.delete(oldest[0]); }
    }
    base = buildBaseClient(url);
    baseCache.set(dbKey, { client: base, ts: Date.now() });
  }

  // Evitar cache ilimitado de estendidos
  if (extendedCache.size >= MAX_CLIENTS) {
    const oldest = Array.from(extendedCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) extendedCache.delete(oldest[0]);
  }
  const extended = buildExtendedClient(base, networkId);
  extendedCache.set(networkId, { client: extended, ts: Date.now() });
  return extended;
}

/**
 * Executa fn com isolamento de rede.
 * O cliente já injeta SET LOCAL em cada operação; não precisa de $transaction extra.
 */
export async function withTenant<T>(
  networkId: string,
  fn: (db: Awaited<ReturnType<typeof getTenantDb>>) => Promise<T>,
): Promise<T> {
  const db = await getTenantDb(networkId);
  return fn(db);
}

/**
 * Alias semântico — mantido para compatibilidade de chamadas anteriores.
 * Retorna o mesmo cliente com RLS ativo que getTenantDb.
 */
export async function getTenantDbWithRls(networkId: string) {
  return getTenantDb(networkId);
}
