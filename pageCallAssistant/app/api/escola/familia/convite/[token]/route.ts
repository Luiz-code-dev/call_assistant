import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { findFamilyInviteByToken, deregisterInviteFromCatalog, hashToken } from "@/lib/escola/invite";
import { isAppClient, APP_FAMILY_SECONDS } from "@/lib/escola/app-auth";
import { syncGuardianLogin } from "@/lib/escola/catalogo-sync";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const result = await findFamilyInviteByToken(params.token);
  if (!result) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  const { invite, db } = result;

  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });

  const guardian = await db.eduGuardian.findUnique({
    where: { id: invite.guardianId },
    select: { name: true, passwordHash: true },
  });

  const links = await db.eduGuardianLink.findMany({ where: { guardianId: invite.guardianId, isActive: true } });
  const ids = links.map((l: { studentId: string }) => l.studentId);
  const students = ids.length
    ? await db.eduStudent.findMany({ where: { id: { in: ids } }, select: { fullName: true } })
    : [];

  return NextResponse.json({
    guardianName: guardian?.name ?? null,
    hasPassword: !!guardian?.passwordHash,
    filhos: students.map((s: { fullName: string }) => s.fullName),
    accepted: !!invite.acceptedAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const result = await findFamilyInviteByToken(params.token);
  if (!result) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  const { invite, db, tenantId } = result;

  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado. Use Entrar ou Esqueci minha senha." }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const termsVersion: string = typeof body.termsVersion === "string" ? body.termsVersion : "v1.0";
  const senha: string | undefined = typeof body.senha === "string" ? body.senha : undefined;

  const guardian = await db.eduGuardian.findUnique({ where: { id: invite.guardianId }, select: { passwordHash: true } });
  const temSenha = !!guardian?.passwordHash;

  if (!temSenha && (!senha || senha.length < 6)) {
    return NextResponse.json({ error: "Crie uma senha de pelo menos 6 caracteres para acessar.", needsPassword: true }, { status: 400 });
  }
  if (senha !== undefined && senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  try {
    await db.eduGuardianInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    if (senha !== undefined) {
      await db.eduGuardian.update({
        where: { id: invite.guardianId },
        data: { passwordHash: await bcrypt.hash(senha, 10), loginFailedCount: 0, loginLockedUntil: null },
      });
    }

    // Sincroniza índice de login no catálogo para que login futuro funcione
    const guardianFull = await db.eduGuardian.findUnique({ where: { id: invite.guardianId }, select: { email: true, phone: true, networkId: true } });
    if (guardianFull?.email) await syncGuardianLogin(guardianFull.email.toLowerCase().trim(), guardianFull.networkId).catch(() => null);
    if (guardianFull?.phone) await syncGuardianLogin(guardianFull.phone, guardianFull.networkId).catch(() => null);

    const links = await db.eduGuardianLink.findMany({ where: { guardianId: invite.guardianId, isActive: true } });
    for (const l of links) {
      await db.eduGuardianConsent.create({
        data: { guardianId: invite.guardianId, studentId: l.studentId, termsVersion },
      }).catch(() => {});
    }

    await deregisterInviteFromCatalog(hashToken(params.token)).catch(() => null);

    const appClient = isAppClient();
    const familySeconds = appClient ? APP_FAMILY_SECONDS : 60 * 60 * 24 * 90;
    const token = await new SignJWT({ nid: tenantId })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("family")
      .setSubject(invite.guardianId)
      .setIssuedAt()
      .setExpirationTime(`${familySeconds}s`)
      .sign(familySecret());

    const res = NextResponse.json({ ok: true, ...(appClient ? { token } : {}) });
    res.cookies.set("sf_family_ctx", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: familySeconds, path: "/",
    });
    return res;
  } catch (err) {
    console.error("[familia/convite:POST]", err);
    return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
  }
}
