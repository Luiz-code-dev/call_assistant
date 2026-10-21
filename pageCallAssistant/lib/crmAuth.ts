import { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "@/lib/auth";
import { db } from "@/lib/db";

async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const rawToken = bearer ?? req.cookies.get("token")?.value;
  if (!rawToken) return null;
  return verifyToken(rawToken);
}

export async function isCrmUser(req: NextRequest): Promise<boolean> {
  const session = await getSession(req);
  if (!session) return false;

  const rootEmail = (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (rootEmail && session.email?.toLowerCase() === rootEmail) return true;

  const user = await (db as any).user.findUnique({
    where: { id: session.sub },
    select: { superAdmin: true, crmAccess: true },
  });

  return !!user?.superAdmin || !!user?.crmAccess;
}

export async function getCrmSession(req: NextRequest): Promise<JWTPayload | null> {
  return getSession(req);
}
