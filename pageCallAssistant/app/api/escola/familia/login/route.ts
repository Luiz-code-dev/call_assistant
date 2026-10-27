import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { FAMILY_COOKIE } from "@/lib/escola/cookies";
import { normalizePhone } from "@/lib/escola/phone";
import { isAppClient, APP_FAMILY_SECONDS } from "@/lib/escola/app-auth";

const WEB_FAMILY_SECONDS = 60 * 60 * 24 * 90;

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({ identifier: z.string().min(3), senha: z.string().min(1) });
const GENERIC = "E-mail/celular ou senha incorretos.";

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: GENERIC }, { status: 400 });

  const { identifier, senha } = parsed.data;
  const isEmail = identifier.includes("@");
  const value = isEmail ? identifier.trim().toLowerCase() : normalizePhone(identifier);
  if (!value) return NextResponse.json({ error: GENERIC }, { status: 401 });

  const appClient = isAppClient();
  const familySeconds = appClient ? APP_FAMILY_SECONDS : WEB_FAMILY_SECONDS;

  try {
    // O mesmo e-mail/celular pode existir em redes diferentes (nao ha unique
    // global). Buscamos todos os candidatos e autenticamos so a conta cuja
    // senha confere — sem logar numa rede arbitraria nem punir a conta errada.
    const candidates = await (prismaEdu as any).eduGuardian.findMany({
      where: { passwordHash: { not: null }, ...(isEmail ? { email: { equals: value, mode: "insensitive" } } : { phone: { endsWith: value.slice(-8) } }) },
    });
    if (candidates.length === 0) return NextResponse.json({ error: GENERIC }, { status: 401 });

    const now = Date.now();
    const active = candidates.filter((g: any) => !(g.loginLockedUntil && new Date(g.loginLockedUntil).getTime() > now));
    if (active.length === 0) {
      return NextResponse.json({ error: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });
    }

    for (const g of active) {
      if (await bcrypt.compare(senha, g.passwordHash)) {
        await (prismaEdu as any).eduGuardian.update({ where: { id: g.id }, data: { loginFailedCount: 0, loginLockedUntil: null } });
        const token = await new SignJWT({ nid: g.networkId }).setProtectedHeader({ alg: "HS256" }).setAudience("family").setSubject(g.id).setIssuedAt().setExpirationTime(`${familySeconds}s`).sign(familySecret());
        const res = NextResponse.json({ ok: true, ...(appClient ? { token } : {}) });
        res.cookies.set(FAMILY_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: familySeconds, path: "/" });
        return res;
      }
    }

    // Nenhuma senha conferiu: incrementa a falha apenas nas contas desse identificador.
    await Promise.all(active.map((g: any) => {
      const count = (g.loginFailedCount ?? 0) + 1;
      const lock = count >= 5;
      return (prismaEdu as any).eduGuardian.update({
        where: { id: g.id },
        data: lock ? { loginFailedCount: 0, loginLockedUntil: new Date(Date.now() + 15 * 60000) } : { loginFailedCount: count },
      });
    }));
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  } catch (err) {
    console.error("[familia/login:POST]", err);
    return NextResponse.json({ error: "Não foi possível entrar." }, { status: 500 });
  }
}
