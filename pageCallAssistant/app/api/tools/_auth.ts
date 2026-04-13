import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/** Extrai e verifica o token JWT de cookie ou Bearer header. */
export async function getToolSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const rawToken = bearer ?? req.cookies.get("token")?.value;
  if (!rawToken) return null;
  return verifyToken(rawToken);
}
