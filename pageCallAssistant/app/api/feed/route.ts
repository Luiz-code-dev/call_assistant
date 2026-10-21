import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const tab = searchParams.get("tab") ?? "friends";
  const activityFilter = searchParams.get("activity") ?? null;
  const take = 12;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let whereClause: any;

  if (tab === "discover") {
    whereClause = {};
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const friendships = await (db as any).friendship.findMany({
      where: {
        OR: [{ requesterId: session.sub }, { addresseeId: session.sub }],
        status: "accepted",
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds: string[] = friendships.map((f: { requesterId: string; addresseeId: string }) =>
      f.requesterId === session.sub ? f.addresseeId : f.requesterId
    );
    whereClause = { userId: { in: Array.from(new Set([session.sub, ...friendIds])) } };
  }

  const validTypes = ["POST", "LIVE_SESSION", "ACHIEVEMENT", "CHALLENGE_COMPLETED"];
  if (activityFilter && validTypes.includes(activityFilter)) {
    whereClause = { ...whereClause, activityType: activityFilter };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await (db as any).post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 3,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const hasMore = posts.length > take;
  const items = hasMore ? posts.slice(0, take) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const result = items.map((p: any) => ({
    ...p,
    likedByMe: p.likes.some((l: any) => l.userId === session.sub),
  }));

  return NextResponse.json({ posts: result, nextCursor });
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json();
  const content = body.content?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";
  const validTypes = ["POST", "LIVE_SESSION", "ACHIEVEMENT", "CHALLENGE_COMPLETED"];
  const activityType = validTypes.includes(body.activityType) ? body.activityType : "POST";
  const activityMeta = body.activityMeta && typeof body.activityMeta === "object" ? body.activityMeta : null;

  if (!content && !imageUrl && activityType === "POST")
    return NextResponse.json({ error: "empty_post" }, { status: 400 });

  if (content.length > 2000)
    return NextResponse.json({ error: "too_long" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = await (db as any).post.create({
    data: {
      userId: session.sub,
      content: content || null,
      imageUrl: imageUrl || null,
      activityType,
      activityMeta,
    },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      comments: { take: 0 },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({ ...post, likedByMe: false }, { status: 201 });
}
