import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const ALWAYS_OK = NextResponse.json({
  message: "Se este e-mail estiver cadastrado, você receberá um link em breve.",
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "E-mail é obrigatório" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return 200 to avoid user enumeration
    if (!user) return ALWAYS_OK;

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await (db as any).user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://speakf.com.br";
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, user.name, resetLink);

    return ALWAYS_OK;
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
