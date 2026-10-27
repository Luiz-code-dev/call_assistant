import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { hashToken } from "@/lib/escola/invite";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({
  token: z.string().min(10),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const INVALID = "Link inválido ou expirado. Peça um novo e-mail de redefinição.";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? INVALID }, { status: 400 });
  }

  const { token, senha } = parsed.data;

  try {
    const guardian = await (prismaEdu as any).eduGuardian.findFirst({
      where: { resetTokenHash: hashToken(token) },
    });

    if (!guardian || !guardian.resetTokenExpiresAt || new Date(guardian.resetTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(senha, 10);
    await (prismaEdu as any).eduGuardian.update({
      where: { id: guardian.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        loginFailedCount: 0,
        loginLockedUntil: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[familia/redefinir-senha:POST]", err);
    return NextResponse.json({ error: "Não foi possível redefinir a senha." }, { status: 500 });
  }
}
