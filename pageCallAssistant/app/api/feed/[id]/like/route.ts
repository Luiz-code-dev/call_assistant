import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const postId = params.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).postLike.findUnique({
    where: { postId_userId: { postId, userId: session.sub } },
  });

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).postLike.delete({
      where: { postId_userId: { postId, userId: session.sub } },
    });
    return NextResponse.json({ liked: false });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).postLike.create({ data: { postId, userId: session.sub } });
  return NextResponse.json({ liked: true });
}
