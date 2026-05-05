import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateUniqueUsername } from "@/lib/username";
import { isDisposableEmail } from "@/lib/disposableEmails";

const IP_REGISTRATION_LIMIT = 3;
const IP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

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

    // 1. Block disposable / temporary email providers
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { message: "E-mails temporários não são permitidos. Use um e-mail permanente." },
        { status: 400 }
      );
    }

    // 2. IP-based rate limiting — max 3 accounts per IP per 24h
    const clientIp = getClientIp(req);
    if (clientIp !== "unknown") {
      const since = new Date(Date.now() - IP_WINDOW_MS);
      const ipCount = await db.user.count({
        where: { registrationIp: clientIp, createdAt: { gte: since } },
      });
      if (ipCount >= IP_REGISTRATION_LIMIT) {
        return NextResponse.json(
          { message: "Muitas contas criadas deste dispositivo. Tente novamente amanhã ou entre em contato com o suporte." },
          { status: 429 }
        );
      }
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ message: "Este e-mail já está em uso" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const username = await generateUniqueUsername(name);

    const user = await db.user.create({
      data: {
        name,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        verificationToken,
        verificationExpiry,
        acceptedTerms: true,
        emailVerified: false,
        credits: 50,
        plan: "free",
        registrationIp: clientIp,
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
