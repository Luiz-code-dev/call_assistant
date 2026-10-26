import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { familySecret } from "@/lib/escola/secrets";

export interface FamilyContext {
  guardianId: string;
  networkId: string;
}

export async function getFamilyContext(): Promise<FamilyContext | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get("sf_family_ctx")?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, familySecret());
    const guardianId = payload["sub"] as string | undefined;
    const networkId = payload["nid"] as string | undefined;
    if (!guardianId || !networkId) return null;
    return { guardianId, networkId };
  } catch {
    return null;
  }
}
