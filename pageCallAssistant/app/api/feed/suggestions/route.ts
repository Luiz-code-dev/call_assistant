import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // Get all friend/pending IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendships = await (db as any).friendship.findMany({
    where: {
      OR: [{ requesterId: session.sub }, { addresseeId: session.sub }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const knownIds = new Set<string>([session.sub]);
  for (const f of friendships) {
    knownIds.add(f.requesterId);
    knownIds.add(f.addresseeId);
  }

  // Find users not yet connected who have at least one post, ordered by recency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestions = await (db as any).user.findMany({
    where: {
      id: { notIn: Array.from(knownIds) },
      posts: { some: {} },
    },
    select: {
      id: true, name: true, username: true, avatarUrl: true,
      _count: { select: { posts: true, friendsRequested: true, friendsReceived: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return NextResponse.json(suggestions);
}
