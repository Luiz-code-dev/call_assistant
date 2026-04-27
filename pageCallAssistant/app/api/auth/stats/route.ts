import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

const BADGE_CRITERIA: {
  slug: string;
  check: (s: {
    liveSessions: number;
    submissions: number;
    highScoreCount: number;
    toolUsages: number;
  }) => boolean;
}[] = [
  { slug: "live-first",      check: (s) => s.liveSessions >= 1 },
  { slug: "live-10",         check: (s) => s.liveSessions >= 10 },
  { slug: "live-50",         check: (s) => s.liveSessions >= 50 },
  { slug: "challenge-first", check: (s) => s.submissions >= 1 },
  { slug: "high-scorer",     check: (s) => s.highScoreCount >= 1 },
  { slug: "tool-user",       check: (s) => s.toolUsages >= 1 },
];

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "token_invalid" }, { status: 401 });

  const userId = payload.sub;

  const [liveSessions, submissions, highScores, toolUsages] = await Promise.all([
    db.callSession.count({ where: { userId } }),
    db.submission.count({ where: { userId } }),
    db.submissionEvaluation.count({
      where: { submission: { userId }, totalScore: { gte: 90 } },
    }),
    db.toolUsage.count({ where: { userId } }),
  ]);

  const stats = { liveSessions, submissions, highScoreCount: highScores, toolUsages };

  const earnedSlugs = BADGE_CRITERIA.filter((b) => b.check(stats)).map((b) => b.slug);

  await Promise.all(
    earnedSlugs.map((slug) =>
      db.userBadge.upsert({
        where: { userId_slug: { userId, slug } },
        create: { userId, slug },
        update: {},
      })
    )
  );

  return NextResponse.json({ ...stats, earnedSlugs });
}
