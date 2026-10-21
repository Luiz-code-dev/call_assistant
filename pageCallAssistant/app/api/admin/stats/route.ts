import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ message: "Token inválido" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  const rootEmail = (process.env.ROOT_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const isSuperAdmin = user?.superAdmin === true || (!!rootEmail && user?.email.toLowerCase() === rootEmail);
  if (!isSuperAdmin) return NextResponse.json({ message: "Acesso negado" }, { status: 403 });

  const [totalUsers, activeSubscriptions, newUsersToday, planCounts, creditsSum] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { subscriptionStatus: "active" } }),
    db.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    db.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.user.aggregate({ _sum: { credits: true } }),
  ]);

  const planMap = Object.fromEntries(planCounts.map((p) => [p.plan, p._count._all]));

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    newUsersToday,
    totalCreditsIssued: creditsSum._sum.credits ?? 0,
    freeUsers: planMap["free"] ?? 0,
    basicUsers: planMap["basic"] ?? 0,
    premiumUsers: planMap["premium"] ?? 0,
  });
}
