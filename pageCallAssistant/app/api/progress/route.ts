import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const userId = session.sub;

  const [submissions, circles] = await Promise.all([
    db.submission.findMany({
      where: { userId },
      include: {
        challenge: { select: { id: true, title: true, type: true, circleId: true, startsAt: true, endsAt: true } },
        evaluation: { select: { totalScore: true, contentScore: true, fluencyScore: true, clarityScore: true, feedback: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.circleMember.findMany({
      where: { userId, status: "active" },
      include: { circle: { select: { id: true, name: true, focus: true } } },
    }),
  ]);

  // Per-circle ranking position
  const circleIds = circles.map((m) => m.circleId);
  const leaderboards = await Promise.all(
    circleIds.map(async (circleId) => {
      const members = await db.circleMember.findMany({
        where: { circleId, status: "active" },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);
      const scores = await db.submissionEvaluation.groupBy({
        by: ["submissionId"],
        _sum: { totalScore: true },
      });
      // Get scores per user in this circle
      const subs = await db.submission.findMany({
        where: { circleId, userId: { in: memberIds }, isSelected: true },
        include: { evaluation: { select: { totalScore: true } } },
      });
      const userTotals: Record<string, number> = {};
      for (const s of subs) {
        if (!userTotals[s.userId]) userTotals[s.userId] = 0;
        userTotals[s.userId] += s.evaluation?.totalScore ?? 0;
      }
      const sorted = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === userId) + 1;
      return { circleId, rank: rank > 0 ? rank : sorted.length + 1, total: sorted.length + (userTotals[userId] === undefined ? 1 : 0) };
    })
  );

  const rankMap: Record<string, { rank: number; total: number }> = {};
  for (const l of leaderboards) rankMap[l.circleId] = { rank: l.rank, total: l.total };

  // Aggregate stats
  const totalSubmissions = submissions.length;
  const evaluatedSubs = submissions.filter((s) => s.evaluation);
  const avgScore = evaluatedSubs.length
    ? Math.round(evaluatedSubs.reduce((acc, s) => acc + (s.evaluation?.totalScore ?? 0), 0) / evaluatedSubs.length)
    : 0;

  const quizSubs = submissions.filter((s) => s.challenge?.type === "quiz");
  let quizTotalPts = 0;
  let quizCorrect = 0;
  let quizTotal = 0;
  for (const s of quizSubs) {
    try {
      const d = JSON.parse(s.content);
      quizTotalPts += d.score ?? 0;
      quizCorrect += d.correct ?? 0;
      quizTotal += d.total ?? 0;
    } catch {}
  }

  return NextResponse.json({
    stats: {
      totalSubmissions,
      evaluatedSubmissions: evaluatedSubs.length,
      avgScore,
      quizCount: quizSubs.length,
      quizTotalPts: Math.round(quizTotalPts * 10) / 10,
      quizAccuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0,
    },
    submissions: submissions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      content: s.content,
      challenge: s.challenge,
      evaluation: s.evaluation,
    })),
    circles: circles.map((m) => ({
      id: m.circleId,
      name: m.circle.name,
      focus: m.circle.focus,
      role: m.role,
      rank: rankMap[m.circleId]?.rank ?? null,
      totalMembers: rankMap[m.circleId]?.total ?? null,
    })),
  });
}
