import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken, getCookieDomain } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) {
    return NextResponse.json({ message: "Token necessário" }, { status: 401 });
  }

  const payload = await verifyToken(bearer);
  if (!payload) {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, plan: true },
  });
  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
  }

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
  });

  const host = req.headers.get("host") ?? "";
  const isProd = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    domain: getCookieDomain(host),
  });

  return response;
}
