import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById, hasRole } from "@/lib/orgAuth";
import { sendOrgInviteEmail } from "@/lib/email";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const members = await (db as any).orgMember.findMany({
    where: { orgId: params.orgId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, plan: true, createdAt: true } },
      teamMembers: { include: { team: { select: { id: true, name: true } } } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!hasRole(org.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, role = "member" } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });

  const validRoles = ["admin", "member"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Role inválida." }, { status: 400 });

  const existingInvite = await (db as any).orgInvite.findFirst({
    where: { orgId: params.orgId, email: email.toLowerCase(), status: "pending" },
  });
  if (existingInvite) return NextResponse.json({ error: "Convite já enviado para este e-mail." }, { status: 409 });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await (db as any).orgInvite.create({
    data: {
      orgId: params.orgId,
      email: email.toLowerCase(),
      role,
      invitedBy: org.userId,
      expiresAt,
    },
  });

  const [orgRecord, inviterUser] = await Promise.all([
    (db as any).organization.findUnique({ where: { id: params.orgId }, select: { name: true } }),
    (db as any).user.findUnique({ where: { id: org.userId }, select: { name: true } }).catch(() => null),
  ]);

  sendOrgInviteEmail(
    email.toLowerCase(),
    orgRecord?.name ?? "sua organização",
    inviterUser?.name ?? "Um administrador",
    role,
    invite.token,
    expiresAt,
  ).catch(() => {});

  return NextResponse.json({ invite }, { status: 201 });
}
