import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = bearer ?? req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ message: "Token inválido" }, { status: 401 });

    const caller = await db.user.findUnique({ where: { id: payload.sub } });
    const rootEmail = (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();
    const isSuperAdmin = caller?.superAdmin === true || (!!rootEmail && caller?.email.toLowerCase() === rootEmail);
    if (!isSuperAdmin) return NextResponse.json({ message: "Acesso negado" }, { status: 403 });

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "E-mail é obrigatório" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await (db as any).user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://speakf.com.br";
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, user.name, resetLink);

    return NextResponse.json({ message: `Link de redefinição enviado para ${user.email}` });
  } catch (err) {
    console.error("[admin/reset-user-password]", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
