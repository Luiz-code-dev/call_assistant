/**
 * lib/escola/db.ts — acesso tenant-aware ao banco das redes (Etapa 3)
 *
 * Como funciona:
 *   1. getEduContext/getStudentContext/getFamilyContext resolvem o networkId,
 *      carregam o cliente Prisma via getTenantDb e chamam setTenantDb().
 *   2. `prismaEdu` (Proxy) lê o cliente do AsyncLocalStorage de forma síncrona.
 *   3. Rotas existentes (const p = prismaEdu as any) não precisam ser alteradas.
 *
 * Novo código deve usar getDb(networkId) diretamente.
 */
import { AsyncLocalStorage } from "async_hooks";
import { getTenantDb } from "@/lib/escola/tenant-db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tenantDbStore = new AsyncLocalStorage<any>();

/** Chamado pelas funções de contexto (getEduContext, etc.) após resolver networkId. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setTenantDb(db: any): void {
  tenantDbStore.enterWith(db);
}

/**
 * prismaEdu — Proxy tenant-aware.
 * Lê o cliente Prisma injetado por getEduContext/getStudentContext/getFamilyContext.
 * Compatible com uso legado: const p = prismaEdu as any;
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prismaEdu: any = new Proxy({} as any, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_target: any, model: string) {
    const db = tenantDbStore.getStore();
    if (!db) {
      throw new Error(
        `[Escolas] prismaEdu.${model} acessado antes de resolver o contexto. ` +
        `Chame getEduContext(), getStudentContext() ou getFamilyContext() primeiro.`
      );
    }
    return db[model];
  },
});

/** Alias direto para getTenantDb — use em código novo. */
export const getDb = getTenantDb;
