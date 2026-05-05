import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { userId } = params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      plan: true,
      createdAt: true,
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

  // Stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [postsCount, friendsCount] = await Promise.all([
    (db as any).post.count({ where: { userId } }),
    (db as any).friendship.count({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    }),
  ]);

  // Posts (last 12)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await (db as any).post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({
    user,
    friendshipStatus: friendship?.status ?? null,
    isOwnProfile: session.sub === userId,
    stats: { postsCount, friendsCount },
    posts,
  });
}
