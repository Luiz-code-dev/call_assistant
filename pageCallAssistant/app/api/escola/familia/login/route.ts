import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { FAMILY_COOKIE } from "@/lib/escola/cookies";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({ identifier: z.string().min(3), senha: z.string().min(1) });
const GENERIC = "E-mail/celular ou senha incorretos.";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const { identifier, senha } = parsed.data;
  const isEmail = identifier.includes("@");
  const value = isEmail ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, "");

  try {
    const guardian = await (prismaEdu as any).eduGuardian.findFirst({
      where: { passwordHash: { not: null }, ...(isEmail ? { email: { equals: value, mode: "insensitive" } } : { phone: { contains: value.slice(-8) } }) },
    });
    if (!guardian) return NextResponse.json({ error: GENERIC }, { status: 401 });

    if (guardian.loginLockedUntil && new Date(guardian.loginLockedUntil) > new Date()) {
      return NextResponse.json({ error: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });
    }

    const ok = await bcrypt.compare(senha, guardian.passwordHash);
    if (!ok) {
      const count = (guardian.loginFailedCount ?? 0) + 1;
      const lock = count >= 5;
      await (prismaEdu as any).eduGuardian.update({
        where: { id: guardian.id },
        data: lock ? { loginFailedCount: 0, loginLockedUntil: new Date(Date.now() + 15 * 60000) } : { loginFailedCount: count },
      });
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    await (prismaEdu as any).eduGuardian.update({ where: { id: guardian.id }, data: { loginFailedCount: 0, loginLockedUntil: null } });
    const token = await new SignJWT({ nid: guardian.networkId }).setProtectedHeader({ alg: "HS256" }).setSubject(guardian.id).setIssuedAt().setExpirationTime("90d").sign(familySecret());
    const res = NextResponse.json({ ok: true });
    res.cookies.set(FAMILY_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 90, path: "/" });
    return res;
  } catch (err) {
    console.error("[familia/login:POST]", err);
    return NextResponse.json({ error: "Não foi possível entrar." }, { status: 500 });
  }
}
