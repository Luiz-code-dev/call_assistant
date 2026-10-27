import { cookies } from "next/headers";
import { familySecret } from "@/lib/escola/secrets";
import { bearerToken, verifyTypedToken } from "@/lib/escola/app-auth";

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
  return { guardianId, networkId };
}
