import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
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
