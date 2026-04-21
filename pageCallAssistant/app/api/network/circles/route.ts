import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "discover"; // discover | mine
  const focus = searchParams.get("focus") ?? "";
  const level = searchParams.get("level") ?? "";

  if (filter === "mine") {
    const memberships = await db.circleMember.findMany({
      where: { userId: session.sub, status: "active" },
      include: {
        circle: {
          include: {
            _count: { select: { members: { where: { status: "active" } } } },
            challenges: {
              where: { endsAt: { gte: new Date() } },
              orderBy: { endsAt: "asc" },
              take: 1,
              select: { id: true, title: true, endsAt: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return NextResponse.json(memberships.map((m) => ({ ...m.circle, myRole: m.role })));
  }

  const where: Record<string, unknown> = { visibility: "public" };
  if (focus) where.focus = focus;
  if (level) where.level = level;

  const circles = await db.circle.findMany({
    where,
    include: {
      _count: { select: { members: { where: { status: "active" } } } },
      challenges: {
        where: { endsAt: { gte: new Date() } },
        orderBy: { endsAt: "asc" },
        take: 1,
        select: { id: true, title: true, endsAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const memberCircleIds = await db.circleMember
    .findMany({ where: { userId: session.sub, status: "active" }, select: { circleId: true } })
    .then((ms) => new Set(ms.map((m) => m.circleId)));

  return NextResponse.json(circles.map((c) => ({ ...c, isMember: memberCircleIds.has(c.id) })));
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.sub }, select: { plan: true } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  if (user.plan === "free")
    return NextResponse.json({ error: "Apenas planos Básico ou Premium podem criar Circles.", code: "plan_required" }, { status: 403 });

  if (user.plan === "basic") {
    const owned = await db.circle.count({ where: { ownerId: session.sub } });
    if (owned >= 1)
      return NextResponse.json({ error: "Plano Básico permite criar apenas 1 Circle. Faça upgrade para Premium.", code: "circle_limit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, description, focus, level, visibility, maxMembers } = body;

  if (!name?.trim() || !focus?.trim())
    return NextResponse.json({ error: "Nome e foco são obrigatórios." }, { status: 400 });

  const circle = await db.circle.create({
    data: {
      ownerId: session.sub,
      name: name.trim().slice(0, 80),
      description: description?.trim().slice(0, 300) ?? null,
      focus: focus.trim().slice(0, 60),
      level: level ?? "Todos",
      visibility: ["public", "private", "invite"].includes(visibility) ? visibility : "public",
      maxMembers: Math.min(Math.max(Number(maxMembers) || 20, 5), 100),
      members: { create: { userId: session.sub, role: "owner", status: "active" } },
    },
  });

  return NextResponse.json(circle, { status: 201 });
}
