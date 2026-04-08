import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyToken } from "@/lib/auth";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  try {
    // Accept cookie OR Authorization Bearer (fallback when CDN strips cookies)
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const sessionToken = bearerToken ?? req.cookies.get("token")?.value;

    console.log("DESKTOP_TOKEN_DEBUG", {
      hasCookie: !!req.cookies.get("token")?.value,
      hasBearer: !!bearerToken,
      hasJwtSecret: !!process.env.JWT_SECRET,
    });

    if (!sessionToken) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    // Generate 30-day desktop session token directly — no exchange step needed
    const desktopToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      plan: payload.plan,
      type: "desktop-session",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return NextResponse.json({ token: desktopToken });
  } catch {
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
