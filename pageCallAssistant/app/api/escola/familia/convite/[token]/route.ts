import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { hashToken } from "@/lib/escola/familia";

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
  const guardian = await (prismaEdu as any).eduGuardian.findUnique({ where: { id: invite.guardianId }, select: { name: true } });
  return NextResponse.json({
    guardianName: guardian?.name ?? null,
    filhos: await guardianChildren(invite.guardianId),
    accepted: !!invite.acceptedAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });

  const { termsVersion } = await req.json().catch(() => ({ termsVersion: "v1.0" }));

  try {
    await (prismaEdu as any).eduGuardianInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    // Registra consentimento por filho vinculado
    const links = await (prismaEdu as any).eduGuardianLink.findMany({ where: { guardianId: invite.guardianId, isActive: true } });
    for (const l of links) {
      await (prismaEdu as any).eduGuardianConsent.create({
        data: { guardianId: invite.guardianId, studentId: l.studentId, termsVersion: termsVersion ?? "v1.0" },
      }).catch(() => {});
    }

    const token = await new SignJWT({ nid: invite.networkId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(invite.guardianId)
      .setIssuedAt()
      .setExpirationTime("90d")
      .sign(familySecret());

    const res = NextResponse.json({ ok: true });
    res.cookies.set("sf_family_ctx", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90, path: "/",
    });
    return res;
  } catch (err) {
    // Causa mais comum: EDU_FAMILY_JWT_SECRET ausente em producao (familySecret lanca).
    console.error("[familia/convite:POST]", err);
    return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
  }
}
