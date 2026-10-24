import { NextRequest, NextResponse } from "next/server";
import { findInviteByToken } from "@/lib/escola/invite";
import { prismaEdu } from "@/lib/escola/db";
import { resolveInviteMode, resolveAccount } from "@/lib/escola/invite-account";
import { signStaffToken, staffCookieOptions } from "@/lib/escola/staff-session";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await findInviteByToken(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

  const { password, acceptTerms } = await req.json();
  if (!acceptTerms) return NextResponse.json({ error: "Aceite os termos de uso" }, { status: 400 });

  const { mode } = await resolveInviteMode(invite.email, invite.userId);
  let userId: string;
  try {
    userId = await resolveAccount({ email: invite.email, name: invite.name, userId: invite.userId }, mode, password);
  } catch (e: unknown) {
    const err = e as { error: string; status: number };
    return NextResponse.json({ error: err.error }, { status: err.status ?? 400 });
  }

  await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { userId } });

  // Always record terms acceptance on the user row
  await prismaEdu.user.update({ where: { id: userId }, data: { acceptedTerms: true } });

  // PLATFORM_ADMIN — no EduMembership, activate EduPlatformAdmin record
  if (invite.role === "PLATFORM_ADMIN") {
    await prismaEdu.eduPlatformAdmin.upsert({
      where: { userId },
      create: { userId, createdById: "invite" },
      update: { isActive: true },
    });
    await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
    await prismaEdu.eduAuditLog.create({
      data: { networkId: null, actorType: "user", actorId: userId, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
    });
    const jwtToken = await signStaffToken({ userId, role: "PLATFORM_ADMIN" });
    const res = NextResponse.json({ ok: true, redirect: "/escola/admin" });
    res.cookies.set("sf_edu_ctx", jwtToken, staffCookieOptions);
    return res;
  }

  // Upsert membership for all other roles
  const existingMembership = await prismaEdu.eduMembership.findFirst({
    where: { networkId: invite.networkId, userId, schoolId: invite.schoolId, role: invite.role },
  });
  let membershipId: string;
  if (existingMembership) {
    await prismaEdu.eduMembership.update({ where: { id: existingMembership.id }, data: { isActive: true } });
    membershipId = existingMembership.id;
  } else {
    const created = await prismaEdu.eduMembership.create({
      data: { networkId: invite.networkId, userId, schoolId: invite.schoolId, role: invite.role, isActive: true },
    });
    membershipId = created.id;
  }

  await prismaEdu.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: invite.networkId, actorType: "user", actorId: userId, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
  });

  const jwtToken = await signStaffToken({ userId, role: invite.role, membershipId, networkId: invite.networkId, schoolId: invite.schoolId });

  const res = NextResponse.json({ ok: true, redirect: "/escola/painel" });
  res.cookies.set("sf_edu_ctx", jwtToken, staffCookieOptions);
  return res;
}
