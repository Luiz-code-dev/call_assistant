import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "@/app/api/network/_auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comments = await (db as any).postComment.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim() || content.length > 500)
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comment = await (db as any).postComment.create({
    data: { postId: params.id, userId: session.sub, content: content.trim() },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
