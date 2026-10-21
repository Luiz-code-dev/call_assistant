import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgSessionById } from "@/lib/orgAuth";

export const dynamic = "force-dynamic";

type Ctx = { params: { orgId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const org = await getOrgSessionById(params.orgId);
  if (!org) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const orgId = params.orgId;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOf30Days = new Date(now);
  startOf30Days.setDate(now.getDate() - 29);
  startOf30Days.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalMembers,
    activeThisWeek,
    totalLiveSessions,
    liveSessionsThisWeek,
    totalChallenges,
    totalSubmissions,
    submissionsThisWeek,
    totalCertifications,
    topMembers,
    weeklyActivity,
    categoryBreakdown,
    allMembers,
    rawSessions30,
    rawSubmissions30,
  ] = await Promise.all([
    (db as any).orgMember.count({ where: { orgId } }),

    (db as any).orgLiveSession.groupBy({
      by: ["userId"],
      where: { orgId, createdAt: { gte: startOfWeek } },
      _count: true,
    }).then((r: any[]) => r.length),

    (db as any).orgLiveSession.count({ where: { orgId } }),

    (db as any).orgLiveSession.count({ where: { orgId, createdAt: { gte: startOfWeek } } }),

    (db as any).corporateChallenge.count({ where: { orgId } }),

    (db as any).corpChallengeSubmission.count({ where: { orgId } }),

    (db as any).corpChallengeSubmission.count({ where: { orgId, createdAt: { gte: startOfWeek } } }),

    (db as any).corporateCertification.count({ where: { orgId } }),

    (db as any).orgMember.findMany({
      where: { orgId },
      orderBy: { commScore: "desc" },
      take: 10,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        teamMembers: { include: { team: { select: { name: true } } }, take: 1 },
      },
    }),

    (db as any).orgLiveSession.groupBy({
      by: ["createdAt"],
      where: { orgId, createdAt: { gte: startOfWeek } },
      _count: { id: true },
      _sum: { creditsUsed: true },
    }).catch(() => []),

    (db as any).orgLiveSession.groupBy({
      by: ["category"],
      where: { orgId },
      _count: { id: true },
    }).catch(() => []),

    (db as any).orgMember.findMany({
      where: { orgId },
      select: { department: true, commScore: true, jobTitle: true },
    }),

    (db as any).orgLiveSession.findMany({
      where: { orgId, createdAt: { gte: startOf30Days } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => []),

    (db as any).corpChallengeSubmission.findMany({
      where: { orgId, createdAt: { gte: startOf30Days } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => []),
  ]);

  const avgScore = topMembers.length > 0
    ? Math.round(topMembers.reduce((s: number, m: any) => s + (m.commScore ?? 0), 0) / topMembers.length)
    : 0;

  // Build department breakdown
  const deptMap: Record<string, { count: number; totalScore: number }> = {};
  for (const m of allMembers as any[]) {
    const dept = m.department || "Sem setor";
    if (!deptMap[dept]) deptMap[dept] = { count: 0, totalScore: 0 };
    deptMap[dept].count++;
    deptMap[dept].totalScore += m.commScore ?? 0;
  }
  const departmentBreakdown = Object.entries(deptMap)
    .map(([department, { count, totalScore }]) => ({
      department,
      count,
      avgScore: count > 0 ? Math.round(totalScore / count) : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Build daily series (last 30 days)
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const dailyMap: Record<string, { date: string; sessions: number; submissions: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = fmt(d);
    dailyMap[key] = { date: key, sessions: 0, submissions: 0 };
  }
  for (const s of rawSessions30 as any[]) {
    const key = fmt(new Date(s.createdAt));
    if (dailyMap[key]) dailyMap[key].sessions++;
  }
  for (const s of rawSubmissions30 as any[]) {
    const key = fmt(new Date(s.createdAt));
    if (dailyMap[key]) dailyMap[key].submissions++;
  }
  const dailySeries = Object.values(dailyMap);

  return NextResponse.json({
    totalMembers,
    activeThisWeek,
    totalLiveSessions,
    liveSessionsThisWeek,
    totalChallenges,
    totalSubmissions,
    submissionsThisWeek,
    totalCertifications,
    avgCommunicationScore: avgScore,
    topMembers: topMembers.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      commScore: m.commScore,
      department: m.department ?? null,
      jobTitle: m.jobTitle ?? null,
      team: m.teamMembers[0]?.team?.name ?? null,
    })),
    weeklyActivity,
    categoryBreakdown,
    departmentBreakdown,
    dailySeries,
  });
}
