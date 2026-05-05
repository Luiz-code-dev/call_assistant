import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";
import { encryptMessage, decryptMessage, conversationKey } from "@/lib/encryption";
import { sendPushToUsers } from "@/lib/webpush";

async function areFriends(userA: string, userB: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = await (db as any).friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
  return !!f;
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!(await areFriends(session.sub, params.userId)))
    return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const take = 40;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = await (db as any).message.findMany({
    where: {
      OR: [
        { senderId: session.sub, receiverId: params.userId },
        { senderId: params.userId, receiverId: session.sub },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const convKey = conversationKey(session.sub, params.userId);
  const decrypted = messages.map((m: any) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    content: decryptMessage(m.content, m.iv, convKey),
    isRead: m.isRead,
    createdAt: m.createdAt,
  }));

  // Mark as read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).message.updateMany({
    where: { senderId: params.userId, receiverId: session.sub, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json(decrypted.reverse());
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!(await areFriends(session.sub, params.userId)))
    return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim() || content.length > 2000)
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });

  const convKey = conversationKey(session.sub, params.userId);
  const { content: encrypted, iv } = encryptMessage(content.trim(), convKey);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = await (db as any).message.create({
    data: { senderId: session.sub, receiverId: params.userId, content: encrypted, iv },
  });

  // Push notification to receiver
  sendPushToUsers([params.userId], {
    title: `💬 ${session.name}`,
    body: content.trim().length > 80 ? content.trim().slice(0, 77) + "..." : content.trim(),
    url: `/messages/${session.sub}`,
  }).catch(console.error);

  return NextResponse.json({
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    content: content.trim(),
    isRead: false,
    createdAt: msg.createdAt,
  }, { status: 201 });
}
