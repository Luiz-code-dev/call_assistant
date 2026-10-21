import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

// DELETE /api/network/challenges/[id]
// Only owner or moderator of the circle can delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const challenge = await db.challenge.findUnique({
    where: { id: params.id },
    select: { circleId: true },
  });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: challenge.circleId, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Sem permissão para excluir desafios neste Circle." }, { status: 403 });

  try {
    await db.challenge.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/network/challenges/[id] error:", err);
    return NextResponse.json({ error: "Erro ao excluir desafio." }, { status: 500 });
  }
}
