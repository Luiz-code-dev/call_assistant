import { SignJWT } from "jose";
import { staffSecret } from "@/lib/escola/secrets";

export const STAFF_SESSION_SECONDS = 60 * 60 * 12;

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
