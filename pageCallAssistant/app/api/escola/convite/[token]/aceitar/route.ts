import { NextRequest, NextResponse } from "next/server";
import { findInviteByToken, deregisterInviteFromCatalog, hashToken } from "@/lib/escola/invite";
import { findTenantByInviteHash } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { resolveInviteMode, resolveAccount } from "@/lib/escola/invite-account";
import { signStaffToken, staffCookieOptions } from "@/lib/escola/staff-session";
import { TERMO_VERSAO } from "@/lib/escola/apoio-profissional";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await findInviteByToken(params.token);
  if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

  const tokenHash = hashToken(params.token);
  const idx = await findTenantByInviteHash(tokenHash);
  if (!idx) return NextResponse.json({ error: "Rede não encontrada para este convite" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await getTenantDb(idx.tenantId) as any;

  const { password, acceptTerms, acceptSigilo } = await req.json();
  if (!acceptTerms) return NextResponse.json({ error: "Aceite os termos de uso" }, { status: 400 });

  // Profissional de apoio: precisa do cadastro feito pela secretaria e do aceite do termo de sigilo
  let cadastroDeApoio: { id: string; funcao: string; schoolIds: string[] } | null = null;
  if (invite.role === "SUPPORT") {
    cadastroDeApoio = await db.eduApoioCadastro.findFirst({ where: { inviteId: invite.id, status: "CONVIDADO" }, select: { id: true, funcao: true, schoolIds: true } });
    if (!cadastroDeApoio) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    if (acceptSigilo !== true) return NextResponse.json({ error: "Aceite o termo de sigilo e proteção de dados" }, { status: 400 });
  }

  const { mode } = await resolveInviteMode(invite.email, invite.userId);
  let userId: string;
  try {
    userId = await resolveAccount({ email: invite.email, name: invite.name, userId: invite.userId }, mode, password);
  } catch (e: unknown) {
    const err = e as { error: string; status: number };
    return NextResponse.json({ error: err.error }, { status: err.status ?? 400 });
  }

  // PLATFORM_ADMIN — sem EduMembership no tenant; usa EduUser no catálogo
  if (invite.role === "PLATFORM_ADMIN") {
    await db.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
    await db.eduAuditLog.create({
      data: { networkId: null, actorType: "user", actorId: userId, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
    }).catch(() => null);
    await deregisterInviteFromCatalog(tokenHash);
    const jwtToken = await signStaffToken({ userId, role: "PLATFORM_ADMIN" });
    const res = NextResponse.json({ ok: true, redirect: "/escola/admin" });
    res.cookies.set("sf_edu_ctx", jwtToken, staffCookieOptions);
    return res;
  }

  // Upsert membership
  const existingMembership = await db.eduMembership.findFirst({
    where: { networkId: invite.networkId, userId, schoolId: invite.schoolId, role: invite.role },
  });
  let membershipId: string;
  if (existingMembership) {
    await db.eduMembership.update({ where: { id: existingMembership.id }, data: { isActive: true } });
    membershipId = existingMembership.id;
  } else {
    const created = await db.eduMembership.create({
      data: { networkId: invite.networkId, userId, schoolId: invite.schoolId, role: invite.role, isActive: true },
    });
    membershipId = created.id;
  }

  await db.eduInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), userId } });
  await db.eduAuditLog.create({
    data: { networkId: invite.networkId, actorType: "user", actorId: userId, action: "invite.accepted", entity: "EduInvite", entityId: invite.id },
  }).catch(() => null);
  await deregisterInviteFromCatalog(tokenHash);

  if (cadastroDeApoio) {
    await db.eduEquipeApoio.upsert({
      where: { networkId_userId: { networkId: invite.networkId, userId } },
      create: { networkId: invite.networkId, userId, addedById: invite.createdById, funcao: cadastroDeApoio.funcao, schoolIds: cadastroDeApoio.schoolIds },
      update: { funcao: cadastroDeApoio.funcao, schoolIds: cadastroDeApoio.schoolIds },
    });
    await db.eduApoioCadastro.update({ where: { id: cadastroDeApoio.id }, data: { status: "ATIVO", userId, termoVersao: TERMO_VERSAO, termoAceitoEm: new Date() } });
    await db.eduAuditLog.create({
      data: { networkId: invite.networkId, actorType: "user", actorId: userId, action: "apoio.profissional.aceitou", entity: "EduApoioCadastro", entityId: cadastroDeApoio.id, metadata: { termoVersao: TERMO_VERSAO } },
    }).catch(() => null);
  }

  const jwtToken = await signStaffToken({ userId, role: invite.role, membershipId, networkId: invite.networkId, schoolId: invite.schoolId });
  const res = NextResponse.json({ ok: true, redirect: "/escola/painel" });
  res.cookies.set("sf_edu_ctx", jwtToken, staffCookieOptions);
  return res;
}
