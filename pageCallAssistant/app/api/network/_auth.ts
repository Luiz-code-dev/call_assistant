import { NextRequest } from "next/server";
import { verifyToken, JWTPayload } from "@/lib/auth";

export async function getNetworkSession(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const rawToken = bearer ?? req.cookies.get("token")?.value;
  if (!rawToken) return null;
  return verifyToken(rawToken);
}
