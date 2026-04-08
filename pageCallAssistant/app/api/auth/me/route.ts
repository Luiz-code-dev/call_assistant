import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  return NextResponse.json({
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    plan: payload.plan,
  });
}
