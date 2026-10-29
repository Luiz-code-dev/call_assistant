import { cookies } from "next/headers";
import { familySecret } from "@/lib/escola/secrets";
import { bearerToken, verifyTypedToken } from "@/lib/escola/app-auth";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { setTenantDb } from "@/lib/escola/db";

export interface FamilyContext {
  guardianId: string;
  networkId: string;
}

export async function getFamilyContext(): Promise<FamilyContext | null> {
  const raw = bearerToken() ?? cookies().get("sf_family_ctx")?.value;
  if (!raw) return null;
  const payload = await verifyTypedToken(raw, familySecret(), "family");
  if (!payload) return null;
  const guardianId = payload["sub"] as string | undefined;
  const networkId = payload["nid"] as string | undefined;
  if (!guardianId || !networkId) return null;
  // Injeta o cliente tenant no AsyncLocalStorage para prismaEdu
  try {
    const db = await getTenantDb(networkId);
    setTenantDb(db);
  } catch { /* silencia erros de tenant em contexto família */ }
  return { guardianId, networkId };
}
