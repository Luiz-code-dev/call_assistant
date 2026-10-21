import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";
import { sendPushToUsers } from "@/lib/webpush";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { action } = await req.json() as { action: "accept" | "reject" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendship = await (db as any).friendship.findUnique({ where: { id: params.id } });
  if (!friendship) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (friendship.addresseeId !== session.sub)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (friendship.status !== "pending")
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });

  if (action === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).friendship.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any).friendship.update({
    where: { id: params.id },
    data: { status: "accepted" },
    include: {
      addressee: { select: { name: true } },
    },
  });

  await sendPushToUsers([friendship.requesterId], {
    title: "🎉 Solicitação aceita!",
    body: `${updated.addressee.name} aceitou sua solicitação de amizade!`,
    url: "/friends",
  }).catch(console.error);

  return NextResponse.json({ ok: true, action: "accepted" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const friendship = await (db as any).friendship.findUnique({ where: { id: params.id } });
  if (!friendship) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isMember = friendship.requesterId === session.sub || friendship.addresseeId === session.sub;
  if (!isMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
