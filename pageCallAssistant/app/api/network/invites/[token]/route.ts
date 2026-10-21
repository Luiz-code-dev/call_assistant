import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await db.circleMember.findUnique({
    where: { inviteToken: params.token },
    include: {
      circle: { select: { id: true, name: true, description: true, focus: true, level: true, _count: { select: { members: { where: { status: "active" } } } }, maxMembers: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invite || invite.status !== "invited")
    return NextResponse.json({ error: "Convite inválido ou já processado." }, { status: 404 });

  return NextResponse.json({
    circleName: invite.circle.name,
    circleDescription: invite.circle.description,
    circleFocus: invite.circle.focus,
    circleLevel: invite.circle.level,
    circleId: invite.circle.id,
    memberCount: invite.circle._count.members,
    maxMembers: invite.circle.maxMembers,
    inviteeName: invite.user.name,
  });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const invite = await db.circleMember.findUnique({
    where: { inviteToken: params.token },
    include: { circle: { select: { id: true, name: true, _count: { select: { members: { where: { status: "active" } } } }, maxMembers: true } } },
  });

  if (!invite || invite.status !== "invited")
    return NextResponse.json({ error: "Convite inválido ou já processado." }, { status: 404 });

  if (invite.userId !== session.sub)
    return NextResponse.json({ error: "Este convite é para outro usuário." }, { status: 403 });

  const { action } = await req.json();

  if (action === "accept") {
    if (invite.circle._count.members >= invite.circle.maxMembers)
      return NextResponse.json({ error: "Circle já está no limite de membros." }, { status: 400 });

    await db.circleMember.update({
      where: { id: invite.id },
      data: { status: "active", inviteToken: null },
    });
    return NextResponse.json({ circleId: invite.circle.id, accepted: true });
  }

  if (action === "decline") {
    await db.circleMember.update({
      where: { id: invite.id },
      data: { status: "removed", inviteToken: null },
    });
    return NextResponse.json({ declined: true });
  }

  return NextResponse.json({ error: "Ação inválida. Use: accept ou decline." }, { status: 400 });
}
