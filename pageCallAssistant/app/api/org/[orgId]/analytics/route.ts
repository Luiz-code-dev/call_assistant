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
  ]);

  const avgScore = topMembers.length > 0
    ? Math.round(topMembers.reduce((s: number, m: any) => s + (m.commScore ?? 0), 0) / topMembers.length)
    : 0;

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
      team: m.teamMembers[0]?.team?.name ?? null,
    })),
    weeklyActivity,
    categoryBreakdown,
  });
}
