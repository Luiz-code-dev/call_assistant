import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { message: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.", pendingVerification: true },
        { status: 403 }
      );
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
