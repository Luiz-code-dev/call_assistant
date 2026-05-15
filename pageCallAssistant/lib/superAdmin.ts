import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Root admin email — hardcoded in ROOT_ADMIN_EMAIL env var.
 * This account ALWAYS has superAdmin access regardless of the DB flag.
 * It can NEVER be revoked via API — only by changing the env var on the server.
 */
export const ROOT_ADMIN_EMAIL =
  (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();

/**
 * Returns true if the current request comes from a super admin.
 * Priority:
 *   1. INTERNAL_API_SECRET header (server-to-server calls)
 *   2. ROOT_ADMIN_EMAIL (env-protected root account — immune to DB changes)
 *   3. user.superAdmin === true in DB (co-admins granted via panel)
 */
export async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const secret = req.headers.get("x-internal-secret");
  if (secret && process.env.INTERNAL_API_SECRET && secret === process.env.INTERNAL_API_SECRET) return true;

  const session = await getSession();
  if (!session) return false;

  if (ROOT_ADMIN_EMAIL && session.email?.toLowerCase() === ROOT_ADMIN_EMAIL) return true;

  const user = await (db as any).user.findUnique({
    where: { id: session.sub },
    select: { superAdmin: true },
  });
  return !!user?.superAdmin;
}

/**
 * Returns true if the target email is the protected root admin.
 * Used to block revoke attempts on the root account.
 */
export function isRootAdmin(email: string): boolean {
  return !!ROOT_ADMIN_EMAIL && email.toLowerCase() === ROOT_ADMIN_EMAIL;
}
