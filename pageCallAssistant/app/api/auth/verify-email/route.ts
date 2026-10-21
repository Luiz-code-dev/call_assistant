export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, getCookieDomain } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ message: "Token inválido" }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ message: "Token inválido ou expirado" }, { status: 400 });
    }

    if (user.verificationExpiry && user.verificationExpiry < new Date()) {
      return NextResponse.json({ message: "Token expirado. Faça o cadastro novamente." }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    const sessionToken = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const isDesktopCallback = req.cookies.get("desktop_callback")?.value === "1";
    const redirectTo = isDesktopCallback ? `${appUrl}/auth/desktop` : `${appUrl}/dashboard?verified=1`;
    const response = NextResponse.redirect(redirectTo);
    response.cookies.delete("desktop_callback");
    const host = req.headers.get("host") ?? "";
    response.cookies.set("token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      domain: getCookieDomain(host),
    });

    return response;
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
