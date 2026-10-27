import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { rotaDoPapel } from "@/lib/escola/context";
import { signStaffToken, staffCookieOptions, STAFF_SESSION_SECONDS } from "@/lib/escola/staff-session";
import { isAppClient, APP_STAFF_SECONDS } from "@/lib/escola/app-auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const appClient = isAppClient();
  const staffSeconds = appClient ? APP_STAFF_SECONDS : STAFF_SESSION_SECONDS;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password ?? "");
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const [memberships, platformAdmin] = await Promise.all([
    (db as any).eduMembership.findMany({
      where: { userId: user.id, isActive: true, network: { isActive: true } },
      select: { id: true, role: true, schoolId: true, networkId: true },
      orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
    }),
    (db as any).eduPlatformAdmin.findUnique({ where: { userId: user.id }, select: { isActive: true } }),
  ]);

  const isAdmin = !!platformAdmin?.isActive;
  const opcoes = memberships.length + (isAdmin ? 1 : 0);

  if (opcoes === 0) {
    return NextResponse.json(
      { error: "Seu e-mail não está vinculado ao SpeakFlow Escolas. Fale com a Secretaria de Educação." },
      { status: 403 }
    );
  }

  const lastCookie = req.cookies.get("sf_edu_last")?.value;

  // Escolha automática: único vínculo/admin
  if (opcoes === 1) {
    if (isAdmin) {
      const token = await signStaffToken({ userId: user.id, role: "PLATFORM_ADMIN" }, staffSeconds);
      const res = NextResponse.json({ ok: true, redirect: rotaDoPapel("PLATFORM_ADMIN"), ...(appClient ? { token } : {}) });
      res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
      res.cookies.set("sf_edu_last", "platform", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
      return res;
    }
    const chosen = memberships[0];
    const token = await signStaffToken({ userId: user.id, role: chosen.role, membershipId: chosen.id, networkId: chosen.networkId, schoolId: chosen.schoolId }, staffSeconds);
    const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(chosen.role), ...(appClient ? { token } : {}) });
    res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
    res.cookies.set("sf_edu_last", chosen.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }

  // Lembrar último acesso
  if (lastCookie === "platform" && isAdmin) {
    const token = await signStaffToken({ userId: user.id, role: "PLATFORM_ADMIN" }, staffSeconds);
    const res = NextResponse.json({ ok: true, redirect: rotaDoPapel("PLATFORM_ADMIN"), ...(appClient ? { token } : {}) });
    res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
    res.cookies.set("sf_edu_last", "platform", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }
  const lastMatch = lastCookie ? memberships.find((m: { id: string }) => m.id === lastCookie) : null;
  if (lastMatch) {
    const token = await signStaffToken({ userId: user.id, role: lastMatch.role, membershipId: lastMatch.id, networkId: lastMatch.networkId, schoolId: lastMatch.schoolId }, staffSeconds);
    const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(lastMatch.role), ...(appClient ? { token } : {}) });
    res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
    res.cookies.set("sf_edu_last", lastMatch.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }

  // Múltiplos — escolher perfil
  const res = NextResponse.json({ ok: true, redirect: "/escola/escolher-perfil" });
  res.cookies.set("sf_edu_pending_uid", user.id, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 5, path: "/",
  });
  return res;
  } catch (err) {
    console.error("[staff/login]", err);
    return NextResponse.json({ error: "Erro interno ao autenticar" }, { status: 500 });
  }
}
