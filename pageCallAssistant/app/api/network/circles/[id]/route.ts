import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const circle = await db.circle.findUnique({
    where: { id: params.id },
    include: {
      members: {
        where: { status: "active" },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
      challenges: {
        orderBy: { startsAt: "desc" },
        take: 5,
        include: {
          _count: { select: { submissions: true } },
        },
      },
      _count: { select: { members: { where: { status: "active" } } } },
    },
  });

  if (!circle) return NextResponse.json({ error: "Circle não encontrado." }, { status: 404 });
  if (circle.visibility === "private") {
    const isMember = circle.members.some((m) => m.userId === session.sub);
    if (!isMember) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const myMembership = circle.members.find((m) => m.userId === session.sub);
  return NextResponse.json({ ...circle, myRole: myMembership?.role ?? null });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, description, focus, level, visibility, maxMembers } = body;

  const data: Record<string, unknown> = {};
  if (name?.trim()) data.name = name.trim().slice(0, 80);
  if (typeof description === "string") data.description = description.trim().slice(0, 300) || null;
  if (focus?.trim()) data.focus = focus.trim().slice(0, 60);
  if (level) data.level = level;
  if (visibility && ["public", "private", "invite"].includes(visibility)) data.visibility = visibility;
  if (maxMembers) data.maxMembers = Math.min(Math.max(Number(maxMembers), 5), 100);

  const updated = await db.circle.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}
