import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = await (db as any).post.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.userId !== session.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
