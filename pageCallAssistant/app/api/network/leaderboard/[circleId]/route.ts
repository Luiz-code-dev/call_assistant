import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function GET(req: NextRequest, { params }: { params: { circleId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all"; // all | weekly

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const members = await db.circleMember.findMany({
    where: { circleId: params.circleId, status: "active" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          submissions: {
            where: {
              circleId: params.circleId,
              ...(period === "weekly" ? { createdAt: { gte: weekStart } } : {}),
              evaluation: { isNot: null },
            },
            include: { evaluation: { select: { totalScore: true } } },
          },
        },
      },
    },
  });

  const ranked = members
    .map((m) => {
      const scores = m.user.submissions.map((s) => s.evaluation?.totalScore ?? 0);
      const totalScore = scores.reduce((a, b) => a + b, 0);
      const submissionCount = scores.length;
      const avgScore = submissionCount > 0 ? Math.round(totalScore / submissionCount) : 0;
      return {
        userId:          m.user.id,
        name:            m.user.name,
        avatarUrl:       m.user.avatarUrl,
        role:            m.role,
        totalScore,
        avgScore,
        submissionCount,
        isMe:            m.user.id === session.sub,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || b.submissionCount - a.submissionCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return NextResponse.json({ period, rankings: ranked });
}
