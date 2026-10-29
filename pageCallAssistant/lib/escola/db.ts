/**
 * lib/escola/db.ts
 * Durante a migração (Etapa 3): prismaEdu ainda aponta para o banco legado.
 * Após Etapa 3, todas as rotas usarão getTenantDb(ctx.networkId) e este
 * arquivo será removido.
 */
import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prismaEdu = db as any;
