import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function DELETE(req: NextRequest, { params }: { params: { phraseId: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const phrase = await db.circlePhrase.findUnique({
    where: { id: params.phraseId },
    select: { userId: true, circleId: true },
  });
  if (!phrase) return NextResponse.json({ error: "Frase não encontrada." }, { status: 404 });

  // Autor ou owner/moderator do Circle pode remover
  let canDelete = phrase.userId === session.sub;
  if (!canDelete) {
    const member = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId: phrase.circleId, userId: session.sub } },
      select: { role: true },
    });
    canDelete = !!member && ["owner", "moderator"].includes(member.role);
  }
  if (!canDelete) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  await db.circlePhrase.delete({ where: { id: params.phraseId } });
  return NextResponse.json({ ok: true });
}
