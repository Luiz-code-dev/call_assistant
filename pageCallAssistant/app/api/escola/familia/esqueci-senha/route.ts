import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { hashToken, sendFamilyPasswordResetEmail } from "@/lib/escola/invite";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({ email: z.string().email() });

// Resposta sempre generica: nunca revelar se existe conta com aquele e-mail.
const OK = { ok: true, message: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha." };

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  // E-mail invalido tambem responde generico (nao vaza validacao de conta).
  if (!parsed.success) return NextResponse.json(OK);

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const guardian = await (prismaEdu as any).eduGuardian.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, passwordHash: { not: null } },
    });

    if (guardian?.email) {
      const raw = crypto.randomBytes(32).toString("hex");
      await (prismaEdu as any).eduGuardian.update({
        where: { id: guardian.id },
        data: { resetTokenHash: hashToken(raw), resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await sendFamilyPasswordResetEmail(guardian.email, guardian.name, raw);
    }
  } catch (err) {
    console.error("[familia/esqueci-senha:POST]", err);
    // Ainda assim respondemos OK para nao vazar o estado da conta.
  }

  return NextResponse.json(OK);
}
