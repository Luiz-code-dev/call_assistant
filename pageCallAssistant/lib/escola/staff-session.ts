import { SignJWT, jwtVerify } from "jose";
import { staffSecret } from "@/lib/escola/secrets";

export const STAFF_SESSION_SECONDS = 60 * 60 * 12;
// Token curto de "perfil pendente" (so para o app escolher entre varios vinculos).
export const PENDING_STAFF_SECONDS = 60 * 10;

/** Emite o token pendente (app) com aud "staff-pending", sub = userId e claim eml = email. */
export async function signPendingStaffToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ pending: true, eml: email })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("staff-pending")
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_STAFF_SECONDS}s`)
    .sign(staffSecret());
}

/** Valida o token pendente e retorna { userId, email }, ou null. */
export async function verifyPendingStaffToken(raw: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(raw, staffSecret(), { audience: "staff-pending" });
    if (payload.pending !== true) return null;
    const userId = payload.sub as string | undefined;
    const email = payload["eml"] as string | undefined;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export type StaffTokenInput =
  | { userId: string; role: "PLATFORM_ADMIN" }
  | { userId: string; role: string; membershipId: string; networkId: string; schoolId: string | null };

export async function signStaffToken(
  input: StaffTokenInput,
  seconds: number = STAFF_SESSION_SECONDS
): Promise<string> {
  const claims: Record<string, unknown> = { sub: input.userId, role: input.role };
  if ("membershipId" in input) {
    claims.mid = input.membershipId;
    claims.nid = input.networkId;
    if (input.schoolId) claims.sid = input.schoolId;
  }
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("staff")
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(staffSecret());
}

export const staffCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: STAFF_SESSION_SECONDS,
};
