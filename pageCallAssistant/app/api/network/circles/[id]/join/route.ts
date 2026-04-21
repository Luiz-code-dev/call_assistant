import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const circle = await db.circle.findUnique({
    where: { id: params.id },
    include: { _count: { select: { members: { where: { status: "active" } } } } },
  });
  if (!circle) return NextResponse.json({ error: "Circle não encontrado." }, { status: 404 });
  if (circle.visibility === "invite")
    return NextResponse.json({ error: "Este Circle é por convite." }, { status: 403 });
  if (circle._count.members >= circle.maxMembers)
    return NextResponse.json({ error: "Circle cheio." }, { status: 409 });

  const existing = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (existing?.status === "active")
    return NextResponse.json({ error: "Você já é membro." }, { status: 409 });

  if (existing) {
    await db.circleMember.update({
      where: { id: existing.id },
      data: { status: "active", joinedAt: new Date() },
    });
  } else {
    await db.circleMember.create({
      data: {
        circleId: params.id,
        userId: session.sub,
        role: "member",
        status: circle.visibility === "private" ? "pending" : "active",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
