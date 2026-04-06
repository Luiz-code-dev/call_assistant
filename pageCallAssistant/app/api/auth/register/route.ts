import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, acceptedTerms } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Campos obrigatórios não informados" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Senha deve ter mínimo 8 caracteres" }, { status: 400 });
    }
    if (!acceptedTerms) {
      return NextResponse.json({ message: "Você precisa aceitar os termos de uso" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ message: "Este e-mail já está em uso" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        verificationToken,
        verificationExpiry,
        acceptedTerms: true,
        emailVerified: false,
        credits: 50,
        plan: "free",
      },
    });

    await (db as any).creditTransaction.create({
      data: {
        userId: user.id,
        type: "credit",
        amount: 50,
        source: "trial",
        description: "Créditos trial",
      },
    });

    await sendVerificationEmail(email, name, verificationToken);

    return NextResponse.json({
      message: "Conta criada! Verifique seu e-mail para ativar a conta.",
      pendingVerification: true,
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
