import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";

export async function POST(req: NextRequest, { params }: { params: { phraseId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const phrase = await db.circlePhrase.findUnique({
    where: { id: params.phraseId },
    select: { id: true },
  });
  if (!phrase) return NextResponse.json({ error: "Frase não encontrada." }, { status: 404 });

  const existing = await db.circlePhraseLike.findUnique({
    where: { phraseId_userId: { phraseId: params.phraseId, userId: session.sub } },
  });

  if (existing) {
    const [, updated] = await db.$transaction([
      db.circlePhraseLike.delete({ where: { id: existing.id } }),
      db.circlePhrase.update({
        where: { id: params.phraseId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);
    return NextResponse.json({ likedByMe: false, likeCount: Math.max(0, updated.likeCount) });
  }

  const [, updated] = await db.$transaction([
    db.circlePhraseLike.create({ data: { phraseId: params.phraseId, userId: session.sub } }),
    db.circlePhrase.update({
      where: { id: params.phraseId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    }),
  ]);
  return NextResponse.json({ likedByMe: true, likeCount: updated.likeCount });
}
