import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: { token: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const invite = await (db as any).orgInvite.findUnique({
    where: { token: params.token },
    include: { org: { select: { id: true, name: true, slug: true, logoUrl: true, industry: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Convite já utilizado ou expirado." }, { status: 410 });
  if (new Date(invite.expiresAt) < new Date()) {
    await (db as any).orgInvite.update({ where: { token: params.token }, data: { status: "expired" } });
    return NextResponse.json({ error: "Convite expirado." }, { status: 410 });
  }

  return NextResponse.json({ invite });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "accept";
  const department: string | null = body.department ?? null;

  const invite = await (db as any).orgInvite.findUnique({ where: { token: params.token } });
  if (!invite) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Convite já utilizado." }, { status: 410 });
  if (new Date(invite.expiresAt) < new Date()) {
    await (db as any).orgInvite.update({ where: { token: params.token }, data: { status: "expired" } });
    return NextResponse.json({ error: "Convite expirado." }, { status: 410 });
  }

  if (invite.email.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Este convite é para outro e-mail." }, { status: 403 });
  }

  if (action === "reject") {
    await (db as any).orgInvite.update({ where: { token: params.token }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  const existingMember = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId: session.sub } },
  });

  if (!existingMember) {
    await (db as any).orgMember.create({
      data: {
        orgId: invite.orgId,
        userId: session.sub,
        role: invite.role,
        ...(department ? { department } : {}),
      },
    });
  } else if (department) {
    await (db as any).orgMember.update({
      where: { orgId_userId: { orgId: invite.orgId, userId: session.sub } },
      data: { department },
    });
  }

  await (db as any).orgInvite.update({ where: { token: params.token }, data: { status: "accepted" } });

  const org = await (db as any).organization.findUnique({
    where: { id: invite.orgId },
    select: { slug: true },
  });

  return NextResponse.json({ ok: true, action: "accepted", slug: org?.slug });
}
