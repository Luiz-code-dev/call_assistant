import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const session = await getNetworkSession(req);
    if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    const { userId } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db2 = db as any;

    // Fetch user — try with bio first, fall back without it
    let user = await db2.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, avatarUrl: true, bio: true, plan: true, createdAt: true },
    }).catch(() =>
      db2.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, username: true, avatarUrl: true, plan: true, createdAt: true },
      })
    );

    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!("bio" in user)) user = { ...user, bio: null };

    // Friendship status
    const friendship = await db2.friendship.findFirst({
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

    // Run all extra queries with individual fallbacks so a missing table never crashes the profile
    const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

    const [postsCount, friendsCount, friendsList, proficiency, challenges, badges, posts] = await Promise.all([
      safe(db2.post.count({ where: { userId } }), 0),
      db2.friendship.count({
        where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      }),
      canSeeFriends
        ? safe(
            db2.friendship.findMany({
              where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
              include: {
                requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
                addressee: { select: { id: true, name: true, username: true, avatarUrl: true } },
              },
            }),
            []
          )
        : Promise.resolve([]),
      safe(
        db2.proficiencyAssessment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { level: true, levelLabel: true, totalAvg: true, createdAt: true, overallFeedback: true },
        }),
        null
      ),
      safe(
        db2.submission.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: {
            challenge: { select: { title: true } },
            evaluation: { select: { fluencyScore: true, contentScore: true, clarityScore: true, totalScore: true } },
          },
        }),
        []
      ),
      safe(
        db2.userBadge.findMany({
          where: { userId },
          orderBy: { earnedAt: "desc" },
          select: { slug: true, earnedAt: true },
        }),
        []
      ),
      safe(
        db2.post.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { _count: { select: { likes: true, comments: true } } },
        }),
        []
      ),
    ]);

    const friends = canSeeFriends
      ? (friendsList as Array<{ requesterId: string; requester: object; addressee: object }>).map(
          (f) => (f.requesterId === userId ? f.addressee : f.requester)
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
      challenges: (challenges as Array<{ evaluation: object | null }>).filter((c) => c.evaluation !== null),
      badges,
    });
  } catch (err) {
    console.error("[profile] unexpected error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
