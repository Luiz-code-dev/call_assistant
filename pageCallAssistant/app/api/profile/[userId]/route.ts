import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { userId } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (db as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, username: true,
      avatarUrl: true, bio: true, plan: true, createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Friendship status with viewer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendship = await (db as any).friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.sub, addresseeId: userId },
        { requesterId: userId, addresseeId: session.sub },
      ],
    },
    select: { status: true },
  });

  const isOwnProfile = session.sub === userId;
  const canSeeFriends = isOwnProfile || friendship?.status === "accepted";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db2 = db as any;

  // Stats + posts + proficiency + challenges in parallel
  const [postsCount, friendsCount, friendsList, proficiency, challenges, posts] = await Promise.all([
    db2.post.count({ where: { userId } }),
    db2.friendship.count({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    }),
    canSeeFriends
      ? db2.friendship.findMany({
          where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
          include: {
            requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
            addressee: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        })
      : Promise.resolve([]),
    db2.proficiencyAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { level: true, cefrLevel: true, createdAt: true, overallFeedback: true },
    }),
    db2.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        challenge: { select: { title: true } },
        evaluation: { select: { fluencyScore: true, contentScore: true, clarityScore: true, cefrLevel: true } },
      },
    }),
    db2.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { _count: { select: { likes: true, comments: true } } },
    }),
  ]);

  // Normalize friends list to always return "the other person"
  const friends = canSeeFriends
    ? friendsList.map((f: { requesterId: string; requester: object; addressee: object }) =>
        f.requesterId === userId ? f.addressee : f.requester
      )
    : null;

  return NextResponse.json({
    user,
    friendshipStatus: friendship?.status ?? null,
    isOwnProfile,
    stats: { postsCount, friendsCount },
    posts,
    friends,
    proficiency: proficiency ?? null,
    challenges: challenges.filter((c: { evaluation: object | null }) => c.evaluation !== null),
  });
}
