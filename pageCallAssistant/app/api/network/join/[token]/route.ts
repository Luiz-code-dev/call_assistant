import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const circle = await db.circle.findUnique({
    where: { inviteToken: params.token },
    select: {
      id: true, name: true, description: true, focus: true, level: true, visibility: true,
      _count: { select: { members: { where: { status: "active" } } } },
      maxMembers: true,
    },
  });
  if (!circle) return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 404 });
  return NextResponse.json(circle);
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const circle = await db.circle.findUnique({
    where: { inviteToken: params.token },
    include: { _count: { select: { members: { where: { status: "active" } } } } },
  });
  if (!circle) return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 404 });

  if (circle._count.members >= circle.maxMembers)
    return NextResponse.json({ error: "Circle já está no limite de membros." }, { status: 400 });

  const existing = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: circle.id, userId: session.sub } },
  });

  if (existing) {
    if (existing.status === "active")
      return NextResponse.json({ circleId: circle.id, alreadyMember: true });
    await db.circleMember.update({
      where: { id: existing.id },
      data: { status: "active" },
    });
    return NextResponse.json({ circleId: circle.id, joined: true });
  }

  await db.circleMember.create({
    data: { circleId: circle.id, userId: session.sub, role: "member", status: "active" },
  });
  return NextResponse.json({ circleId: circle.id, joined: true }, { status: 201 });
}
