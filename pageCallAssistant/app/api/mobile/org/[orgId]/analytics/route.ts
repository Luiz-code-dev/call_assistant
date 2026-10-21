import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: { orgId: string } };

async function getSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const payload = await getSession(req);
  if (!payload) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const membership = await (db as any).orgMember.findUnique({
    where: { orgId_userId: { orgId: params.orgId, userId: payload.sub } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orgId = params.orgId;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

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
    categoryBreakdown,
    allMembers,
  ] = await Promise.all([
    (db as any).orgMember.count({ where: { orgId } }),
    (db as any).orgLiveSession.groupBy({
      by: ["userId"],
      where: { orgId, createdAt: { gte: startOfWeek } },
      _count: true,
    }).then((r: any[]) => r.length).catch(() => 0),
    (db as any).orgLiveSession.count({ where: { orgId } }).catch(() => 0),
    (db as any).orgLiveSession.count({ where: { orgId, createdAt: { gte: startOfWeek } } }).catch(() => 0),
    (db as any).corporateChallenge.count({ where: { orgId } }).catch(() => 0),
    (db as any).corpChallengeSubmission.count({ where: { orgId } }).catch(() => 0),
    (db as any).corpChallengeSubmission.count({ where: { orgId, createdAt: { gte: startOfWeek } } }).catch(() => 0),
    (db as any).corporateCertification.count({ where: { orgId } }).catch(() => 0),
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
      by: ["category"],
      where: { orgId },
      _count: { id: true },
    }).catch(() => []),
    (db as any).orgMember.findMany({
      where: { orgId },
      select: { department: true, commScore: true },
    }),
  ]);

  const avgScore = (topMembers as any[]).length > 0
    ? Math.round((topMembers as any[]).reduce((s: number, m: any) => s + (m.commScore ?? 0), 0) / (topMembers as any[]).length)
    : 0;

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
    topMembers: (topMembers as any[]).map((m: any) => ({
      id: m.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      commScore: m.commScore ?? 0,
      department: m.department ?? null,
      jobTitle: m.jobTitle ?? null,
    })),
    categoryBreakdown,
    departmentBreakdown,
  });
}
