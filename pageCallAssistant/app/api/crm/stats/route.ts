import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCrmUser } from "@/lib/crmAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isCrmUser(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    totalUsers, usersByPlan, newUsersThisWeek,
    totalOrgs, activeOrgs,
    totalLeads, leadsByStatus,
    b2bUsers,
  ] = await Promise.all([
    (db as any).user.count(),
    (db as any).user.groupBy({ by: ["plan"], _count: { _all: true } }),
    (db as any).user.count({ where: { createdAt: { gte: weekAgo } } }),
    (db as any).organization.count({ where: { deletedAt: null } }),
    (db as any).organization.count({ where: { deletedAt: null, isActive: true } }),
    (db as any).crmLead.count(),
    (db as any).crmLead.groupBy({ by: ["status"], _count: { _all: true } }),
    (db as any).user.count({ where: { b2bAccess: true } }),
  ]);

  const planMap: Record<string, number> = {};
  for (const p of usersByPlan) planMap[p.plan] = p._count._all;

  const statusMap: Record<string, number> = {};
  for (const s of leadsByStatus) statusMap[s.status] = s._count._all;

  const premiumUsers = (planMap.premium ?? 0) + (planMap.basic ?? 0);

  const orgs = await (db as any).organization.findMany({
    where: { deletedAt: null, isActive: true },
    select: { seatLimit: true },
  });
  const mrrEstimate = orgs.reduce((sum: number, o: any) => {
    const ppu = o.seatLimit <= 10 ? 100 : o.seatLimit <= 25 ? 85 : 70;
    return sum + o.seatLimit * ppu;
  }, 0);

  const newLeadsThisWeek = await (db as any).crmLead.count({ where: { createdAt: { gte: weekAgo } } });

  return NextResponse.json({
    totalUsers,
    newUsersThisWeek,
    premiumUsers,
    freeUsers: planMap.free ?? 0,
    b2bUsers,
    totalOrgs,
    activeOrgs,
    mrrEstimate,
    totalLeads,
    newLeadsThisWeek,
    convertedLeads: statusMap.convertido ?? 0,
    activeTrials: statusMap.trial ?? 0,
    leadsByStatus: statusMap,
    planMap,
  });
}
