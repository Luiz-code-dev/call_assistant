import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";
import { sendPushToUsers } from "@/lib/webpush";
import { sendFriendRequestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendships = await (db as any).friendship.findMany({
    where: {
      OR: [
        { requesterId: session.sub },
        { addresseeId: session.sub },
      ],
    },
    include: {
      requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
      addressee:  { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = friendships.map((f: any) => {
    const isRequester = f.requesterId === session.sub;
    const other = isRequester ? f.addressee : f.requester;
    return {
      id: f.id,
      status: f.status,
      direction: isRequester ? "sent" : "received",
      friend: other,
      createdAt: f.createdAt,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId || userId === session.sub)
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.sub, addresseeId: userId },
        { requesterId: userId, addresseeId: session.sub },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "already_exists", status: existing.status }, { status: 409 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendship = await (db as any).friendship.create({
    data: { requesterId: session.sub, addresseeId: userId },
    include: {
      requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  const requesterName = friendship.requester.name;
  await Promise.allSettled([
    sendPushToUsers([userId], {
      title: "👥 Nova solicitação de amizade",
      body: `${requesterName} quer ser seu amigo no SpeakFlow!`,
      url: "/friends",
    }),
    sendFriendRequestEmail(target.email, target.name, requesterName),
  ]);

  return NextResponse.json(friendship, { status: 201 });
}
