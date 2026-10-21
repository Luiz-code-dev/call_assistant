import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Token e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Senha deve ter mínimo 8 caracteres" }, { status: 400 });
    }

    const user = await (db as any).user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      return NextResponse.json({ message: "Token inválido ou expirado." }, { status: 400 });
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ message: "Link expirado. Solicite um novo link de redefinição." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await (db as any).user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
