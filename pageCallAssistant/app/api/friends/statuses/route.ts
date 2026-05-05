import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

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

  if (friendIds.length === 0) return NextResponse.json([]);

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = await (db as any).user.findMany({
    where: {
      id: { in: friendIds },
      statusExpires: { gt: now },
      OR: [{ statusText: { not: null } }, { statusMediaUrl: { not: null } }],
    },
    select: {
      id: true, name: true, avatarUrl: true, username: true,
      statusText: true, statusEmoji: true, statusExpires: true, statusMediaUrl: true,
    },
  }).catch(() => []);

  return NextResponse.json(users);
}
