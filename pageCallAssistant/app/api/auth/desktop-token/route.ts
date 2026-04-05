import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyToken } from "@/lib/auth";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    const desktopToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      plan: payload.plan,
      type: "desktop",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    return NextResponse.json({ token: desktopToken });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
