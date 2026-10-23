import { NextRequest, NextResponse } from "next/server";
import { findInviteByToken } from "@/lib/escola/invite";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const EDU_SECRET = new TextEncoder().encode(process.env.EDU_JWT_SECRET ?? "edu-dev-secret-change-me");

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await findInviteByToken(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

  const { password, acceptTerms } = await req.json();
  if (!acceptTerms) return NextResponse.json({ error: "Aceite os termos de uso" }, { status: 400 });

  let userId = invite.userId;

  if (!userId) {
    if (!password || password.length < 8) return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres" }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prismaEdu.user.findFirst({ where: { email: invite.email } });
    if (existing) {
      userId = existing.id;
    } else {
      const user = await prismaEdu.user.create({
        data: { email: invite.email, name: invite.name, password: passwordHash, emailVerified: true, acceptedTerms: true },
      });
      userId = user.id;
    }
    await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { userId } });
  }

  // Always record terms acceptance on the user row
  await prismaEdu.user.update({ where: { id: userId! }, data: { acceptedTerms: true } });

  // PLATFORM_ADMIN — no EduMembership, activate EduPlatformAdmin record
  if (invite.role === "PLATFORM_ADMIN") {
    await prismaEdu.eduPlatformAdmin.upsert({
      where: { userId: userId! },
      create: { userId: userId!, createdById: "invite" },
      update: { isActive: true },
    });
    await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
    await prismaEdu.eduAuditLog.create({
      data: { networkId: null, actorType: "user", actorId: userId!, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
    });
    const jwtToken = await new SignJWT({ sub: userId!, role: "PLATFORM_ADMIN" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(EDU_SECRET);
    const res = NextResponse.json({ ok: true, redirect: "/escola/admin" });
    res.cookies.set("sf_edu_ctx", jwtToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
    return res;
  }

  // Upsert membership for all other roles
  const existingMembership = await prismaEdu.eduMembership.findFirst({
    where: { networkId: invite.networkId, userId: userId!, schoolId: invite.schoolId, role: invite.role },
  });
  let membershipId: string;
  if (existingMembership) {
    await prismaEdu.eduMembership.update({ where: { id: existingMembership.id }, data: { isActive: true } });
    membershipId = existingMembership.id;
  } else {
    const created = await prismaEdu.eduMembership.create({
      data: { networkId: invite.networkId, userId: userId!, schoolId: invite.schoolId, role: invite.role, isActive: true },
    });
    membershipId = created.id;
  }

  await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: invite.networkId, actorType: "user", actorId: userId!, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
  });

  const jwtToken = await new SignJWT({ sub: userId!, mid: membershipId, nid: invite.networkId, sid: invite.schoolId ?? undefined, role: invite.role })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(EDU_SECRET);

  const res = NextResponse.json({ ok: true, redirect: "/escola/painel" });
  res.cookies.set("sf_edu_ctx", jwtToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
  return res;
}
