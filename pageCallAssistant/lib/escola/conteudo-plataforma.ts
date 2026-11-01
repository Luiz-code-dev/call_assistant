/**
 * lib/escola/conteudo-plataforma.ts
 *
 * Utilitários para as rotas do Estúdio de Conteúdo (PLATFORM_ADMIN).
 * Diferente de getTenantDb:
 *   - Usa o superusuário (URL original) — o PLATFORM_ADMIN precisa escrever
 *     conteúdo com networkId=null, que o escolas_app não pode.
 *   - Leitura/revisão: usa a primeira base ativa (a referência canônica).
 *   - Aprovação/reprovação/edição: replica em TODAS as bases ativas.
 *     Se falhar em qualquer base, retorna o erro sem deixar o pacote incompleto.
 *
 * Nunca é importado por código de aluno, professor ou família.
 */
import { PrismaClient } from "@prisma/escolas";
import { catalogDb } from "./catalogo";

const superCache = new Map<string, { client: PrismaClient; ts: number }>();
const TTL = 10 * 60_000;

function getSuperClient(url: string): PrismaClient {
  const cached = superCache.get(url);
  if (cached && Date.now() - cached.ts < TTL) return cached.client;
  const c = new PrismaClient({ datasources: { db: { url } } });
  superCache.set(url, { client: c, ts: Date.now() });
  return c;
}

/** Retorna lista de (envVar, url) de todas as bases ativas. */
async function getAllActiveDbUrls(): Promise<{ key: string; url: string }[]> {
  const dbs = await catalogDb.tenantDatabase.findMany({
    where: { isActive: true },
    orderBy: { key: "asc" },
  });
  const result: { key: string; url: string }[] = [];
  for (const db of dbs) {
    const url = process.env[db.envVar];
    if (url) result.push({ key: db.key, url });
  }
  return result;
}

/** Retorna um PrismaClient superusuário para a primeira base ativa (leitura/revisão). */
export async function getContentReadDb(): Promise<PrismaClient> {
  const dbs = await getAllActiveDbUrls();
  if (dbs.length === 0) throw new Error("Nenhuma base ativa encontrada.");
  return getSuperClient(dbs[0].url);
}

/**
 * Executa `fn` em TODAS as bases ativas como superusuário.
 * Se falhar em qualquer base, lança erro imediatamente listando qual base falhou.
 * `fn` recebe o cliente e a chave da base.
 */
export async function forEachContentDb<T>(
  fn: (db: PrismaClient, key: string) => Promise<T>
): Promise<{ key: string; result: T }[]> {
  const dbs = await getAllActiveDbUrls();
  if (dbs.length === 0) throw new Error("Nenhuma base ativa encontrada.");
  const results: { key: string; result: T }[] = [];
  for (const { key, url } of dbs) {
    try {
      const db = getSuperClient(url);
      const result = await fn(db, key);
      results.push({ key, result });
    } catch (err) {
      throw new Error(
        `Falha na base '${key}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return results;
}
