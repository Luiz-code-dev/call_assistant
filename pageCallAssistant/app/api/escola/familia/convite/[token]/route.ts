import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { hashToken } from "@/lib/escola/familia";
import { isAppClient, APP_FAMILY_SECONDS } from "@/lib/escola/app-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadInvite(token: string): Promise<any | null> {
  const invite = await (prismaEdu as any).eduGuardianInvite.findFirst({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.expiresAt < new Date()) return null;
  return invite;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function guardianChildren(guardianId: string) {
  const links = await (prismaEdu as any).eduGuardianLink.findMany({ where: { guardianId, isActive: true } });
  const ids = links.map((l: { studentId: string }) => l.studentId);
  if (!ids.length) return [];
  const students = await (prismaEdu as any).eduStudent.findMany({ where: { id: { in: ids } }, select: { fullName: true } });
  return students.map((s: { fullName: string }) => s.fullName);
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  const guardian = await (prismaEdu as any).eduGuardian.findUnique({ where: { id: invite.guardianId }, select: { name: true, passwordHash: true } });
  return NextResponse.json({
    guardianName: guardian?.name ?? null,
    // Confirma no banco se a conta ja tem senha (decide se o convite pede criar
    // a senha ou apenas oferece alterar). So e revelado a quem detem o convite.
    hasPassword: !!guardian?.passwordHash,
    filhos: await guardianChildren(invite.guardianId),
    accepted: !!invite.acceptedAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  // Uso único: um convite ja aceito nao pode ser reusado para trocar a senha.
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado. Use Entrar ou Esqueci minha senha." }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const termsVersion = body.termsVersion ?? "v1.0";
  const senha: string | undefined = typeof body.senha === "string" ? body.senha : undefined;

  const guardian = await (prismaEdu as any).eduGuardian.findUnique({ where: { id: invite.guardianId }, select: { passwordHash: true } });
  const temSenha = !!guardian?.passwordHash;

  // Sem senha ainda: criar senha e obrigatorio. Com senha: alterar e opcional.
  if (!temSenha && (!senha || senha.length < 6)) {
    return NextResponse.json({ error: "Crie uma senha de pelo menos 6 caracteres para acessar.", needsPassword: true }, { status: 400 });
  }
  if (senha !== undefined && senha.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  try {
    await (prismaEdu as any).eduGuardianInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    // Define (1o acesso) ou troca (opcional) a senha do responsavel.
    if (senha !== undefined) {
      await (prismaEdu as any).eduGuardian.update({ where: { id: invite.guardianId }, data: { passwordHash: await bcrypt.hash(senha, 10), loginFailedCount: 0, loginLockedUntil: null } });
    }

    // Registra consentimento por filho vinculado
    const links = await (prismaEdu as any).eduGuardianLink.findMany({ where: { guardianId: invite.guardianId, isActive: true } });
    for (const l of links) {
      await (prismaEdu as any).eduGuardianConsent.create({
        data: { guardianId: invite.guardianId, studentId: l.studentId, termsVersion: termsVersion ?? "v1.0" },
      }).catch(() => {});
    }

    const appClient = isAppClient();
    const familySeconds = appClient ? APP_FAMILY_SECONDS : 60 * 60 * 24 * 90;
    const token = await new SignJWT({ nid: invite.networkId })
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
    // Causa mais comum: EDU_FAMILY_JWT_SECRET ausente em producao (familySecret lanca).
    console.error("[familia/convite:POST]", err);
    return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
  }
}
