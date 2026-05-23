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

const CIRCLE_FREE_LIMIT = 5;
const CIRCLE_EXTRA_COST = 10;

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.sub }, select: { plan: true, credits: true } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const isPremium = user.plan === "premium";

  const isPromo = user.plan === "free" && !!(await (db as any).creditTransaction.findFirst({
    where: { userId: session.sub, source: "launch_promo" },
  }));

  const isBasicOrPromo = user.plan === "basic" || isPromo;

  if (!isBasicOrPromo && !isPremium)
    return NextResponse.json({ error: "Apenas planos Básico ou Premium podem criar Circles.", code: "plan_required" }, { status: 403 });

  let chargeCredits = false;
  if (!isPremium) {
    const owned = await db.circle.count({ where: { ownerId: session.sub } });
    if (owned >= CIRCLE_FREE_LIMIT) {
      if (user.credits < CIRCLE_EXTRA_COST)
        return NextResponse.json({
          error: `Você atingiu o limite de ${CIRCLE_FREE_LIMIT} Circles gratuitos. Criar mais custa ${CIRCLE_EXTRA_COST} créditos, mas você não tem créditos suficientes.`,
          code: "insufficient_credits",
        }, { status: 403 });
      chargeCredits = true;
    }
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

  if (chargeCredits) {
    await db.$transaction([
      db.user.update({ where: { id: session.sub }, data: { credits: { decrement: CIRCLE_EXTRA_COST } } }),
      (db as any).creditTransaction.create({
        data: { userId: session.sub, type: "debit", amount: CIRCLE_EXTRA_COST, source: "circle_create", description: `Circle criado: ${circle.name}` },
      }),
    ]);
  }

  return NextResponse.json(circle, { status: 201 });
}
